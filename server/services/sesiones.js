/**
 * services/sesiones.js
 * ─────────────────────────────────────────────────────────────
 * Reglas de las sesiones de medición, compartidas por el controlador
 * y el simulador.
 *
 *   inicializar()             — al arrancar: cierra las sesiones que
 *                               quedaron abiertas de una ejecución anterior
 *   iniciar({modo, pasoMM, medio}) — crea la sesión (409 si ya hay otra abierta)
 *   finalizar(id)             — la cierra y detiene el simulador
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
import { mallaParaPaso } from '../config/barrido.js';
import { difundir } from './tiempoReal.js';
import * as simulador from './simulador.js';

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

/** Sesión con su geometría, tal como se envía al navegador */
function conGeometria(sesion) {
  const malla = mallaParaPaso(sesion.paso_mm);
  return {
    ...sesion,
    grid_n: malla.gridN,
    z_levels_mm: malla.zLevels,
    puntos_esperados: malla.totalPuntos,
  };
}

export const sesionAbierta = () => (abierta ? conGeometria(abierta) : null);

/**
 * Al arrancar el servidor no hay ningún barrido en marcha: cualquier
 * sesión abierta es de una ejecución anterior (un reinicio o un corte
 * de luz). Se cierra y se registra en el log.
 */
export async function inicializar() {
  const huerfanas = await Medicion.obtenerSesionesAbiertas();
  for (const s of huerfanas) {
    await Medicion.cerrarSesionHuerfana(s.id);
    console.warn(`[sesiones] La sesión ${s.id} (iniciada ${s.iniciada_en.toISOString()}) seguía abierta de una ejecución anterior: se cerró con la hora de su última medición.`);
  }
  abierta = null;
}

/**
 * Crea una sesión y, en modo simulación, arranca el simulador.
 * @param {object} p  { modo, pasoMM, medio } ya validados
 * @returns {Promise<object>} la sesión con su geometría
 * @throws {ErrorSesion} 409 si ya hay otra abierta
 */
export function iniciar({ modo, pasoMM, medio }) {
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
    const id = await Medicion.crearSesion({ modo, origen, pasoMM, medio });
    abierta = await Medicion.obtenerSesion(id);
    const sesion = conGeometria(abierta);

    console.log(`[sesiones] Sesión ${id} iniciada: ${modo}, paso ${pasoMM} mm, ${medio}, origen ${origen}.`);
    difundir('sesion', { tipo: 'iniciada', sesion });

    if (origen === 'sim') {
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

    const sesion = conGeometria(await Medicion.obtenerSesion(id));
    console.log(`[sesiones] Sesión ${id} finalizada (${motivo}).`);
    difundir('sesion', { tipo: 'finalizada', motivo, sesion });
    return sesion;
  });
}
