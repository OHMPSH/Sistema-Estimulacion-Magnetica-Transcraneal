/**
 * models/Configuracion.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — tabla `configuracion` (clave → valor JSON).
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';

/**
 * Según la versión, mysql2 entrega la columna JSON ya convertida
 * (objeto, o el texto "simulacion" sin comillas) o como el texto JSON
 * original ('"simulacion"', '{...}'). Se aceptan los dos casos.
 */
function leerValor(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

/** Todas las claves: [{ clave, valor, actualizado_en, actualizado_por }] */
export async function obtenerTodas() {
  const [filas] = await pool.execute(
    'SELECT clave, valor, actualizado_en, actualizado_por FROM configuracion'
  );
  return filas.map(f => ({ ...f, valor: leerValor(f.valor) }));
}

/**
 * Guarda el valor de una clave.
 * @param {string} clave
 * @param {*} valor          se guarda como JSON
 * @param {number|null} usuarioId  quién la cambió
 */
export async function guardar(clave, valor, usuarioId) {
  await pool.execute(
    `INSERT INTO configuracion (clave, valor, actualizado_en, actualizado_por)
     VALUES (?, ?, UTC_TIMESTAMP(), ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor),
                             actualizado_en = VALUES(actualizado_en),
                             actualizado_por = VALUES(actualizado_por)`,
    [clave, JSON.stringify(valor), usuarioId ?? null]
  );
}
