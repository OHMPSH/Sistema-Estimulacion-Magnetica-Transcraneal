/**
 * models/SesionLogin.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — Recurso: sesiones de login
 *
 * Todo el SQL de la tabla `sesiones_login` (las sesiones de USUARIO
 * del dashboard; las sesiones de medición están en Medicion.js).
 *
 * El id de cada fila es el SHA-256 del token de la cookie, nunca el
 * token. Las horas las pone la base de datos, en UTC.
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';
import { normalizarPreferencias } from './Usuario.js';

/**
 * Crea una sesión de login.
 * @param {object} s  { id, usuarioId, duracionS, ip, userAgent }
 */
export async function crear({ id, usuarioId, duracionS, ip, userAgent }) {
  await pool.execute(
    `INSERT INTO sesiones_login
       (id, usuario_id, creada_en, expira_en, ultimo_uso, ip, user_agent)
     VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? SECOND, UTC_TIMESTAMP(), ?, ?)`,
    [id, usuarioId, duracionS, ip ?? null, userAgent ?? null]
  );
}

/**
 * Busca una sesión vigente (no expirada) de un usuario activo.
 * @param {string} id  SHA-256 del token
 * @returns {Promise<object|null>} { usuario: {...}, segundosSinUso } o null
 */
export async function buscarVigenteConUsuario(id) {
  const [filas] = await pool.execute(
    `SELECT u.id, u.usuario, u.nombre, u.rol, u.debe_cambiar_password, u.preferencias,
            TIMESTAMPDIFF(SECOND, s.ultimo_uso, UTC_TIMESTAMP()) AS segundos_sin_uso
       FROM sesiones_login s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = ?
        AND s.expira_en > UTC_TIMESTAMP()
        AND u.activo = 1`,
    [id]
  );
  const fila = filas[0];
  if (!fila) return null;
  return {
    usuario: {
      id:                    fila.id,
      usuario:               fila.usuario,
      nombre:                fila.nombre,
      rol:                   fila.rol,
      debe_cambiar_password: Boolean(fila.debe_cambiar_password),
      preferencias:          normalizarPreferencias(fila.preferencias),
    },
    segundosSinUso: Number(fila.segundos_sin_uso),
  };
}

/** Extiende la sesión: expira dentro de `duracionS` segundos a partir de ahora */
export async function renovar(id, duracionS) {
  await pool.execute(
    `UPDATE sesiones_login
        SET expira_en = UTC_TIMESTAMP() + INTERVAL ? SECOND, ultimo_uso = UTC_TIMESTAMP()
      WHERE id = ?`,
    [duracionS, id]
  );
}

/** Borra una sesión (logout) */
export async function borrar(id) {
  const [resultado] = await pool.execute('DELETE FROM sesiones_login WHERE id = ?', [id]);
  return resultado.affectedRows === 1;
}

/**
 * Borra todas las sesiones de un usuario.
 * @param {number} usuarioId
 * @param {string|null} exceptoId  una sesión que se conserva (la actual), si se indica
 * @returns {Promise<number>} cuántas se borraron
 */
export async function borrarDeUsuario(usuarioId, exceptoId = null) {
  const [resultado] = exceptoId
    ? await pool.execute('DELETE FROM sesiones_login WHERE usuario_id = ? AND id <> ?', [usuarioId, exceptoId])
    : await pool.execute('DELETE FROM sesiones_login WHERE usuario_id = ?', [usuarioId]);
  return resultado.affectedRows;
}

/**
 * Borra las sesiones que ya expiraron.
 * @returns {Promise<number>} cuántas se borraron
 */
export async function limpiarExpiradas() {
  const [resultado] = await pool.execute(
    'DELETE FROM sesiones_login WHERE expira_en <= UTC_TIMESTAMP()'
  );
  return resultado.affectedRows;
}
