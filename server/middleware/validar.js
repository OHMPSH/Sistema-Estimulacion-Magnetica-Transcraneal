/**
 * middleware/validar.js
 * ─────────────────────────────────────────────────────────────
 * Validación de entradas antes de llegar al controlador.
 *
 * Cada middleware deja el valor ya convertido y validado en `req`
 * (req.idSesion, req.modo, req.medicion) o responde:
 *   400 — falta el cuerpo o tiene un formato inválido
 *   422 — los valores no cumplen las reglas físicas del barrido
 *
 * Solo se aceptan números JSON (no textos como "1.5"), para que una
 * trama mal formada del firmware se rechace en lugar de convertirse
 * en silencio en otro valor.
 * ─────────────────────────────────────────────────────────────
 */

import { GRID_SIZE_MM, Z_LEVELS, B_MAX_UT } from '../config/barrido.js';

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
