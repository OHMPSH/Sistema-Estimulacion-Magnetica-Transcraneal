/**
 * services/ingesta.js
 * ─────────────────────────────────────────────────────────────
 * Única puerta de entrada de las mediciones a la base de datos.
 * La usan el simulador del servidor (una lectura en µT a la vez) y la
 * Pico W (lotes de cuentas crudas, Fase 4).
 *
 * registrarMedicion(sesion, lectura) — simulador:
 *   1. valida la posición contra la malla de la sesión (su paso);
 *   2. un eje por encima del fondo de escala del sensor se trata como
 *      el HMC5883L real: se desborda (crudo −4096), se guarda NULL en
 *      ese eje y la lectura queda marcada `saturado`;
 *   3. numera `seq` desde 1 en cada sesión;
 *   4. calcula |B| = √(Bx² + By² + Bz²), sin redondear (NULL si saturó);
 *   5. inserta con la hora del servidor en UTC, solo si la sesión
 *      sigue abierta, y difunde el evento SSE `medicion`.
 *
 * registrarLoteDispositivo(sesion, lecturas) — Pico W:
 *   valida y convierte cada lectura (services/conversionSensor.js),
 *   inserta las nuevas de forma idempotente por (sesion_id, seq) y
 *   difunde solo las nuevas. Devuelve {aceptadas, duplicadas, rechazadas}.
 *
 * Si algo falla lanza un ErrorIngesta con el código HTTP adecuado
 * (404, 409 o 422), que el controlador traduce a la respuesta.
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';
import { tamanoPlacaMM, mallaParaPaso, limiteCampoUT } from '../config/barrido.js';
import { obtener } from './configuracion.js';
import { difundir } from './tiempoReal.js';
import { erroresDePosicion, clasificarLote, DESBORDE } from './conversionSensor.js';

export class ErrorIngesta extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.status = status;
    this.errores = errores ?? [mensaje];
  }
}

/** Último seq usado por cada sesión abierta en este proceso (simulador y Pico) */
const ultimoSeqPorSesion = new Map();

/** El último seq conocido de una sesión (0 si no tiene lecturas con seq) */
export async function ultimoSeq(sesionId) {
  if (!ultimoSeqPorSesion.has(sesionId)) {
    ultimoSeqPorSesion.set(sesionId, await Medicion.ultimoSeq(sesionId));
  }
  return ultimoSeqPorSesion.get(sesionId);
}

/** Olvida el contador de una sesión (al cerrarla) */
export const olvidarSesion = sesionId => ultimoSeqPorSesion.delete(sesionId);

/** Medición tal como se difunde por SSE */
function paraDifundir(sesionId, m, timestamp) {
  return {
    sesionId,
    seq: m.seq,
    xMM: m.xMM, yMM: m.yMM, zMM: m.zMM, zIdx: m.zIdx,
    bx: m.bx, by: m.by, bz: m.bz, magnitud: m.magnitud,
    saturado: m.saturado,
    raw: m.raw ?? null,
    timestamp: timestamp.toISOString(),
    tsDispositivo: m.tsDispositivo ? m.tsDispositivo.toISOString() : null,
  };
}

/**
 * Guarda y difunde una medición del simulador.
 * @param {object} sesion   la sesión abierta { id, paso_mm, ... }
 * @param {object} lectura  { xMM, yMM, zMM, bx, by, bz } en mm y µT
 * @returns {Promise<object>} la medición tal como se difundió
 * @throws {ErrorIngesta}
 */
export async function registrarMedicion(sesion, { xMM, yMM, zMM, bx, by, bz }) {
  const malla = mallaParaPaso(sesion.paso_mm);
  const errores = erroresDePosicion({ xMM, yMM, zMM }, tamanoPlacaMM(), malla.zLevels);
  for (const [nombre, v] of [['bx', bx], ['by', by], ['bz', bz]]) {
    if (typeof v !== 'number' || !Number.isFinite(v)) errores.push(`${nombre} debe ser un número finito`);
  }
  if (errores.length > 0) throw new ErrorIngesta(422, errores.join('; '), errores);

  // Por encima del fondo de escala, el HMC5883L desborda ese eje (−4096)
  const limite = limiteCampoUT();
  const ut = { x: bx, y: by, z: bz };
  let saturado = false;
  let raw = null;
  for (const eje of ['x', 'y', 'z']) {
    if (Math.abs(ut[eje]) > limite) {
      saturado = true;
      ut[eje] = null;
      raw ??= { x: null, y: null, z: null };
      raw[eje] = DESBORDE;
    }
  }

  const seq = (await ultimoSeq(sesion.id)) + 1;
  const medicion = {
    seq, xMM, yMM, zMM, zIdx: malla.zLevels.indexOf(zMM),
    bx: ut.x, by: ut.y, bz: ut.z,
    magnitud: saturado ? null : Math.hypot(ut.x, ut.y, ut.z),
    saturado, raw,
  };
  const timestamp = new Date();

  const insertada = await Medicion.insertarMedicion({ sesionId: sesion.id, ...medicion, timestamp });
  if (!insertada) {
    const estado = await Medicion.obtenerEstadoSesion(sesion.id);
    if (!estado) throw new ErrorIngesta(404, `La sesión ${sesion.id} no existe`);
    if (estado.terminada_en) throw new ErrorIngesta(409, `La sesión ${sesion.id} ya está cerrada`);
    throw new ErrorIngesta(409, `El seq ${seq} ya existe en la sesión ${sesion.id}`);
  }
  ultimoSeqPorSesion.set(sesion.id, seq);

  const difundida = paraDifundir(sesion.id, medicion, timestamp);
  difundir('medicion', difundida);
  return difundida;
}

/**
 * Guarda un lote de la Pico W (cuentas crudas) de forma idempotente.
 * @param {object} sesion    la sesión abierta, de origen 'hw'
 * @param {Array}  lecturas  [{seq, xMM, yMM, zMM, raw:{x,y,z}, ts_ms}]
 * @returns {Promise<{aceptadas: number, duplicadas: number, rechazadas: {seq, error}[]}>}
 * @throws {ErrorIngesta} 409 si la sesión se cerró
 */
export async function registrarLoteDispositivo(sesion, lecturas) {
  const ctx = {
    placaMM: tamanoPlacaMM(),
    zLevels: mallaParaPaso(sesion.paso_mm).zLevels,
    sensor:  obtener('sensor'),   // no cambia con la sesión abierta (409 en PUT /configuracion)
  };
  const timestamp = new Date();
  const r = await Medicion.insertarLote(sesion.id, guardados => clasificarLote(lecturas, guardados, ctx), timestamp);
  if (!r.abierta) throw new ErrorIngesta(409, `La sesión ${sesion.id} ya no está abierta`);

  let mayor = await ultimoSeq(sesion.id);
  for (const m of r.nuevas) {
    if (m.seq > mayor) mayor = m.seq;
    difundir('medicion', paraDifundir(sesion.id, m, timestamp));
  }
  ultimoSeqPorSesion.set(sesion.id, mayor);

  return { aceptadas: r.nuevas.length, duplicadas: r.duplicadas.length, rechazadas: r.rechazadas };
}
