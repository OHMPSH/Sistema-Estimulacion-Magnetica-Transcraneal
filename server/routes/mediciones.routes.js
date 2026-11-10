/**
 * routes/mediciones.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC)
 *
 * Solo declara qué URL llama a qué función del controlador,
 * con su middleware de validación. Sin lógica aquí.
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import {
  getStatus,
  sseHandler,
  iniciarSesion,
  finalizarSesion,
  getSesiones,
  deleteSesion,
  createMedicion,
  getMedicionesDeSesion,
} from '../controllers/mediciones.controller.js';
import { validarIdSesion, validarModo, validarMedicion } from '../middleware/validar.js';

const router = Router();

// Health-check
router.get('/status', getStatus);

// Canal SSE para recibir mediciones en tiempo real
router.get('/stream', sseHandler);

// Sesiones
router.post  ('/sesiones',     validarModo,     iniciarSesion);    // crear
router.put   ('/sesiones/:id', validarIdSesion, finalizarSesion);  // cerrar
router.get   ('/sesiones',                      getSesiones);      // listar
router.delete('/sesiones/:id', validarIdSesion, deleteSesion);     // eliminar

// Mediciones
router.post('/mediciones',              validarMedicion, createMedicion);         // insertar
router.get ('/sesiones/:id/mediciones', validarIdSesion, getMedicionesDeSesion);  // exportar

export default router;
