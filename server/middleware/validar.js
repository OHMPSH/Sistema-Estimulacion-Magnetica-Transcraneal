/**
 * middleware/validar.js
 * ─────────────────────────────────────────────────────────────
 * Validación de entradas antes de llegar al controlador.
 *
 * Cada middleware deja el valor ya convertido y validado en `req`
 * (req.idSesion, req.nuevaSesion, req.lote, req.credenciales…) o responde:
 *   400 — falta el cuerpo o tiene un formato inválido
 *   422 — los valores no cumplen las reglas (físicas del barrido,
 *         formato de usuario, longitud de contraseña…)
 *
 * Solo se aceptan números JSON (no textos como "1.5"), para que una
 * trama mal formada del firmware se rechace en lugar de convertirse
 * en silencio en otro valor.
 * ─────────────────────────────────────────────────────────────
 */

import { ROLES, TEMAS } from '../config/roles.js';
import { PASOS_MM, MEDIOS } from '../services/geometria.js';
import { CLAVES } from '../services/validacionConfiguracion.js';
import { obtener as obtenerConfiguracion } from '../services/configuracion.js';
import { errorDePassword, LONGITUD_MAXIMA } from '../services/passwords.js';
import { MAX_LECTURAS_LOTE, tsDispositivoValido } from '../services/conversionSensor.js';

const MODOS = ['DC', 'AC'];
const ORIGENES = ['sim', 'hw'];

const esEnteroPositivo = v => Number.isSafeInteger(v) && v > 0;
const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

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

/**
 * body de POST /api/sesiones → req.nuevaSesion { modo, pasoMM, medio }
 * (CLAUDE.md 7.0). Si faltan paso_mm o medio se usan los predeterminados.
 */
export function validarNuevaSesion(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  }
  const { modo, paso_mm: paso, medio } = body;
  const errores = [];
  if (!MODOS.includes(modo)) errores.push(`modo debe ser ${MODOS.join(' o ')}`);
  if (paso !== undefined && !PASOS_MM.includes(paso)) {
    errores.push(`paso_mm debe ser ${PASOS_MM.join(', ')} (0,5, 1 o 2 cm)`);
  }
  if (medio !== undefined && !MEDIOS.includes(medio)) errores.push(`medio debe ser ${MEDIOS.join(' o ')}`);
  if (errores.length > 0) return rechazar(res, 422, errores);

  req.nuevaSesion = {
    modo,
    pasoMM: paso ?? obtenerConfiguracion('barrido').paso_predeterminado_mm,
    medio:  medio ?? 'campo_magnetico',
  };
  next();
}

/**
 * Query de GET /api/sesiones → req.filtros { modo?, pasoMM?, medio?, origen?, incluirEliminadas? }
 * Un valor vacío equivale a "sin filtro". incluir_eliminadas=1 solo para admin (403).
 */
export function validarFiltrosSesiones(req, res, next) {
  const q = req.query;
  const errores = [];
  const filtros = {};
  const texto = v => (typeof v === 'string' && v !== '' ? v : undefined);

  const modo = texto(q.modo);
  if (modo !== undefined) {
    if (MODOS.includes(modo)) filtros.modo = modo; else errores.push(`modo debe ser ${MODOS.join(' o ')}`);
  }
  const paso = texto(q.paso_mm);
  if (paso !== undefined) {
    const n = /^\d+$/.test(paso) ? Number(paso) : NaN;
    if (PASOS_MM.includes(n)) filtros.pasoMM = n; else errores.push(`paso_mm debe ser ${PASOS_MM.join(', ')}`);
  }
  const medio = texto(q.medio);
  if (medio !== undefined) {
    if (MEDIOS.includes(medio)) filtros.medio = medio; else errores.push(`medio debe ser ${MEDIOS.join(' o ')}`);
  }
  const origen = texto(q.origen);
  if (origen !== undefined) {
    if (ORIGENES.includes(origen)) filtros.origen = origen; else errores.push(`origen debe ser ${ORIGENES.join(' o ')}`);
  }
  // Ver también las eliminadas (borrado lógico): solo admin
  const eliminadas = texto(q.incluir_eliminadas);
  if (eliminadas !== undefined) {
    if (!['0', '1'].includes(eliminadas)) errores.push('incluir_eliminadas debe ser 0 o 1');
    else if (eliminadas === '1') {
      if (req.usuario?.rol !== 'admin') {
        return rechazar(res, 403, ['Solo un admin puede ver las sesiones eliminadas']);
      }
      filtros.incluirEliminadas = true;
    }
  }
  if (errores.length > 0) return rechazar(res, 422, errores);
  req.filtros = filtros;
  next();
}

/** Máximo de caracteres de las notas de una sesión */
export const NOTAS_MAXIMO = 5000;

/** body de PATCH /sesiones/:id → req.notas (texto, puede quedar vacío) */
export function validarNotas(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  if (body.notas === undefined) return rechazar(res, 400, ['Campos faltantes: notas']);
  if (body.notas !== null && typeof body.notas !== 'string') return rechazar(res, 400, ['notas debe ser un texto']);
  const notas = (body.notas ?? '').trim();
  if (notas.length > NOTAS_MAXIMO) {
    return rechazar(res, 422, [`notas admite como máximo ${NOTAS_MAXIMO} caracteres (recibidos: ${notas.length})`]);
  }
  req.notas = notas;
  next();
}

/**
 * PUT /api/configuracion/:clave con cuerpo { valor }
 *   → req.claveConfiguracion y req.valorConfiguracion
 * Para las claves que son objetos, `valor` puede traer solo los campos
 * que cambian. Las reglas de cada clave las aplica el servicio (422).
 */
export function validarClaveConfiguracion(req, res, next) {
  const clave = req.params.clave;
  if (!CLAVES.includes(clave)) {
    return rechazar(res, 404, [`Clave de configuración desconocida: ${clave}. Válidas: ${CLAVES.join(', ')}`]);
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.valor === undefined) {
    return rechazar(res, 400, ['El cuerpo debe ser {"valor": …}']);
  }
  req.claveConfiguracion = clave;
  req.valorConfiguracion = body.valor;
  next();
}

// ─────────────────────────────────────────────────────────────
// DISPOSITIVO (Pico W, Fase 4)
// ─────────────────────────────────────────────────────────────

/**
 * body de POST /dispositivo/latido → req.latido
 * { firmware?, rssi?, uptime_s?, ts_dispositivo_ms? }: todos opcionales,
 * pero si vienen deben tener el tipo correcto.
 */
export function validarLatido(req, res, next) {
  const body = req.body ?? {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  }
  const { firmware, rssi, uptime_s: uptime, ts_dispositivo_ms: ts } = body;
  const errores = [];
  if (firmware !== undefined && (typeof firmware !== 'string' || firmware.length > 40)) {
    errores.push('firmware debe ser un texto de hasta 40 caracteres');
  }
  if (rssi !== undefined && (!Number.isInteger(rssi) || rssi < -127 || rssi > 0)) {
    errores.push('rssi debe ser un entero entre −127 y 0 (dBm)');
  }
  if (uptime !== undefined && (!Number.isSafeInteger(uptime) || uptime < 0 || uptime > 4294967295)) {
    errores.push('uptime_s debe ser un entero no negativo');
  }
  if (ts !== undefined && ts !== 0 && !tsDispositivoValido(ts)) {
    errores.push('ts_dispositivo_ms debe ser un epoch en milisegundos (UTC), o 0 si la Pico aún no sincronizó su reloj');
  }
  if (errores.length > 0) return rechazar(res, 422, errores);
  req.latido = { firmware, rssi, uptime_s: uptime, ts_dispositivo_ms: ts || null };
  next();
}

/**
 * body de POST /dispositivo/mediciones → req.lote { sesionId, lecturas }
 * Aquí solo se revisa la forma del lote; cada lectura la valida el
 * servicio de ingesta, para rechazar solo las malas y aceptar el resto.
 */
export function validarLoteDispositivo(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  const { sesionId, lecturas } = body;
  if (sesionId === undefined || lecturas === undefined) {
    return rechazar(res, 400, ['Campos faltantes: sesionId y lecturas']);
  }
  if (!Array.isArray(lecturas)) return rechazar(res, 400, ['lecturas debe ser una lista']);
  const errores = [];
  if (!esEnteroPositivo(sesionId)) errores.push('sesionId debe ser un entero positivo');
  if (lecturas.length === 0) errores.push('lecturas no puede estar vacía');
  if (lecturas.length > MAX_LECTURAS_LOTE) errores.push(`Como máximo ${MAX_LECTURAS_LOTE} lecturas por lote (recibidas: ${lecturas.length})`);
  if (errores.length > 0) return rechazar(res, 422, errores);
  req.lote = { sesionId, lecturas };
  next();
}

/** body de PATCH /dispositivo → req.cambiosDispositivo { activo } */
export function validarCambiosDispositivo(req, res, next) {
  const body = req.body;
  if (!esObjeto(body)) return rechazar(res, 400, ['El cuerpo debe ser un objeto JSON']);
  if (body.activo === undefined) return rechazar(res, 400, ['Campos faltantes: activo']);
  if (typeof body.activo !== 'boolean') return rechazar(res, 400, ['activo debe ser true o false']);
  req.cambiosDispositivo = { activo: body.activo };
  next();
}

// ─────────────────────────────────────────────────────────────
// USUARIOS Y LOGIN (Fase 2)
// ─────────────────────────────────────────────────────────────

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
