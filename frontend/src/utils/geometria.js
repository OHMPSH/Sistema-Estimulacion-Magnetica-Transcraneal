/**
 * utils/geometria.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido según el paso de la sesión (CLAUDE.md 7.0).
 * Es el mismo cálculo que server/services/geometria.js: el paso se
 * aplica igual en X, Y y Z.
 *
 *   0,5 cm → 13 × 13 × 5 planos = 845 puntos
 *   1 cm   →  7 ×  7 × 3 planos = 147 puntos
 *   2 cm   →  4 ×  4 × 2 planos =  32 puntos
 * ─────────────────────────────────────────────────────────────
 */

/** Pasos de medición que se pueden elegir, en mm */
export const PASOS = [
  { mm: 5,  etiqueta: '0,5 cm' },
  { mm: 10, etiqueta: '1 cm' },
  { mm: 20, etiqueta: '2 cm' },
];

/** Medios en los que se mide */
export const MEDIOS = [
  { valor: 'campo_magnetico', etiqueta: 'Campo magnético',               corta: 'Campo mag.' },
  { valor: 'solucion_salina', etiqueta: 'Solución salina con voltaje',   corta: 'Sol. salina' },
];

export const MODOS = [
  { valor: 'DC', etiqueta: 'DC — rápida' },
  { valor: 'AC', etiqueta: 'AC — normal' },
];

export const etiquetaPaso  = mm => PASOS.find(p => p.mm === mm)?.etiqueta ?? `${mm} mm`;
export const etiquetaMedio = v  => MEDIOS.find(m => m.valor === v)?.etiqueta ?? v;
export const etiquetaMedioCorta = v => MEDIOS.find(m => m.valor === v)?.corta ?? v;
export const etiquetaModo  = v  => MODOS.find(m => m.valor === v)?.etiqueta ?? v;

/** Barrido por defecto, por si la configuración todavía no llegó */
export const BARRIDO_POR_DEFECTO = { grid_size_mm: 60, z_max_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 };

/**
 * Malla de un barrido.
 * @returns {{ pasoMM, gridSizeMM, gridN, zLevels: number[], totalPuntos }}
 */
export function mallaDePaso(barrido, pasoMM) {
  const b = barrido ?? BARRIDO_POR_DEFECTO;
  const gridN = Math.round(b.grid_size_mm / pasoMM) + 1;
  const zLevels = Array.from({ length: Math.round(b.z_max_mm / pasoMM) + 1 }, (_, i) => i * pasoMM);
  return { pasoMM, gridSizeMM: b.grid_size_mm, gridN, zLevels, totalPuntos: gridN * gridN * zLevels.length };
}

/**
 * Índice de una lectura en el orden del barrido (x → y → z), o null si
 * no cae en la malla. Es la "posición del barrido" del eje X de la
 * gráfica de líneas: un hueco deja un índice sin lectura.
 */
export function indiceEnMalla(malla, xMM, yMM, zMM) {
  const ix = Math.round(xMM / malla.pasoMM);
  const iy = Math.round(yMM / malla.pasoMM);
  const iz = malla.zLevels.indexOf(zMM);
  if (iz === -1 || ix < 0 || iy < 0 || ix >= malla.gridN || iy >= malla.gridN) return null;
  return (iz * malla.gridN + iy) * malla.gridN + ix;
}
