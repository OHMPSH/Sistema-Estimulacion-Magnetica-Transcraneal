/**
 * models/Medicion.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — Recurso: Mediciones y Sesiones
 *
 * Aquí viven TODAS las consultas SQL relacionadas con mediciones.
 * El controlador nunca escribe SQL directamente; lo delega aquí.
 *
 * Tablas que maneja:
 * sesiones   — una fila por cada proceso de medición
 * mediciones — 845 filas por sesión (13×13 × 5 planos Z)
 *
 * Tiempo: todas las fechas se guardan y se leen en UTC
 * (UTC_TIMESTAMP en SQL y timezone 'Z' en el pool).
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';

// ─────────────────────────────────────────────────────────────
// SESIONES
// ─────────────────────────────────────────────────────────────

/** Columnas de una sesión que se envían al navegador */
const COLUMNAS_SESION = 'id, modo, origen, paso_mm, medio, iniciada_en, terminada_en';

/**
 * Crea una nueva sesión en la BD y devuelve su ID.
 * La regla de "una sola sesión abierta" la aplica services/sesiones.js.
 * @param {object} s  { modo: 'DC'|'AC', origen: 'sim'|'hw', pasoMM: 5|10|20, medio }
 * @returns {Promise<number>} ID de la sesión recién creada
 */
export async function crearSesion({ modo, origen, pasoMM, medio }) {
  const [result] = await pool.execute(
    `INSERT INTO sesiones (modo, origen, paso_mm, medio, iniciada_en)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
    [modo, origen, pasoMM, medio]
  );
  return result.insertId;
}

/** Una sesión completa (sin estadísticas), o null si no existe */
export async function obtenerSesion(sesionId) {
  const [rows] = await pool.execute(`SELECT ${COLUMNAS_SESION} FROM sesiones WHERE id = ?`, [sesionId]);
  return rows[0] ?? null;
}

/** Sesiones abiertas (terminada_en NULL), de la más antigua a la más nueva */
export async function obtenerSesionesAbiertas() {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNAS_SESION} FROM sesiones WHERE terminada_en IS NULL ORDER BY id ASC`
  );
  return rows;
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
 * Devuelve { id, terminada_en } de una sesión, o null si no existe.
 * @param {number} sesionId
 */
export async function obtenerEstadoSesion(sesionId) {
  const [rows] = await pool.execute(
    'SELECT id, terminada_en FROM sesiones WHERE id = ?',
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

/**
 * Obtiene las sesiones ordenadas de más reciente a más antigua.
 * Se usa en la página "Mediciones Pasadas".
 * @param {object} [filtros]  { modo?, pasoMM?, medio?, origen? } ya validados
 * @returns {Promise<Array>} filas de la tabla sesiones con estadísticas
 */
export async function obtenerSesiones(filtros = {}) {
  // Solo columnas fijas; los valores van siempre como parámetros "?"
  const condiciones = [];
  const valores = [];
  if (filtros.modo)   { condiciones.push('s.modo = ?');    valores.push(filtros.modo); }
  if (filtros.pasoMM) { condiciones.push('s.paso_mm = ?'); valores.push(filtros.pasoMM); }
  if (filtros.medio)  { condiciones.push('s.medio = ?');   valores.push(filtros.medio); }
  if (filtros.origen) { condiciones.push('s.origen = ?');  valores.push(filtros.origen); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT
       s.id,
       s.modo,
       s.origen,
       s.paso_mm,
       s.medio,
       s.iniciada_en,
       s.terminada_en,
       COUNT(m.id)       AS total_puntos,
       MAX(m.magnitud)   AS max_magnitud,
       MIN(m.magnitud)   AS min_magnitud
     FROM sesiones s
     LEFT JOIN mediciones m ON m.sesion_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY s.iniciada_en DESC, s.id DESC`,
    valores
  );
  return rows;
}

/**
 * Elimina una sesión y en cascada sus mediciones (ON DELETE CASCADE en SQL).
 * @param {number} sesionId
 * @returns {Promise<boolean>} false si la sesión no existía
 */
export async function eliminarSesion(sesionId) {
  const [result] = await pool.execute('DELETE FROM sesiones WHERE id = ?', [sesionId]);
  return result.affectedRows === 1;
}

// ─────────────────────────────────────────────────────────────
// MEDICIONES
// ─────────────────────────────────────────────────────────────

/**
 * Inserta una medición, solo si su sesión existe y sigue abierta.
 * La comprobación y el INSERT son una sola sentencia, así que una
 * medición que llega después de cerrar la sesión no se guarda.
 *
 * @param {object} m  { sesionId, xMM, yMM, zMM, bx, by, bz, magnitud, timestamp: Date }
 * @returns {Promise<boolean>} false si la sesión no existe o está cerrada
 */
export async function insertarMedicion(m) {
  const [result] = await pool.execute(
    `INSERT INTO mediciones
       (sesion_id, x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud, \`timestamp\`)
     SELECT id, ?, ?, ?, ?, ?, ?, ?, ?
       FROM sesiones
      WHERE id = ? AND terminada_en IS NULL`,
    [m.xMM, m.yMM, m.zMM, m.bx, m.by, m.bz, m.magnitud, m.timestamp, m.sesionId]
  );
  return result.affectedRows === 1;
}

/**
 * Devuelve todas las mediciones de una sesión específica.
 * Útil para el botón "Exportar CSV".
 * @param {number} sesionId
 * @returns {Promise<Array>}
 */
export async function obtenerMedicionesDeSesion(sesionId) {
  const [rows] = await pool.execute(
    `SELECT x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud, \`timestamp\`
     FROM mediciones
     WHERE sesion_id = ?
     ORDER BY \`timestamp\` ASC, id ASC`,
    [sesionId]
  );
  return rows;
}
