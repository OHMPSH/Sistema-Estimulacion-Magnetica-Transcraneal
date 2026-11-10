/**
 * middleware/validar.js
 * ─────────────────────────────────────────────────────────────
 * Validación de entradas antes de llegar al controlador.
 *
 * Cada middleware deja el valor ya convertido y validado en `req`
 * (req.idSesion, req.modo, req.medicion, req.credenciales…) o responde:
 *   400 — falta el cuerpo o tiene un formato inválido
 *   422 — los valores no cumplen las reglas (físicas del barrido,
 *         formato de usuario, longitud de contraseña…)
 *
 * Solo se aceptan números JSON (no textos como "1.5"), para que una
 * trama mal formada del firmware se rechace en lugar de convertirse
 * en silencio en otro valor.
 * ─────────────────────────────────────────────────────────────
 */

import { GRID_SIZE_MM, Z_LEVELS, B_MAX_UT } from '../config/barrido.js';
import { ROLES, TEMAS } from '../config/roles.js';
import { errorDePassword, LONGITUD_MAXIMA } from '../services/passwords.js';

const MODOS = ['DC', 'AC'];

const esNumeroFinito = v => typeof v === 'number' && Number.isFinite(v);
const esEnteroPositivo = v => Number.isSafeInteger(v) && v > 0;

const rechazar = (res, status, errores) =>
  res.status(status).json({ ok: false, error: errores.join('; '), errores });

/** :id de la URL → req.idSesion (entero positivo) */
export function validarIdSesion(req, res, next) {
  const texto = req.params.id;
  const id = /^\d+$/.test(texto) ? Number(texto) : NaN;
  if (!esEnteroPositivo(id)) {
    return rechazar(res, 400, [`El id de sesión debe ser un entero positivo (recibido: "${texto}")`]);
  }
  req.idSesion = id;
  next();
}

/** body.modo → req.modo ('DC' | 'AC') */
export function validarModo(req, res, next) {
  const modo = req.body?.modo;
  if (!MODOS.includes(modo)) {
    return rechazar(res, 422, [`modo debe ser ${MODOS.join(' o ')}`]);
  }
  req.modo = modo;
  next();
}

/**
 * body de POST /api/mediciones → req.medicion
 * Unidades: posiciones en mm, campo en μT.
 */
export function validarMedicion(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  }

  const errores = [];
  const requeridos = ['sesionId', 'xMM', 'yMM', 'zMM', 'bx', 'by', 'bz'];
  const faltantes = requeridos.filter(k => body[k] === undefined || body[k] === null);
  if (faltantes.length > 0) {
    return rechazar(res, 400, [`Campos faltantes: ${faltantes.join(', ')}`]);
  }

  const { sesionId, xMM, yMM, zMM, bx, by, bz } = body;

  if (!esEnteroPositivo(sesionId)) errores.push('sesionId debe ser un entero positivo');

  for (const [nombre, v] of [['xMM', xMM], ['yMM', yMM]]) {
    if (!esNumeroFinito(v)) errores.push(`${nombre} debe ser un número`);
    else if (v < 0 || v > GRID_SIZE_MM) errores.push(`${nombre} fuera de la placa (0 a ${GRID_SIZE_MM} mm): ${v}`);
  }

  const zIdx = esNumeroFinito(zMM) ? Z_LEVELS.indexOf(zMM) : -1;
  if (zIdx === -1) errores.push(`zMM debe ser uno de los niveles ${Z_LEVELS.join(', ')} mm (recibido: ${zMM})`);

  for (const [nombre, v] of [['bx', bx], ['by', by], ['bz', bz]]) {
    if (!esNumeroFinito(v)) errores.push(`${nombre} debe ser un número finito`);
    else if (Math.abs(v) > B_MAX_UT) errores.push(`${nombre} fuera del rango aceptado (±${B_MAX_UT} μT): ${v}`);
  }

  if (errores.length > 0) return rechazar(res, 422, errores);

  req.medicion = { sesionId, xMM, yMM, zMM, zIdx, bx, by, bz };
  next();
}

// ─────────────────────────────────────────────────────────────
// USUARIOS Y LOGIN (Fase 2)
// ─────────────────────────────────────────────────────────────

const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const esTexto  = v => typeof v === 'string';

/** Nombre de usuario: 3 a 32 caracteres, minúsculas, dígitos, punto, guion y guion bajo */
const FORMATO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const NOMBRE_MAXIMO   = 100;

/** Normaliza un nombre de usuario: sin espacios alrededor y en minúsculas */
const normalizarUsuario = v => v.trim().toLowerCase();

/** :id de la URL → req.idUsuario (entero positivo) */
export function validarIdUsuario(req, res, next) {
  const texto = req.params.id;
  const id = /^\d+$/.test(texto) ? Number(texto) : NaN;
  if (!esEnteroPositivo(id)) {
    return rechazar(res, 400, [`El id de usuario debe ser un entero positivo (recibido: "${texto}")`]);
  }
  req.idUsuario = id;
  next();
}

/**
 * body de POST /auth/login → req.credenciales { usuario, password }
 * Aquí solo se revisa el formato; si las credenciales son correctas
 * lo decide el controlador (que nunca dice cuál de las dos falló).
 */
export function validarLogin(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);

  const { usuario, password } = body;
  if (!esTexto(usuario) || !esTexto(password) || usuario.trim() === '' || password === '') {
    return rechazar(res, 400, ['usuario y password son obligatorios y deben ser textos']);
  }
  if (usuario.length > 64 || password.length > LONGITUD_MAXIMA) {
    return rechazar(res, 422, ['usuario o password demasiado largos']);
  }

  req.credenciales = { usuario: normalizarUsuario(usuario), password };
  next();
}

/** body de POST /auth/cambiar-password → req.cambioPassword { actual, nueva } */
export function validarCambioPassword(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);

  const { actual, nueva } = body;
  if (!esTexto(actual) || !esTexto(nueva) || actual === '') {
    return rechazar(res, 400, ['actual y nueva son obligatorias y deben ser textos']);
  }

  const errores = [];
  const error = errorDePassword(nueva);
  if (error) errores.push(error);
  else if (nueva === actual) errores.push('La contraseña nueva debe ser distinta de la actual');
  if (actual.length > LONGITUD_MAXIMA) errores.push('La contraseña actual no es correcta');
  if (errores.length > 0) return rechazar(res, 422, errores);

  req.cambioPassword = { actual, nueva };
  next();
}

/** body de PATCH /auth/preferencias → req.preferencias { tema } */
export function validarPreferencias(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  if (body.tema === undefined) return rechazar(res, 400, ['Campos faltantes: tema']);
  if (!TEMAS.includes(body.tema)) {
    return rechazar(res, 422, [`tema debe ser ${TEMAS.join(', ')}`]);
  }
  req.preferencias = { tema: body.tema };
  next();
}

/** body de POST /usuarios → req.nuevoUsuario { usuario, nombre, rol, password } */
export function validarNuevoUsuario(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);

  const requeridos = ['usuario', 'nombre', 'rol', 'password'];
  const faltantes = requeridos.filter(k => body[k] === undefined || body[k] === null);
  if (faltantes.length > 0) return rechazar(res, 400, [`Campos faltantes: ${faltantes.join(', ')}`]);

  const noTextos = requeridos.filter(k => !esTexto(body[k]));
  if (noTextos.length > 0) return rechazar(res, 400, [`Deben ser textos: ${noTextos.join(', ')}`]);

  const usuario = normalizarUsuario(body.usuario);
  const nombre  = body.nombre.trim();
  const errores = [];

  if (!FORMATO_USUARIO.test(usuario)) {
    errores.push('usuario debe tener de 3 a 32 caracteres: letras minúsculas, dígitos, punto, guion o guion bajo');
  }
  if (nombre.length === 0 || nombre.length > NOMBRE_MAXIMO) {
    errores.push(`nombre debe tener de 1 a ${NOMBRE_MAXIMO} caracteres`);
  }
  if (!ROLES.includes(body.rol)) errores.push(`rol debe ser ${ROLES.join(', ')}`);
  const errorPassword = errorDePassword(body.password);
  if (errorPassword) errores.push(errorPassword);

  if (errores.length > 0) return rechazar(res, 422, errores);

  req.nuevoUsuario = { usuario, nombre, rol: body.rol, password: body.password };
  next();
}

/** body de PATCH /usuarios/:id → req.cambiosUsuario { nombre?, rol?, activo? } */
export function validarCambiosUsuario(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);

  const { nombre, rol, activo } = body;
  if (nombre === undefined && rol === undefined && activo === undefined) {
    return rechazar(res, 400, ['Indica al menos uno de: nombre, rol, activo']);
  }

  const errores = [];
  const cambios = {};

  if (nombre !== undefined) {
    if (!esTexto(nombre)) return rechazar(res, 400, ['nombre debe ser un texto']);
    const limpio = nombre.trim();
    if (limpio.length === 0 || limpio.length > NOMBRE_MAXIMO) {
      errores.push(`nombre debe tener de 1 a ${NOMBRE_MAXIMO} caracteres`);
    }
    cambios.nombre = limpio;
  }
  if (rol !== undefined) {
    if (!ROLES.includes(rol)) errores.push(`rol debe ser ${ROLES.join(', ')}`);
    cambios.rol = rol;
  }
  if (activo !== undefined) {
    // Solo true o false de JSON: "false" o 0 se rechazan en lugar de adivinar
    if (typeof activo !== 'boolean') return rechazar(res, 400, ['activo debe ser true o false']);
    cambios.activo = activo;
  }

  if (errores.length > 0) return rechazar(res, 422, errores);

  req.cambiosUsuario = cambios;
  next();
}

/** body de POST /usuarios/:id/restablecer-password → req.passwordNueva */
export function validarPasswordNueva(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  if (!esTexto(body.password)) return rechazar(res, 400, ['password es obligatoria y debe ser un texto']);

  const error = errorDePassword(body.password);
  if (error) return rechazar(res, 422, [error]);

  req.passwordNueva = body.password;
  next();
}
