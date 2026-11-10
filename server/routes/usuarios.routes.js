/**
 * routes/usuarios.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC) — Administración de usuarios (solo admin)
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import {
  listarUsuarios, crearUsuario, actualizarUsuario, restablecerPassword,
} from '../controllers/usuarios.controller.js';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import {
  validarIdUsuario, validarNuevoUsuario, validarCambiosUsuario, validarPasswordNueva,
} from '../middleware/validar.js';

const router = Router();

// Todas exigen sesión y rol admin
const soloAdmin = [requiereLogin, requiereRol('admin')];

router.get  ('/usuarios',                          soloAdmin,                                          listarUsuarios);
router.post ('/usuarios',                          soloAdmin, validarNuevoUsuario,                     crearUsuario);
router.patch('/usuarios/:id',                      soloAdmin, validarIdUsuario, validarCambiosUsuario, actualizarUsuario);
router.post ('/usuarios/:id/restablecer-password', soloAdmin, validarIdUsuario, validarPasswordNueva,  restablecerPassword);

export default router;
