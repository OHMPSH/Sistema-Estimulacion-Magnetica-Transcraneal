/**
 * models/Dispositivo.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — tabla `dispositivos` (la Pico W, Fase 4).
 *
 * El token de la Pico nunca se guarda: solo su SHA-256 (token_hash).
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';

const COLUMNAS = `id, nombre, activo, creado_en, ultimo_latido, ip, firmware, rssi, uptime_s,
                  (token_hash IS NOT NULL) AS tiene_token`;

const normalizar = fila => fila && ({
  ...fila,
  activo: Boolean(fila.activo),
  tiene_token: Boolean(fila.tiene_token),
});

/**
 * El dispositivo principal (el de menor id, 'pico-w-1' por defecto).
 * El sistema tiene una sola mesa de medición, así que la interfaz y el
 * estado en línea siguen a este dispositivo.
 */
export async function obtenerPrincipal() {
  const [filas] = await pool.execute(`SELECT ${COLUMNAS} FROM dispositivos ORDER BY id ASC LIMIT 1`);
  return normalizar(filas[0] ?? null);
}

/** Dispositivo activo con ese hash de token, o null */
export async function buscarPorTokenHash(tokenHash) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS} FROM dispositivos WHERE token_hash = ? AND activo = 1`,
    [tokenHash]
  );
  return normalizar(filas[0] ?? null);
}

/** Guarda (o quita, con null) el hash del token */
export async function guardarTokenHash(id, tokenHash) {
  const [r] = await pool.execute('UPDATE dispositivos SET token_hash = ? WHERE id = ?', [tokenHash, id]);
  return r.affectedRows === 1;
}

/** Activa o desactiva el dispositivo */
export async function cambiarActivo(id, activo) {
  const [r] = await pool.execute('UPDATE dispositivos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  return r.affectedRows === 1;
}

/** Guarda el último latido */
export async function guardarLatido(id, { ultimoLatido, ip, firmware, rssi, uptimeS }) {
  await pool.execute(
    `UPDATE dispositivos
        SET ultimo_latido = ?, ip = ?, firmware = ?, rssi = ?, uptime_s = ?
      WHERE id = ?`,
    [ultimoLatido, ip ?? null, firmware ?? null, rssi ?? null, uptimeS ?? null, id]
  );
}
