/**
 * routes/mediciones.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC)
 *
 * Solo declara qué URL llama a qué función del controlador,
 * con sus middleware de permisos y de validación. Sin lógica aquí.
 *
 * Permisos (Fase 2):
 *   /status                        público (única ruta sin sesión)
 *   /stream y los GET              cualquier usuario con sesión
 *   crear/cerrar sesión, medición  operador o admin
 *   eliminar sesión                admin
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
import {
  validarIdSesion, validarNuevaSesion, validarFiltrosSesiones, validarMedicion,
} from '../middleware/validar.js';
import { requiereLogin, requiereRol } from '../middleware/auth.js';

const router = Router();

const conSesion = requiereLogin;
const operador  = [requiereLogin, requiereRol('operador', 'admin')];
const soloAdmin = [requiereLogin, requiereRol('admin')];

// Health-check (público)
router.get('/status', getStatus);

// Canal SSE para recibir mediciones en tiempo real.
// EventSource envía la cookie de sesión porque es del mismo origen.
router.get('/stream', conSesion, sseHandler);

// Sesiones
router.post  ('/sesiones',     operador,  validarNuevaSesion, iniciarSesion);  // crear {modo, paso_mm?, medio?}
router.put   ('/sesiones/:id', operador,  validarIdSesion, finalizarSesion);  // cerrar
router.get   ('/sesiones',     conSesion, validarFiltrosSesiones, getSesiones); // listar (?modo&paso_mm&medio&origen)
router.delete('/sesiones/:id', soloAdmin, validarIdSesion, deleteSesion);     // eliminar

// Mediciones
// POST /mediciones: 409 en modo simulación (el simulador está en el servidor).
// En modo real la usan operador y admin hasta la Fase 4.
router.post('/mediciones',              operador,  validarMedicion, createMedicion);         // insertar
router.get ('/sesiones/:id/mediciones', conSesion, validarIdSesion, getMedicionesDeSesion);  // exportar

export default router;
