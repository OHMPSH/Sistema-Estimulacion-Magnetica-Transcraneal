/**
 * models/Medicion.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — Recurso: Mediciones y Sesiones
 *
 * Aquí viven TODAS las consultas SQL relacionadas con mediciones.
 * El controlador nunca escribe SQL directamente; lo delega aquí.
 * Esto facilita cambiar de base de datos en el futuro sin tocar
 * la lógica de negocio.
 *
 * Tablas que maneja:
 * sesiones   — una fila por cada proceso de medición
 * mediciones — 845 filas por sesión (13×13 × 5 planos Z)
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';

// ─────────────────────────────────────────────────────────────
// SESIONES
// ─────────────────────────────────────────────────────────────

/**
 * Crea una nueva sesión en la BD y devuelve su ID.
 * @param {string} modo  'DC' o 'AC'
 * @returns {number}     ID de la sesión recién creada
 */
export async function crearSesion(modo) {
  // INSERT devuelve un objeto; insertId contiene el ID autogenerado
  const [result] = await pool.execute(
    'INSERT INTO sesiones (modo, iniciada_en) VALUES (?, NOW())',
    [modo]
  );
  return result.insertId;
}

/**
 * Marca una sesión como terminada guardando la fecha/hora de fin.
 * @param {number} sesionId
 */
export async function cerrarSesion(sesionId) {
  await pool.execute(
    'UPDATE sesiones SET terminada_en = NOW() WHERE id = ?',
    [sesionId]
  );
}

/**
 * Obtiene todas las sesiones ordenadas de más reciente a más antigua.
 * Se usa en la página "Mediciones Pasadas".
 * @returns {Array} filas de la tabla sesiones
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
     ORDER BY s.iniciada_en DESC`
  );
  return rows;
}

/**
 * Elimina una sesión y en cascada sus mediciones (ON DELETE CASCADE en SQL).
 * @param {number} sesionId
 */
export async function eliminarSesion(sesionId) {
  await pool.execute('DELETE FROM sesiones WHERE id = ?', [sesionId]);
}

// ─────────────────────────────────────────────────────────────
// MEDICIONES
// ─────────────────────────────────────────────────────────────

/**
 * Inserta una medición individual ligada a una sesión.
 * @param {number} sesionId  ID de la sesión activa
 * @param {object} m         Objeto con los datos del sensor
 */
export async function insertarMedicion(sesionId, m) {
  // Formatear la fecha para MariaDB: Cambiar la 'T' por un espacio y quitar la 'Z'
  const sqlTimestamp = m.timestamp.replace('T', ' ').replace('Z', '');

  await pool.execute(
    `INSERT INTO mediciones
       (sesion_id, x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud, \`timestamp\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sesionId, m.xMM, m.yMM, m.zMM, m.bx, m.by, m.bz, m.magnitud, sqlTimestamp]
  );
}

/**
 * Devuelve todas las mediciones de una sesión específica.
 * Útil para el botón "Exportar CSV".
 * @param {number} sesionId
 * @returns {Array}
 */
export async function obtenerMedicionesDeSesion(sesionId) {
  const [rows] = await pool.execute(
    `SELECT x_mm, y_mm, z_mm, \`bx\`, \`by\`, \`bz\`, magnitud, \`timestamp\`
     FROM mediciones
     WHERE sesion_id = ?
     ORDER BY timestamp ASC`,
    [sesionId]
  );
  return rows;
}