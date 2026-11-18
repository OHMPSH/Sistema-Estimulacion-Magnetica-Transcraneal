/**
 * Utilidades de las gráficas: escalas de color (Viridis y RdBu de ColorBrewer, las mismas de la web),
 * marcas "bonitas" para los ejes, proyección en perspectiva y el gesto de giro / pellizco.
 */
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { PanResponder, GestureResponderEvent } from 'react-native';

// ── Escalas de color ──
/** Viridis de Plotly (la escala de |B| en la sábana) */
export const VIRIDIS: [number, string][] = [
  [0, '#440154'], [0.06274509803921569, '#48186a'], [0.12549019607843137, '#472d7b'], [0.18823529411764706, '#424086'],
  [0.25098039215686274, '#3b528b'], [0.3137254901960784, '#33638d'], [0.3764705882352941, '#2c728e'], [0.4392156862745098, '#26828e'],
  [0.5019607843137255, '#21918c'], [0.5647058823529412, '#1fa088'], [0.6274509803921569, '#28ae80'], [0.6901960784313725, '#3fbc73'],
  [0.7529411764705882, '#5ec962'], [0.8156862745098039, '#84d44b'], [0.8784313725490196, '#addc30'], [0.9411764705882353, '#d8e219'], [1, '#fde725'],
];
/** RdBu de ColorBrewer (11 clases): azul = negativo, blanco = 0, rojo = positivo */
export const RDBU: [number, string][] = ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f']
  .map((c, i, a) => [i / (a.length - 1), c] as [number, string]);

const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const cacheEscala = new Map<[number, string][], { p: number; c: number[] }[]>();
/** Color [r, g, b] de la escala en v ∈ [0, 1] */
export function colorEscala(escala: [number, string][], v: number): number[] {
  let e = cacheEscala.get(escala);
  if (!e) { e = escala.map(([p, c]) => ({ p, c: rgb(c) })); cacheEscala.set(escala, e); }
  const x = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  let i = 0;
  while (i < e.length - 2 && x > e[i + 1].p) i++;
  const a = e[i], b = e[i + 1], f = (x - a.p) / (b.p - a.p || 1);
  return [a.c[0] + (b.c[0] - a.c[0]) * f, a.c[1] + (b.c[1] - a.c[1]) * f, a.c[2] + (b.c[2] - a.c[2]) * f];
}
export const aHex = (c: number[]) => `#${c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// ── Marcas de los ejes (como Chart.js / Plotly) ──
function numBonito(rango: number, redondear: boolean) {
  const exp = Math.floor(Math.log10(rango)), f = rango / 10 ** exp;
  const nf = redondear ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * 10 ** exp;
}
/** Marcas "bonitas" entre min y max (máximo ~n) */
export function marcas(min: number, max: number, n = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { marcas: [] as number[], paso: 1, min, max };
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const paso = numBonito(numBonito(max - min, false) / Math.max(1, n - 1), true);
  const ini = Math.ceil(min / paso - 1e-9) * paso, lista: number[] = [];
  for (let v = ini; v <= max + paso * 1e-6; v += paso) lista.push((Math.round(v / paso) * paso) || 0);   // sin «-0»
  return { marcas: lista, paso, min, max };
}
/** Decimales para mostrar las marcas de un paso */
export const decimalesDePaso = (paso: number) => Math.max(0, Math.min(4, -Math.floor(Math.log10(paso) + 1e-9)));

// ── Proyección en perspectiva ──
export type V3 = [number, number, number];
const resta = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const normalizar = norma;
export const producto = punto;
export const productoCruz = cruz;
export const diferencia = resta;

/** Cámara mirando a `objetivo` desde `ojo`, con `arriba`; fov vertical en radianes */
export function camara(ojo: V3, objetivo: V3, arriba: V3, fov: number, ancho: number, alto: number) {
  const f = norma(resta(objetivo, ojo)), r = norma(cruz(f, arriba)), u = cruz(r, f);
  const focal = (alto / 2) / Math.tan(fov / 2);
  return {
    ojo, adelante: f,
    /** [x, y, profundidad] en píxeles; profundidad > 0 delante de la cámara */
    proyectar(p: V3): [number, number, number] {
      const d = resta(p, ojo), zc = Math.max(1e-3, punto(d, f));
      return [ancho / 2 + (punto(d, r) * focal) / zc, alto / 2 - (punto(d, u) * focal) / zc, zc];
    },
    focal,
  };
}

// ── Gesto de giro (un dedo) y zoom (pellizco) ──
export interface Orbita { a: number; b: number; zoom: number }
/**
 * Giro con el dedo o el ratón: `a` cambia con el arrastre horizontal y `b` con el vertical; dos dedos hacen zoom.
 * Mientras se arrastra, `moviendo` es true (para bajar la resolución o congelar los datos).
 */
export function useOrbita(inicial: Orbita, limites: {
  bMin: number; bMax: number; zoomMin: number; zoomMax: number; ka?: number; kb?: number; alTocar?: (x: number, y: number) => void;
}) {
  const [o, setO] = useState(inicial);
  const [moviendo, setMoviendo] = useState(false);
  const pend = useRef({ da: 0, db: 0, z: 1 }), raf = useRef<any>(null);
  const ult = useRef<{ x: number; y: number; dist: number } | null>(null);
  const toque = useRef<{ x: number; y: number; recorrido: number } | null>(null);
  const lim = useRef(limites); lim.current = limites;

  const aplicar = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const { da, db, z } = pend.current; pend.current = { da: 0, db: 0, z: 1 };
      const L = lim.current;
      setO(v => ({ a: v.a + da, b: Math.max(L.bMin, Math.min(L.bMax, v.b + db)), zoom: Math.max(L.zoomMin, Math.min(L.zoomMax, v.zoom * z)) }));
    });
  }, []);

  const leer = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    if (t && t.length >= 2) {
      const x = (t[0].pageX + t[1].pageX) / 2, y = (t[0].pageY + t[1].pageY) / 2;
      return { x, y, dist: Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) };
    }
    return { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, dist: 0 };
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,   // el ScrollView no se roba el gesto
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: e => {
      setMoviendo(true); ult.current = leer(e);
      toque.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, recorrido: 0 };
    },
    onPanResponderMove: e => {
      const p = leer(e), u = ult.current;
      if (u) {
        if (p.dist && u.dist) pend.current.z *= p.dist / u.dist;   // separar los dedos acerca
        else if (!p.dist && !u.dist) { pend.current.da += (p.x - u.x) * (lim.current.ka ?? 0.01); pend.current.db += (p.y - u.y) * (lim.current.kb ?? 0.008); }
        if (toque.current) toque.current.recorrido += Math.hypot(p.x - u.x, p.y - u.y) + (p.dist ? 100 : 0);
      }
      ult.current = p; aplicar();
    },
    onPanResponderRelease: () => {
      ult.current = null; setMoviendo(false);
      const tq = toque.current; toque.current = null;
      if (tq && tq.recorrido < 6) lim.current.alTocar?.(tq.x, tq.y);   // un toque sin arrastre
    },
    onPanResponderTerminate: () => { ult.current = null; toque.current = null; setMoviendo(false); },
  }), [aplicar]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const mover = useCallback((da: number, db: number, z = 1) => {
    const L = lim.current;
    setO(v => ({ a: v.a + da, b: Math.max(L.bMin, Math.min(L.bMax, v.b + db)), zoom: Math.max(L.zoomMin, Math.min(L.zoomMax, v.zoom * z)) }));
  }, []);
  const restablecer = useCallback(() => setO(inicial), [inicial.a, inicial.b, inicial.zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...o, moviendo, pan: pan.panHandlers, mover, restablecer, setO };
}
