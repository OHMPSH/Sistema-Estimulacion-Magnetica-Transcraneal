/**
 * utils/geometria.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido según el paso de la sesión (CLAUDE.md 7.0).
 * Es el mismo cálculo que server/services/geometria.js: el paso lo
 * escribe el operador (en mm, con hasta un decimal) y se aplica igual
 * en X, Y y Z, dentro de la zona de muestreo de la sesión (X × Y × Z, sin
 * pasar de los límites de la base). Si no divide la zona, el último punto
 * queda antes del borde.
 *
 *   5 mm  → 13 × 13 × 5 planos = 845 puntos
 *   7 mm  →  9 ×  9 × 3 planos = 243 puntos
 *   20 mm →  4 ×  4 × 2 planos =  32 puntos
 * ─────────────────────────────────────────────────────────────
 */

/** Pasos más usados: solo sugerencias (el paso es libre) */
export const PASOS_SUGERIDOS = [5, 10, 20];

/** Límites del paso (los mismos que valida el servidor) */
export const PASO_MIN_MM = 1;
export const PASO_MAX_MM = 300;
export const MAX_PUNTOS_SESION = 25000;

const EPS = 1e-6;
const redondearMM = v => Math.round(v * 10) / 10;
const mm = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

/** "5 mm", "2.5 mm" (es-MX usa punto decimal) */
export const etiquetaPaso = v => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : `${mm.format(Number(v))}\u00a0mm`);

/** Límites de la base { x, y, z } (acepta la forma vieja {grid_size_mm, z_max_mm}) */
export function limitesDeBarrido(barrido) {
  const b = barrido ?? BARRIDO_POR_DEFECTO;
  if (b.limite_x_mm !== undefined) return { x: b.limite_x_mm, y: b.limite_y_mm, z: b.limite_z_mm };
  return { x: b.grid_size_mm, y: b.grid_size_mm, z: b.z_max_mm };
}

const leerMM = texto => {
  const t = String(texto ?? '').trim().replace(',', '.');
  return /^\d{1,4}(\.\d)?$/.test(t) ? Number(t) : null;
};

/**
 * Lee la zona de muestreo escrita por el usuario ({x, y, z} como texto).
 * @returns {{ valor: {x,y,z}|null, errores: {x?,y?,z?} }}
 */
export function leerZona(textos, limites) {
  const valor = {};
  const errores = {};
  for (const eje of ['x', 'y', 'z']) {
    const v = leerMM(textos[eje]);
    if (v === null) errores[eje] = 'Escribe mm con un decimal como máximo.';
    else if (v > limites[eje]) errores[eje] = `Máximo ${mm.format(limites[eje])} mm (límite de la base).`;
    else valor[eje] = v;
  }
  return { valor: Object.keys(errores).length ? null : valor, errores };
}

/**
 * Lee el paso escrito por el usuario ("7", "2,5", "2.5") para una zona.
 * @returns {{ valor: number|null, error: string }}
 */
export function leerPaso(texto, zona) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return { valor: null, error: 'Escribe el paso en mm.' };
  if (!/^\d{1,3}(\.\d)?$/.test(t)) return { valor: null, error: 'Usa un número en mm con un decimal como máximo (por ejemplo 5 o 2.5).' };
  const valor = Number(t);
  if (valor < PASO_MIN_MM || valor > PASO_MAX_MM) {
    return { valor: null, error: `El paso debe estar entre ${PASO_MIN_MM} y ${PASO_MAX_MM} mm.` };
  }
  if (zona) {
    const total = mallaDeZona(zona, valor).totalPuntos;
    if (total > MAX_PUNTOS_SESION) {
      return { valor: null, error: `Con ${mm.format(valor)} mm serían ${total.toLocaleString('es-MX')} puntos; el máximo es ${MAX_PUNTOS_SESION.toLocaleString('es-MX')}. Usa un paso mayor o una zona menor.` };
    }
  }
  return { valor, error: '' };
}

/** Medios en los que se mide */
export const MEDIOS = [
  { valor: 'campo_magnetico', etiqueta: 'Campo magnético',               corta: 'Campo mag.' },
  { valor: 'solucion_salina', etiqueta: 'Solución salina con voltaje',   corta: 'Sol. salina' },
];

export const MODOS = [
  { valor: 'DC', etiqueta: 'DC — rápida' },
  { valor: 'AC', etiqueta: 'AC — normal' },
];

export const etiquetaMedio = v  => MEDIOS.find(m => m.valor === v)?.etiqueta ?? v;
export const etiquetaMedioCorta = v => MEDIOS.find(m => m.valor === v)?.corta ?? v;
export const etiquetaModo  = v  => MODOS.find(m => m.valor === v)?.etiqueta ?? v;

/** Barrido por defecto, por si la configuración todavía no llegó */
export const BARRIDO_POR_DEFECTO = { limite_x_mm: 60, limite_y_mm: 60, limite_z_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 };

/**
 * Malla de una zona de muestreo { x, y, z } (mm) con un paso (mm).
 * Mismo cálculo que server/services/geometria.js.
 * @returns {{ pasoMM, zona, gridNx, gridNy, zLevels: number[], totalPuntos }}
 */
export function mallaDeZona(zona, pasoMM) {
  const n = largo => Math.floor(largo / pasoMM + EPS) + 1;
  const gridNx = n(zona.x);
  const gridNy = n(zona.y);
  const zLevels = Array.from({ length: n(zona.z) }, (_, i) => redondearMM(i * pasoMM));
  return { pasoMM, zona: { ...zona }, gridNx, gridNy, zLevels, totalPuntos: gridNx * gridNy * zLevels.length };
}

/** "60 × 60 × 20 mm" */
export const etiquetaZona = z => (z ? `${mm.format(z.x)}\u00a0×\u00a0${mm.format(z.y)}\u00a0×\u00a0${mm.format(z.z)}\u00a0mm` : '—');

/**
 * Índice de una lectura en el orden del barrido, o null si no cae en la
 * malla. Es la "posición en el barrido" del eje X de la gráfica de líneas:
 * un hueco deja un índice sin lectura.
 *
 * El barrido va en SERPENTINA, como la Pico y el simulador (contrato en
 * docs/firmware-pico-w.md, sección 7; mismo cálculo que indiceDeMalla en
 * server/services/geometria.js): X avanza y regresa en filas alternas, y
 * cada plano Z se recorre desde donde quedó el anterior.
 *   fila = iy (iz par) o ny − 1 − iy (iz impar);  g = iz·ny + fila
 *   c    = ix (g par) o nx − 1 − ix (g impar);    k = g·nx + c
 */
export function indiceEnMalla(malla, xMM, yMM, zMM) {
  const ix = Math.round(xMM / malla.pasoMM);
  const iy = Math.round(yMM / malla.pasoMM);
  const iz = indicePlano(malla.zLevels, zMM);
  if (iz === -1 || ix < 0 || iy < 0 || ix >= malla.gridNx || iy >= malla.gridNy) return null;
  return serpentinaDeIndices(malla.gridNx, malla.gridNy, ix, iy, iz);
}

/** Número k del punto (ix, iy, iz) en la serpentina */
export function serpentinaDeIndices(nx, ny, ix, iy, iz) {
  const fila = iz % 2 === 0 ? iy : ny - 1 - iy;
  const g = iz * ny + fila;
  const c = g % 2 === 0 ? ix : nx - 1 - ix;
  return g * nx + c;
}

/** Índices (ix, iy, iz) del punto número k en la serpentina (lo inverso) */
export function indicesDeSerpentina(nx, ny, k) {
  const porPlano = nx * ny;
  const iz = Math.floor(k / porPlano);
  const r = k % porPlano;
  const fila = Math.floor(r / nx);
  const iy = iz % 2 === 0 ? fila : ny - 1 - fila;
  const g = iz * ny + fila;
  const ix = g % 2 === 0 ? r % nx : nx - 1 - (r % nx);
  return { ix, iy, iz };
}

/** Índice del plano Z (con tolerancia de coma flotante), o −1 */
export const indicePlano = (zLevels, zMM) => zLevels.findIndex(z => Math.abs(z - zMM) < EPS);

/** Clase de color de un plano: hay 5 colores y se repiten si hay más planos */
export const clasePlano = i => `z${((i % 5) + 5) % 5}`;
