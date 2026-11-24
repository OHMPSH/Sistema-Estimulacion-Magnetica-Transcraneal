/**
 * services/calibracion.js
 * ─────────────────────────────────────────────────────────────
 * Previsualizador de la bobina (2026-11-24): antes de un barrido, el
 * operador lleva el sensor a un punto de la mesa y ve en vivo cuánto
 * campo mide, para saber si la corriente de la bobina es poca o demasiada.
 *
 * Todo vive en memoria: las lecturas de calibración NO se guardan en la
 * base ni crean sesiones; solo se difunden por SSE (evento `calibracion`).
 *
 *   iniciar(usuario, objetivo?)  — activa la calibración (el controlador
 *                                  comprueba antes el modo real y que no
 *                                  haya sesión abierta)
 *   mover(objetivo)              — nuevo punto, en mm de MÁQUINA
 *   terminar(motivo)             — la Pico vuelve al descanso
 *   paraPico()                   — lo que la Pico recibe en el latido y en
 *                                  POST /dispositivo/calibracion
 *   registrarDePico(datos)       — estado y lectura que manda la Pico
 *   anotarLimites(limites)       — recorrido de la mesa (lo manda la Pico
 *                                  en el latido: config.LIMITE_*_MM)
 *   erroresDeObjetivo(objetivo, limites) — puro, con tests
 *
 * Flujo con la Pico: el latido trae `calibracion: {activa, objetivo,
 * sensor}`; mientras está activa, la Pico va al punto, mide en bucle y
 * manda cada lectura a POST /dispositivo/calibracion, cuya respuesta le
 * devuelve el objetivo vigente (no espera al latido de 5 s).
 * ─────────────────────────────────────────────────────────────
 */

import { obtener } from './configuracion.js';
import { difundir } from './tiempoReal.js';
import { convertirCrudo, crudoValido } from './conversionSensor.js';
import { redondearMM } from './geometria.js';

const EJES = ['x', 'y', 'z'];
/** Recorrido máximo que se acepta como límite de la mesa (mm); la Pico manda los reales */
export const LIMITE_MAXIMO_MM = 2000;
/** Estados de movimiento que informa la Pico */
export const ESTADOS_CALIBRACION = ['moviendo', 'en_posicion', 'error'];

export class ErrorCalibracion extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const vacio = () => ({ estado: null, posicion_mm: null, error: null, actualizado: null });

let activa = false;
let objetivo = null;          // {x_mm, y_mm, z_mm}
let iniciadaPor = null;
let iniciadaEn = null;
let pico = vacio();           // lo último que informó la Pico
let ultimaLectura = null;
let limites = null;           // {x_mm, y_mm, z_mm} del latido

/**
 * Motivos por los que un objetivo no vale (vacío si vale).
 * Con `limites` conocidos, cada eje debe quedar entre 0 y su límite.
 */
export function erroresDeObjetivo(obj, lims = null) {
  const errores = [];
  for (const eje of EJES) {
    const v = obj?.[`${eje}_mm`];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errores.push(`${eje}_mm debe ser un número`);
    } else if (v < 0 || v > LIMITE_MAXIMO_MM) {
      errores.push(`${eje}_mm debe estar entre 0 y ${LIMITE_MAXIMO_MM} mm`);
    } else if (lims && v > lims[`${eje}_mm`] + 1e-6) {
      errores.push(`${eje}_mm = ${v} mm está fuera del recorrido de la mesa (0–${lims[`${eje}_mm`]} mm)`);
    }
  }
  return errores;
}

/** El objetivo con décimas de mm (como las posiciones de la malla) */
const normalizar = obj => Object.fromEntries(EJES.map(e => [`${e}_mm`, redondearMM(obj[`${e}_mm`])]));

/** Lo que ven el navegador (GET /calibracion) y el SSE */
export function estadoPublico() {
  return {
    activa,
    objetivo,
    iniciada_por: iniciadaPor,
    iniciada_en: iniciadaEn,
    limites_mm: limites,
    pico,
    ultima_lectura: ultimaLectura,
  };
}

const difundirEstado = () => difundir('calibracion', { tipo: 'estado', calibracion: estadoPublico() });

export function iniciar(usuario, obj = null) {
  if (activa) throw new ErrorCalibracion(409, `La calibración ya está activa (la inició ${iniciadaPor ?? 'otro usuario'}).`);
  const destino = obj ?? { x_mm: 0, y_mm: 0, z_mm: 0 };      // por defecto, el descanso
  const errores = erroresDeObjetivo(destino, limites);
  if (errores.length) throw new ErrorCalibracion(422, errores.join('; '));
  activa = true;
  objetivo = normalizar(destino);
  iniciadaPor = usuario ?? null;
  iniciadaEn = new Date().toISOString();
  pico = vacio();
  ultimaLectura = null;
  console.log(`[calibracion] "${iniciadaPor}" la inició en (${objetivo.x_mm}, ${objetivo.y_mm}, ${objetivo.z_mm}) mm.`);
  difundirEstado();
  return estadoPublico();
}

export function mover(obj) {
  if (!activa) throw new ErrorCalibracion(409, 'La calibración no está activa: iníciala primero.');
  const errores = erroresDeObjetivo(obj, limites);
  if (errores.length) throw new ErrorCalibracion(422, errores.join('; '));
  objetivo = normalizar(obj);
  difundirEstado();
  return estadoPublico();
}

/** Termina la calibración (si estaba activa). Devuelve true si la terminó. */
export function terminar(motivo = 'manual') {
  if (!activa) return false;
  activa = false;
  objetivo = null;
  console.log(`[calibracion] Terminada (${motivo}); la Pico vuelve al descanso.`);
  difundir('calibracion', { tipo: 'terminada', motivo, calibracion: estadoPublico() });
  return true;
}

/** Lo que recibe la Pico: null si no hay calibración */
export function paraPico(sensor = null) {
  if (!activa) return null;
  return { activa: true, objetivo, sensor: sensor ?? obtener('sensor') };
}

/** Recorrido de la mesa que manda la Pico en el latido */
export function anotarLimites(lims) {
  if (!lims) return;
  const nuevos = normalizar(lims);
  if (limites && EJES.every(e => limites[`${e}_mm`] === nuevos[`${e}_mm`])) return;
  limites = nuevos;
  difundirEstado();
}

/**
 * Estado y lectura que manda la Pico (ya validados en forma).
 * @param {{estado, posicion_mm?, raw?, saturado?, error?}} datos
 * @returns {string[]} errores de la lectura (la lectura se descarta, el estado se guarda)
 */
export function registrarDePico(datos, sensor = null) {
  const errores = [];
  pico = {
    estado: datos.estado,
    posicion_mm: datos.posicion_mm ? normalizar(datos.posicion_mm) : pico.posicion_mm,
    error: datos.error ?? null,
    actualizado: new Date().toISOString(),
  };
  if (!activa) return errores;
  sensor ??= obtener('sensor');
  if (datos.raw) {
    if (!EJES.every(e => crudoValido(datos.raw[e], sensor))) {
      errores.push(`raw fuera del rango del ${sensor.modelo ?? 'sensor'}`);
    } else {
      ultimaLectura = {
        ...convertirCrudo(datos.raw, sensor, datos.saturado === true),
        raw: datos.raw,
        posicion_mm: pico.posicion_mm,
        ts: pico.actualizado,
      };
    }
  }
  difundirEstado();
  return errores;
}

/** Para las pruebas */
export function reiniciar() {
  activa = false;
  objetivo = null;
  iniciadaPor = null;
  iniciadaEn = null;
  pico = vacio();
  ultimaLectura = null;
  limites = null;
}
