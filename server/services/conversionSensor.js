/**
 * services/conversionSensor.js
 * ─────────────────────────────────────────────────────────────
 * Lecturas de la Pico W (Fase 4): validación, conversión de cuentas
 * del HMC5883L a µT e idempotencia de los lotes. Funciones puras, sin
 * base de datos (se prueban con node:test).
 *
 * Conversión, por eje:
 *     µT = cuentas / lsb_por_ga × 100 − offset_ut[eje]
 *
 * Desborde: el HMC5883L devuelve −4096 en el eje que se sale de rango.
 * Decisión (Fase 4): ese eje NO se convierte y se guarda como NULL;
 * se conserva el crudo (−4096) y la lectura se marca saturado = 1.
 * |B| también queda NULL, porque no se puede calcular sin ese eje, y
 * las lecturas saturadas no cuentan para el MAX ni el MIN del historial.
 * ─────────────────────────────────────────────────────────────
 */

/** Valor del registro de un eje cuando se desborda */
export const DESBORDE = -4096;
/** Rango aceptado para las cuentas crudas */
export const CRUDO_MIN = -4096;
export const CRUDO_MAX = 2047;
/** Máximo de lecturas en un lote de la Pico */
export const MAX_LECTURAS_LOTE = 200;

const EJES = ['x', 'y', 'z'];
const esNumero = v => typeof v === 'number' && Number.isFinite(v);
const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** ¿Es un entero válido para el registro de un eje? */
export const crudoValido = v => Number.isInteger(v) && v >= CRUDO_MIN && v <= CRUDO_MAX;

/**
 * Convierte las cuentas crudas a µT con la configuración del sensor.
 * @param {{x:number,y:number,z:number}} raw  cuentas ya validadas
 * @param {{lsb_por_ga:number, offset_ut:{x,y,z}}} sensor
 * @returns {{ bx: number|null, by: number|null, bz: number|null, magnitud: number|null, saturado: boolean }}
 */
export function convertirCrudo(raw, sensor) {
  const ut = {};
  let saturado = false;
  for (const eje of EJES) {
    if (raw[eje] === DESBORDE) {
      ut[eje] = null;
      saturado = true;
    } else {
      ut[eje] = (raw[eje] / sensor.lsb_por_ga) * 100 - (sensor.offset_ut?.[eje] ?? 0);
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
 * x e y deben caer en la placa; z debe ser uno de los planos de la
 * sesión (según su paso). Es la misma regla para el simulador y la Pico.
 * @returns {string[]} errores (vacío si es válida)
 */
export function erroresDePosicion({ xMM, yMM, zMM }, placaMM, zLevels) {
  const errores = [];
  for (const [nombre, v] of [['xMM', xMM], ['yMM', yMM]]) {
    if (!esNumero(v)) errores.push(`${nombre} debe ser un número`);
    else if (v < 0 || v > placaMM) errores.push(`${nombre} fuera de la placa (0 a ${placaMM} mm): ${v}`);
  }
  if (!esNumero(zMM)) errores.push('zMM debe ser un número');
  else if (!zLevels.includes(zMM)) {
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
 * @param {object} l  { seq, xMM, yMM, zMM, raw:{x,y,z}, ts_ms? }
 * @param {object} ctx { placaMM, zLevels, sensor }
 * @returns {{ errores: string[], lectura?: object }}
 *   lectura = { seq, xMM, yMM, zMM, zIdx, raw, bx, by, bz, magnitud, saturado, tsDispositivo: Date|null }
 */
export function validarLecturaDispositivo(l, { placaMM, zLevels, sensor }) {
  if (!esObjeto(l)) return { errores: ['La lectura debe ser un objeto'] };
  const errores = [];
  if (!Number.isSafeInteger(l.seq) || l.seq <= 0) errores.push('seq debe ser un entero positivo');
  errores.push(...erroresDePosicion(l, placaMM, zLevels));

  if (!esObjeto(l.raw)) {
    errores.push('raw debe ser un objeto {x, y, z} con las cuentas del sensor');
  } else {
    for (const eje of EJES) {
      if (!crudoValido(l.raw[eje])) errores.push(`raw.${eje} debe ser un entero entre ${CRUDO_MIN} y ${CRUDO_MAX}`);
    }
  }
  // ts_ms es opcional (0 o ausente = la Pico aún no sincronizó su reloj)
  let tsDispositivo = null;
  if (l.ts_ms !== undefined && l.ts_ms !== null && l.ts_ms !== 0) {
    if (!tsDispositivoValido(l.ts_ms)) errores.push('ts_ms debe ser un epoch en milisegundos (UTC, entre 2020 y 2100)');
    else tsDispositivo = new Date(l.ts_ms);
  }
  if (errores.length > 0) return { errores };

  const convertida = convertirCrudo(l.raw, sensor);
  return {
    errores: [],
    lectura: {
      seq: l.seq, xMM: l.xMM, yMM: l.yMM, zMM: l.zMM, zIdx: zLevels.indexOf(l.zMM),
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
 * @param {object} ctx           { placaMM, zLevels, sensor }
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
 * Lo contrario de convertirCrudo, para el emulador y las pruebas:
 * µT → cuentas, redondeadas y con desborde si pasan de 2047 o de −2048.
 */
export function utACrudo(ut, sensor, eje = 'x') {
  const cuentas = Math.round(((ut + (sensor.offset_ut?.[eje] ?? 0)) * sensor.lsb_por_ga) / 100);
  return cuentas > CRUDO_MAX || cuentas < -2048 ? DESBORDE : cuentas;
}
