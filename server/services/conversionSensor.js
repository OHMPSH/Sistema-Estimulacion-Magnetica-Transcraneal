/**
 * services/conversionSensor.js
 * ─────────────────────────────────────────────────────────────
 * Lecturas de la Pico W (Fase 4): validación, conversión de cuentas a
 * µT e idempotencia de los lotes. Funciones puras, sin base de datos
 * (se prueban con node:test).
 *
 * Dos modelos de sensor, según sensor.modelo (la copia de la sesión):
 *
 *   QMC5883P (el módulo real, por defecto desde la migración 008):
 *     raw de −32768 a 32767, µT = cuentas / cuentas_por_g × 100 − offset_ut[eje].
 *     La saturación llega como un bit (OVFL) en el campo `saturado` de la
 *     lectura; −4096 es una cuenta válida más.
 *
 *   HMC5883L (lo sigue usando firmware_hall_1d/, el Hall 49E):
 *     raw de −4096 a 2047, µT = cuentas / lsb_por_ga × 100 − offset_ut[eje].
 *     −4096 en un eje = desborde (Fase 4): ese eje queda NULL y la lectura
 *     saturado = 1.
 *
 * Con `saturado: true` en la lectura (en los dos modelos) el bit no dice
 * qué eje se pasó: bx, by, bz y |B| quedan NULL, se conservan los crudos
 * y saturado = 1. Las saturadas no cuentan para el MAX ni el MIN.
 * ─────────────────────────────────────────────────────────────
 */

import { indicePlano } from './geometria.js';
/** Valor del registro de un eje del HMC5883L cuando se desborda */
export const DESBORDE = -4096;
/** Rangos aceptados para las cuentas crudas, por modelo */
export const LIMITES_CRUDO = {
  HMC5883L: { min: -4096,  max: 2047 },
  QMC5883P: { min: -32768, max: 32767 },
};
/** Compatibilidad: los límites del HMC5883L */
export const CRUDO_MIN = LIMITES_CRUDO.HMC5883L.min;
export const CRUDO_MAX = LIMITES_CRUDO.HMC5883L.max;
/** Máximo de lecturas en un lote de la Pico */
export const MAX_LECTURAS_LOTE = 200;

const EJES = ['x', 'y', 'z'];
const esNumero = v => typeof v === 'number' && Number.isFinite(v);
const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** ¿Es el sensor un QMC5883P? (cualquier otro modelo se trata como HMC5883L) */
export const esQMC = sensor => sensor?.modelo === 'QMC5883P';

/** Cuentas por gauss del sensor: cuentas_por_g (QMC5883P) o lsb_por_ga (HMC5883L) */
export const cuentasPorGauss = sensor => (esQMC(sensor) ? sensor.cuentas_por_g : sensor.lsb_por_ga);

/** Rango de cuentas válido para el modelo del sensor */
export const limitesCrudo = sensor => (esQMC(sensor) ? LIMITES_CRUDO.QMC5883P : LIMITES_CRUDO.HMC5883L);

/** ¿Es un entero válido para el registro de un eje? (por defecto, del HMC5883L) */
export const crudoValido = (v, sensor) => {
  const { min, max } = limitesCrudo(sensor);
  return Number.isInteger(v) && v >= min && v <= max;
};

/**
 * Convierte las cuentas crudas a µT con la configuración del sensor.
 * @param {{x:number,y:number,z:number}} raw  cuentas ya validadas
 * @param {object} sensor  { modelo, cuentas_por_g | lsb_por_ga, offset_ut:{x,y,z} }
 * @param {boolean} [saturadoBit]  la lectura trae saturado = true (OVFL)
 * @returns {{ bx: number|null, by: number|null, bz: number|null, magnitud: number|null, saturado: boolean }}
 */
export function convertirCrudo(raw, sensor, saturadoBit = false) {
  if (saturadoBit) return { bx: null, by: null, bz: null, magnitud: null, saturado: true };
  const factor = cuentasPorGauss(sensor);
  const desbordeHMC = !esQMC(sensor);
  const ut = {};
  let saturado = false;
  for (const eje of EJES) {
    if (desbordeHMC && raw[eje] === DESBORDE) {
      ut[eje] = null;
      saturado = true;
    } else {
      ut[eje] = (raw[eje] / factor) * 100 - (sensor.offset_ut?.[eje] ?? 0);
    }
  }
  return {
    bx: ut.x, by: ut.y, bz: ut.z,
    magnitud: saturado ? null : Math.hypot(ut.x, ut.y, ut.z),
    saturado,
  };
}

/**
 * Valida la posición de una lectura contra la malla de la sesión.
 * x e y deben caer en la zona de la sesión; z debe ser uno de los planos de la
 * sesión (según su paso). Es la misma regla para el simulador y la Pico.
 * @returns {string[]} errores (vacío si es válida)
 */
export function erroresDePosicion({ xMM, yMM, zMM }, zona, zLevels) {
  const errores = [];
  for (const [nombre, v, max] of [['xMM', xMM, zona.x], ['yMM', yMM, zona.y]]) {
    if (!esNumero(v)) errores.push(`${nombre} debe ser un número`);
    else if (v < 0 || v > max + 1e-6) errores.push(`${nombre} fuera de la zona de la sesión (0 a ${max} mm): ${v}`);
  }
  if (!esNumero(zMM)) errores.push('zMM debe ser un número');
  else if (indicePlano(zLevels, zMM) === -1) {
    errores.push(`zMM debe ser uno de los planos de la sesión: ${zLevels.join(', ')} mm (recibido: ${zMM})`);
  }
  return errores;
}

/** Epoch en ms entre 2020 y 2100: una hora de la Pico ya sincronizada por NTP */
const TS_MIN = Date.UTC(2020, 0, 1);
const TS_MAX = Date.UTC(2100, 0, 1);
export const tsDispositivoValido = v => Number.isInteger(v) && v >= TS_MIN && v < TS_MAX;

/**
 * Valida una lectura de la Pico y la convierte.
 * @param {object} l  { seq, xMM, yMM, zMM, raw:{x,y,z}, saturado?, ts_ms? }
 * @param {object} ctx { zona: {x, y}, zLevels, sensor }
 * @returns {{ errores: string[], lectura?: object }}
 *   lectura = { seq, xMM, yMM, zMM, zIdx, raw, bx, by, bz, magnitud, saturado, tsDispositivo: Date|null }
 */
export function validarLecturaDispositivo(l, { zona, zLevels, sensor }) {
  if (!esObjeto(l)) return { errores: ['La lectura debe ser un objeto'] };
  const errores = [];
  if (!Number.isSafeInteger(l.seq) || l.seq <= 0) errores.push('seq debe ser un entero positivo');
  errores.push(...erroresDePosicion(l, zona, zLevels));

  if (!esObjeto(l.raw)) {
    errores.push('raw debe ser un objeto {x, y, z} con las cuentas del sensor');
  } else {
    const { min, max } = limitesCrudo(sensor);
    for (const eje of EJES) {
      if (!crudoValido(l.raw[eje], sensor)) errores.push(`raw.${eje} debe ser un entero entre ${min} y ${max} (${esQMC(sensor) ? 'QMC5883P' : 'HMC5883L'})`);
    }
  }
  // saturado es opcional (false por defecto): el bit OVFL del QMC5883P
  if (l.saturado !== undefined && typeof l.saturado !== 'boolean') errores.push('saturado debe ser true o false');
  // ts_ms es opcional (0 o ausente = la Pico aún no sincronizó su reloj)
  let tsDispositivo = null;
  if (l.ts_ms !== undefined && l.ts_ms !== null && l.ts_ms !== 0) {
    if (!tsDispositivoValido(l.ts_ms)) errores.push('ts_ms debe ser un epoch en milisegundos (UTC, entre 2020 y 2100)');
    else tsDispositivo = new Date(l.ts_ms);
  }
  if (errores.length > 0) return { errores };

  const convertida = convertirCrudo(l.raw, sensor, l.saturado === true);
  return {
    errores: [],
    lectura: {
      seq: l.seq, xMM: l.xMM, yMM: l.yMM, zMM: l.zMM, zIdx: indicePlano(zLevels, l.zMM),
      raw: { x: l.raw.x, y: l.raw.y, z: l.raw.z },
      ...convertida,
      tsDispositivo,
    },
  };
}

/**
 * Separa un lote en lecturas nuevas, duplicadas y rechazadas.
 * Es la lógica de la idempotencia: una lectura es duplicada si su seq
 * ya está guardado en la sesión o si aparece antes en el mismo lote.
 *
 * @param {Array} lecturas       tal como llegaron en el cuerpo
 * @param {Set<number>} seqGuardados  seq que la sesión ya tiene en la base
 * @param {object} ctx           { zona, zLevels, sensor }
 * @returns {{ nuevas: object[], duplicadas: number[], rechazadas: {seq, error}[] }}
 */
export function clasificarLote(lecturas, seqGuardados, ctx) {
  const nuevas = [];
  const duplicadas = [];
  const rechazadas = [];
  const vistos = new Set();

  for (const original of lecturas) {
    const { errores, lectura } = validarLecturaDispositivo(original, ctx);
    if (errores.length > 0) {
      const seq = esObjeto(original) && Number.isSafeInteger(original.seq) ? original.seq : null;
      rechazadas.push({ seq, error: errores.join('; ') });
      continue;
    }
    if (seqGuardados.has(lectura.seq) || vistos.has(lectura.seq)) {
      duplicadas.push(lectura.seq);
      continue;
    }
    vistos.add(lectura.seq);
    nuevas.push(lectura);
  }
  return { nuevas, duplicadas, rechazadas };
}

/**
 * ¿Parece un lote de «cuentas HMC» llegado con el modelo QMC5883P? Es la
 * huella del firmware del Hall 49E (firmware_hall_1d/) cuando nadie puso
 * el modelo HMC5883L: todas las cuentas caben en −4096..2047 y alguna vale
 * exactamente −4096 (su desborde). Con un QMC5883P real es muy improbable.
 * Solo sirve para avisar en el log; no rechaza nada.
 */
export function pareceLoteHMC(lecturas, sensor) {
  if (!esQMC(sensor) || !Array.isArray(lecturas)) return false;
  let hayDesborde = false;
  for (const l of lecturas) {
    if (!esObjeto(l?.raw)) continue;
    for (const eje of EJES) {
      const v = l.raw[eje];
      if (!Number.isInteger(v)) continue;
      if (v < LIMITES_CRUDO.HMC5883L.min || v > LIMITES_CRUDO.HMC5883L.max) return false;
      if (v === DESBORDE) hayDesborde = true;
    }
  }
  return hayDesborde;
}

/**
 * Lo contrario de convertirCrudo, para el emulador, el simulador y las pruebas:
 * µT → cuentas redondeadas.
 *   HMC5883L: −4096 (desborde) si pasan de 2047 o de −2048.
 *   QMC5883P: recortadas a −32768..32767 (la saturación la marca el bit
 *             aparte, en el campo saturado de la lectura).
 */
export function utACrudo(ut, sensor, eje = 'x') {
  const cuentas = Math.round(((ut + (sensor.offset_ut?.[eje] ?? 0)) * cuentasPorGauss(sensor)) / 100);
  if (esQMC(sensor)) return Math.max(LIMITES_CRUDO.QMC5883P.min, Math.min(LIMITES_CRUDO.QMC5883P.max, cuentas));
  return cuentas > CRUDO_MAX || cuentas < -2048 ? DESBORDE : cuentas;
}
