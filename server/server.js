/**
 * server.js — Punto de entrada del servidor
 * ─────────────────────────────────────────────────────────────
 * TMS Sistema de Adquisición de Datos v3.0
 * Instituto Politécnico Nacional — ESIME
 *
 * Responsabilidades:
 *   1. Cargar variables de entorno desde .env
 *   2. Crear la aplicación Express
 *   3. Registrar middlewares (cors, json)
 *   4. Montar el router de la API
 *   5. Responder errores en JSON
 *   6. Verificar la conexión a MariaDB e iniciar el servidor HTTP
 *
 * El acceso externo y HTTPS lo maneja Nginx (proxy inverso).
 * Este servidor solo escucha en 127.0.0.1 por seguridad.
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config';               // carga .env al proceso (debe ir primero)
import express from 'express';
import { testConnection } from './config/database.js';
import router from './routes/mediciones.routes.js';
import { corsMiddleware } from './middleware/cors.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/errores.js';

const app  = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';

// ── Middlewares ───────────────────────────────────────────────
app.disable('x-powered-by');
app.use(corsMiddleware);

// express.json: convierte el body JSON a objeto JS (límite explícito)
app.use(express.json({ limit: '100kb' }));

// ── Rutas ─────────────────────────────────────────────────────
// La API responde en dos prefijos:
//   /api/...  → desarrollo (el proxy de Vite reenvía la ruta completa)
//   /...      → producción (Nginx, con `proxy_pass http://127.0.0.1:4000/;`,
//               quita el prefijo /api antes de reenviar)
// Así funciona en ambos entornos sin modificar la configuración de Nginx.
app.use('/api', router);
app.use('/', router);

// ── Errores (siempre en JSON) ─────────────────────────────────
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, HOST, async () => {
  console.log(`\n[TMS] Servidor escuchando en http://${HOST}:${PORT} (${process.env.NODE_ENV || 'sin NODE_ENV'})`);
  console.log('[TMS] API disponible en /api (desarrollo) y en / (detrás de Nginx)');
  await testConnection();
});
