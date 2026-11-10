/**
 * tests/integracion/helper.js
 * ─────────────────────────────────────────────────────────────
 * Levanta la app de Express (app.js) en un puerto aleatorio contra la
 * base de PRUEBAS tms_db_test, nunca contra tms_db.
 *
 * Credenciales: las de server/.env (DB_USER, DB_PASSWORD, DB_HOST,
 * DB_PORT), con DB_NAME forzado a tms_db_test. Se pueden cambiar con
 * TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD y
 * TEST_DB_NAME. La base se crea con:  sudo mysql < tests/setup_test_db.sql
 *
 * Al empezar deja la base vacía (borra filas, no tablas) y crea tres
 * usuarios: admin/admin, operador/operador123 y observador/observador123.
 * ─────────────────────────────────────────────────────────────
 */

import { config as cargarEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const carpetaServidor = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function configurarEntorno() {
  cargarEnv({ path: join(carpetaServidor, '.env'), quiet: true });
  const e = process.env;
  e.DB_NAME = e.TEST_DB_NAME ?? 'tms_db_test';
  if (e.DB_NAME === 'tms_db') throw new Error('Los tests de integración nunca usan tms_db');
  if (e.TEST_DB_HOST) e.DB_HOST = e.TEST_DB_HOST;
  if (e.TEST_DB_PORT) e.DB_PORT = e.TEST_DB_PORT;
  if (e.TEST_DB_USER) e.DB_USER = e.TEST_DB_USER;
  if (e.TEST_DB_PASSWORD) e.DB_PASSWORD = e.TEST_DB_PASSWORD;
  e.NODE_ENV = 'test';
  e.CORS_ORIGINS ??= 'http://localhost:5173';
}

/**
 * @returns {Promise<{base, pool, cerrar} | {error}>}  error si la base no está disponible
 */
export async function levantar() {
  configurarEntorno();
  const { default: pool } = await import('../../config/database.js');
  try {
    await pool.query('SELECT 1 FROM configuracion LIMIT 1');
  } catch (err) {
    await pool.end().catch(() => {});
    return { error: `No se pudo usar ${process.env.DB_NAME} (${err.code ?? err.message}). Créala con: sudo mysql < server/tests/setup_test_db.sql` };
  }

  // Base vacía y usuarios conocidos
  for (const t of ['mediciones', 'sesiones', 'sesiones_login', 'configuracion', 'usuarios']) await pool.query(`DELETE FROM ${t}`);
  await pool.query('UPDATE dispositivos SET token_hash = NULL, activo = 1, ultimo_latido = NULL, ip = NULL, firmware = NULL, rssi = NULL, uptime_s = NULL');
  const { hashPassword } = await import('../../services/passwords.js');
  for (const [usuario, rol, password] of [['admin', 'admin', 'admin'], ['operador', 'operador', 'operador123'], ['observador', 'observador', 'observador123']]) {
    await pool.execute(
      `INSERT INTO usuarios (usuario, nombre, rol, hash_password, activo, debe_cambiar_password, creado_en)
       VALUES (?, ?, ?, ?, 1, 0, UTC_TIMESTAMP())`,
      [usuario, `Prueba ${rol}`, rol, await hashPassword(password, { validar: false })]);
  }

  const { crearApp, iniciarServicios } = await import('../../app.js');
  await iniciarServicios();
  const servidor = crearApp().listen(0, '127.0.0.1');
  await new Promise(r => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  const cerrar = async () => {
    const dispositivo = await import('../../services/dispositivo.js');
    dispositivo.detener();
    servidor.closeAllConnections?.();
    await new Promise(r => servidor.close(r));
    await pool.end();
  };
  return { base, pool, cerrar };
}

/** Cliente HTTP con la cookie de sesión guardada */
export function cliente(base) {
  let cookie = '';
  const pedir = async (metodo, ruta, cuerpo, cabeceras = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...cabeceras },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const nueva = res.headers.get('set-cookie');
    if (nueva) cookie = nueva.split(';')[0];
    const tipo = res.headers.get('content-type') ?? '';
    const datos = tipo.includes('json') ? await res.json() : await res.text();
    return { status: res.status, datos, res };
  };
  return {
    get: (r, h) => pedir('GET', r, undefined, h),
    post: (r, c, h) => pedir('POST', r, c, h),
    put: (r, c) => pedir('PUT', r, c),
    patch: (r, c) => pedir('PATCH', r, c),
    del: r => pedir('DELETE', r),
    login: async (usuario, password) => pedir('POST', '/auth/login', { usuario, password }),
  };
}

/** Espera hasta que `condicion()` sea verdadera (o falla tras `ms`) */
export async function esperar(condicion, ms = 15000, cada = 100) {
  const limite = Date.now() + ms;
  for (;;) {
    const v = await condicion();
    if (v) return v;
    if (Date.now() > limite) throw new Error('Tiempo de espera agotado');
    await new Promise(r => setTimeout(r, cada));
  }
}

/** Convierte el CSV del servidor en { meta: {clave: valor}, filas: [objeto] } */
export function leerCSV(texto) {
  const meta = {};
  const lineas = texto.trimEnd().split('\n');
  let i = 0;
  for (; lineas[i].startsWith('# '); i++) {
    const s = lineas[i].slice(2);
    const p = s.indexOf(': ');
    meta[s.slice(0, p)] = s.slice(p + 2);
  }
  const columnas = lineas[i].split(',');
  const filas = lineas.slice(i + 1).map(l => Object.fromEntries(l.split(',').map((v, j) => [columnas[j], v])));
  return { meta, columnas, filas };
}
