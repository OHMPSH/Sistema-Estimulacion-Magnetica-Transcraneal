/**
 * constants/system.js
 * ─────────────────────────────────────────────────────────────
 * Fuente única de verdad para todas las constantes del sistema.
 * Cambiar aquí afecta automáticamente a todos los componentes.
 * ─────────────────────────────────────────────────────────────
 */

// ── Geometría de la placa de medición ────────────────────────
export const GRID_N       = 13;          // puntos por eje X e Y (13×13 = 169 por plano)
export const GRID_SIZE_MM = 60;          // tamaño de la placa en mm (6 cm)
export const STEP_MM      = GRID_SIZE_MM / (GRID_N - 1); // separación entre puntos ≈ 5 mm

// ── Niveles de altura Z ───────────────────────────────────────
export const Z_LEVELS      = [0, 5, 10, 15, 20];         // alturas en mm
export const TOTAL_POINTS  = GRID_N * GRID_N * Z_LEVELS.length; // 13×13×5 = 845

// ── Límites de la interfaz ────────────────────────────────────
export const MAX_CHART_POINTS = 80;   // cuántas muestras muestra la gráfica de líneas
export const MAX_TABLE_ROWS   = 60;   // cuántas filas muestra la tabla

// ── Paleta de colores por nivel Z ────────────────────────────
// Cada plano Z tiene un color distinto para identificarlo en la vista 3D
export const Z_COLORS_HEX = ['#00e5ff', '#00ffa3', '#ffe600', '#ff8c00', '#ff00c8'];
export const Z_COLORS_INT = [0x00e5ff,  0x00ffa3,  0xffe600,  0xff8c00,  0xff00c8];

// ── Colores de los componentes del campo ─────────────────────
export const COLOR_BX = '#00e5ff';   // cyan   — componente X
export const COLOR_BY = '#ff00c8';   // magenta — componente Y
export const COLOR_BZ = '#00ffa3';   // verde  — componente Z

// ── Tasas de simulación ────────────────────────────────────────
// DC (campo estático): muestreo rápido
// AC (campo pulsado): muestreo más lento para capturar transitorios
export const SIM_RATE_MS = { DC: 60, AC: 120 };

// ── Parámetros físicos de la bobina TMS (simulación) ─────────
// Radio de la bobina circular en mm
export const BOBINA_RADIO_MM = 25;
// Intensidad máxima del campo en el centro de la bobina (μT)
export const CAMPO_MAXIMO_UT = 120;
