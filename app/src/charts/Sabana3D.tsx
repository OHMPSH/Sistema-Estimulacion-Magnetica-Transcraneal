/**
 * Sábana 3D del campo (equivale a Superficie3D.jsx de la web, con Plotly): superficie del campo sobre el plano (x, y)
 * con estilo de figura científica.
 *   - Tema claro: figura blanca (planos #F8F9FA, rejilla #CCCCCC, texto #111111); tema oscuro: la misma sobre negro.
 *   - Viridis para |B| y RdBu (ColorBrewer, simétrica en 0) para Bx, By o Bz; sin contornos; barra de color con unidad.
 *   - Vista: «Huella máxima total» (en cada (x, y), el valor de mayor |valor| entre todas las alturas) o un plano Z.
 *   - Rango de color fijo para toda la sesión; las celdas sin lectura válida quedan vacías (sin interpolar).
 *   - Giro tipo turntable con el dedo, pellizco para acercar; un toque muestra el valor del punto más cercano.
 *   - Los datos se actualizan como máximo ~3 veces por segundo y nunca mientras se gira.
 *   - Exportación a SVG (vectorial), con los colores del tema que se ve.
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SText } from 'react-native-svg';
import { useStyles, useTheme } from '../theme';
import { Malla, numero } from '../util';
import type { Medicion } from '../store';
import { Icono, Mensaje, Selector } from '../ui';
import type { NombreIcono } from '../glifos';
import { useLento } from '../hooks';
import { compartirArchivo } from '../archivos';
import { aHex, colorEscala, decimalesDePaso, marcas, normalizar, producto, productoCruz, RDBU, V3, VIRIDIS, useOrbita } from './comun';

const FIGURAS = {
  claro: { texto: '#111111', fondo: '#FFFFFF', plano: '#F8F9FA', rejilla: '#CCCCCC', linea: '#888888', globo: '#FFFFFF' },
  oscuro: { texto: '#E6E8EC', fondo: '#000000', plano: '#0E1014', rejilla: '#3A3F47', linea: '#7A808A', globo: '#15181D' },
};
type Clave = 'magnitud' | 'bx' | 'by' | 'bz';
const MAGNITUDES: { valor: Clave; etiqueta: string; titulo: [string, string]; hover: string; escala: [number, string][]; conSigno: boolean }[] = [
  { valor: 'magnitud', etiqueta: '|B| (módulo)', titulo: ['|B|', ''], hover: '|B|', escala: VIRIDIS, conSigno: false },
  { valor: 'bz', etiqueta: 'Bz (componente)', titulo: ['B', 'z'], hover: 'Bz', escala: RDBU, conSigno: true },
  { valor: 'bx', etiqueta: 'Bx (componente)', titulo: ['B', 'x'], hover: 'Bx', escala: RDBU, conSigno: true },
  { valor: 'by', etiqueta: 'By (componente)', titulo: ['B', 'y'], hover: 'By', escala: RDBU, conSigno: true },
];
const FUENTE = 'Arial, Helvetica, sans-serif';
const r1 = (n: number) => Math.round(n * 10) / 10;
const ALTO = 330, ANCHO_BARRA = 72;
const VISTA_INICIAL = { a: Math.atan2(-1.5, 1.5), b: Math.atan2(1.1, Math.hypot(1.5, 1.5)), zoom: 1 };
const DIST = Math.hypot(1.5, -1.5, 1.1);

// ── Primitivas de la figura (se dibujan con react-native-svg y se exportan como texto SVG) ──
type Prim =
  | { k: 'path'; d: string; fill?: string; stroke?: string; sw?: number; op?: number }
  | { k: 'text'; x: number; y: number; t: string; sub?: string; size: number; color: string; anchor: 'start' | 'middle' | 'end'; rot?: number; negrita?: boolean };

interface Figura { prims: Prim[]; gradiente: { y1: number; y2: number; x: number; stops: [number, string][] } | null; vertices: { x: number; y: number; xmm: number; ymm: number; v: number }[] }

function construir(p: {
  matriz: (number | null)[][]; ejeX: number[]; ejeY: number[]; rango: { cmin: number; cmax: number; min: number; max: number };
  mag: (typeof MAGNITUDES)[number]; fig: (typeof FIGURAS)['claro']; W: number; H: number; vista: { a: number; b: number; zoom: number };
  zonaX: number; zonaY: number; reducido: boolean;
  /** Durante una medición en curso: como mucho 2 × 2 subdivisiones por celda (menos trabajo en cada redibujo) */
  enVivo?: boolean;
}): Figura {
  const { matriz, ejeX, ejeY, rango, mag, fig, W, H, vista } = p;
  const prims: Prim[] = [];
  const plotW = W - ANCHO_BARRA;
  // Caja de la escena: proporción real de la zona en x, y, y 0,7 en el eje vertical
  const ax = p.zonaX >= p.zonaY ? 1 : Math.max(0.2, p.zonaX / p.zonaY);
  const ay = p.zonaY >= p.zonaX ? 1 : Math.max(0.2, p.zonaY / p.zonaX);
  const az = 0.7;
  const x0 = ejeX[0], x1 = ejeX[ejeX.length - 1] > x0 ? ejeX[ejeX.length - 1] : x0 + 1;
  const y0 = ejeY[0], y1 = ejeY[ejeY.length - 1] > y0 ? ejeY[ejeY.length - 1] : y0 + 1;
  let zmin = rango.min, zmax = rango.max;
  if (zmax - zmin < 1e-9) { zmin -= 1; zmax += 1; }
  const mz = marcas(zmin, zmax, 5);
  const SX = (x: number) => -ax + ((x - x0) / (x1 - x0)) * 2 * ax;
  const SY = (y: number) => -ay + ((y - y0) / (y1 - y0)) * 2 * ay;
  const SZ = (v: number) => -az + ((v - zmin) / (zmax - zmin)) * 2 * az;

  // Cámara (turntable, eje z hacia arriba) y escala que encaja la caja en el área de la figura
  const cam = (a: number, b: number) => {
    const ojo: V3 = [DIST * Math.cos(b) * Math.cos(a), DIST * Math.cos(b) * Math.sin(a), DIST * Math.sin(b)];
    const f = normalizar([-ojo[0], -ojo[1], -ojo[2]]), r = normalizar(productoCruz(f, [0, 0, 1])), u = productoCruz(r, f);
    return { ojo, proy: (q: V3) => { const d: V3 = [q[0] - ojo[0], q[1] - ojo[1], q[2] - ojo[2]]; const zc = Math.max(1e-3, producto(d, f)); return [producto(d, r) / zc, producto(d, u) / zc, zc] as const; } };
  };
  const esquinas: V3[] = [];
  for (const sx of [-ax, ax]) for (const sy of [-ay, ay]) for (const sz of [-az, az]) esquinas.push([sx, sy, sz]);
  // Encuadre con la vista inicial (la diagonal, la más ancha): la caja llena el área dejando lugar a las etiquetas
  let x0p = Infinity, x1p = -Infinity, y0p = Infinity, y1p = -Infinity;
  const ci = cam(VISTA_INICIAL.a, VISTA_INICIAL.b);
  for (const e of esquinas) { const [x, y] = ci.proy(e); x0p = Math.min(x0p, x); x1p = Math.max(x1p, x); y0p = Math.min(y0p, y); y1p = Math.max(y1p, y); }
  const escala = Math.min((plotW - 2 * 26) / (x1p - x0p), (H - 2 * 40) / (y1p - y0p)) * vista.zoom;
  const c = cam(vista.a, vista.b);
  const cxp = plotW / 2 + 6 - ((x0p + x1p) / 2) * escala, cyp = H / 2 + ((y0p + y1p) / 2) * escala - 4;
  const P = (q: V3) => { const [x, y, z] = c.proy(q); return [cxp + x * escala, cyp - y * escala, z] as const; };
  const M = (q: V3) => { const [x, y] = P(q); return `${r1(x)} ${r1(y)}`; };

  // Paredes del fondo (las del lado lejano a la cámara) con su rejilla
  const xw = c.ojo[0] > 0 ? -ax : ax, yw = c.ojo[1] > 0 ? -ay : ay, zw = c.ojo[2] > 0 ? -az : az;
  const xf = -xw, yf = -yw;
  const mxs = marcas(x0, x1, 6).marcas.filter(v => v >= x0 - 1e-9 && v <= x1 + 1e-9);
  const mys = marcas(y0, y1, 6).marcas.filter(v => v >= y0 - 1e-9 && v <= y1 + 1e-9);
  const mzs = mz.marcas.filter(v => v >= zmin - 1e-9 && v <= zmax + 1e-9);
  const pared = (pts: V3[]) => `M${pts.map(M).join('L')}Z`;
  prims.push({ k: 'path', d: pared([[xw, -ay, -az], [xw, ay, -az], [xw, ay, az], [xw, -ay, az]]), fill: fig.plano });
  prims.push({ k: 'path', d: pared([[-ax, yw, -az], [ax, yw, -az], [ax, yw, az], [-ax, yw, az]]), fill: fig.plano });
  prims.push({ k: 'path', d: pared([[-ax, -ay, zw], [ax, -ay, zw], [ax, ay, zw], [-ax, ay, zw]]), fill: fig.plano });
  let rej = '';
  const lin = (a: V3, b: V3) => { rej += `M${M(a)}L${M(b)}`; };
  for (const v of mxs) { const x = SX(v); lin([x, yw, -az], [x, yw, az]); lin([x, -ay, zw], [x, ay, zw]); }
  for (const v of mys) { const y = SY(v); lin([xw, y, -az], [xw, y, az]); lin([-ax, y, zw], [ax, y, zw]); }
  for (const v of mzs) { const z = SZ(v); lin([xw, -ay, z], [xw, ay, z]); lin([-ax, yw, z], [ax, yw, z]); }
  prims.push({ k: 'path', d: rej, stroke: fig.rejilla, sw: 1 });

  // Superficie: un cuadro por celda con sus cuatro esquinas medidas (connectgaps: false)
  const nx = ejeX.length, ny = ejeY.length;
  const salto = p.reducido ? Math.max(1, Math.ceil(Math.max(nx, ny) / 30)) : 1;
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < nx; i += salto) xs.push(i); if (xs[xs.length - 1] !== nx - 1) xs.push(nx - 1);
  for (let j = 0; j < ny; j += salto) ys.push(j); if (ys[ys.length - 1] !== ny - 1) ys.push(ny - 1);
  const luz = normalizar([0.707, 0.707, 0.35]);
  const cuadros: { prof: number; color: string; d: string }[] = [];
  const vertices: Figura['vertices'] = [];
  const pos = (i: number, j: number): V3 | null => { const v = matriz[j]?.[i]; return v === null || v === undefined ? null : [SX(ejeX[i]), SY(ejeY[j]), SZ(v)]; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = matriz[j][i]; if (v === null) continue;
    const [x, y] = P([SX(ejeX[i]), SY(ejeY[j]), SZ(v)]);
    vertices.push({ x, y, xmm: ejeX[i], ymm: ejeY[j], v });
  }
  // Cada celda se divide en sub × sub cuadros con interpolación bilineal: el color cambia suave, como en Plotly
  const celdas = (xs.length - 1) * (ys.length - 1);
  const sub = p.reducido ? 1 : celdas <= 400 ? (p.enVivo ? 2 : 3) : celdas <= 1600 ? 2 : 1;
  const rangoC = rango.cmax - rango.cmin || 1;
  for (let jj = 0; jj < ys.length - 1; jj++) for (let ii = 0; ii < xs.length - 1; ii++) {
    const i = xs[ii], i2 = xs[ii + 1], j = ys[jj], j2 = ys[jj + 1];
    const A = pos(i, j), B = pos(i2, j), C = pos(i2, j2), D = pos(i, j2);
    if (!A || !B || !C || !D) continue;
    const v00 = matriz[j][i] as number, v10 = matriz[j][i2] as number, v11 = matriz[j2][i2] as number, v01 = matriz[j2][i] as number;
    const n = normalizar(productoCruz([C[0] - A[0], C[1] - A[1], C[2] - A[2]], [D[0] - B[0], D[1] - B[1], D[2] - B[2]]));
    const sombra = Math.min(1, 0.85 + 0.35 * Math.abs(producto(n, luz)) - 0.08);
    const X0 = A[0], X1 = B[0], Y0 = A[1], Y1 = D[1];
    const val = (u: number, w: number) => v00 * (1 - u) * (1 - w) + v10 * u * (1 - w) + v11 * u * w + v01 * (1 - u) * w;
    const punto = (u: number, w: number) => P([X0 + (X1 - X0) * u, Y0 + (Y1 - Y0) * w, SZ(val(u, w))]);
    for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) {
      const u0 = a / sub, u1 = (a + 1) / sub, w0 = b / sub, w1 = (b + 1) / sub;
      const media = (val(u0, w0) + val(u1, w0) + val(u1, w1) + val(u0, w1)) / 4;
      const col = colorEscala(mag.escala, (media - rango.cmin) / rangoC).map(q => Math.round((q * sombra) / 3) * 3);
      const pa = punto(u0, w0), pb = punto(u1, w0), pc = punto(u1, w1), pd = punto(u0, w1);
      cuadros.push({ prof: (pa[2] + pb[2] + pc[2] + pd[2]) / 4, color: aHex(col), d: `M${r1(pa[0])} ${r1(pa[1])}L${r1(pb[0])} ${r1(pb[1])}L${r1(pc[0])} ${r1(pc[1])}L${r1(pd[0])} ${r1(pd[1])}Z` });
    }
  }
  cuadros.sort((q1, q2) => q2.prof - q1.prof);   // de atrás hacia adelante
  for (const q of cuadros) {
    const u = prims[prims.length - 1];
    if (u && u.k === 'path' && u.fill === q.color && u.stroke === q.color && u.sw === 0.6) u.d += q.d;
    else prims.push({ k: 'path', d: q.d, fill: q.color, stroke: q.color, sw: 0.6 });
  }

  // Ejes: línea, marcas hacia fuera y etiquetas (en las aristas delanteras, como Plotly)
  const centro = P([0, 0, 0]);
  const eje = (a: V3, b: V3, valores: number[], aEscena: (v: number) => V3, deci: number, titulo: [string, string], esZ: boolean) => {
    prims.push({ k: 'path', d: `M${M(a)}L${M(b)}`, stroke: fig.linea, sw: 1 });
    const pa = P(a), pb = P(b);
    const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    let dx = mid[0] - centro[0], dy = mid[1] - centro[1];
    if (esZ) { dx = mid[0] < centro[0] ? -1 : 1; dy = 0; }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let marcasTxt = '';
    let maxLargo = 0;
    for (const v of valores) {
      const [x, y] = P(aEscena(v));
      marcasTxt += `M${r1(x)} ${r1(y)}L${r1(x + dx * 4)} ${r1(y + dy * 4)}`;
      const txt = numero(v, deci);
      maxLargo = Math.max(maxLargo, txt.length);
      prims.push({ k: 'text', x: x + dx * 8, y: y + dy * 8 + (dy > 0.4 ? 9 : dy < -0.4 ? -1 : 4), t: txt, size: 10.5, color: fig.texto, anchor: dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle' });
    }
    prims.push({ k: 'path', d: marcasTxt, stroke: fig.linea, sw: 1 });
    const sep = 16 + (Math.abs(dx) > 0.35 ? maxLargo * 5.6 : 6);
    let tx = mid[0] + dx * sep;
    const ty = Math.min(H - 6, mid[1] + dy * sep + (dy > 0.4 ? 10 : 4));
    if (esZ) { prims.push({ k: 'text', x: Math.max(10, tx), y: ty, t: titulo[0], sub: titulo[1], size: 11.5, color: fig.texto, anchor: 'middle', rot: -90 }); return; }
    // El título no se sale del área de la figura (ni se mete en la barra de color)
    const largoT = titulo[0].length * 6.3;
    const anchor: 'start' | 'end' | 'middle' = dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle';
    const ini = anchor === 'start' ? tx : anchor === 'end' ? tx - largoT : tx - largoT / 2;
    if (ini < 3) tx += 3 - ini;
    if (ini + largoT > plotW + 2) tx -= ini + largoT - (plotW + 2);
    prims.push({ k: 'text', x: tx, y: ty, t: titulo[0], size: 11.5, color: fig.texto, anchor });
  };
  const zEje = zw;
  eje([-ax, yf, zEje], [ax, yf, zEje], mxs, v => [SX(v), yf, zEje], decimalesDePaso(marcas(x0, x1, 6).paso), ['Posición X [mm]', ''], false);
  eje([xf, -ay, zEje], [xf, ay, zEje], mys, v => [xf, SY(v), zEje], decimalesDePaso(marcas(y0, y1, 6).paso), ['Posición Y [mm]', ''], false);
  // Arista vertical: la de la silueta más a la izquierda
  const cand: V3[] = [[xw, yf, 0], [xf, yw, 0]];
  const zc = P(cand[0])[0] < P(cand[1])[0] ? cand[0] : cand[1];
  eje([zc[0], zc[1], -az], [zc[0], zc[1], az], mzs, v => [zc[0], zc[1], SZ(v)], decimalesDePaso(mz.paso), [mag.titulo[0], mag.titulo[1] ? `${mag.titulo[1]} [µT]` : ' [µT]'], true);

  // Barra de color (thickness 16, len 0,75) con marcas hacia fuera y el título a la derecha
  const bx = plotW + 6, largo = H * 0.75, by1 = (H - largo) / 2, by2 = by1 + largo;
  prims.push({ k: 'path', d: `M${bx} ${r1(by1)}h16v${r1(largo)}h-16Z`, fill: 'url(#barraSabana)', stroke: fig.linea, sw: 1 });
  const mb = marcas(rango.cmin, rango.cmax, 6);
  let tb = '';
  for (const v of mb.marcas) {
    if (v < rango.cmin - 1e-9 || v > rango.cmax + 1e-9) continue;
    const y = by2 - ((v - rango.cmin) / (rango.cmax - rango.cmin || 1)) * largo;
    tb += `M${bx + 16} ${r1(y)}h3`;
    prims.push({ k: 'text', x: bx + 22, y: y + 3.5, t: numero(v, decimalesDePaso(mb.paso)), size: 10.5, color: fig.texto, anchor: 'start' });
  }
  prims.push({ k: 'path', d: tb, stroke: fig.linea, sw: 1 });
  prims.push({ k: 'text', x: W - 12, y: H / 2, t: mag.titulo[0], sub: mag.titulo[1] ? `${mag.titulo[1]} [µT]` : ' [µT]', size: 11.5, color: fig.texto, anchor: 'middle', rot: 90 });
  return { prims, gradiente: { y1: by2, y2: by1, x: bx, stops: mag.escala }, vertices };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** La misma figura como texto SVG (para exportar) */
function aSVG(f: Figura, W: number, H: number, fondo: string) {
  const g = f.gradiente!;
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}" viewBox="0 0 ${W} ${H}" font-family="${FUENTE}">`,
    `<defs><linearGradient id="barraSabana" x1="0" y1="${g.y1}" x2="0" y2="${g.y2}" gradientUnits="userSpaceOnUse">${g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="${fondo}"/>`];
  for (const p of f.prims) {
    if (p.k === 'path') partes.push(`<path d="${p.d}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 1}"` : ''}${p.stroke === p.fill ? ' stroke-linejoin="round"' : ''}/>`);
    else partes.push(`<text x="${r1(p.x)}" y="${r1(p.y)}" font-size="${p.size}" fill="${p.color}" text-anchor="${p.anchor}"${p.rot ? ` transform="rotate(${p.rot} ${r1(p.x)} ${r1(p.y)})"` : ''}>${esc(p.t)}${p.sub ? `<tspan font-size="${p.size * 0.75}" dy="3">${esc(p.sub.split(' ')[0])}</tspan><tspan dy="-3">${esc(p.sub.slice(p.sub.split(' ')[0].length))}</tspan>` : ''}</text>`);
  }
  partes.push('</svg>');
  return partes.join('\n');
}

export const Sabana3D = memo(function Sabana3D({ mediciones, malla, enCurso = false, sesionId, titulo = 'Sábana 3D del campo', ancho }: {
  mediciones: Medicion[]; malla: Malla; enCurso?: boolean; sesionId: number | null; titulo?: string; ancho: number;
}) {
  const t = useTheme(); const s = useStyles();
  const FIG = FIGURAS[t.claro ? 'claro' : 'oscuro'];
  const W = Math.max(220, ancho - 2), H = ALTO;
  const [toque, setToque] = useState<{ x: number; y: number } | null>(null);
  const o = useOrbita(VISTA_INICIAL, { bMin: -1.45, bMax: 1.45, zoomMin: 0.5, zoomMax: 3, ka: -0.01, kb: 0.01, alTocar: (x, y) => setToque({ x, y }) });

  // Mientras se gira no llegan datos nuevos; fuera de eso, como máximo ~3 redibujos por segundo
  const congelado = useRef(mediciones);
  if (!o.moviendo) congelado.current = mediciones;
  const datos = useLento(congelado.current, 350, enCurso);

  const [plano, setPlano] = useState<'ALL' | number>('ALL');
  const [clave, setClave] = useState<Clave>('magnitud');
  const [aviso, setAviso] = useState({ t: '', error: false });
  const mag = MAGNITUDES.find(m => m.valor === clave) ?? MAGNITUDES[0];
  const ultimoZ = datos.length ? datos[datos.length - 1].zMM : null;
  useEffect(() => { setPlano('ALL'); }, [sesionId]);
  useEffect(() => { if (enCurso && plano !== 'ALL' && ultimoZ !== null && plano !== ultimoZ) setPlano(ultimoZ); }, [enCurso, ultimoZ, plano]);

  const validas = useMemo(() => datos.filter(m => !m.saturado && m[clave] !== null && m[clave] !== undefined && Number.isFinite(Number(m[clave]))), [datos, clave]);
  const rango = useMemo(() => {
    if (!validas.length) return null;
    let min = Infinity, max = -Infinity;
    for (const m of validas) { const v = Number(m[clave]); if (v < min) min = v; if (v > max) max = v; }
    if (mag.conSigno) { const a = Math.max(Math.abs(min), Math.abs(max)) || 1; return { min, max, cmin: -a, cmax: a }; }
    return { min, max, cmin: min, cmax: max > min ? max : min + 1 };
  }, [validas, clave, mag.conSigno]);

  const { gridNx, gridNy, pasoMM } = malla;
  const ejeX = useMemo(() => Array.from({ length: gridNx }, (_, i) => Math.round(i * pasoMM * 10) / 10), [gridNx, pasoMM]);
  const ejeY = useMemo(() => Array.from({ length: gridNy }, (_, i) => Math.round(i * pasoMM * 10) / 10), [gridNy, pasoMM]);
  const matriz = useMemo(() => {
    const z: (number | null)[][] = Array.from({ length: gridNy }, () => Array(gridNx).fill(null));
    for (const m of validas) {
      if (plano !== 'ALL' && Math.abs(m.zMM - plano) > 1e-6) continue;
      const ix = Math.round(m.xMM / pasoMM), iy = Math.round(m.yMM / pasoMM);
      if (ix < 0 || iy < 0 || ix >= gridNx || iy >= gridNy) continue;
      const v = Number(m[clave]), a = z[iy][ix];
      z[iy][ix] = plano !== 'ALL' || a === null || Math.abs(v) > Math.abs(a) ? v : a;
    }
    return z;
  }, [validas, plano, gridNx, gridNy, pasoMM, clave]);
  // Rango del eje vertical: el de los valores dibujados (como el autorange de Plotly)
  const rangoVista = useMemo(() => {
    if (!rango) return null;
    let min = Infinity, max = -Infinity;
    for (const fila of matriz) for (const v of fila) if (v !== null) { if (v < min) min = v; if (v > max) max = v; }
    return Number.isFinite(min) ? { ...rango, min, max } : rango;
  }, [rango, matriz]);

  const figura = useMemo(() => (rangoVista && validas.length >= 4 ? construir({
    matriz, ejeX, ejeY, rango: rangoVista, mag, fig: FIG, W, H, vista: { a: o.a, b: o.b, zoom: o.zoom }, zonaX: malla.zona.x, zonaY: malla.zona.y, reducido: o.moviendo, enVivo: enCurso,
  }) : null), [matriz, ejeX, ejeY, rangoVista, mag, FIG, W, H, o.a, o.b, o.zoom, malla.zona.x, malla.zona.y, o.moviendo, validas.length, enCurso]);

  // Valor del punto más cercano al toque
  const elegido = useMemo(() => {
    if (!toque || !figura) return null;
    let mejor: Figura['vertices'][number] | null = null, d = 24;
    for (const v of figura.vertices) { const e = Math.hypot(v.x - toque.x, v.y - toque.y); if (e < d) { d = e; mejor = v; } }
    return mejor;
  }, [toque, figura]);
  useEffect(() => { setToque(null); }, [clave, plano, sesionId]);

  const archivo = `sabana3d_sesion${sesionId ?? 'actual'}_${clave}${plano === 'ALL' ? '_huella' : `_z${plano}mm`}.svg`;
  const exportar = async () => {
    if (!figura) return;
    const r = await compartirArchivo(archivo, aSVG(figura, W, H, FIG.fondo), 'image/svg+xml');
    setAviso(r.ok ? { t: `Figura lista: ${archivo}`, error: false } : { t: r.error ?? 'No se pudo exportar.', error: true });
  };

  const descripcion = plano === 'ALL'
    ? `Huella máxima total: en cada (x, y), el ${mag.conSigno ? `${mag.hover} de mayor valor absoluto` : 'mayor |B|'} entre todas las alturas medidas.`
    : `Plano Z = ${plano} mm.`;
  const resumen = rango
    ? `Sábana 3D de ${mag.hover} ${plano === 'ALL' ? '(huella máxima entre todas las alturas)' : `en el plano Z = ${plano} mm`}; ${validas.length} lecturas; de ${numero(rango.min, 1)} a ${numero(rango.max, 1)} µT.`
    : `Sábana 3D de ${mag.hover}: todavía no hay lecturas.`;
  const botones: [NombreIcono, string, () => void][] = [
    ['zoom-in', 'Acercar', () => o.mover(0, 0, 1.2)],
    ['zoom-out', 'Alejar', () => o.mover(0, 0, 1 / 1.2)],
    ['bullseye', 'Restablecer la cámara', () => { o.restablecer(); setToque(null); }],
    ['download', 'Descargar SVG (vectorial)', exportar],
  ];

  return (
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.chartTitle}>{titulo}</Text>
      <Text style={s.chartDesc}>{descripcion} Escala de color fija para toda la sesión; las celdas sin medir quedan vacías.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 }}>
        <Selector contenedor={{ flex: 1 }} etiqueta="Magnitud" opciones={MAGNITUDES.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))} valor={clave} onCambio={setClave} />
        <Selector contenedor={{ flex: 1 }} etiqueta="Vista" valor={plano === 'ALL' ? 'ALL' : String(plano)} onCambio={v => setPlano(v === 'ALL' ? 'ALL' : Number(v))}
          opciones={[{ valor: 'ALL', etiqueta: 'Huella máxima total' }, ...malla.zLevels.map(z => ({ valor: String(z), etiqueta: `Plano Z = ${z} mm` }))]} />
      </View>
      {!figura ? (
        <View style={{ height: 120, justifyContent: 'center' }}><Text style={[s.sec, { padding: 20 }]}>Construyendo la superficie… (hacen falta al menos 4 lecturas)</Text></View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }} accessibilityRole="toolbar">
            {botones.map(([ic, et, fn]) => (
              <Pressable key={ic} accessibilityRole="button" accessibilityLabel={et} onPress={fn}
                style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: pressed ? t.guindaBright : t.borderBright, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.bgCardHover : 'transparent' })}>
                <Icono nombre={ic} tam={15} />
              </Pressable>
            ))}
          </View>
          <View {...o.pan} accessible accessibilityRole="image" accessibilityLabel={resumen}
            style={{ height: H + 2, borderRadius: 8, borderWidth: 1, borderColor: t.border, overflow: 'hidden', backgroundColor: FIG.fondo }}>
            <Svg width={W} height={H}>
              <Defs>
                <LinearGradient id="barraSabana" x1="0" y1={figura.gradiente!.y1} x2="0" y2={figura.gradiente!.y2} gradientUnits="userSpaceOnUse">
                  {figura.gradiente!.stops.map(([of, c]) => <Stop key={of} offset={of} stopColor={c} />)}
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={W} height={H} fill={FIG.fondo} />
              {figura.prims.map((p, i) => p.k === 'path'
                ? <Path key={i} d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} strokeLinejoin="round" />
                : (
                  <SText key={i} x={p.x} y={p.y} fontSize={p.size} fill={p.color} textAnchor={p.anchor} fontFamily={FUENTE}
                    rotation={p.rot} originX={p.x} originY={p.y}>
                    {p.t}{p.sub ? `${p.sub}` : ''}
                  </SText>
                ))}
              {elegido && <G><Path d={`M${r1(elegido.x)} ${r1(elegido.y)}h0.01`} stroke={FIG.texto} strokeWidth={8} strokeLinecap="round" /><Path d={`M${r1(elegido.x)} ${r1(elegido.y)}h0.01`} stroke={FIG.fondo} strokeWidth={4} strokeLinecap="round" /></G>}
            </Svg>
            {elegido && (
              <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 8, backgroundColor: FIG.globo, borderWidth: 1, borderColor: FIG.linea, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8 }}>
                <Text style={{ color: FIG.texto, fontSize: 11 }}>X {elegido.xmm} mm{'\n'}Y {elegido.ymm} mm{'\n'}{mag.hover} {numero(elegido.v, 3)} µT</Text>
              </View>
            )}
          </View>
          <Text style={s.ayuda}>Arrastra para girar, pellizca para acercar y toca un punto para ver su valor.</Text>
          <Mensaje texto={aviso.t} error={aviso.error} />
        </>
      )}
    </View>
  );
});
