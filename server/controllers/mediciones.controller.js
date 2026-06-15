/**
 * controllers/mediciones.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC)
 *
 * Recibe peticiones HTTP desde el frontend (Fetch API) o desde
 * el microcontrolador Pico 2W, ejecuta la lógica de negocio y
 * devuelve respuestas JSON.
 *
 * Funciones:
 *   getStatus        — GET  /api/status       health-check
 *   sseHandler       — GET  /api/stream        canal tiempo real
 *   iniciarSesion    — POST /api/sesiones       crea sesión en BD
 *   cerrarSesion     — PUT  /api/sesiones/:id   cierra sesión
 *   getSesiones      — GET  /api/sesiones       lista sesiones
 *   deleteSesion     — DELETE /api/sesiones/:id elimina sesión
 *   createMedicion   — POST /api/mediciones     inserta medición
 *   getMediciones    — GET  /api/sesiones/:id/mediciones
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';

// ── Canal SSE ────────────────────────────────────────────────
// Array de objetos Response de Express.
// Cuando llega una medición, se envía a todos los clientes.
let sseClients = [];

/** Envía datos a todos los clientes SSE conectados */
const broadcast = (event, data) => {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  // Recorrer la lista e intentar escribir en cada conexión abierta
  sseClients.forEach(({ res }) => {
    try { res.write(msg); } catch (_) { /* cliente ya desconectado */ }
  });
};

// ─────────────────────────────────────────────────────────────
// HEALTH-CHECK
// ─────────────────────────────────────────────────────────────

/** GET /api/status — el frontend lo llama cada 15 s */
export const getStatus = (_req, res) => {
  res.json({
    ok:      true,
    version: '3.0.0',
    uptime:  process.uptime(),         // segundos que lleva corriendo
    clientes: sseClients.length,       // cuántos dashboards conectados
  });
};

// ─────────────────────────────────────────────────────────────
// SSE — Server-Sent Events
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/stream
 * El frontend abre esta conexión UNA sola vez y queda
 * escuchando. Cada vez que llega una medición, el servidor
 * la empuja aquí sin que el cliente tenga que pedir nada.
 */
export const sseHandler = (req, res) => {
  // Cabeceras especiales para SSE
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // evita que Nginx almacene el stream
  res.flushHeaders();

  // Registrar este cliente en la lista
  const clientId = Date.now();
  sseClients.push({ id: clientId, res });
  console.log(`[SSE] +cliente ${clientId}. Total: ${sseClients.length}`);

  // Mantener viva la conexión con un ping cada 25 segundos
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 25_000);

  // Cuando el cliente cierra el navegador, limpiar
  req.on('close', () => {
    clearInterval(ping);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[SSE] -cliente ${clientId}. Total: ${sseClients.length}`);
  });
};

// ─────────────────────────────────────────────────────────────
// SESIONES
// ─────────────────────────────────────────────────────────────

/** POST /api/sesiones — crea una nueva sesión en MariaDB */
export const iniciarSesion = async (req, res) => {
  const { modo } = req.body; // 'DC' o 'AC'

  // Validar que se envió el modo
  if (!modo || !['DC', 'AC'].includes(modo)) {
    return res.status(400).json({ ok: false, error: 'modo debe ser DC o AC' });
  }

  try {
    // El modelo hace el INSERT y devuelve el ID
    const sesionId = await Medicion.crearSesion(modo);
    res.status(201).json({ ok: true, sesionId });
  } catch (err) {
    console.error('[sesion] Error al crear:', err.message);
    res.status(500).json({ ok: false, error: 'Error al crear sesión' });
  }
};

/** PUT /api/sesiones/:id — marca la sesión como terminada */
export const finalizarSesion = async (req, res) => {
  const sesionId = parseInt(req.params.id, 10);
  try {
    await Medicion.cerrarSesion(sesionId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sesion] Error al cerrar:', err.message);
    res.status(500).json({ ok: false, error: 'Error al cerrar sesión' });
  }
};

/** GET /api/sesiones — lista todas las sesiones con estadísticas */
export const getSesiones = async (_req, res) => {
  try {
    const sesiones = await Medicion.obtenerSesiones();
    res.json({ ok: true, data: sesiones });
  } catch (err) {
    console.error('[sesion] Error al listar:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener sesiones' });
  }
};

/** DELETE /api/sesiones/:id — elimina sesión y sus mediciones */
export const deleteSesion = async (req, res) => {
  const sesionId = parseInt(req.params.id, 10);
  try {
    await Medicion.eliminarSesion(sesionId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sesion] Error al eliminar:', err.message);
    res.status(500).json({ ok: false, error: 'Error al eliminar sesión' });
  }
};

// ─────────────────────────────────────────────────────────────
// MEDICIONES
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/mediciones
 * Recibe una lectura del Pico 2W, la guarda en MariaDB
 * y la reenvía en tiempo real al dashboard vía SSE.
 *
 * Body esperado: { sesionId, xMM, yMM, zMM, bx, by, bz }
 */
export const createMedicion = async (req, res) => {
  const { sesionId, xMM, yMM, zMM, bx, by, bz } = req.body;

  // Validar campos obligatorios
  const requeridos = ['sesionId', 'xMM', 'yMM', 'zMM', 'bx', 'by', 'bz'];
  const faltantes  = requeridos.filter(k => req.body[k] == null);
  if (faltantes.length > 0) {
    return res.status(400).json({
      ok: false,
      error: `Campos faltantes: ${faltantes.join(', ')}`,
    });
  }

  // Calcular magnitud del vector: |B| = √(Bx²+By²+Bz²)
  const magnitud = parseFloat(
    Math.sqrt(bx ** 2 + by ** 2 + bz ** 2).toFixed(4)
  );

  // Índice del plano Z (0=0mm, 1=5mm, 2=10mm, 3=15mm, 4=20mm)
  const Z_NIVELES = [0, 5, 10, 15, 20];
  const zIdx      = Z_NIVELES.indexOf(Number(zMM));

  // Objeto de medición completo
  const medicion = {
    sesionId: parseInt(sesionId, 10),
    xMM:    parseFloat(xMM),
    yMM:    parseFloat(yMM),
    zMM:    parseFloat(zMM),
    zIdx:   zIdx >= 0 ? zIdx : 0,
    bx:     parseFloat(bx),
    by:     parseFloat(by),
    bz:     parseFloat(bz),
    magnitud,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Guardar en MariaDB
    await Medicion.insertarMedicion(medicion.sesionId, medicion);

    // 2. Enviar al dashboard en tiempo real (SSE)
    broadcast('medicion', medicion);

    // 3. Responder al Pico 2W
    res.status(200).json({ ok: true, data: medicion });
  } catch (err) {
    console.error('[medicion] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al guardar medición' });
  }
};

/** GET /api/sesiones/:id/mediciones — exportar datos de una sesión */
export const getMedicionesDeSesion = async (req, res) => {
  const sesionId = parseInt(req.params.id, 10);
  try {
    const datos = await Medicion.obtenerMedicionesDeSesion(sesionId);
    res.json({ ok: true, data: datos });
  } catch (err) {
    console.error('[medicion] Error al exportar:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener mediciones' });
  }
};
