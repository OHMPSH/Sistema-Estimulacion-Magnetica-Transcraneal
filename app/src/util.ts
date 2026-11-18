/**
 * Formato y geometría: equivalentes de frontend/src/utils/formato.js y utils/geometria.js
 * (mismo cálculo que server/services/geometria.js, con el recorrido en serpentina).
 */
const NB = ' ';

// ── Números ──
const cacheNumeros = new Map<number, Intl.NumberFormat>();
function formatoNumero(d: number) {
  if (!cacheNumeros.has(d)) {
    try { cacheNumeros.set(d, new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })); }
    catch { cacheNumeros.set(d, { format: (v: number) => v.toFixed(d) } as any); }
  }
  return cacheNumeros.get(d)!;
}
/** Número con decimales, o "—" si no hay valor (0 sí se muestra) */
export const numero = (v: any, d = 3) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '—' : formatoNumero(d).format(Number(v)));
/** Entero con separador de miles */
export const entero = (v: any) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : formatoNumero(0).format(Math.round(Number(v))));
const mm1 = (v: number) => { try { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(v); } catch { return String(Math.round(v * 10) / 10); } };

// ── Fechas (zona del laboratorio) ──
export function fechaHora(v: any, zona = 'America/Mexico_City') {
  if (!v) return '—';
  const f = new Date(v);
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium', timeZone: zona } as any).format(f); }
  catch { return f.toLocaleString('es-MX'); }
}
/** Hora con centésimas (tabla en vivo) */
export function horaPrecisa(v: any, zona = 'America/Mexico_City') {
  if (!v) return '—';
  const f = new Date(v);
  const cs = String(Math.floor(f.getMilliseconds() / 10)).padStart(2, '0');
  try { return `${new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: zona }).format(f)}.${cs}`; }
  catch { return `${f.toLocaleTimeString('es-MX', { hour12: false })}.${cs}`; }
}
/** AAAA-MM-DD en la zona dada (filtro por día) */
export function diaLocal(v: any, zona = 'America/Mexico_City') {
  try { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zona }).format(new Date(v)); }
  catch { return String(v).slice(0, 10); }
}
/** "16 nov 2026" a partir de AAAA-MM-DD */
export function etiquetaDia(dia: string) {
  const [a, m, d] = dia.split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return a && m && d ? `${d} ${meses[m - 1]} ${a}` : dia;
}
export function horaCorta(f: Date, zona?: string) {
  try { return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zona || undefined }).format(f); }
  catch { return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
}
/** mm:ss o h:mm:ss */
export function duracion(seg: number | null | undefined) {
  if (seg === null || seg === undefined || seg < 0 || !Number.isFinite(seg)) return '—';
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = Math.floor(seg % 60);
  const d = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${d(m)}:${d(s)}` : `${d(m)}:${d(s)}`;
}
/** "40 s", "3 min", "2 h" */
export const duracionCorta = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} h` : `${Math.floor(s / 86400)} d`);
/** "2 min 15 s", "1 h 05 min", "40 s" (useTiempoEstimado.tiempoAproximado de la web) */
export function tiempoAproximado(seg: number | null | undefined) {
  if (seg === null || seg === undefined || !Number.isFinite(seg)) return '—';
  const s = Math.round(seg);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}
export const ROLES_TEXTO: Record<string, string> = { admin: 'Administrador', operador: 'Operador', observador: 'Observador' };

// ── Geometría del barrido ──
export const PASOS_SUGERIDOS = [5, 10, 20];
export const PASO_MIN_MM = 1, PASO_MAX_MM = 300, MAX_PUNTOS_SESION = 25000;
export const MEDIOS = [
  { valor: 'campo_magnetico', etiqueta: 'Campo magnético', corta: 'Campo mag.' },
  { valor: 'solucion_salina', etiqueta: 'Solución salina con voltaje', corta: 'Sol. salina' },
];
export const MODOS = [{ valor: 'DC', etiqueta: 'DC — rápida' }, { valor: 'AC', etiqueta: 'AC — normal' }];
export const etiquetaMedio = (v: string) => MEDIOS.find(m => m.valor === v)?.etiqueta ?? v;
export const etiquetaMedioCorta = (v: string) => MEDIOS.find(m => m.valor === v)?.corta ?? v;
export const etiquetaModo = (v: string) => MODOS.find(m => m.valor === v)?.etiqueta ?? v;
export const etiquetaPaso = (v: any) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : `${mm1(Number(v))}${NB}mm`);
export const etiquetaZona = (z: any) => (z ? `${mm1(Number(z.x))}${NB}×${NB}${mm1(Number(z.y))}${NB}×${NB}${mm1(Number(z.z))}${NB}mm` : '—');

export const BARRIDO_POR_DEFECTO = { limite_x_mm: 60, limite_y_mm: 60, limite_z_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 };
export function limitesDeBarrido(b: any) {
  const c = b ?? BARRIDO_POR_DEFECTO;
  if (c.limite_x_mm !== undefined) return { x: c.limite_x_mm, y: c.limite_y_mm, z: c.limite_z_mm };
  return { x: c.grid_size_mm, y: c.grid_size_mm, z: c.z_max_mm };
}
const EPS = 1e-6;
export interface Zona { x: number; y: number; z: number }
export interface Malla { pasoMM: number; zona: Zona; gridNx: number; gridNy: number; zLevels: number[]; totalPuntos: number }
export function mallaDeZona(zona: Zona, pasoMM: number): Malla {
  const n = (l: number) => Math.floor(l / pasoMM + EPS) + 1;
  const gridNx = n(zona.x), gridNy = n(zona.y);
  const zLevels = Array.from({ length: n(zona.z) }, (_, i) => Math.round(i * pasoMM * 10) / 10);
  return { pasoMM, zona: { ...zona }, gridNx, gridNy, zLevels, totalPuntos: gridNx * gridNy * zLevels.length };
}
/** Malla de una sesión (con su zona y planos; las anteriores a la migración 007 usan los límites de la base) */
export function mallaDeSesion(sesion: any, barrido?: any): Malla {
  const zona: Zona = sesion.zona_mm ?? (sesion.zona_x_mm != null
    ? { x: Number(sesion.zona_x_mm), y: Number(sesion.zona_y_mm), z: Number(sesion.zona_z_mm) }
    : limitesDeBarrido(barrido));
  const m = mallaDeZona(zona, Number(sesion.paso_mm));
  return { ...m, zLevels: sesion.z_levels_mm ?? m.zLevels, totalPuntos: sesion.puntos_esperados ?? m.totalPuntos };
}
const leerMM = (t: any) => { const s = String(t ?? '').trim().replace(',', '.'); return /^\d{1,4}(\.\d)?$/.test(s) ? Number(s) : null; };
export function leerZona(textos: Record<string, string>, limites: Zona) {
  const valor: any = {}, errores: Record<string, string> = {};
  for (const eje of ['x', 'y', 'z'] as const) {
    const v = leerMM(textos[eje]);
    if (v === null) errores[eje] = 'Escribe mm con un decimal como máximo.';
    else if (v > limites[eje]) errores[eje] = `Máximo ${mm1(limites[eje])} mm (límite de la base).`;
    else valor[eje] = v;
  }
  return { valor: Object.keys(errores).length ? null : (valor as Zona), errores };
}
export function leerPaso(texto: string, zona?: Zona) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return { valor: null as number | null, error: 'Escribe el paso en mm.' };
  if (!/^\d{1,3}(\.\d)?$/.test(t)) return { valor: null, error: 'Usa un número en mm con un decimal como máximo (por ejemplo 5 o 2.5).' };
  const v = Number(t);
  if (v < PASO_MIN_MM || v > PASO_MAX_MM) return { valor: null, error: `El paso debe estar entre ${PASO_MIN_MM} y ${PASO_MAX_MM} mm.` };
  if (zona) {
    const total = mallaDeZona(zona, v).totalPuntos;
    if (total > MAX_PUNTOS_SESION) return { valor: null, error: `Con ${mm1(v)} mm serían ${entero(total)} puntos; el máximo es ${entero(MAX_PUNTOS_SESION)}. Usa un paso mayor o una zona menor.` };
  }
  return { valor: v, error: '' };
}
/** Índice del plano Z (con tolerancia), o −1 */
export const indicePlano = (zLevels: number[], zMM: number) => zLevels.findIndex(z => Math.abs(z - zMM) < EPS);
/** Número k del punto (ix, iy, iz) en la serpentina (docs/firmware-pico-w.md, sección 7) */
export function serpentinaDeIndices(nx: number, ny: number, ix: number, iy: number, iz: number) {
  const fila = iz % 2 === 0 ? iy : ny - 1 - iy;
  const g = iz * ny + fila;
  const c = g % 2 === 0 ? ix : nx - 1 - ix;
  return g * nx + c;
}
/** Índices (ix, iy, iz) del punto número k en la serpentina */
export function indicesDeSerpentina(nx: number, ny: number, k: number) {
  const porPlano = nx * ny, iz = Math.floor(k / porPlano), r = k % porPlano, fila = Math.floor(r / nx);
  const iy = iz % 2 === 0 ? fila : ny - 1 - fila;
  const g = iz * ny + fila;
  const ix = g % 2 === 0 ? r % nx : nx - 1 - (r % nx);
  return { ix, iy, iz };
}
/** Posición de una lectura en el orden del barrido (eje X de la gráfica de líneas), o null */
export function indiceEnMalla(m: Malla, x: number, y: number, z: number) {
  const ix = Math.round(x / m.pasoMM), iy = Math.round(y / m.pasoMM), iz = indicePlano(m.zLevels, z);
  if (iz === -1 || ix < 0 || iy < 0 || ix >= m.gridNx || iy >= m.gridNy) return null;
  return serpentinaDeIndices(m.gridNx, m.gridNy, ix, iy, iz);
}
