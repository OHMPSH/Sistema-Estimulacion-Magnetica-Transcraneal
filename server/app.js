/**
 * app.js — La aplicación de Express, sin escuchar en ningún puerto
 * ─────────────────────────────────────────────────────────────
 * Separada de server.js (Fase 8) para que los tests de integración
 * puedan levantarla en un puerto aleatorio con otra base de datos.
 *
 *   crearApp()            — la app con middlewares, routers y errores
 *   iniciarServicios()    — carga la configuración, cierra las sesiones
 *                           huérfanas y carga el estado de la Pico W
 * ─────────────────────────────────────────────────────────────
 */

import express from 'express';
import { cargar as cargarConfiguracion } from './services/configuracion.js';
import { inicializar as inicializarSesiones } from './services/sesiones.js';
import { cargar as cargarDispositivo } from './services/dispositivo.js';
import configuracionRouter from './routes/configuracion.routes.js';
import authRouter from './routes/auth.routes.js';
import usuariosRouter from './routes/usuarios.routes.js';
import medicionesRouter from './routes/mediciones.routes.js';
import dispositivoRouter from './routes/dispositivo.routes.js';
import { corsMiddleware } from './middleware/cors.js';
import { rutaNoEncontrada, manejadorErrores } from './middleware/errores.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');

  // Detrás de Nginx la conexión llega desde 127.0.0.1. Con esto, req.ip es
  // la IP real del navegador (cabecera X-Forwarded-For que pone Nginx), y
  // solo se confía en esa cabecera cuando viene del propio equipo.
  app.set('trust proxy', 'loopback');

  app.use(corsMiddleware);
  app.use(express.json({ limit: '100kb' }));

  // La API responde en dos prefijos:
  //   /api/...  → desarrollo (el proxy de Vite reenvía la ruta completa)
  //   /...      → producción (Nginx, con `proxy_pass http://127.0.0.1:4000/;`,
  //               quita el prefijo /api antes de reenviar)
  // Así funciona en ambos entornos sin modificar la configuración de Nginx.
  const routers = [authRouter, usuariosRouter, configuracionRouter, medicionesRouter, dispositivoRouter];
  app.use('/api', routers);
  app.use('/', routers);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

/** Lo que hay que hacer antes de aceptar conexiones */
export async function iniciarServicios() {
  await cargarConfiguracion();
  await inicializarSesiones();
  await cargarDispositivo();
}
