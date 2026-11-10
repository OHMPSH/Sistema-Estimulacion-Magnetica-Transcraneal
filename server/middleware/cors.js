/**
 * middleware/cors.js
 * ─────────────────────────────────────────────────────────────
 * Política CORS a partir de CORS_ORIGINS (.env, separados por coma).
 *
 * - Peticiones sin cabecera Origin (curl, Pico W): se aceptan.
 * - Orígenes de la lista: reciben las cabeceras CORS.
 * - Otros orígenes: NO reciben cabeceras CORS, de modo que el
 *   navegador bloquea la respuesta, pero no se lanza un error 500.
 *
 * Esto último es importante detrás de Nginx: el dashboard servido
 * por Nginx es del mismo origen que la API, y el navegador igual
 * envía la cabecera Origin en los POST/PUT/DELETE. Antes eso
 * provocaba un 500; ahora la petición pasa porque, al ser del
 * mismo origen, el navegador no necesita cabeceras CORS.
 * ─────────────────────────────────────────────────────────────
 */

import cors from 'cors';

const origenes = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, cb) => cb(null, !origin || origenes.includes(origin)),
});

export { origenes as origenesPermitidos };
