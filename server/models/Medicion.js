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

/**
 * Crea una nueva sesión en la BD y devuelve su ID.
 * @param {string} modo  'DC' o 'AC'
 * @returns {Promise<number>} ID de la sesión recién creada
 */
export async function crearSesion(modo) {
  const [result] = await pool.execute(
    'INSERT INTO sesiones (modo, iniciada_en) VALUES (?, UTC_TIMESTAMP())',
    [modo]
  );
  return result.insertId;
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
 * Obtiene todas las sesiones ordenadas de más reciente a más antigua.
 * Se usa en la página "Mediciones Pasadas".
 * @returns {Promise<Array>} filas de la tabla sesiones con estadísticas
 */
export async function obtenerSesiones() {
  const [rows] = await pool.execute(
    `SELECT
       s.id,
       s.modo,
       s.iniciada_en,
       s.terminada_en,
       COUNT(m.id)       AS total_puntos,
       MAX(m.magnitud)   AS max_magnitud,
       MIN(m.magnitud)   AS min_magnitud
     FROM sesiones s
     LEFT JOIN mediciones m ON m.sesion_id = s.id
     GROUP BY s.id
     ORDER BY s.iniciada_en DESC, s.id DESC`
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
