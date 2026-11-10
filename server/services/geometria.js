/**
 * services/geometria.js
 * ─────────────────────────────────────────────────────────────
 * Geometría del barrido (funciones puras).
 *
 * Cada sesión tiene su ZONA DE MUESTREO (tamaño en X, Y y Z, en mm) y su
 * PASO (en mm, igual en los tres ejes). Los dos los elige el operador al
 * iniciar (CLAUDE.md 7.0). La zona no puede pasar de los LÍMITES de la
 * base configurados en `barrido` (limite_x_mm, limite_y_mm, limite_z_mm).
 *
 * Coordenadas de la zona: x de 0 a zona.x, y de 0 a zona.y, z de 0 a
 * zona.z (z = 0 es el standoff). La zona va CENTRADA bajo la bobina: el
 * eje de la bobina está en (zona.x / 2, zona.y / 2).
 *
 * Los puntos van de 0 en adelante cada `paso` hasta el borde; si el paso
 * no divide la zona, el último punto queda antes del borde:
 *
 *   zona 60 × 60 × 20, paso 5 mm  → 13 × 13 × 5 planos = 845 puntos
 *   zona 40 × 20 × 10, paso 10 mm →  5 ×  3 × 2 planos =  30 puntos
 * ─────────────────────────────────────────────────────────────
 */

/** Pasos más usados (solo sugerencias: el paso es libre) */
export const PASOS_SUGERIDOS_MM = [5, 10, 20];

/** Límites del paso: el posicionamiento tiene ±1 mm de error, así que menos de 1 mm no aporta */
export const PASO_MIN_MM = 1;
export const PASO_MAX_MM = 300;

/** Máximo de puntos por sesión (el mapa 3D dibuja una flecha por punto) */
export const MAX_PUNTOS_SESION = 25000;

/** Tolerancia para comparar posiciones en mm (evita errores de coma flotante) */
const EPS = 1e-6;

/** Redondea a décimas de mm: i × 0,1 no da exacto en coma flotante */
export const redondearMM = v => Math.round(v * 10) / 10;

/** ¿Tiene como máximo un decimal? */
export const unDecimal = v => Math.abs(v * 10 - Math.round(v * 10)) < EPS;

/** Medios en los que se mide */
export const MEDIOS = ['campo_magnetico', 'solucion_salina'];

/**
 * Límites de la base { x, y, z } a partir de la configuración `barrido`.
 * Acepta la forma anterior a la migración 007 ({grid_size_mm, z_max_mm}),
 * que siguen teniendo las copias guardadas con las sesiones viejas.
 */
export function limitesDeBarrido(barrido) {
  if (barrido.limite_x_mm !== undefined) {
    return { x: barrido.limite_x_mm, y: barrido.limite_y_mm, z: barrido.limite_z_mm };
  }
  return { x: barrido.grid_size_mm, y: barrido.grid_size_mm, z: barrido.z_max_mm };
}

/**
 * Malla de una zona.
 * @param {{x:number, y:number, z:number}} zona  tamaño en mm
 * @param {number} pasoMM   paso en mm (≥ 1, hasta un decimal)
 * @returns {{ pasoMM, zona, gridNx, gridNy, ejeX: number[], ejeY: number[], zLevels: number[], totalPuntos }}
 */
export function mallaDeZona(zona, pasoMM) {
  const eje = largo => Array.from({ length: Math.floor(largo / pasoMM + EPS) + 1 }, (_, i) => redondearMM(i * pasoMM));
  const ejeX = eje(zona.x);
  const ejeY = eje(zona.y);
  const zLevels = eje(zona.z);
  return {
    pasoMM, zona: { x: zona.x, y: zona.y, z: zona.z },
    gridNx: ejeX.length, gridNy: ejeY.length, ejeX, ejeY, zLevels,
    totalPuntos: ejeX.length * ejeY.length * zLevels.length,
  };
}

/** Malla de toda la base (la zona más grande permitida) */
export const mallaDeBarrido = (barrido, pasoMM) => mallaDeZona(limitesDeBarrido(barrido), pasoMM);

/**
 * Recorre la malla en el orden del barrido: x, luego y, luego z.
 * Devuelve el punto número `indice` (0..totalPuntos−1).
 */
export function puntoDeMalla(malla, indice) {
  const porPlano = malla.gridNx * malla.gridNy;
  const zIdx = Math.floor(indice / porPlano);
  const resto = indice % porPlano;
  const yIdx = Math.floor(resto / malla.gridNx);
  const xIdx = resto % malla.gridNx;
  return {
    xMM: malla.ejeX[xIdx],
    yMM: malla.ejeY[yIdx],
    zMM: malla.zLevels[zIdx],
    zIdx,
  };
}

/** Índice de (ix, iy, iz) en el orden del barrido, o −1 si cae fuera */
export function indiceDeMalla(malla, ix, iy, iz) {
  if (iz < 0 || iz >= malla.zLevels.length || ix < 0 || iy < 0 || ix >= malla.gridNx || iy >= malla.gridNy) return -1;
  return (iz * malla.gridNy + iy) * malla.gridNx + ix;
}

/** Índice del plano Z que corresponde a `zMM` (con tolerancia), o −1 */
export const indicePlano = (zLevels, zMM) => zLevels.findIndex(z => Math.abs(z - zMM) < EPS);

/**
 * Errores de una zona escrita por el usuario (vacío si es válida).
 * @param {*} zona          valor recibido ({x, y, z} en mm)
 * @param {object} limites  { x, y, z } de la base
 */
export function erroresDeZona(zona, limites, nombre = 'zona_mm') {
  if (zona === null || typeof zona !== 'object' || Array.isArray(zona)) return [`${nombre} debe ser un objeto {x, y, z} en mm`];
  const errores = [];
  for (const eje of ['x', 'y', 'z']) {
    const v = zona[eje];
    if (typeof v !== 'number' || !Number.isFinite(v)) errores.push(`${nombre}.${eje} debe ser un número en mm`);
    else if (v < 0 || v > limites[eje] + EPS) errores.push(`${nombre}.${eje} debe estar entre 0 y ${limites[eje]} mm (límite de la base)`);
    else if (!unDecimal(v)) errores.push(`${nombre}.${eje} admite como máximo un decimal`);
  }
  const desconocidas = Object.keys(zona).filter(k => !['x', 'y', 'z'].includes(k));
  if (desconocidas.length) errores.push(`${nombre} solo admite x, y, z (sobra: ${desconocidas.join(', ')})`);
  return errores;
}

/**
 * Errores de un paso escrito por el usuario (vacío si es válido).
 * @param {*} paso          valor recibido
 * @param {object} zona     { x, y, z } en mm (ya validada)
 * @param {string} [nombre] nombre del campo para el mensaje
 */
export function erroresDePaso(paso, zona, nombre = 'paso_mm') {
  if (typeof paso !== 'number' || !Number.isFinite(paso)) return [`${nombre} debe ser un número en mm`];
  if (paso < PASO_MIN_MM || paso > PASO_MAX_MM) return [`${nombre} debe estar entre ${PASO_MIN_MM} y ${PASO_MAX_MM} mm`];
  if (!unDecimal(paso)) return [`${nombre} admite como máximo un decimal (por ejemplo 2.5)`];
  const total = mallaDeZona(zona, paso).totalPuntos;
  if (total > MAX_PUNTOS_SESION) {
    return [`Con ${paso} mm de paso en esa zona serían ${total} puntos; el máximo por sesión es ${MAX_PUNTOS_SESION}. Usa un paso mayor o una zona menor`];
  }
  return [];
}
