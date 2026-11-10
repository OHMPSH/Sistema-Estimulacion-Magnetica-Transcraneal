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
import { mallaDeBarrido } from '../services/geometria.js';
import { limiteSensorUT } from '../services/validacionConfiguracion.js';

/** Configuración de barrido vigente { grid_size_mm, z_max_mm, standoff_mm, paso_predeterminado_mm } */
export const barridoVigente = () => obtener('barrido');

/** Tamaño de la placa en mm: x e y válidos van de 0 a este valor */
export const tamanoPlacaMM = () => obtener('barrido').grid_size_mm;

/** Malla (ejes, planos Z y total de puntos) para un paso dado */
export const mallaParaPaso = pasoMM => mallaDeBarrido(obtener('barrido'), pasoMM);

/**
 * Valor absoluto máximo que puede reportar el sensor por componente,
 * en µT: el fondo de escala del ADC con la ganancia vigente
 * (2047 / lsb_por_ga × 100; 249,6 µT con 1,9 Ga). Una lectura por
 * encima es una saturación o un error de la trama, y se rechaza.
 */
export const limiteCampoUT = () => limiteSensorUT(obtener('sensor'));
