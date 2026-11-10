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
 *   4. Montar los routers de la API (login, usuarios, mediciones)
 *   5. Responder errores en JSON
 *   6. Verificar la conexión a MariaDB e iniciar el servidor HTTP
 *   7. Limpiar cada hora las sesiones de login expiradas
 *
 * Antes de aceptar conexiones carga la configuración del sistema y
 * cierra las sesiones de medición que quedaron abiertas de una
 * ejecución anterior (Fase 3).
 *
 * El acceso externo y HTTPS lo maneja Nginx (proxy inverso).
 * Este servidor solo escucha en 127.0.0.1 por seguridad.
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config';               // carga .env al proceso (debe ir primero)
import express from 'express';
import { testConnection } from './config/database.js';
import { cargar as cargarConfiguracion } from './services/configuracion.js';
import { inicializar as inicializarSesiones } from './services/sesiones.js';
import configuracionRouter from './routes/configuracion.routes.js';
import authRouter from './routes/auth.routes.js';
import usuariosRouter from './routes/usuarios.routes.js';
import medicionesRouter from './routes/mediciones.routes.js';
import { iniciarLimpiezaPeriodica } from './services/sesionUsuario.js';
import { corsMiddleware } from './middleware/cors.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/errores.js';

const app  = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';

// ── Middlewares ───────────────────────────────────────────────
app.disable('x-powered-by');

// Detrás de Nginx la conexión llega desde 127.0.0.1. Con esto, req.ip es
// la IP real del navegador (cabecera X-Forwarded-For que pone Nginx), y
// solo se confía en esa cabecera cuando viene del propio equipo.
app.set('trust proxy', 'loopback');

app.use(corsMiddleware);

// express.json: convierte el body JSON a objeto JS (límite explícito)
app.use(express.json({ limit: '100kb' }));

// ── Rutas ─────────────────────────────────────────────────────
// La API responde en dos prefijos:
//   /api/...  → desarrollo (el proxy de Vite reenvía la ruta completa)
//   /...      → producción (Nginx, con `proxy_pass http://127.0.0.1:4000/;`,
//               quita el prefijo /api antes de reenviar)
// Así funciona en ambos entornos sin modificar la configuración de Nginx.
const routers = [authRouter, usuariosRouter, configuracionRouter, medicionesRouter];
app.use('/api', routers);
app.use('/', routers);

// ── Errores (siempre en JSON) ─────────────────────────────────
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

// ── Arranque ──────────────────────────────────────────────────
async function arrancar() {
  await testConnection();
  try {
    await cargarConfiguracion();
    await inicializarSesiones();
  } catch (err) {
    console.error('[TMS] ✗ No se pudo cargar la configuración o las sesiones:', err.message);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('[TMS]   Falta una migración. Ejecuta: sudo mysql tms_db < server/migrations/003_configuracion.sql');
    }
    process.exit(1);
  }

  app.listen(PORT, HOST, () => {
    console.log(`\n[TMS] Servidor escuchando en http://${HOST}:${PORT} (${process.env.NODE_ENV || 'sin NODE_ENV'})`);
    console.log('[TMS] API disponible en /api (desarrollo) y en / (detrás de Nginx)');
    iniciarLimpiezaPeriodica();
  });
}

arrancar();
