/**
 * routes/configuracion.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC) — configuración del sistema
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { getConfiguracion, putConfiguracion } from '../controllers/configuracion.controller.js';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import { validarClaveConfiguracion } from '../middleware/validar.js';

const router = Router();

router.get('/configuracion',        requiereLogin,                                                getConfiguracion);
router.put('/configuracion/:clave', requiereLogin, requiereRol('admin'), validarClaveConfiguracion, putConfiguracion);

export default router;
