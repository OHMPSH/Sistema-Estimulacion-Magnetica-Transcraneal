/**
 * routes/mediciones.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC)
 *
 * Solo declara qué URL llama a qué función del controlador.
 * Sin lógica aquí.
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

const router = Router();

// Health-check
router.get('/status', getStatus);

// Canal SSE para recibir mediciones en tiempo real
router.get('/stream', sseHandler);

// Sesiones
router.post  ('/sesiones',     iniciarSesion);    // crear
router.put   ('/sesiones/:id', finalizarSesion);  // cerrar
router.get   ('/sesiones',     getSesiones);       // listar
router.delete('/sesiones/:id', deleteSesion);     // eliminar

// Mediciones
router.post('/mediciones',                createMedicion);         // insertar
router.get ('/sesiones/:id/mediciones',   getMedicionesDeSesion);  // exportar

export default router;
