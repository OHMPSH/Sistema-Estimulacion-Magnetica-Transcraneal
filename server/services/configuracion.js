/**
 * services/configuracion.js
 * ─────────────────────────────────────────────────────────────
 * Configuración del sistema, en memoria.
 *
 *   cargar()                          — lee la tabla al arrancar (antes del listen)
 *   obtener(clave) / obtenerTodo()    — lectura síncrona desde la caché
 *   actualizar(clave, cambio, usuarioId) — valida, guarda, actualiza la caché y difunde
 *
 * Si falta alguna clave en la base (por ejemplo, alguien la borró),
 * se usa el valor por defecto de CLAUDE.md 7.2 y se guarda.
 *
 * Los cambios de modo_operacion, barrido y sensor con una sesión
 * abierta los rechaza el controlador (409), porque cambiarían los
 * datos a mitad de un barrido.
 * ─────────────────────────────────────────────────────────────
 */

import * as Configuracion from '../models/Configuracion.js';
import { validarClave, mezclar, CLAVES } from './validacionConfiguracion.js';
import { difundir } from './tiempoReal.js';

/** Valores por defecto (iguales a la migración 003 y a setup_db.sql) */
export const POR_DEFECTO = {
  modo_operacion: 'simulacion',
  barrido:        { grid_size_mm: 60, z_max_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 },
  sensor:         { modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 1, offset_ut: { x: 0, y: 0, z: 0 } },
  simulacion:     { ms_por_punto: { DC: 60, AC: 120 }, semilla: 12345, ruido_sigma_ut: 0.25, radio_bobina_mm: 25, campo_centro_ut: 120, prob_hueco: 0, prob_saturacion: 0 },
  dispositivo:    { intervalo_latido_s: 5, umbral_desconexion_s: 15 },
  visualizacion:  { ventana_grafica: 80, filas_tabla: 60, decimales: 3, escala_superficie: 'Jet', rotacion_auto: true, reducir_animaciones: false },
  datos:          { zona_horaria: 'America/Mexico_City' },
};

const cache = new Map();

/** Copia profunda, para que nadie modifique la caché por accidente */
const copia = v => structuredClone(v);

/** Carga toda la configuración desde la base. Se llama una vez al arrancar. */
export async function cargar() {
  const filas = await Configuracion.obtenerTodas();
  cache.clear();
  for (const { clave, valor } of filas) {
    if (!CLAVES.includes(clave)) continue;
    const { valor: limpio, errores } = validarClave(clave, valor);
    if (errores.length > 0) {
      console.warn(`[config] "${clave}" guardada en la base no es válida (${errores.join('; ')}); se usa el valor por defecto.`);
      continue;
    }
    cache.set(clave, limpio);
  }
  for (const clave of CLAVES) {
    if (!cache.has(clave)) {
      cache.set(clave, copia(POR_DEFECTO[clave]));
      await Configuracion.guardar(clave, POR_DEFECTO[clave], null);
      console.log(`[config] "${clave}" no estaba en la base: se guardó el valor por defecto.`);
    }
  }
  console.log(`[config] ✓ Configuración cargada (modo ${cache.get('modo_operacion')}).`);
}

/** Valor actual de una clave (copia) */
export function obtener(clave) {
  if (!cache.has(clave)) throw new Error(`Configuración no cargada o clave desconocida: ${clave}`);
  return copia(cache.get(clave));
}

/** Todas las claves, como objeto { clave: valor } */
export function obtenerTodo() {
  return Object.fromEntries(CLAVES.map(c => [c, copia(cache.get(c))]));
}

/**
 * Valida y guarda un cambio. Para las claves que son objetos, el
 * cambio puede ser parcial: se mezcla con el valor actual.
 * @returns {Promise<{ valor?, errores: string[] }>}
 */
export async function actualizar(clave, cambio, usuarioId) {
  const actual = cache.get(clave);
  let propuesto = mezclar(actual, cambio);
  // En `sensor`, lsb_por_ga se recalcula a partir del rango: si el
  // cambio no lo trae, se descarta el valor anterior
  if (clave === 'sensor' && propuesto && typeof propuesto === 'object' && cambio?.lsb_por_ga === undefined) {
    propuesto = { ...propuesto };
    delete propuesto.lsb_por_ga;
  }

  const { valor, errores } = validarClave(clave, propuesto);
  if (errores.length > 0) return { errores };

  await Configuracion.guardar(clave, valor, usuarioId);
  cache.set(clave, valor);
  difundir('configuracion', { clave, valor });
  return { valor: copia(valor), errores: [] };
}
