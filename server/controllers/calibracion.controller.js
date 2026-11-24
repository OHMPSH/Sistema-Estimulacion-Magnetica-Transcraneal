/**
 * controllers/calibracion.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — previsualizador de la bobina (2026-11-24)
 *
 *   getCalibracion    — GET    /calibracion           cualquier usuario con sesión
 *   iniciarCalibracion — POST  /calibracion [objetivo] operador o admin
 *   moverCalibracion  — PATCH  /calibracion {x_mm, y_mm, z_mm}  operador o admin
 *   terminarCalibracion — DELETE /calibracion        operador o admin
 *
 * Solo en modo real y sin sesión de medición abierta (409). Iniciar una
 * sesión o pasar a modo simulación termina la calibración (ver
 * mediciones.controller.js y configuracion.controller.js).
 * ─────────────────────────────────────────────────────────────
 */

import * as calibracion from '../services/calibracion.js';
import { sesionAbierta } from '../services/sesiones.js';
import { obtener } from '../services/configuracion.js';

function responder(res, next, err) {
  if (err instanceof calibracion.ErrorCalibracion) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  return next(err);
}

/** 409 si no se puede calibrar ahora (modo simulación o sesión abierta) */
function bloqueo() {
  if (obtener('modo_operacion') !== 'real') {
    return 'El previsualizador mueve la mesa real: cambia el modo de operación a Real (menú lateral).';
  }
  const abierta = sesionAbierta();
  if (abierta) return `Hay una sesión de medición en curso (la ${abierta.id}): detenla antes de calibrar.`;
  return null;
}

/** GET /calibracion */
export const getCalibracion = (_req, res) => {
  res.json({ ok: true, calibracion: calibracion.estadoPublico() });
};

/** POST /calibracion — activa la calibración (por defecto en el descanso) */
export const iniciarCalibracion = (req, res, next) => {
  const motivo = bloqueo();
  if (motivo) return res.status(409).json({ ok: false, error: motivo });
  try {
    res.status(201).json({ ok: true, calibracion: calibracion.iniciar(req.usuario.usuario, req.objetivo) });
  } catch (err) {
    responder(res, next, err);
  }
};

/** PATCH /calibracion — nuevo punto (mm de máquina) */
export const moverCalibracion = (req, res, next) => {
  const motivo = bloqueo();
  if (motivo) return res.status(409).json({ ok: false, error: motivo });
  try {
    res.json({ ok: true, calibracion: calibracion.mover(req.objetivo) });
  } catch (err) {
    responder(res, next, err);
  }
};

/** DELETE /calibracion — la termina; la Pico vuelve al descanso */
export const terminarCalibracion = (req, res) => {
  const terminada = calibracion.terminar(`la terminó ${req.usuario.usuario}`);
  res.json({ ok: true, terminada, calibracion: calibracion.estadoPublico() });
};
