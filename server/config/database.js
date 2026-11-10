/**
 * config/database.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONFIGURACIÓN — Conexión a MariaDB
 *
 * Usa mysql2 con un "pool" de conexiones que se reutilizan entre
 * peticiones.
 *
 * Credenciales: se leen SOLO de variables de entorno (.env).
 * No hay contraseña por defecto en el código; si falta
 * DB_PASSWORD el servidor no arranca.
 *
 * Tiempo: todo en UTC.
 *   - timezone 'Z': mysql2 envía y lee los DATETIME como UTC
 *     (antes los leía como hora local y el CSV salía corrido 6 h).
 *   - SET time_zone: NOW() y similares también devuelven UTC.
 * ─────────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';

const faltantes = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(k => !process.env[k]);
if (faltantes.length > 0) {
  console.error(`[DB] ✗ Faltan variables en server/.env: ${faltantes.join(', ')}`);
  console.error('[DB]   Copia server/.env.example a server/.env y complétalo.');
  process.exit(1);
}

const pool = mysql.createPool({
  host:     process.env.DB_HOST || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         100,   // como máximo 100 consultas en espera
});

// Cada conexión nueva del pool trabaja en UTC
pool.on('connection', conn => {
  conn.query("SET time_zone = '+00:00'");
});

/**
 * Verifica que la conexión a MariaDB funciona al arrancar.
 * Si falla, imprime el error pero no detiene el servidor.
 */
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('[DB] ✓ Conexión a MariaDB establecida.');
    conn.release();
  } catch (err) {
    console.error('[DB] ✗ No se pudo conectar a MariaDB:', err.message);
    console.error('[DB]   Verifica las credenciales en .env');
  }
}

export default pool;
