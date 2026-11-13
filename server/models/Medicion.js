/**
 * models/Medicion.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — Recurso: Mediciones y Sesiones
 *
 * Aquí viven TODAS las consultas SQL relacionadas con mediciones.
 * El controlador nunca escribe SQL directamente; lo delega aquí.
 *
 * Tablas que maneja:
 * sesiones   — una fila por cada proceso de medición, con sus metadatos
 *              de reproducibilidad y el borrado lógico (Fase 5)
 * mediciones — 845 filas por sesión con el paso de 5 mm (13×13 × 5 planos Z)
 *
 * Tiempo: todas las fechas se guardan y se leen en UTC
 * (UTC_TIMESTAMP en SQL y timezone 'Z' en el pool).
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';
import { indicePlano } from '../services/geometria.js';

// ─────────────────────────────────────────────────────────────
// SESIONES
// ─────────────────────────────────────────────────────────────

/**
 * Según la versión, mysql2 entrega las columnas JSON de MariaDB ya
 * convertidas o como texto. Se aceptan los dos casos.
 */
function leerJSON(v) {
  if (typeof v !== 'string') return v ?? null;
  try { return JSON.parse(v); } catch { return null; }
}

/** Columnas de una sesión que se envían al navegador (sin las copias de configuración) */
const COLUMNAS_SESION = `s.id, s.usuario_id, u.nombre AS iniciada_por, s.modo, s.origen, s.paso_mm, s.medio,
  s.zona_x_mm, s.zona_y_mm, s.zona_z_mm,
  s.iniciada_en, s.terminada_en, s.notas, s.puntos_esperados, s.puntos_recibidos, s.huecos,
  s.version_software, s.version_firmware, s.eliminada_en`;

const COLUMNAS_CONFIG = 's.config_barrido, s.config_sensor, s.config_simulacion';

const DESDE_SESIONES = 'FROM sesiones s LEFT JOIN usuarios u ON u.id = s.usuario_id';

/** Convierte las columnas JSON de una fila de sesión */
function normalizarSesion(fila) {
  if (!fila) return null;
  const r = { ...fila, huecos: leerJSON(fila.huecos) };
  // paso_mm y zona_*_mm son DECIMAL: mysql2 los entrega como texto ("5.0")
  for (const c of ['paso_mm', 'zona_x_mm', 'zona_y_mm', 'zona_z_mm']) {
    if (r[c] !== undefined && r[c] !== null) r[c] = Number(r[c]);
  }
  for (const c of ['config_barrido', 'config_sensor', 'config_simulacion']) {
    if (c in r) r[c] = leerJSON(r[c]);
  }
  return r;
}

/**
 * Crea una nueva sesión en la BD y devuelve su ID.
 * La regla de "una sola sesión abierta" la aplica services/sesiones.js.
 * @param {object} s  { modo, origen, pasoMM, medio, zona: {x,y,z}, usuarioId, puntosEsperados,
 *                      configBarrido, configSensor, configSimulacion, versionSoftware, versionFirmware }
 * @returns {Promise<number>} ID de la sesión recién creada
 */
export async function crearSesion(s) {
  const json = v => (v === null || v === undefined ? null : JSON.stringify(v));
  const [result] = await pool.execute(
    `INSERT INTO sesiones (usuario_id, modo, origen, paso_mm, medio, zona_x_mm, zona_y_mm, zona_z_mm,
                           iniciada_en, puntos_esperados,
                           config_barrido, config_sensor, config_simulacion, version_software, version_firmware)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?)`,
    [s.usuarioId ?? null, s.modo, s.origen, s.pasoMM, s.medio, s.zona.x, s.zona.y, s.zona.z, s.puntosEsperados ?? null,
     json(s.configBarrido), json(s.configSensor), json(s.configSimulacion),
     s.versionSoftware ?? null, s.versionFirmware ?? null]
  );
  return result.insertId;
}

/**
 * Una sesión (sin estadísticas), o null si no existe.
 * @param {number} sesionId
 * @param {{ conConfig?: boolean, incluirEliminada?: boolean }} [op]
 */
export async function obtenerSesion(sesionId, { conConfig = false, incluirEliminada = true } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNAS_SESION}${conConfig ? `, ${COLUMNAS_CONFIG}` : ''}
       ${DESDE_SESIONES}
      WHERE s.id = ? ${incluirEliminada ? '' : 'AND s.eliminada_en IS NULL'}`,
    [sesionId]
  );
  return normalizarSesion(rows[0]);
}

/** Sesiones abiertas (terminada_en NULL), de la más antigua a la más nueva */
export async function obtenerSesionesAbiertas() {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNAS_SESION}, ${COLUMNAS_CONFIG} ${DESDE_SESIONES} WHERE s.terminada_en IS NULL ORDER BY s.id ASC`
  );
  return rows.map(normalizarSesion);
}

/**
 * Cierra una sesión que quedó abierta de una ejecución anterior del
 * servidor. La hora de cierre es la de su última medición (o la de
 * inicio si no tiene ninguna), no la hora actual: así la duración del
 * historial refleja lo que de verdad se midió.
 * @returns {Promise<boolean>}
 */
export async function cerrarSesionHuerfana(sesionId) {
  const [result] = await pool.execute(
    `UPDATE sesiones s
        SET s.terminada_en = COALESCE(
              (SELECT MAX(m.\`timestamp\`) FROM mediciones m WHERE m.sesion_id = s.id),
              s.iniciada_en)
      WHERE s.id = ? AND s.terminada_en IS NULL`,
    [sesionId]
  );
  return result.affectedRows === 1;
}

/**
 * Devuelve { id, terminada_en, eliminada_en, usuario_id } de una sesión, o null si no existe.
 * @param {number} sesionId
 */
export async function obtenerEstadoSesion(sesionId) {
  const [rows] = await pool.execute(
    'SELECT id, terminada_en, eliminada_en, usuario_id FROM sesiones WHERE id = ?',
    [sesionId]
  );
  return rows[0] ?? null;
}

/**
 * Marca una sesión abierta como terminada.
 * @param {number} sesionId
 * @returns {Promise<boolean>} false si no existe o ya estaba cerrada
 */
export async function cerrarSesion(sesionId) {
  const [result] = await pool.execute(
    'UPDATE sesiones SET terminada_en = UTC_TIMESTAMP() WHERE id = ? AND terminada_en IS NULL',
    [sesionId]
  );
  return result.affectedRows === 1;
}

/** Cuántas filas tiene la sesión y las posiciones de sus lecturas válidas (no saturadas) */
export async function resumenDeLecturas(sesionId) {
  const [[{ total }]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM mediciones WHERE sesion_id = ?', [sesionId]);
  const [posiciones] = await pool.execute(
    'SELECT DISTINCT x_mm, y_mm, z_mm FROM mediciones WHERE sesion_id = ? AND saturado = 0', [sesionId]);
  return { total: Number(total), posiciones };
}

/** Guarda lo que se calcula al cerrar: puntos recibidos y huecos */
export async function guardarCierre(sesionId, { puntosRecibidos, huecos, puntosEsperados }) {
  await pool.execute(
    `UPDATE sesiones
        SET puntos_recibidos = ?, huecos = ?, puntos_esperados = COALESCE(puntos_esperados, ?)
      WHERE id = ?`,
    [puntosRecibidos, JSON.stringify(huecos), puntosEsperados ?? null, sesionId]
  );
}

/**
 * Obtiene las sesiones ordenadas de más reciente a más antigua.
 * Se usa en la página "Mediciones Pasadas".
 * @param {object} [filtros]  { modo?, pasoMM?, medio?, origen?, incluirEliminadas? } ya validados
 * @returns {Promise<Array>} filas de la tabla sesiones con estadísticas
 */
export async function obtenerSesiones(filtros = {}) {
  // Solo columnas fijas; los valores van siempre como parámetros "?"
  const condiciones = [];
  const valores = [];
  if (!filtros.incluirEliminadas) condiciones.push('s.eliminada_en IS NULL');
  if (filtros.modo)   { condiciones.push('s.modo = ?');    valores.push(filtros.modo); }
  if (filtros.pasoMM) { condiciones.push('s.paso_mm = ?'); valores.push(filtros.pasoMM); }
  if (filtros.medio)  { condiciones.push('s.medio = ?');   valores.push(filtros.medio); }
  if (filtros.origen) { condiciones.push('s.origen = ?');  valores.push(filtros.origen); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT
       ${COLUMNAS_SESION},
       COUNT(m.id)       AS total_puntos,
       -- Las lecturas saturadas no cuentan para el máximo ni el mínimo
       -- (su |B| es NULL, y el CASE lo deja explícito)
       MAX(CASE WHEN m.saturado = 0 THEN m.magnitud END) AS max_magnitud,
       MIN(CASE WHEN m.saturado = 0 THEN m.magnitud END) AS min_magnitud,
       CAST(COALESCE(SUM(m.saturado), 0) AS UNSIGNED) AS saturadas
     ${DESDE_SESIONES}
     LEFT JOIN mediciones m ON m.sesion_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY s.iniciada_en DESC, s.id DESC`,
    valores
  );
  return rows.map(normalizarSesion);
}

/**
 * Borrado lógico: pone eliminada_en. Las mediciones se conservan.
 * @returns {Promise<boolean>} false si no existe o ya estaba eliminada
 */
export async function marcarEliminada(sesionId) {
  const [result] = await pool.execute(
    'UPDATE sesiones SET eliminada_en = UTC_TIMESTAMP() WHERE id = ? AND eliminada_en IS NULL', [sesionId]);
  return result.affectedRows === 1;
}

/** Quita el borrado lógico. false si no existe o no estaba eliminada */
export async function restaurar(sesionId) {
  const [result] = await pool.execute(
    'UPDATE sesiones SET eliminada_en = NULL WHERE id = ? AND eliminada_en IS NOT NULL', [sesionId]);
  return result.affectedRows === 1;
}

/** Anota el firmware de la Pico en una sesión que todavía no lo tiene */
export async function anotarFirmware(sesionId, firmware) {
  await pool.execute(
    'UPDATE sesiones SET version_firmware = ? WHERE id = ? AND version_firmware IS NULL', [firmware, sesionId]);
}

/** Cambia las notas de una sesión (NULL si el texto queda vacío) */
export async function actualizarNotas(sesionId, notas) {
  const [result] = await pool.execute(
    'UPDATE sesiones SET notas = ? WHERE id = ? AND eliminada_en IS NULL', [notas === '' ? null : notas, sesionId]);
  return result.affectedRows === 1;
}

// ─────────────────────────────────────────────────────────────
// MEDICIONES
// ─────────────────────────────────────────────────────────────

/** Columnas que se insertan por cada medición, en orden */
const COLUMNAS_INSERT = `(sesion_id, seq, x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud,
   raw_x, raw_y, raw_z, saturado, \`timestamp\`, ts_dispositivo)`;

const valoresDe = (sesionId, m) => [
  sesionId, m.seq ?? null, m.xMM, m.yMM, m.zMM, m.bx, m.by, m.bz, m.magnitud,
  m.raw?.x ?? null, m.raw?.y ?? null, m.raw?.z ?? null, m.saturado ? 1 : 0,
  m.timestamp, m.tsDispositivo ?? null,
];

/**
 * Inserta una medición, solo si su sesión existe y sigue abierta.
 * La comprobación y el INSERT son una sola sentencia, así que una
 * medición que llega después de cerrar la sesión no se guarda.
 * Si el seq ya existe en la sesión, no inserta nada (idempotente).
 *
 * @param {object} m  { sesionId, seq, xMM, yMM, zMM, bx, by, bz, magnitud, raw?, saturado, timestamp: Date, tsDispositivo? }
 * @returns {Promise<boolean>} false si la sesión no existe, está cerrada o el seq ya estaba
 */
export async function insertarMedicion(m) {
  const [sesionId, ...resto] = valoresDe(m.sesionId, m);
  const [result] = await pool.execute(
    `INSERT INTO mediciones ${COLUMNAS_INSERT}
     SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM sesiones
      WHERE id = ? AND terminada_en IS NULL
     ON DUPLICATE KEY UPDATE mediciones.id = mediciones.id`,
    [...resto, sesionId]
  );
  return result.affectedRows === 1;
}

/**
 * Inserta un lote de la Pico W de forma idempotente, en una transacción:
 *   1. bloquea la fila de la sesión (FOR UPDATE) y comprueba que siga
 *      abierta; así un cierre simultáneo espera a que el lote termine, y
 *      dos lotes de la misma sesión no se cruzan;
 *   2. lee qué seq de la sesión ya existen;
 *   3. llama a `clasificar(seqGuardados)` para separar nuevas,
 *      duplicadas y rechazadas, e inserta solo las nuevas.
 *
 * @param {number} sesionId
 * @param {(seqGuardados: Set<number>) => {nuevas: object[], duplicadas: number[], rechazadas: object[]}} clasificar
 * @param {Date} timestamp  hora de recepción (la misma para todo el lote)
 * @returns {Promise<{abierta: boolean, nuevas, duplicadas, rechazadas}>}
 */
export async function insertarLote(sesionId, clasificar, timestamp) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sesion] = await conn.execute(
      'SELECT id FROM sesiones WHERE id = ? AND terminada_en IS NULL FOR UPDATE', [sesionId]);
    if (sesion.length === 0) {
      await conn.rollback();
      return { abierta: false, nuevas: [], duplicadas: [], rechazadas: [] };
    }
    const [filas] = await conn.execute(
      'SELECT seq FROM mediciones WHERE sesion_id = ? AND seq IS NOT NULL', [sesionId]);
    const resultado = clasificar(new Set(filas.map(f => f.seq)));

    if (resultado.nuevas.length > 0) {
      const marcadores = resultado.nuevas.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const valores = resultado.nuevas.flatMap(m => valoresDe(sesionId, { ...m, timestamp }));
      await conn.execute(
        `INSERT INTO mediciones ${COLUMNAS_INSERT} VALUES ${marcadores} ON DUPLICATE KEY UPDATE mediciones.id = mediciones.id`,
        valores
      );
    }
    await conn.commit();
    // seq distintos guardados tras este lote (las nuevas ya vienen sin duplicados)
    return { abierta: true, ...resultado, totalSeq: filas.length + resultado.nuevas.length };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/** Mayor seq guardado en una sesión (0 si no hay) */
export async function ultimoSeq(sesionId) {
  const [filas] = await pool.execute(
    'SELECT COALESCE(MAX(seq), 0) AS ultimo FROM mediciones WHERE sesion_id = ?', [sesionId]);
  return Number(filas[0].ultimo);
}

/**
 * Devuelve todas las mediciones de una sesión específica.
 * Útil para el botón "Exportar CSV".
 * @param {number} sesionId
 * @returns {Promise<Array>}
 */
export async function obtenerMedicionesDeSesion(sesionId) {
  const [rows] = await pool.execute(
    `SELECT seq, x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud,
            raw_x, raw_y, raw_z, saturado, \`timestamp\`, ts_dispositivo
     FROM mediciones
     WHERE sesion_id = ?
     ORDER BY seq IS NULL, seq ASC, id ASC`,
    [sesionId]
  );
  return rows.map(r => ({ ...r, saturado: Boolean(r.saturado) }));
}

/**
 * Mediciones de la sesión en el mismo formato que el evento SSE
 * `medicion` (para GET /sesiones/activa: quien abre el dashboard tarde
 * dibuja lo que ya se midió).
 */
export async function medicionesComoEventos(sesionId, zLevels) {
  const filas = await obtenerMedicionesDeSesion(sesionId);
  return filas.map(r => ({
    sesionId,
    seq: r.seq,
    xMM: r.x_mm, yMM: r.y_mm, zMM: r.z_mm, zIdx: indicePlano(zLevels, r.z_mm),
    bx: r.bx, by: r.by, bz: r.bz, magnitud: r.magnitud,
    saturado: r.saturado,
    raw: r.raw_x === null && r.raw_y === null && r.raw_z === null ? null : { x: r.raw_x, y: r.raw_y, z: r.raw_z },
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
    tsDispositivo: r.ts_dispositivo instanceof Date ? r.ts_dispositivo.toISOString() : r.ts_dispositivo,
  }));
}

/**
 * Recorre las mediciones de una sesión como un stream (para el CSV de
 * sesiones grandes: no se cargan todas en memoria).
 * Uso:  for await (const fila of streamMediciones(id)) { ... }
 * Ordenadas por seq y luego por id.
 */
export function streamMediciones(sesionId) {
  return pool.pool
    .query(
      `SELECT seq, x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud,
              raw_x, raw_y, raw_z, saturado, \`timestamp\`, ts_dispositivo
         FROM mediciones
        WHERE sesion_id = ?
        ORDER BY seq IS NULL, seq ASC, id ASC`,
      [sesionId]
    )
    .stream({ highWaterMark: 200 });
}
