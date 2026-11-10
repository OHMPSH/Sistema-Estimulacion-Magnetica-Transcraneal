/**
 * controllers/mediciones.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC)
 *
 * Recibe peticiones HTTP desde el frontend (Fetch API) o desde
 * el microcontrolador Pico W, ejecuta la lógica de negocio y
 * devuelve respuestas JSON.
 *
 * Funciones:
 *   getStatus        — GET  /api/status       health-check
 *   sseHandler       — GET  /api/stream        canal tiempo real
 *   iniciarSesion    — POST /api/sesiones       crea sesión en BD
 *   finalizarSesion  — PUT  /api/sesiones/:id   cierra sesión
 *   getSesiones      — GET  /api/sesiones       lista sesiones
 *   deleteSesion     — DELETE /api/sesiones/:id elimina sesión
 *   createMedicion   — POST /api/mediciones     inserta medición
 *   getMediciones    — GET  /api/sesiones/:id/mediciones
 * ─────────────────────────────────────────────────────────────
 */

import { randomUUID } from 'node:crypto';
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
  const clientId = randomUUID();
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

/** POST /api/sesiones — crea una nueva sesión en MariaDB (modo validado) */
export const iniciarSesion = async (req, res) => {
  try {
    const sesionId = await Medicion.crearSesion(req.modo);
    res.status(201).json({ ok: true, sesionId });
  } catch (err) {
    console.error('[sesion] Error al crear:', err.message);
    res.status(500).json({ ok: false, error: 'Error al crear sesión' });
  }
};

/**
 * Responde 404 si la sesión no existe o 409 si ya está cerrada.
 * Se usa cuando una operación sobre una sesión abierta no afectó filas.
 */
const responderSesionNoDisponible = async (res, sesionId) => {
  const sesion = await Medicion.obtenerEstadoSesion(sesionId);
  if (!sesion) return res.status(404).json({ ok: false, error: `La sesión ${sesionId} no existe` });
  return res.status(409).json({ ok: false, error: `La sesión ${sesionId} ya está cerrada` });
};

/** PUT /api/sesiones/:id — marca la sesión como terminada */
export const finalizarSesion = async (req, res) => {
  try {
    const cerrada = await Medicion.cerrarSesion(req.idSesion);
    if (!cerrada) return await responderSesionNoDisponible(res, req.idSesion);
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
  try {
    const eliminada = await Medicion.eliminarSesion(req.idSesion);
    if (!eliminada) {
      return res.status(404).json({ ok: false, error: `La sesión ${req.idSesion} no existe` });
    }
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
 * Recibe una lectura (ya validada por validarMedicion), la guarda en
 * MariaDB y la reenvía en tiempo real al dashboard vía SSE.
 *
 * Body esperado: { sesionId, xMM, yMM, zMM, bx, by, bz }
 * Unidades: mm y μT. timestamp = hora de recepción del servidor (UTC).
 */
export const createMedicion = async (req, res) => {
  const { sesionId, xMM, yMM, zMM, zIdx, bx, by, bz } = req.medicion;

  // |B| = √(Bx²+By²+Bz²), sin redondear (el redondeo es solo de presentación)
  const magnitud  = Math.hypot(bx, by, bz);
  const timestamp = new Date();

  try {
    // 1. Guardar en MariaDB (solo si la sesión existe y está abierta)
    const insertada = await Medicion.insertarMedicion({
      sesionId, xMM, yMM, zMM, bx, by, bz, magnitud, timestamp,
    });
    if (!insertada) return await responderSesionNoDisponible(res, sesionId);

    const medicion = {
      sesionId, xMM, yMM, zMM, zIdx, bx, by, bz, magnitud,
      timestamp: timestamp.toISOString(),
    };

    // 2. Enviar al dashboard en tiempo real (SSE)
    broadcast('medicion', medicion);

    // 3. Responder al cliente (simulación o Pico W)
    res.status(201).json({ ok: true, data: medicion });
  } catch (err) {
    console.error('[medicion] Error:', err.message);
    res.status(500).json({ ok: false, error: 'Error al guardar medición' });
  }
};

/** GET /api/sesiones/:id/mediciones — exportar datos de una sesión */
export const getMedicionesDeSesion = async (req, res) => {
  try {
    const datos = await Medicion.obtenerMedicionesDeSesion(req.idSesion);
    res.json({ ok: true, data: datos });
  } catch (err) {
    console.error('[medicion] Error al exportar:', err.message);
    res.status(500).json({ ok: false, error: 'Error al obtener mediciones' });
  }
};
