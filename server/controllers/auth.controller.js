/**
 * controllers/auth.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — Login y cuenta propia
 *
 *   login            — POST  /api/auth/login             {usuario, password}
 *   logout           — POST  /api/auth/logout
 *   yo               — GET   /api/auth/yo
 *   cambiarPassword  — POST  /api/auth/cambiar-password  {actual, nueva}
 *   guardarPreferencias — PATCH /api/auth/preferencias   {tema}
 *
 * Los cuerpos llegan ya validados por middleware/validar.js.
 * Las contraseñas nunca se escriben en el log ni en las respuestas.
 * ─────────────────────────────────────────────────────────────
 */

import * as Usuario from '../models/Usuario.js';
import * as SesionLogin from '../models/SesionLogin.js';
import { hashPassword, verificarPassword, verificarContraRelleno } from '../services/passwords.js';
import { abrirSesion, quitarCookie, hashDeToken, NOMBRE_COOKIE } from '../services/sesionUsuario.js';
import { leerCookie } from '../middleware/auth.js';
import {
  claveDeIntento, segundosDeBloqueo, registrarFallo, olvidarFallos,
} from '../services/limiteIntentos.js';

/** Datos del usuario que se envían al navegador (nunca el hash) */
const usuarioPublico = u => ({
  id:                    u.id,
  usuario:               u.usuario,
  nombre:                u.nombre,
  rol:                   u.rol,
  debe_cambiar_password: Boolean(u.debe_cambiar_password),
  preferencias:          u.preferencias ?? {},
});

/** 429 con el tiempo que falta, en el cuerpo y en la cabecera Retry-After */
const responderBloqueo = (res, segundos) => {
  const minutos = Math.ceil(segundos / 60);
  res.set('Retry-After', String(segundos));
  return res.status(429).json({
    ok:    false,
    error: `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
    reintentar_en_s: segundos,
  });
};

/**
 * POST /api/auth/login
 * Si las credenciales son correctas crea la sesión y la cookie.
 * Si no, responde siempre el mismo 401: no dice si falló el usuario
 * o la contraseña, ni si la cuenta está desactivada.
 */
export const login = async (req, res, next) => {
  const { usuario, password } = req.credenciales;
  const clave = claveDeIntento(usuario, req.ip);

  try {
    const bloqueo = segundosDeBloqueo(clave);
    if (bloqueo > 0) return responderBloqueo(res, bloqueo);

    const encontrado = await Usuario.buscarConHashPorUsuario(usuario);
    const coincide = encontrado
      ? await verificarPassword(password, encontrado.hash_password)
      : await verificarContraRelleno(password);   // mismo tiempo de respuesta si no existe

    if (!encontrado || !coincide || !encontrado.activo) {
      registrarFallo(clave);
      console.warn(`[auth] Login fallido para "${usuario}" desde ${req.ip}`);
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
    }

    olvidarFallos(clave);
    // Si el navegador traía una sesión anterior (otra pestaña, o la de antes
    // de pedir el login de nuevo), se cierra: queda solo la nueva.
    const anterior = leerCookie(req, NOMBRE_COOKIE);
    if (anterior) await SesionLogin.borrar(hashDeToken(anterior));
    await abrirSesion(req, res, encontrado.id);
    await Usuario.registrarAcceso(encontrado.id);
    console.log(`[auth] Login de "${usuario}" (${encontrado.rol}) desde ${req.ip}`);

    res.json({ ok: true, usuario: usuarioPublico(encontrado) });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/logout — borra la sesión de login y la cookie */
export const logout = async (req, res, next) => {
  try {
    await SesionLogin.borrar(req.sesionLoginId);
    quitarCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/yo — el usuario de la sesión actual */
export const yo = (req, res) => {
  res.json({ ok: true, usuario: usuarioPublico(req.usuario) });
};

/**
 * POST /api/auth/cambiar-password
 * Comprueba la contraseña actual, guarda la nueva, apaga
 * debe_cambiar_password y cierra las demás sesiones del usuario
 * (la actual se conserva).
 */
export const cambiarPassword = async (req, res, next) => {
  const { actual, nueva } = req.cambioPassword;
  // Mismo límite que el login, para que una sesión robada no sirva
  // para adivinar la contraseña actual a fuerza de intentos
  const clave = claveDeIntento(`cambio:${req.usuario.usuario}`, req.ip);

  try {
    const bloqueo = segundosDeBloqueo(clave);
    if (bloqueo > 0) return responderBloqueo(res, bloqueo);

    const conHash = await Usuario.buscarConHashPorId(req.usuario.id);
    if (!conHash || !(await verificarPassword(actual, conHash.hash_password))) {
      registrarFallo(clave);
      return res.status(422).json({ ok: false, error: 'La contraseña actual no es correcta' });
    }

    olvidarFallos(clave);
    await Usuario.actualizarPassword(req.usuario.id, await hashPassword(nueva), false);
    await SesionLogin.borrarDeUsuario(req.usuario.id, req.sesionLoginId);
    console.log(`[auth] "${req.usuario.usuario}" cambió su contraseña`);

    res.json({
      ok: true,
      usuario: usuarioPublico({ ...req.usuario, debe_cambiar_password: false }),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/auth/preferencias
 * Mezcla las preferencias recibidas con las que ya tenía el usuario.
 */
export const guardarPreferencias = async (req, res, next) => {
  try {
    const preferencias = { ...req.usuario.preferencias, ...req.preferencias };
    await Usuario.actualizarPreferencias(req.usuario.id, preferencias);
    res.json({ ok: true, preferencias });
  } catch (err) {
    next(err);
  }
};
