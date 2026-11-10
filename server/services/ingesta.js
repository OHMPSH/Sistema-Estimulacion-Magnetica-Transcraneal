/**
 * services/ingesta.js
 * ─────────────────────────────────────────────────────────────
 * Única puerta de entrada de las mediciones a la base de datos.
 * La usan POST /mediciones (controlador) y el simulador del servidor;
 * en la Fase 4 la usará también la ingesta de la Pico W.
 *
 * registrarMedicion(sesion, lectura):
 *   1. valida la posición contra la malla de la sesión (su paso) y el
 *      campo contra el rango del sensor vigente;
 *   2. calcula |B| = √(Bx² + By² + Bz²), sin redondear;
 *   3. inserta con la hora del servidor en UTC, solo si la sesión
 *      sigue abierta;
 *   4. difunde el evento SSE `medicion`.
 *
 * Si algo falla lanza un ErrorIngesta con el código HTTP adecuado
 * (404, 409 o 422), que el controlador traduce a la respuesta.
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';
import { tamanoPlacaMM, mallaParaPaso, limiteCampoUT } from '../config/barrido.js';
import { difundir } from './tiempoReal.js';

export class ErrorIngesta extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.status = status;
    this.errores = errores ?? [mensaje];
  }
}

/**
 * Guarda y difunde una medición.
 * @param {object} sesion   la sesión abierta { id, paso_mm, ... }
 * @param {object} lectura  { xMM, yMM, zMM, bx, by, bz } en mm y µT
 * @returns {Promise<object>} la medición tal como se difundió
 * @throws {ErrorIngesta}
 */
export async function registrarMedicion(sesion, { xMM, yMM, zMM, bx, by, bz }) {
  const errores = [];
  const placa = tamanoPlacaMM();
  for (const [nombre, v] of [['xMM', xMM], ['yMM', yMM]]) {
    if (v < 0 || v > placa) errores.push(`${nombre} fuera de la placa (0 a ${placa} mm): ${v}`);
  }

  const malla = mallaParaPaso(sesion.paso_mm);
  const zIdx = malla.zLevels.indexOf(zMM);
  if (zIdx === -1) {
    errores.push(`zMM debe ser uno de los planos de la sesión (paso ${sesion.paso_mm} mm): ${malla.zLevels.join(', ')} mm (recibido: ${zMM})`);
  }

  const limite = limiteCampoUT();
  for (const [nombre, v] of [['bx', bx], ['by', by], ['bz', bz]]) {
    if (Math.abs(v) > limite) errores.push(`${nombre} fuera del rango del sensor (±${limite} µT, saturación): ${v}`);
  }
  if (errores.length > 0) throw new ErrorIngesta(422, errores.join('; '), errores);

  const magnitud  = Math.hypot(bx, by, bz);
  const timestamp = new Date();

  const insertada = await Medicion.insertarMedicion({
    sesionId: sesion.id, xMM, yMM, zMM, bx, by, bz, magnitud, timestamp,
  });
  if (!insertada) {
    const estado = await Medicion.obtenerEstadoSesion(sesion.id);
    if (!estado) throw new ErrorIngesta(404, `La sesión ${sesion.id} no existe`);
    throw new ErrorIngesta(409, `La sesión ${sesion.id} ya está cerrada`);
  }

  const medicion = {
    sesionId: sesion.id, xMM, yMM, zMM, zIdx, bx, by, bz, magnitud,
    timestamp: timestamp.toISOString(),
  };
  difundir('medicion', medicion);
  return medicion;
}
