// Sesiones de la simulación local: se guardan en el celular (las últimas 12) con sus lecturas.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG_LOCAL } from './simulador';
import type { Filtros, Medicion } from './store';
import { indicesDeSerpentina } from './util';

const K_SES = 'sim_sesiones', K_CFG = 'sim_config', K_ID = 'sim_proximo_id';
const MAX_SESIONES = 12, MAX_PUNTOS_GUARDADOS = 6000, TOLERANCIA_MM = 1;
interface Reg { sesion: any; mediciones: Medicion[] }

const leer = async <T,>(k: string, def: T): Promise<T> => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const poner = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export const cargarOrigen = () => leer<'simulacion' | 'servidor' | null>('origen', null);
export const guardarOrigen = (o: string) => poner('origen', o);

export async function cargarConfig() {
  const g = await leer<any>(K_CFG, {});
  const out: any = {};
  for (const k of Object.keys(CONFIG_LOCAL)) out[k] = typeof (CONFIG_LOCAL as any)[k] === 'object' ? { ...(CONFIG_LOCAL as any)[k], ...(g[k] ?? {}) } : (g[k] ?? (CONFIG_LOCAL as any)[k]);
  out.simulacion.ms_por_punto = { ...CONFIG_LOCAL.simulacion.ms_por_punto, ...(g.simulacion?.ms_por_punto ?? {}) };
  return out;
}
export const guardarConfig = (c: any) => poner(K_CFG, c);
export async function proximoId() { const n = (await leer<number>(K_ID, 0)) + 1; await poner(K_ID, n); return n; }

const todas = () => leer<Reg[]>(K_SES, []);
export async function guardarSesion(sesion: any, mediciones: Medicion[]) {
  const lista = await todas();
  const nueva: Reg = { sesion, mediciones: mediciones.length <= MAX_PUNTOS_GUARDADOS ? mediciones : [] };
  await poner(K_SES, [nueva, ...lista.filter(r => r.sesion.id !== sesion.id)].slice(0, MAX_SESIONES));
}

/** Puntos recibidos, saturadas, |B| máximo y mínimo y huecos (en el orden de la serpentina, como el servidor) */
export function estadisticas(sesion: any, med: Medicion[]) {
  const validas = med.filter(m => !m.saturado);
  const clave = (x: number, y: number, z: number) => `${Math.round(x / TOLERANCIA_MM)}|${Math.round(y / TOLERANCIA_MM)}|${Math.round(z / TOLERANCIA_MM)}`;
  const medidos = new Set(validas.map(m => clave(m.xMM, m.yMM, m.zMM)));
  const posiciones: { xMM: number; yMM: number; zMM: number }[] = [];
  let total = 0;
  for (let k = 0; k < sesion.puntos_esperados; k++) {
    const { ix, iy, iz } = indicesDeSerpentina(sesion.grid_nx, sesion.grid_ny, k);
    const p = { xMM: Math.round(ix * sesion.paso_mm * 10) / 10, yMM: Math.round(iy * sesion.paso_mm * 10) / 10, zMM: sesion.z_levels_mm[iz] };
    if (!medidos.has(clave(p.xMM, p.yMM, p.zMM))) { total++; if (posiciones.length < 1000) posiciones.push(p); }
  }
  const mags = validas.filter(m => m.magnitud !== null).map(m => m.magnitud as number);
  return {
    puntos_recibidos: med.length, saturadas: med.filter(m => m.saturado).length,
    max_magnitud: mags.length ? Math.max(...mags) : null, min_magnitud: mags.length ? Math.min(...mags) : null,
    huecos: { total, posiciones },
  };
}

export async function listar(f: Filtros) {
  const p = f.paso.trim().replace(',', '.');
  const data = (await todas()).map(r => r.sesion).filter(s =>
    (f.eliminadas || !s.eliminada_en) && (!f.modo || s.modo === f.modo) && (!f.medio || s.medio === f.medio) &&
    (!f.origen || s.origen === f.origen) && (!/^\d{1,3}(\.\d)?$/.test(p) || Number(s.paso_mm) === Number(p)));
  return { ok: true, data, activaId: null as number | null };
}
async function cambiar(id: number, fn: (s: any) => void) {
  const lista = await todas(); const r = lista.find(x => x.sesion.id === id);
  if (!r) return null; fn(r.sesion); await poner(K_SES, lista); return r.sesion;
}
export async function notas(id: number, texto: string) { const s = await cambiar(id, x => { x.notas = texto; }); return s ? { ok: true, sesion: s } : { ok: false, error: 'No existe la sesión.' }; }
export async function eliminar(id: number) { const s = await cambiar(id, x => { x.eliminada_en = new Date().toISOString(); }); return { ok: !!s, error: s ? undefined : 'No existe la sesión.' }; }
export async function restaurar(id: number) { const s = await cambiar(id, x => { x.eliminada_en = null; }); return { ok: !!s, error: s ? undefined : 'No existe la sesión.' }; }
export async function mediciones(id: number) {
  const r = (await todas()).find(x => x.sesion.id === id);
  if (!r) return { ok: false, data: [] as Medicion[], error: 'No existe la sesión.' };
  if (!r.mediciones.length && r.sesion.puntos_recibidos) return { ok: false, data: [] as Medicion[], error: 'Esta sesión fue muy grande y no se guardaron sus lecturas en el celular.' };
  return { ok: true, data: r.mediciones };
}
/** CSV con el mismo formato que el del servidor (encabezado de metadatos y columnas con unidades) */
export async function csv(id: number) {
  const r = (await todas()).find(x => x.sesion.id === id);
  if (!r) return { ok: false, texto: 'No existe la sesión.' };
  if (!r.mediciones.length) return { ok: false, texto: 'Esta sesión fue muy grande y no se guardaron sus lecturas en el celular.' };
  const s = r.sesion;
  const f = (v: number | null) => (v === null || v === undefined ? '' : String(v));
  const meta = [
    `# sesion_id: ${s.id}`, '# origen: sim (simulación local del celular)', `# modo: ${s.modo}`, `# paso_mm: ${s.paso_mm}`, `# medio: ${s.medio}`,
    `# zona_mm: ${s.zona_x_mm}, ${s.zona_y_mm}, ${s.zona_z_mm}`, `# iniciada_en: ${s.iniciada_en}`, `# terminada_en: ${s.terminada_en ?? ''}`,
    `# puntos_esperados: ${s.puntos_esperados}`, `# puntos_recibidos: ${s.puntos_recibidos ?? r.mediciones.length}`, `# huecos: ${s.huecos?.total ?? ''}`,
    `# version_software: ${s.version_software}`, `# notas: ${(s.notas ?? '').replace(/\r?\n/g, ' ')}`,
  ];
  return { ok: true, texto: [...meta, 'timestamp_utc,seq,x_mm,y_mm,z_mm,bx_uT,by_uT,bz_uT,magnitud_uT,raw_x,raw_y,raw_z,saturado',
    ...r.mediciones.map(m => [m.timestamp, m.seq, m.xMM, m.yMM, m.zMM, f(m.bx), f(m.by), f(m.bz), f(m.magnitud), '', '', '', m.saturado ? 1 : 0].join(','))].join('\n') };
}
