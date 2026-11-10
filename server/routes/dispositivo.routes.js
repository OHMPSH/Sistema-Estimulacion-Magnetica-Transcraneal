/**
 * routes/dispositivo.routes.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE RUTAS (MVC) — la Pico W (Fase 4)
 *
 *   GET    /dispositivo/estado       cualquier usuario con sesión
 *   POST   /dispositivo/token        admin (muestra el token una vez)
 *   DELETE /dispositivo/token        admin (revoca)
 *   PATCH  /dispositivo {activo}     admin
 *   POST   /dispositivo/latido       la Pico (Bearer)
 *   POST   /dispositivo/mediciones   la Pico (Bearer)
 * ─────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import {
  getEstado, generarToken, revocarToken, patchDispositivo, latido, lote,
} from '../controllers/dispositivo.controller.js';
import { requiereLogin, requiereRol, requiereDispositivo } from '../middleware/auth.js';
import { validarLatido, validarLoteDispositivo, validarCambiosDispositivo } from '../middleware/validar.js';

const router = Router();
const soloAdmin = [requiereLogin, requiereRol('admin')];

router.get   ('/dispositivo/estado',      requiereLogin,                            getEstado);
router.post  ('/dispositivo/token',       soloAdmin,                                generarToken);
router.delete('/dispositivo/token',       soloAdmin,                                revocarToken);
router.patch ('/dispositivo',             soloAdmin, validarCambiosDispositivo,     patchDispositivo);
router.post  ('/dispositivo/latido',      requiereDispositivo, validarLatido,       latido);
router.post  ('/dispositivo/mediciones',  requiereDispositivo, validarLoteDispositivo, lote);

export default router;
