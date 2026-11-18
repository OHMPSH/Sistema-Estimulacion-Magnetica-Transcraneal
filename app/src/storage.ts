import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tema } from './theme';

export interface Perfil { id: string; nombre: string; url: string }

const leer = async <T,>(k: string, def: T): Promise<T> => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const guardar = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export const cargarPerfiles = () => leer<Perfil[]>('perfiles', []);
export const guardarPerfiles = (p: Perfil[]) => guardar('perfiles', p);
export const cargarActivo = () => leer<string | null>('perfil_activo', null);
export const guardarActivo = (id: string | null) => guardar('perfil_activo', id);
export const cargarCookie = (id: string) => leer<string | null>(`cookie:${id}`, null);
export const guardarCookie = (id: string, c: string | null) => (c ? guardar(`cookie:${id}`, c) : AsyncStorage.removeItem(`cookie:${id}`).catch(() => {}));
export const cargarTema = () => leer<Tema>('tema', 'oscuro');
export const guardarTema = (t: Tema) => guardar('tema', t);

/** "192.168.1.90" → http://192.168.1.90:4000 ; con esquema o puerto se respeta ; se quita "/" final y "/api" */
export function normalizarUrl(texto: string): string {
  let t = texto.trim().replace(/\s+/g, '');
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) {
    t = 'http://' + t;
    if (!/^http:\/\/[^/]+:\d+/.test(t)) t = t.replace(/^(http:\/\/[^/:]+)/, '$1:4000');   // sin esquema ni puerto → :4000
  }
  return t.replace(/\/+$/, '').replace(/\/api$/i, '');
}
