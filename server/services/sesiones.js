/**
 * services/sesiones.js
 * ─────────────────────────────────────────────────────────────
 * Reglas de las sesiones de medición, compartidas por el controlador
 * y el simulador.
 *
 *   inicializar()             — al arrancar: cierra las sesiones que
 *                               quedaron abiertas de una ejecución anterior
 *   iniciar({modo, pasoMM, medio, usuarioId}) — crea la sesión (409 si ya hay otra abierta)
 *   finalizar(id)             — la cierra, detiene el simulador y calcula
 *                               puntos recibidos y huecos (Fase 5)
 *   sesionAbierta()           — la sesión abierta, o null
 *
 * Solo puede haber UNA sesión abierta a la vez. Como el servidor es
 * un único proceso, la creación se serializa con una cola de promesas:
 * dos clics simultáneos en "Iniciar" no pueden crear dos sesiones.
 *
 * El origen de la sesión sale de modo_operacion: 'sim' en simulación
 * (la genera el simulador del servidor) y 'hw' en modo real (la Pico W).
 *
 * Al crear o cerrar se difunde el evento SSE `sesion`.
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';
import { obtener } from './configuracion.js';
import { mallaDeBarrido } from './geometria.js';
import { difundir } from './tiempoReal.js';
import * as simulador from './simulador.js';
import { olvidarSesion } from './ingesta.js';
import { calcularHuecos } from './trazabilidad.js';
import { VERSION_SOFTWARE } from './version.js';
import { estadoPublico as estadoDispositivo } from './dispositivo.js';

export class ErrorSesion extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

/** La sesión abierta (fila de la BD), o null */
let abierta = null;

/** Cola para que dos operaciones sobre sesiones no se crucen */
let cola = Promise.resolve();
const enCola = tarea => {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.catch(() => {});
  return resultado;
};

/**
 * Malla de una sesión: con la copia de la configuración de barrido que
 * se guardó al iniciarla (Fase 5); las sesiones antiguas, con la vigente.
 */
export const mallaDeSesion = sesion => mallaDeBarrido(sesion.config_barrido ?? obtener('barrido'), sesion.paso_mm);

/** Sesión con su geometría, tal como se envía al navegador (sin las copias de configuración) */
function conGeometria(sesion) {
  const malla = mallaDeSesion(sesion);
  const { config_barrido: _b, config_sensor: _s, config_simulacion: _c, ...publica } = sesion;
  return {
    ...publica,
    grid_n: malla.gridN,
    z_levels_mm: malla.zLevels,
    puntos_esperados: sesion.puntos_esperados ?? malla.totalPuntos,
  };
}

/**
 * Calcula y guarda lo que se sabe al cerrar: filas recibidas y
 * posiciones de la malla sin lectura válida (Fase 5).
 */
async function resumirCierre(sesion) {
  const malla = mallaDeSesion(sesion);
  const { total, posiciones } = await Medicion.resumenDeLecturas(sesion.id);
  const huecos = calcularHuecos(malla, posiciones);
  await Medicion.guardarCierre(sesion.id, { puntosRecibidos: total, huecos, puntosEsperados: malla.totalPuntos });
  return { total, huecos };
}

export const sesionAbierta = () => (abierta ? conGeometria(abierta) : null);

/**
 * Si la sesión real se creó antes del primer latido de la Pico, su
 * version_firmware quedó vacía: se completa con el primer latido.
 */
export async function anotarFirmware(firmware) {
  if (!abierta || abierta.origen !== 'hw' || abierta.version_firmware || !firmware) return;
  await Medicion.anotarFirmware(abierta.id, firmware);
  abierta = { ...abierta, version_firmware: firmware };
}

/**
 * Al arrancar el servidor no hay ningún barrido en marcha: cualquier
 * sesión abierta es de una ejecución anterior (un reinicio o un corte
 * de luz). Se cierra y se registra en el log.
 */
export async function inicializar() {
  const huerfanas = await Medicion.obtenerSesionesAbiertas();
  for (const s of huerfanas) {
    await Medicion.cerrarSesionHuerfana(s.id);
    const { total, huecos } = await resumirCierre(s);
    console.warn(`[sesiones] La sesión ${s.id} (iniciada ${s.iniciada_en.toISOString()}) seguía abierta de una ejecución anterior: se cerró con la hora de su última medición (${total} lecturas, ${huecos.total} huecos).`);
  }
  abierta = null;
}

/**
 * Crea una sesión y, en modo simulación, arranca el simulador.
 * Guarda con la sesión (Fase 5) quién la inició, copias de la
 * configuración vigente (barrido, sensor y, en simulación, la de
 * simulación con su semilla), la versión del software, los puntos
 * esperados y, en modo real, el firmware del último latido de la Pico.
 * @param {object} p  { modo, pasoMM, medio, usuarioId } ya validados
 * @returns {Promise<object>} la sesión con su geometría
 * @throws {ErrorSesion} 409 si ya hay otra abierta
 */
export function iniciar({ modo, pasoMM, medio, usuarioId = null }) {
  return enCola(async () => {
    if (abierta) {
      throw new ErrorSesion(409, `Ya hay una sesión abierta (la ${abierta.id}). Deténla antes de iniciar otra.`);
    }
    // Por si alguien abrió una sesión por fuera del servidor
    const enBase = await Medicion.obtenerSesionesAbiertas();
    if (enBase.length > 0) {
      throw new ErrorSesion(409, `Ya hay una sesión abierta (la ${enBase[0].id}). Deténla antes de iniciar otra.`);
    }

    const origen = obtener('modo_operacion') === 'simulacion' ? 'sim' : 'hw';
    const configBarrido = obtener('barrido');
    const configSimulacion = origen === 'sim' ? obtener('simulacion') : null;
    const id = await Medicion.crearSesion({
      modo, origen, pasoMM, medio, usuarioId,
      puntosEsperados: mallaDeBarrido(configBarrido, pasoMM).totalPuntos,
      configBarrido,
      configSensor: obtener('sensor'),
      configSimulacion,
      versionSoftware: VERSION_SOFTWARE,
      versionFirmware: origen === 'hw' ? (estadoDispositivo().firmware ?? null) : null,
    });
    abierta = await Medicion.obtenerSesion(id, { conConfig: true });
    const sesion = conGeometria(abierta);

    console.log(`[sesiones] Sesión ${id} iniciada: ${modo}, paso ${pasoMM} mm, ${medio}, origen ${origen}.`);
    difundir('sesion', { tipo: 'iniciada', sesion });

    if (origen === 'sim') {
      // El simulador usa exactamente la configuración que quedó guardada con la sesión
      simulador.arrancar(abierta, sesionId => {
        finalizar(sesionId, 'completa').catch(err =>
          console.error(`[sesiones] No se pudo cerrar la sesión ${sesionId} al completarse:`, err.message));
      });
    }
    return sesion;
  });
}

/**
 * Cierra una sesión.
 * @param {number} id
 * @param {'manual'|'completa'} motivo
 * @returns {Promise<object>} la sesión cerrada
 * @throws {ErrorSesion} 404 si no existe, 409 si ya estaba cerrada
 */
export function finalizar(id, motivo = 'manual') {
  return enCola(async () => {
    simulador.detener(id);
    const cerrada = await Medicion.cerrarSesion(id);
    if (!cerrada) {
      const estado = await Medicion.obtenerEstadoSesion(id);
      if (!estado) throw new ErrorSesion(404, `La sesión ${id} no existe`);
      throw new ErrorSesion(409, `La sesión ${id} ya está cerrada`);
    }
    if (abierta?.id === id) abierta = null;
    olvidarSesion(id);

    const { total, huecos } = await resumirCierre(await Medicion.obtenerSesion(id, { conConfig: true }));
    const sesion = conGeometria(await Medicion.obtenerSesion(id));
    console.log(`[sesiones] Sesión ${id} finalizada (${motivo}): ${total} lecturas, ${huecos.total} huecos.`);
    difundir('sesion', { tipo: 'finalizada', motivo, sesion });
    return sesion;
  });
}
