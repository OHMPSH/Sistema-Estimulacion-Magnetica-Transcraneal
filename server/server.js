/**
 * server.js — Punto de entrada del servidor
 * ─────────────────────────────────────────────────────────────
 * TMS Sistema de Adquisición de Datos
 * Instituto Politécnico Nacional — ESIME Zacatenco
 *
 *   1. Carga las variables de entorno desde .env
 *   2. Crea la aplicación (app.js: middlewares, routers y errores)
 *   3. Verifica la conexión a MariaDB, carga la configuración, cierra
 *      las sesiones que quedaron abiertas y carga el estado de la Pico W
 *   4. Escucha en HOST:PORT y limpia cada hora las sesiones de login expiradas
 *
 * El acceso externo y HTTPS lo maneja Nginx (proxy inverso).
 * Este servidor solo escucha en 127.0.0.1 por seguridad.
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config';               // carga .env al proceso (debe ir primero)
import { testConnection } from './config/database.js';
import { crearApp, iniciarServicios } from './app.js';
import { iniciarLimpiezaPeriodica } from './services/sesionUsuario.js';
import { VERSION_SOFTWARE } from './services/version.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';

async function arrancar() {
  await testConnection();
  try {
    await iniciarServicios();
  } catch (err) {
    console.error('[TMS] ✗ No se pudo cargar la configuración, las sesiones o el dispositivo:', err.message);
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
      console.error('[TMS]   Falta una migración. Revisa server/migrations/ y ejecuta las que falten, en orden, por ejemplo:');
      console.error('[TMS]     sudo mysql tms_db < server/migrations/005_trazabilidad.sql');
    }
    process.exit(1);
  }

  crearApp().listen(PORT, HOST, () => {
    console.log(`\n[TMS] Servidor ${VERSION_SOFTWARE} escuchando en http://${HOST}:${PORT} (${process.env.NODE_ENV || 'sin NODE_ENV'})`);
    console.log('[TMS] API disponible en /api (desarrollo) y en / (detrás de Nginx)');
    iniciarLimpiezaPeriodica();
  });
}

arrancar();
