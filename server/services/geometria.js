/**
 * services/geometria.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido a partir del paso de la sesión (funciones puras).
 *
 * El paso se elige al iniciar cada sesión (CLAUDE.md 7.0) y se aplica
 * igual en X, Y y Z:
 *
 *   paso  5 mm → malla 13 × 13, planos 0, 5, 10, 15, 20 → 845 puntos
 *   paso 10 mm → malla  7 ×  7, planos 0, 10, 20         → 147 puntos
 *   paso 20 mm → malla  4 ×  4, planos 0, 20             →  32 puntos
 *
 * (con la placa de 60 mm y z_max de 20 mm por defecto).
 * ─────────────────────────────────────────────────────────────
 */

/** Pasos permitidos en mm: 0,5 cm, 1 cm y 2 cm */
export const PASOS_MM = [5, 10, 20];

/** Medios en los que se mide */
export const MEDIOS = ['campo_magnetico', 'solucion_salina'];

/** Múltiplo común de todos los pasos: placa y z_max deben serlo */
export const MULTIPLO_GEOMETRIA = 20;

/**
 * Malla de un barrido.
 * @param {object} barrido  configuración { grid_size_mm, z_max_mm, ... }
 * @param {number} pasoMM   5, 10 o 20
 * @returns {{ pasoMM, gridSizeMM, gridN, ejeMM: number[], zLevels: number[], totalPuntos }}
 */
export function mallaDeBarrido(barrido, pasoMM) {
  const gridSizeMM = barrido.grid_size_mm;
  const gridN = Math.round(gridSizeMM / pasoMM) + 1;
  const ejeMM = Array.from({ length: gridN }, (_, i) => i * pasoMM);
  const zLevels = Array.from({ length: Math.round(barrido.z_max_mm / pasoMM) + 1 }, (_, i) => i * pasoMM);
  return { pasoMM, gridSizeMM, gridN, ejeMM, zLevels, totalPuntos: gridN * gridN * zLevels.length };
}

/**
 * Recorre la malla en el orden del barrido: x, luego y, luego z.
 * Devuelve el punto número `indice` (0..totalPuntos−1).
 */
export function puntoDeMalla(malla, indice) {
  const porPlano = malla.gridN * malla.gridN;
  const zIdx = Math.floor(indice / porPlano);
  const resto = indice % porPlano;
  const yIdx = Math.floor(resto / malla.gridN);
  const xIdx = resto % malla.gridN;
  return {
    xMM: malla.ejeMM[xIdx],
    yMM: malla.ejeMM[yIdx],
    zMM: malla.zLevels[zIdx],
    zIdx,
  };
}
