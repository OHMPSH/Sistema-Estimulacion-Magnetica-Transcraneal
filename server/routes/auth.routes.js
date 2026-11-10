/**
 * routes/auth.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC) — Login y cuenta propia
 *
 * Solo el login es público. Las demás rutas exigen sesión y son las
 * únicas que puede usar quien todavía debe cambiar su contraseña
 * (ver middleware/auth.js).
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import {
  login, logout, yo, cambiarPassword, guardarPreferencias,
} from '../controllers/auth.controller.js';
import { requiereLogin } from '../middleware/auth.js';
import { validarLogin, validarCambioPassword, validarPreferencias } from '../middleware/validar.js';

const router = Router();

router.post ('/auth/login',            validarLogin,                         login);
router.post ('/auth/logout',           requiereLogin,                        logout);
router.get  ('/auth/yo',               requiereLogin,                        yo);
router.post ('/auth/cambiar-password', requiereLogin, validarCambioPassword, cambiarPassword);
router.patch('/auth/preferencias',     requiereLogin, validarPreferencias,   guardarPreferencias);

export default router;
