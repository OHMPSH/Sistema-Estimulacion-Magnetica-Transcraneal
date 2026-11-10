/**
 * controllers/mediciones.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — sesiones de medición y mediciones
 *
 *   getStatus        — GET    /api/status        health-check (público)
 *   sseHandler       — GET    /api/stream        canal en tiempo real
 *   iniciarSesion    — POST   /api/sesiones      {modo, paso_mm?, medio?}
 *   finalizarSesion  — PUT    /api/sesiones/:id  cierra la sesión
 *   getSesiones      — GET    /api/sesiones      lista (?modo=&paso_mm=&medio=&origen=)
 *   deleteSesion     — DELETE /api/sesiones/:id  elimina la sesión
 *   createMedicion   — POST   /api/mediciones    inserta una medición (solo modo real)
 *   getMedicionesDeSesion — GET /api/sesiones/:id/mediciones
 *
 * Las reglas de negocio viven en services/: sesiones.js (una sola
 * sesión abierta, simulador), ingesta.js (validar, guardar y difundir)
 * y tiempoReal.js (SSE).
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';
import * as sesiones from '../services/sesiones.js';
import { registrarMedicion, ErrorIngesta } from '../services/ingesta.js';
import { conectar, totalClientes } from '../services/tiempoReal.js';
import { obtener } from '../services/configuracion.js';

/** Traduce los errores conocidos de los servicios a su respuesta HTTP */
function responderError(res, next, err) {
  if (err instanceof sesiones.ErrorSesion) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  if (err instanceof ErrorIngesta) {
    return res.status(err.status).json({ ok: false, error: err.message, errores: err.errores });
  }
  return next(err);
}

// ── Health-check y SSE ───────────────────────────────────────

/** GET /api/status — el frontend lo llama cada 15 s */
export const getStatus = (_req, res) => {
  res.json({
    ok:             true,
    version:        '3.0.0',            // la versión real llega en la Fase 5
    uptime:         process.uptime(),
    clientes:       totalClientes(),
    modo_operacion: obtener('modo_operacion'),
  });
};

/** GET /api/stream — eventos medicion, sesion y configuracion */
export const sseHandler = (req, res) => conectar(req, res);

// ── Sesiones ─────────────────────────────────────────────────

/** POST /api/sesiones — crea la sesión (409 si ya hay otra abierta) */
export const iniciarSesion = async (req, res, next) => {
  try {
    const sesion = await sesiones.iniciar(req.nuevaSesion);
    // sesionId se mantiene por compatibilidad con el frontend anterior
    res.status(201).json({ ok: true, sesionId: sesion.id, sesion });
  } catch (err) {
    responderError(res, next, err);
  }
};

/** PUT /api/sesiones/:id — cierra la sesión y detiene el simulador */
export const finalizarSesion = async (req, res, next) => {
  try {
    const sesion = await sesiones.finalizar(req.idSesion, 'manual');
    res.json({ ok: true, sesion });
  } catch (err) {
    responderError(res, next, err);
  }
};

/** GET /api/sesiones — sesiones con estadísticas, filtradas */
export const getSesiones = async (req, res, next) => {
  try {
    res.json({ ok: true, data: await Medicion.obtenerSesiones(req.filtros), activa: sesiones.sesionAbierta() });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/sesiones/:id — elimina la sesión y sus mediciones */
export const deleteSesion = async (req, res, next) => {
  try {
    if (sesiones.sesionAbierta()?.id === req.idSesion) {
      return res.status(409).json({ ok: false, error: `La sesión ${req.idSesion} está en curso. Deténla antes de eliminarla.` });
    }
    const eliminada = await Medicion.eliminarSesion(req.idSesion);
    if (!eliminada) return res.status(404).json({ ok: false, error: `La sesión ${req.idSesion} no existe` });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ── Mediciones ───────────────────────────────────────────────

/**
 * POST /api/mediciones
 * En modo simulación responde 409: los datos los genera el simulador
 * del servidor. En modo real la usan operador y admin hasta que la
 * Fase 4 la reemplace por la ingesta de la Pico W.
 */
export const createMedicion = async (req, res, next) => {
  try {
    if (obtener('modo_operacion') === 'simulacion') {
      return res.status(409).json({
        ok: false,
        error: 'El sistema está en modo simulación: las mediciones las genera el simulador del servidor.',
      });
    }
    const { sesionId, ...lectura } = req.medicion;
    const abierta = sesiones.sesionAbierta();
    if (!abierta || abierta.id !== sesionId) {
      const estado = await Medicion.obtenerEstadoSesion(sesionId);
      if (!estado) return res.status(404).json({ ok: false, error: `La sesión ${sesionId} no existe` });
      return res.status(409).json({ ok: false, error: `La sesión ${sesionId} no está abierta` });
    }
    if (abierta.origen !== 'hw') {
      return res.status(409).json({ ok: false, error: `La sesión ${sesionId} es simulada: no acepta lecturas externas` });
    }
    const medicion = await registrarMedicion(abierta, lectura);
    res.status(201).json({ ok: true, data: medicion });
  } catch (err) {
    responderError(res, next, err);
  }
};

/** GET /api/sesiones/:id/mediciones — exportar datos de una sesión */
export const getMedicionesDeSesion = async (req, res, next) => {
  try {
    res.json({ ok: true, data: await Medicion.obtenerMedicionesDeSesion(req.idSesion) });
  } catch (err) {
    next(err);
  }
};
