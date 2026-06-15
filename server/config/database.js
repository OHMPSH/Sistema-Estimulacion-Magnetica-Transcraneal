/**
 * config/database.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONFIGURACIÓN — Conexión a MariaDB
 *
 * Usa mysql2 con un "pool" de conexiones.
 * Un pool evita abrir/cerrar una conexión en cada petición;
 * en su lugar reutiliza conexiones ya abiertas, lo que es
 * más eficiente para un servidor web.
 *
 * Las credenciales se leen de variables de entorno (.env)
 * para no exponer contraseñas en el código fuente.
 * ─────────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';  // versión con soporte async/await

// Crear el pool de conexiones usando las variables del .env
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',  // dirección del servidor MariaDB
  port:     process.env.DB_PORT     || 3306,          // puerto por defecto de MariaDB
  user:     process.env.DB_USER     || 'tms_user',    // usuario de la base de datos
  password: process.env.DB_PASSWORD || 'tms_password',// contraseña
  database: process.env.DB_NAME     || 'tms_db',      // nombre de la base de datos
  waitForConnections: true,   // esperar si no hay conexiones disponibles
  connectionLimit:    10,     // máximo 10 conexiones simultáneas
  queueLimit:         0,      // sin límite de peticiones en cola
});

/**
 * Verifica que la conexión a MariaDB funciona al arrancar.
 * Si falla, imprime el error pero no detiene el servidor
 * (así el dashboard sigue funcionando sin BD).
 */
export async function testConnection() {
  try {
    // getConnection() toma una conexión del pool para probarla
    const conn = await pool.getConnection();
    console.log('[DB] ✓ Conexión a MariaDB establecida.');
    conn.release(); // devolver la conexión al pool
  } catch (err) {
    console.error('[DB] ✗ No se pudo conectar a MariaDB:', err.message);
    console.error('[DB]   Verifica las credenciales en .env');
  }
}

// Exportar el pool para usarlo en los modelos
export default pool;
