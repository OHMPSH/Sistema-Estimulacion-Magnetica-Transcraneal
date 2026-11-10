/**
 * services/sesionUsuario.js
 * ─────────────────────────────────────────────────────────────
 * Sesiones de usuario del dashboard: el token, su hash y la cookie.
 * Lo comparten el middleware de autenticación y el controlador de
 * login.
 *
 * Cómo funciona:
 *   - Al entrar se genera un token aleatorio de 32 bytes.
 *   - El navegador lo recibe en la cookie `tms_sesion` (HttpOnly, así
 *     que el JavaScript de la página no puede leerla).
 *   - En la base solo se guarda su SHA-256 (sesiones_login.id).
 *   - La sesión dura 12 h desde el último uso.
 * ─────────────────────────────────────────────────────────────
 */

import { randomBytes, createHash } from 'node:crypto';
import * as SesionLogin from '../models/SesionLogin.js';
import { limpiarIntentosViejos } from './limiteIntentos.js';

export const NOMBRE_COOKIE = 'tms_sesion';

/** Duración de la sesión desde el último uso: 12 horas */
export const DURACION_S = 12 * 60 * 60;

/**
 * La renovación no se escribe en la base en cada petición (mientras
 * hay un barrido llegan varias por segundo): basta con hacerlo cuando
 * ha pasado este tiempo desde la última vez.
 */
export const RENOVAR_CADA_S = 60;

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  path:     '/',
  // Con Secure el navegador solo envía la cookie por HTTPS (Nginx en producción)
  secure:   process.env.NODE_ENV === 'production',
});

/** SHA-256 en hexadecimal del token: es el id de la fila en sesiones_login */
export const hashDeToken = token => createHash('sha256').update(String(token)).digest('hex');

/** Escribe (o renueva) la cookie de sesión en la respuesta */
export function ponerCookie(res, token) {
  res.cookie(NOMBRE_COOKIE, token, { ...opcionesCookie(), maxAge: DURACION_S * 1000 });
}

/** Le pide al navegador que borre la cookie de sesión */
export function quitarCookie(res) {
  res.clearCookie(NOMBRE_COOKIE, opcionesCookie());
}

/**
 * Abre una sesión para un usuario: crea el token, guarda su hash y
 * pone la cookie.
 * @returns {Promise<string>} el id de la sesión de login (hash del token)
 */
export async function abrirSesion(req, res, usuarioId) {
  const token = randomBytes(32).toString('base64url');
  const id    = hashDeToken(token);
  await SesionLogin.crear({
    id,
    usuarioId,
    duracionS: DURACION_S,
    ip:        req.ip ?? null,
    userAgent: (req.get('user-agent') ?? '').slice(0, 255) || null,
  });
  ponerCookie(res, token);
  return id;
}

/**
 * Limpieza periódica: borra las sesiones de login expiradas y los
 * intentos fallidos viejos. Se ejecuta al arrancar y luego cada hora.
 * El temporizador no impide que el proceso termine (unref).
 */
export function iniciarLimpiezaPeriodica(intervaloMs = 60 * 60 * 1000) {
  const limpiar = async () => {
    try {
      const borradas = await SesionLogin.limpiarExpiradas();
      limpiarIntentosViejos();
      if (borradas > 0) console.log(`[auth] Limpieza: ${borradas} sesiones de login expiradas borradas.`);
    } catch (err) {
      console.error('[auth] No se pudo limpiar las sesiones de login expiradas:', err.message);
    }
  };
  limpiar();
  return setInterval(limpiar, intervaloMs).unref();
}
