/**
 * config/barrido.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido y límites físicos vigentes.
 *
 * Desde la Fase 3 ya no hay constantes fijas: todo sale de la tabla
 * `configuracion` (services/configuracion.js) y del paso de cada
 * sesión (services/geometria.js, CLAUDE.md 7.0).
 * ─────────────────────────────────────────────────────────────
 */

import { obtener } from '../services/configuracion.js';
import { mallaDeZona, limitesDeBarrido } from '../services/geometria.js';
import { limiteSensorUT } from '../services/validacionConfiguracion.js';

/** Configuración de barrido vigente { limite_x_mm, limite_y_mm, limite_z_mm, standoff_mm, paso_predeterminado_mm } */
export const barridoVigente = () => obtener('barrido');


/**
 * Valor absoluto máximo que puede reportar el sensor por componente,
 * en µT: el fondo de escala del ADC con la ganancia vigente
 * (2047 / lsb_por_ga × 100; 249,6 µT con 1,9 Ga). Una lectura por
 * encima es una saturación o un error de la trama, y se rechaza.
 */
export const limiteCampoUT = () => limiteSensorUT(obtener('sensor'));

/**
 * Zona de muestreo de una sesión { x, y, z } en mm. Las anteriores a la
 * migración 007 no tienen zona guardada: se usa toda la base de la copia
 * de configuración que se guardó con ellas (o la vigente).
 */
export function zonaDeSesion(sesion) {
  if (sesion.zona_x_mm !== undefined && sesion.zona_x_mm !== null) {
    return { x: sesion.zona_x_mm, y: sesion.zona_y_mm, z: sesion.zona_z_mm };
  }
  return limitesDeBarrido(sesion.config_barrido ?? obtener('barrido'));
}

/** Malla de una sesión: su zona y su paso */
export const mallaDeSesion = sesion => mallaDeZona(zonaDeSesion(sesion), sesion.paso_mm);
