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
 *   4. Montar el router de rutas bajo /api
 *   5. Verificar la conexión a MariaDB
 *   6. Iniciar el servidor HTTP
 *
 * El acceso externo y HTTPS lo maneja Nginx (proxy inverso).
 * Este servidor solo escucha en 127.0.0.1 por seguridad.
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config';               // carga .env al proceso
import express from 'express';
import cors    from 'cors';
import { testConnection } from './config/database.js';
import router            from './routes/mediciones.routes.js';

const app  = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

// ── Middlewares ───────────────────────────────────────────────

// cors: permite que el frontend (puerto 5173) llame a este servidor
const origenes = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Sin origin = curl/Postman/Pico 2W → permitir siempre
    if (!origin || origenes.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
}));

// express.json: convierte el body de las peticiones de texto a objeto JS
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────
// Todas las rutas de la API quedan bajo el prefijo /api
app.use('/api', router);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' });
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, HOST, async () => {
  console.log(`\n[TMS] Servidor escuchando en http://${HOST}:${PORT}`);
  console.log('[TMS] API disponible en /api');
  // Verificar conexión a MariaDB al iniciar
  await testConnection();
});
