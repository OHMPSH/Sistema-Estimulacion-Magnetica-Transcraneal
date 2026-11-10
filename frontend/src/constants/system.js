/**
 * constants/system.js
 * ─────────────────────────────────────────────────────────────
 * Constantes de la interfaz.
 *
 * Desde la Fase 3, la geometría del barrido (malla, planos Z y total
 * de puntos) ya no está aquí: depende del paso de cada sesión y de la
 * configuración del servidor (ver utils/geometria.js). Tampoco están
 * los parámetros de la simulación, que ahora corre en el servidor.
 * ─────────────────────────────────────────────────────────────
 */

// ── Límites de la interfaz ────────────────────────────────────
// (pasan a la configuración de visualización en la Fase 6)
export const MAX_CHART_POINTS = 80;   // cuántas muestras muestra la gráfica de líneas
export const MAX_TABLE_ROWS   = 60;   // cuántas filas muestra la tabla

// ── Paleta de colores por plano Z (por índice: Z0, Z1, …) ─────
export const Z_COLORS_HEX = ['#00e5ff', '#00ffa3', '#ffe600', '#ff8c00', '#ff00c8'];
export const Z_COLORS_INT = [0x00e5ff,  0x00ffa3,  0xffe600,  0xff8c00,  0xff00c8];

// ── Colores de los componentes del campo ─────────────────────
export const COLOR_BX = '#00e5ff';   // cyan   — componente X
export const COLOR_BY = '#ff00c8';   // magenta — componente Y
export const COLOR_BZ = '#00ffa3';   // verde  — componente Z
