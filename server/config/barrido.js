/**
 * config/barrido.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido y límites físicos que el servidor usa
 * para validar las mediciones. Deben coincidir con
 * frontend/src/constants/system.js.
 *
 * (En la Fase 3 estos valores pasan a la tabla de configuración.)
 * ─────────────────────────────────────────────────────────────
 */

/** Tamaño de la placa en mm: x e y válidos van de 0 a este valor */
export const GRID_SIZE_MM = 60;

/** Alturas válidas del sensor en mm (planos Z0..Z4) */
export const Z_LEVELS = [0, 5, 10, 15, 20];

/**
 * Valor absoluto máximo aceptado por componente, en μT.
 * El HMC5883L satura en ±8.1 Ga (= ±810 μT) en su rango más amplio;
 * se deja margen para no rechazar lecturas válidas cerca del límite.
 */
export const B_MAX_UT = 1000;
