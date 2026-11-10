/**
 * services/trazabilidad.js
 * ─────────────────────────────────────────────────────────────
 * Cálculos de la Fase 5, puros (sin base de datos):
 *
 *   calcularHuecos(malla, posiciones)  — posiciones de la malla sin lectura válida
 *   encabezadoCSV(meta)                — líneas "# clave: valor" del CSV
 *   lineaCSV(medicion)                 — una fila del CSV, sin redondear
 * ─────────────────────────────────────────────────────────────
 */

import { puntoDeMalla, indicePlano, indiceDeMalla } from './geometria.js';

/** Máximo de posiciones que se guardan en `huecos.posiciones` */
export const MAX_HUECOS_LISTADOS = 1000;

/**
 * Una lectura cuenta para un punto de la malla si su posición está a
 * menos de esta distancia (en cada eje) del punto. Es el error
 * posicional pedido para la mesa XY (±1 mm). Las lecturas del
 * simulador caen exactas.
 */
export const TOLERANCIA_POSICION_MM = 1;

/**
 * Posiciones de la malla que no tienen ninguna lectura válida (no
 * saturada). Se recorren en el orden del barrido (x → y → z).
 * @param {object} malla       mallaDeZona(zona, paso)
 * @param {Array<{x_mm, y_mm, z_mm}>} posiciones  lecturas válidas
 * @returns {{ total: number, posiciones: {xMM, yMM, zMM}[] }}
 */
export function calcularHuecos(malla, posiciones) {
  const paso = malla.pasoMM;
  const cubiertos = new Set();
  for (const p of posiciones) {
    const ix = Math.round(p.x_mm / paso);
    const iy = Math.round(p.y_mm / paso);
    const i = indiceDeMalla(malla, ix, iy, indicePlano(malla.zLevels, p.z_mm));
    if (i === -1) continue;
    if (Math.abs(p.x_mm - ix * paso) > TOLERANCIA_POSICION_MM || Math.abs(p.y_mm - iy * paso) > TOLERANCIA_POSICION_MM) continue;
    cubiertos.add(i);
  }
  const lista = [];
  let total = 0;
  for (let i = 0; i < malla.totalPuntos; i++) {
    if (cubiertos.has(i)) continue;
    total += 1;
    if (lista.length < MAX_HUECOS_LISTADOS) {
      const { xMM, yMM, zMM } = puntoDeMalla(malla, i);
      lista.push({ xMM, yMM, zMM });
    }
  }
  return { total, posiciones: lista };
}

/** Escapa un valor para una línea "# clave: valor": sin saltos de línea */
export function escaparMeta(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return texto.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Encabezado de metadatos del CSV.
 * @param {Array<[string, any]>} pares  [clave, valor] en orden
 * @returns {string} líneas "# clave: valor\n"
 */
export function encabezadoCSV(pares) {
  return pares.map(([clave, valor]) => `# ${clave}: ${escaparMeta(valor)}\n`).join('');
}

export const COLUMNAS_CSV = [
  'timestamp_utc', 'ts_dispositivo_utc', 'seq', 'x_mm', 'y_mm', 'z_mm',
  'bx_uT', 'by_uT', 'bz_uT', 'magnitud_uT', 'raw_x', 'raw_y', 'raw_z', 'saturado',
];

const fecha = v => (v instanceof Date ? v.toISOString() : v ? new Date(v).toISOString() : '');
const numero = v => (v === null || v === undefined ? '' : String(v));

/** Una fila del CSV. Los números van completos (String de un DOUBLE: el más corto que lo representa) */
export function lineaCSV(m) {
  return [
    fecha(m.timestamp), fecha(m.ts_dispositivo), numero(m.seq),
    numero(m.x_mm), numero(m.y_mm), numero(m.z_mm),
    numero(m.bx), numero(m.by), numero(m.bz), numero(m.magnitud),
    numero(m.raw_x), numero(m.raw_y), numero(m.raw_z), m.saturado ? '1' : '0',
  ].join(',') + '\n';
}

/** Nombre del archivo: tms_sesion_<id>_<YYYYMMDDTHHMMSSZ>.csv */
export function nombreArchivoCSV(id, iniciadaEn) {
  const iso = new Date(iniciadaEn).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `tms_sesion_${id}_${iso}.csv`;
}
