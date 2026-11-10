/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────
 * Autenticación y permisos de los usuarios del dashboard.
 *
 *   leerCookie     — lee una cookie de req.headers.cookie, a mano
 *   requiereLogin  — exige una sesión de login vigente → req.usuario
 *   requiereRol    — exige que el rol del usuario esté en la lista
 *
 * Respuestas:
 *   401 — no hay sesión, expiró o el usuario está desactivado
 *   403 — hay sesión, pero el rol no tiene permiso, o el usuario
 *         todavía debe cambiar su contraseña
 *
 * El rol y el estado del usuario se leen de la base en cada petición:
 * si un admin degrada o desactiva a alguien, el cambio aplica de
 * inmediato, sin esperar a que su sesión expire.
 * ─────────────────────────────────────────────────────────────
 */

import * as SesionLogin from '../models/SesionLogin.js';
import {
  NOMBRE_COOKIE, DURACION_S, RENOVAR_CADA_S,
  hashDeToken, ponerCookie, quitarCookie,
} from '../services/sesionUsuario.js';

/**
 * Rutas que un usuario puede usar mientras debe cambiar su contraseña
 * (sin el prefijo /api). Cualquier otra responde 403, incluidas las
 * rutas que se agreguen en el futuro.
 */
const RUTAS_CON_PASSWORD_PENDIENTE = new Set([
  '/auth/yo',
  '/auth/cambiar-password',
  '/auth/logout',
]);

/**
 * Devuelve el valor de una cookie, o null si no viene.
 * Formato de la cabecera: "nombre1=valor1; nombre2=valor2".
 */
export function leerCookie(req, nombre) {
  const cabecera = req.headers?.cookie;
  if (typeof cabecera !== 'string' || cabecera.length === 0) return null;

  for (const par of cabecera.split(';')) {
    const igual = par.indexOf('=');
    if (igual === -1) continue;
    if (par.slice(0, igual).trim() !== nombre) continue;

    let valor = par.slice(igual + 1).trim();
    if (valor.startsWith('"') && valor.endsWith('"')) valor = valor.slice(1, -1);
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;   // no estaba codificada como URL: se usa tal cual
    }
  }
  return null;
}

/** Ruta de la petición sin el prefijo /api, sin query y sin "/" final */
function rutaSinPrefijo(req) {
  const ruta = req.originalUrl.split('?')[0].replace(/^\/api(?=\/|$)/i, '');
  return (ruta.replace(/\/+$/, '') || '/').toLowerCase();
}

const noAutenticado = (res, error = 'Debes iniciar sesión') =>
  res.status(401).json({ ok: false, error });

/**
 * Exige una sesión de login vigente.
 * Deja req.usuario = { id, usuario, nombre, rol, debe_cambiar_password, preferencias }
 * y req.sesionLoginId (el id de la fila en sesiones_login).
 */
export async function requiereLogin(req, res, next) {
  try {
    const token = leerCookie(req, NOMBRE_COOKIE);
    // Un token real mide 43 caracteres; se descarta cualquier cosa enorme
    if (!token || token.length > 128) return noAutenticado(res);

    const id     = hashDeToken(token);
    const sesion = await SesionLogin.buscarVigenteConUsuario(id);
    if (!sesion) {
      quitarCookie(res);
      return noAutenticado(res, 'Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión.');
    }

    // Renovación deslizante: 12 h más desde este uso (en la base y en la cookie)
    if (sesion.segundosSinUso >= RENOVAR_CADA_S) {
      await SesionLogin.renovar(id, DURACION_S);
      ponerCookie(res, token);
    }

    req.usuario       = sesion.usuario;
    req.sesionLoginId = id;

    if (sesion.usuario.debe_cambiar_password && !RUTAS_CON_PASSWORD_PENDIENTE.has(rutaSinPrefijo(req))) {
      return res.status(403).json({
        ok:    false,
        error: 'Debes cambiar tu contraseña antes de continuar',
        debe_cambiar_password: true,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Exige que el rol del usuario sea uno de los indicados.
 * Va siempre después de requiereLogin.
 *   router.delete('/sesiones/:id', requiereLogin, requiereRol('admin'), ...)
 */
export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return noAutenticado(res);
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok:    false,
        error: `Tu rol (${req.usuario.rol}) no tiene permiso para esta acción. Se requiere: ${roles.join(' o ')}.`,
      });
    }
    next();
  };
}
