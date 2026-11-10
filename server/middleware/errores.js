/**
 * middleware/errores.js
 * ─────────────────────────────────────────────────────────────
 * Respuestas de error siempre en JSON.
 *
 *   rutaNoEncontrada — 404 para cualquier ruta sin handler
 *   manejadorErrores — errores lanzados por Express o middlewares
 *                      (JSON mal formado, cuerpo demasiado grande…)
 *
 * En producción (NODE_ENV=production) nunca se envía la traza
 * de la pila al cliente; solo se registra en la consola.
 * ─────────────────────────────────────────────────────────────
 */

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ ok: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Express reconoce un manejador de errores porque recibe 4 argumentos
// eslint-disable-next-line no-unused-vars
export function manejadorErrores(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'El cuerpo no es JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'El cuerpo de la petición es demasiado grande' });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 ? err.status : 500;
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);

  const respuesta = { ok: false, error: status === 500 ? 'Error interno del servidor' : err.message };
  if (process.env.NODE_ENV !== 'production') respuesta.detalle = err.message;
  res.status(status).json(respuesta);
}
