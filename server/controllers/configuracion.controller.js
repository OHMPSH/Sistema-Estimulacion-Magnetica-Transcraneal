/**
 * controllers/configuracion.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — configuración del sistema
 *
 *   getConfiguracion     — GET /api/configuracion           (cualquier usuario con sesión)
 *   putConfiguracion     — PUT /api/configuracion/:clave {valor}  (solo admin)
 *
 * modo_operacion, barrido y sensor no se pueden cambiar con una
 * sesión abierta (409): cambiarían el significado de los datos a
 * mitad de un barrido.
 * ─────────────────────────────────────────────────────────────
 */

import * as configuracion from '../services/configuracion.js';
import { sesionAbierta } from '../services/sesiones.js';
import { PASOS_SUGERIDOS_MM, PASO_MIN_MM, MAX_PUNTOS_SESION, MEDIOS } from '../services/geometria.js';
import { RANGOS_GA, GANANCIAS_HMC5883L } from '../services/validacionConfiguracion.js';

const BLOQUEADAS_CON_SESION = ['modo_operacion', 'barrido', 'sensor'];

/** GET /api/configuracion — todo, más las opciones fijas que la interfaz necesita */
export const getConfiguracion = (_req, res) => {
  res.json({
    ok: true,
    data: configuracion.obtenerTodo(),
    opciones: {
      pasos_sugeridos_mm: PASOS_SUGERIDOS_MM,
      paso_min_mm: PASO_MIN_MM,
      max_puntos_sesion: MAX_PUNTOS_SESION,
      medios: MEDIOS,
      ganancias_hmc5883l: RANGOS_GA.map(rango => ({ rango_ga: rango, lsb_por_ga: GANANCIAS_HMC5883L[rango] })),
    },
    sesion_activa: sesionAbierta(),
  });
};

/** PUT /api/configuracion/:clave — valida, guarda y difunde */
export const putConfiguracion = async (req, res, next) => {
  const clave = req.claveConfiguracion;
  try {
    const abierta = sesionAbierta();
    if (abierta && BLOQUEADAS_CON_SESION.includes(clave)) {
      return res.status(409).json({
        ok: false,
        error: `Hay una sesión de medición en curso (la ${abierta.id}). Detén la sesión antes de cambiar "${clave}".`,
      });
    }
    const { valor, errores } = await configuracion.actualizar(clave, req.valorConfiguracion, req.usuario.id);
    if (errores.length > 0) {
      return res.status(422).json({ ok: false, error: errores.join('; '), errores });
    }
    console.log(`[config] "${req.usuario.usuario}" cambió "${clave}".`);
    res.json({ ok: true, clave, valor });
  } catch (err) {
    next(err);
  }
};
