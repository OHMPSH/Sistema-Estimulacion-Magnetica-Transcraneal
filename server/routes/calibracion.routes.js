/**
 * routes/calibracion.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC) — previsualizador de la bobina (2026-11-24)
 *
 *   GET    /calibracion                       cualquier usuario con sesión
 *   POST   /calibracion [{x_mm, y_mm, z_mm}]  operador o admin
 *   PATCH  /calibracion {x_mm, y_mm, z_mm}    operador o admin
 *   DELETE /calibracion                       operador o admin
 *
 * La Pico manda sus lecturas a POST /dispositivo/calibracion (dispositivo.routes.js).
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import {
  getCalibracion, iniciarCalibracion, moverCalibracion, terminarCalibracion,
} from '../controllers/calibracion.controller.js';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import { validarInicioCalibracion, validarObjetivoCalibracion } from '../middleware/validar.js';

const router = Router();
const operador = [requiereLogin, requiereRol('admin', 'operador')];

router.get   ('/calibracion', requiereLogin,                         getCalibracion);
router.post  ('/calibracion', operador, validarInicioCalibracion,    iniciarCalibracion);
router.patch ('/calibracion', operador, validarObjetivoCalibracion,  moverCalibracion);
router.delete('/calibracion', operador,                              terminarCalibracion);

export default router;
