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
 *   crear/cerrar sesión            operador o admin
 *   POST /mediciones               410 (retirada en la Fase 4)
 *   notas                          admin o el operador que la inició
 *   eliminar / restaurar sesión    admin (borrado lógico)
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
  medicionRetirada,
  getMedicionesDeSesion,
  restaurarSesion,
  patchSesion,
  getSesionActiva,
  getCsv,
} from '../controllers/mediciones.controller.js';
import {
  validarIdSesion, validarNuevaSesion, validarFiltrosSesiones, validarNotas,
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
router.post  ('/sesiones',               operador,  validarNuevaSesion, iniciarSesion);      // crear {modo, paso_mm?, medio?}
router.get   ('/sesiones/activa',        conSesion, getSesionActiva);                       // la abierta + sus mediciones
router.put   ('/sesiones/:id',           operador,  validarIdSesion, finalizarSesion);      // cerrar
router.patch ('/sesiones/:id',           operador,  validarIdSesion, validarNotas, patchSesion); // notas (admin o su operador)
router.get   ('/sesiones',               conSesion, validarFiltrosSesiones, getSesiones);   // listar (?modo&paso_mm&medio&origen&incluir_eliminadas)
router.delete('/sesiones/:id',           soloAdmin, validarIdSesion, deleteSesion);         // borrado lógico
router.post  ('/sesiones/:id/restaurar', soloAdmin, validarIdSesion, restaurarSesion);      // quita el borrado lógico
router.get   ('/sesiones/:id/csv',       conSesion, validarIdSesion, getCsv);               // CSV con metadatos

// Mediciones
// POST /mediciones se retiró en la Fase 4: responde 410 e indica la ruta
// nueva de la Pico W (POST /dispositivo/mediciones, con token).
router.post('/mediciones',              medicionRetirada);
router.get ('/sesiones/:id/mediciones', conSesion, validarIdSesion, getMedicionesDeSesion);  // exportar

export default router;
