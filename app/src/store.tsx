/**
 * Estado global de la app: origen de los datos (simulación local o servidor), servidor y sesión de usuario,
 * configuración, Pico W y la medición en curso (equivale a AuthContext + ConfigContext + useSesionActiva de la web).
 * Todos los datos de la medición llegan por SSE o desde GET /sesiones/activa; el celular no genera datos
 * salvo en la simulación local.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import EventSource from 'react-native-sse';
import { Api, EN_NAVEGADOR } from './api';
import * as St from './storage';
import type { Perfil } from './storage';
import type { Tema } from './theme';
import * as Loc from './simulador';
import * as SL from './sesionesLocales';
import { mallaDeZona } from './util';

export type Fase = 'elegirOrigen' | 'cargando' | 'sinServidor' | 'login' | 'cambiarPassword' | 'listo';
export type Origen = 'simulacion' | 'servidor';
export interface Filtros { modo: string; medio: string; origen: string; paso: string; eliminadas: boolean }
export interface Fuente {
  listar: (f: Filtros) => Promise<{ ok: boolean; data: any[]; activaId: number | null; error?: string }>;
  csv: (id: number) => Promise<{ ok: boolean; texto: string }>;
  mediciones: (id: number) => Promise<{ ok: boolean; data: Medicion[]; error?: string }>;
  notas: (id: number, t: string) => Promise<{ ok: boolean; sesion?: any; error?: string }>;
  eliminar: (id: number) => Promise<{ ok: boolean; error?: string }>;
  restaurar: (id: number) => Promise<{ ok: boolean; error?: string }>;
}
export interface Usuario { id: number; usuario: string; nombre: string; rol: 'admin' | 'operador' | 'observador'; debe_cambiar_password: boolean; preferencias?: { tema?: Tema } }

interface Tms {
  origen: Origen | null; cambiarOrigen: (o: Origen) => Promise<boolean>; fuente: Fuente;
  fase: Fase; perfiles: Perfil[]; perfil: Perfil | null; api: Api | null; usuario: Usuario | null; sesionExpirada: boolean;
  online: boolean; estadoServidor: any; config: any; opciones: any; dispositivo: any; eventosSesion: number;
  tema: Tema; cambiarTema: (t: Tema) => Promise<void>;
  guardarPerfil: (p: Perfil) => Promise<void>; borrarPerfil: (id: string) => Promise<void>; usarPerfil: (id: string) => Promise<void>;
  iniciarSesion: (usuario: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  cerrarSesion: () => Promise<void>; reverificar: () => Promise<void>; usuarioActualizado: (u: Usuario) => void;
  guardarClave: (clave: string, valor: any) => Promise<{ ok: boolean; error?: string; errores?: string[]; status: number }>;
  recargarDispositivo: () => Promise<void>;
}
export interface Medicion {
  sesionId: number; seq: number | null; xMM: number; yMM: number; zMM: number; zIdx: number;
  bx: number | null; by: number | null; bz: number | null; magnitud: number | null; saturado: boolean; timestamp: string; tsDispositivo?: string | null;
}
interface Med {
  sesion: any; enCurso: boolean; mediciones: Medicion[]; version: number; ultima: Medicion | null;
  iniciando: boolean; deteniendo: boolean; errorAccion: string;
  iniciar: (p: { modo: string; pasoMM: number; medio: string; zona: any }) => Promise<boolean>; detener: () => Promise<boolean>;
}
const CtxTms = createContext<Tms>(null as any);
const CtxMed = createContext<Med>(null as any);
export const useTms = () => useContext(CtxTms);
export const useMedicion = () => useContext(CtxMed);

const claveDe = (m: any) => (m.seq !== null && m.seq !== undefined ? `s${m.seq}` : `t${m.timestamp}|${m.xMM}|${m.yMM}|${m.zMM}`);
const porSeq = (a: any, b: any) => (a.seq ?? Infinity) - (b.seq ?? Infinity);

/** Lecturas de GET /sesiones/:id/mediciones en el formato del dashboard */
const comoLectura = (r: any, sesionId: number): Medicion => ({
  sesionId, seq: r.seq, xMM: Number(r.x_mm), yMM: Number(r.y_mm), zMM: Number(r.z_mm), zIdx: -1,
  bx: r.bx, by: r.by, bz: r.bz, magnitud: r.magnitud, saturado: Boolean(r.saturado), timestamp: r.timestamp, tsDispositivo: r.ts_dispositivo ?? null,
});

export function TmsProvider({ children }: { children: React.ReactNode }) {
  const [fase, setFase] = useState<Fase>('cargando');
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [activoId, setActivoId] = useState<string | null>(null);
  const [api, setApi] = useState<Api | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const [online, setOnline] = useState(false);
  const [estadoServidor, setEstadoServidor] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [opciones, setOpciones] = useState<any>(null);
  const [dispositivo, setDispositivo] = useState<any>(null);
  const [eventosSesion, setEventosSesion] = useState(0);
  const [tema, setTema] = useState<Tema>('oscuro');
  const [origen, setOrigen] = useState<Origen | null>(null);
  const motor = useRef<Loc.Motor | null>(null);
  const sesionLocal = useRef<any>(null);

  // ── Medición en curso (ref + versión, igual que useSesionActiva de la web) ──
  const [sesion, setSesion] = useState<any>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [version, setVersion] = useState(0);
  const [iniciando, setIniciando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const datos = useRef<{ sesionId: number | null; mediciones: Medicion[]; vistos: Set<string>; sucio: boolean }>({ sesionId: null, mediciones: [], vistos: new Set(), sucio: false });
  const reloj = useRef<any>(null);
  const ocupado = useRef(false);
  const enCursoRef = useRef(false); enCursoRef.current = enCurso;
  const apiRef = useRef<Api | null>(null); apiRef.current = api;

  /** Un render cada 250 ms como máximo, aunque lleguen muchas lecturas */
  const programar = useCallback(() => {
    if (reloj.current) return;
    reloj.current = setTimeout(() => {
      reloj.current = null;
      if (datos.current.sucio) { datos.current.mediciones = datos.current.mediciones.slice(); datos.current.sucio = false; }
      setVersion(v => v + 1);
    }, 250);
  }, []);
  useEffect(() => () => clearTimeout(reloj.current), []);

  const seguir = useCallback((s: any, lista: Medicion[] = []) => {
    const ord = [...lista].sort(porSeq);
    datos.current = { sesionId: s.id, mediciones: ord, vistos: new Set(ord.map(claveDe)), sucio: false };
    setSesion(s); programar();
  }, [programar]);

  const unir = useCallback((lista: Medicion[]) => {
    const d = datos.current; let nuevas = 0, desordenada = false;
    for (const m of lista) {
      const k = claveDe(m);
      if (d.vistos.has(k)) continue;
      d.vistos.add(k);
      const u = d.mediciones[d.mediciones.length - 1];
      if (u && (m.seq ?? Infinity) < (u.seq ?? Infinity)) desordenada = true;
      d.mediciones.push(m); nuevas++;
    }
    if (desordenada) d.mediciones.sort(porSeq);
    if (nuevas) { d.sucio = true; programar(); }
  }, [programar]);

  const cargarActiva = useCallback(async () => {
    const a = apiRef.current; if (!a) return;
    const r = await a.get('/sesiones/activa');
    if (!r.ok) return;
    if (r.json.sesion) {
      if (r.json.sesion.id === datos.current.sesionId) { setSesion((s: any) => ({ ...s, ...r.json.sesion })); unir(r.json.mediciones); }
      else seguir(r.json.sesion, r.json.mediciones);
      setEnCurso(true);
    } else if (enCursoRef.current) setEnCurso(false);   // terminó mientras no escuchábamos: se conservan los datos
  }, [seguir, unir]);

  const limpiarMedicion = useCallback(() => {
    datos.current = { sesionId: null, mediciones: [], vistos: new Set(), sucio: false };
    setSesion(null); setEnCurso(false); setVersion(v => v + 1); setErrorAccion('');
  }, []);

  // ── Sesión de usuario y perfiles de servidor ──
  const perfil = useMemo(() => perfiles.find(p => p.id === activoId) ?? null, [perfiles, activoId]);

  const verificar = useCallback(async (a: Api) => {
    const est = await a.get('/status');
    setOnline(est.status !== 0 && est.ok); setEstadoServidor(est.ok ? est.json : null);
    if (est.status === 0) { setFase('login'); return; }
    if (!a.cookie) { setUsuario(null); setFase('login'); return; }
    let r = await a.get('/auth/yo');
    if (!r.ok && r.status === 401 && a.cookie) r = await a.get('/auth/yo');   // reintento por si fue una respuesta rezagada
    if (r.ok) {
      setUsuario(r.json.usuario); setSesionExpirada(false);
      if (r.json.usuario.preferencias?.tema) { setTema(r.json.usuario.preferencias.tema); St.guardarTema(r.json.usuario.preferencias.tema); }
      setFase(r.json.usuario.debe_cambiar_password ? 'cambiarPassword' : 'listo');
    } else { setUsuario(null); setFase('login'); }
  }, []);

  const construirApi = useCallback(async (p: Perfil) => {
    const cookie = await St.cargarCookie(p.id);
    const a: Api = new Api(p.url, cookie,
      () => { St.guardarCookie(p.id, null); a.cookie = null; setUsuario(null); setSesionExpirada(true); setFase('login'); },
      c => St.guardarCookie(p.id, c));
    return a;
  }, []);

  const prepararLocal = useCallback(async () => {
    setApi(null); setDispositivo(null); setOpciones(null); setUsuario(Loc.USUARIO_LOCAL); setOnline(true);
    setConfig(await SL.cargarConfig()); setFase('listo');
  }, []);

  useEffect(() => { // arranque
    (async () => {
      const [ps, act, tm, org] = await Promise.all([St.cargarPerfiles(), St.cargarActivo(), St.cargarTema(), SL.cargarOrigen()]);
      setPerfiles(ps); setTema(tm); setOrigen(org);
      const p = ps.find(x => x.id === act) ?? ps[0];
      if (p) setActivoId(p.id);
      if (org === null) { setFase('elegirOrigen'); return; }
      if (org === 'simulacion') { await prepararLocal(); return; }
      if (!p) setFase('sinServidor');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // al cambiar de servidor
    if (!perfil || origen !== 'servidor') return;
    let vivo = true;
    limpiarMedicion(); setConfig(null); setDispositivo(null); setUsuario(null); setFase('cargando');
    construirApi(perfil).then(a => { if (!vivo) return; setApi(a); verificar(a); });
    return () => { vivo = false; };
  }, [perfil?.id, perfil?.url, origen]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarOrigen = useCallback(async (o: Origen) => {
    if (enCursoRef.current && origen === 'simulacion') return false;
    motor.current?.detener();
    await SL.guardarOrigen(o); setOrigen(o); limpiarMedicion();
    if (o === 'simulacion') await prepararLocal();
    else { setConfig(null); setUsuario(null); setDispositivo(null); setApi(null); setFase(perfil ? 'cargando' : 'sinServidor'); }
    return true;
  }, [perfil, origen, limpiarMedicion, prepararLocal]);

  const guardarPerfil = useCallback(async (p: Perfil) => {
    const nuevos = perfiles.some(x => x.id === p.id) ? perfiles.map(x => (x.id === p.id ? p : x)) : [...perfiles, p];
    setPerfiles(nuevos); await St.guardarPerfiles(nuevos);
    setActivoId(p.id); await St.guardarActivo(p.id);
  }, [perfiles]);
  const usarPerfil = useCallback(async (id: string) => { setActivoId(id); await St.guardarActivo(id); }, []);
  const borrarPerfil = useCallback(async (id: string) => {
    const nuevos = perfiles.filter(x => x.id !== id);
    setPerfiles(nuevos); await St.guardarPerfiles(nuevos); await St.guardarCookie(id, null);
    if (id === activoId) {
      const sig = nuevos[0]?.id ?? null; setActivoId(sig); await St.guardarActivo(sig);
      if (!sig) { setApi(null); setUsuario(null); setFase('sinServidor'); }
    }
  }, [perfiles, activoId]);

  const iniciarSesion = useCallback(async (u: string, password: string) => {
    if (!api) return { ok: false, error: 'Primero elige un servidor.' };
    api.cookie = null;
    const r = await api.post('/auth/login', { usuario: u.trim(), password });
    if (!r.ok) return { ok: false, error: r.json.error || 'No se pudo iniciar sesión.' };
    if (!api.cookie) return { ok: false, error: 'El servidor aceptó el acceso pero no entregó la cookie de sesión.' };
    await verificar(api);
    return { ok: true };
  }, [api, verificar]);

  const cerrarSesion = useCallback(async () => {
    if (api) { await api.post('/auth/logout'); api.cookie = null; if (perfil) await St.guardarCookie(perfil.id, null); }
    limpiarMedicion(); setUsuario(null); setConfig(null); setSesionExpirada(false); setFase('login');
  }, [api, perfil, limpiarMedicion]);

  const reverificar = useCallback(async () => { if (api) { setFase('cargando'); await verificar(api); } }, [api, verificar]);
  const usuarioActualizado = useCallback((u: Usuario) => { setUsuario(u); setFase(u.debe_cambiar_password ? 'cambiarPassword' : 'listo'); }, []);

  const cambiarTema = useCallback(async (t: Tema) => {
    setTema(t); St.guardarTema(t);
    if (api && usuario && origen === 'servidor') await api.patch('/auth/preferencias', { tema: t });
  }, [api, usuario, origen]);

  const guardarClave = useCallback(async (clave: string, valor: any) => {
    if (origen === 'simulacion') {
      const malo = (function revisar(o: any, ruta: string): string | null {
        if (o && typeof o === 'object') { for (const k of Object.keys(o)) { const e = revisar(o[k], `${ruta}.${k}`); if (e) return e; } return null; }
        if (typeof o === 'number' && (!Number.isFinite(o) || o < 0 || (ruta.includes('prob_') && o > 1))) return `${ruta.split('.').slice(1).join('.')} no es un valor válido.`;
        if (o === null) return `${ruta.split('.').slice(1).join('.')} está vacío.`;
        return null;
      })(valor, clave);
      if (malo) return { ok: false, error: malo, errores: [malo], status: 422 };
      const actual = config?.[clave];
      const mezclado = actual && typeof actual === 'object' && valor && typeof valor === 'object' ? { ...actual, ...valor } : valor;
      const nueva = { ...(config ?? {}), [clave]: mezclado }; setConfig(nueva); await SL.guardarConfig(nueva);
      return { ok: true, status: 200 };
    }
    if (!api) return { ok: false, error: 'Sin servidor.', status: 0 };
    const r = await api.put(`/configuracion/${clave}`, { valor });
    if (r.ok) { setConfig((c: any) => ({ ...c, [clave]: r.json.valor })); return { ok: true, status: r.status }; }
    return { ok: false, error: r.json.error, errores: r.json.errores ?? [], status: r.status };
  }, [api, origen, config]);

  const recargarDispositivo = useCallback(async () => {
    if (!api) return; const r = await api.get('/dispositivo/estado');
    if (r.ok) { const { ok: _o, ...resto } = r.json; setDispositivo(resto); }
  }, [api]);

  // ── Datos y tiempo real, solo con sesión iniciada ──
  useEffect(() => {
    if (fase !== 'listo' || !api) return;
    let vivo = true;
    (async () => {
      const r = await api.get('/configuracion');
      if (vivo && r.ok) { setConfig(r.json.data); setOpciones(r.json.opciones); }
      await recargarDispositivo(); await cargarActiva();
    })();

    const ping = setInterval(async () => {
      const r = await api.get('/status');
      if (vivo) { setOnline(r.status !== 0 && r.ok); if (r.ok) setEstadoServidor(r.json); }
    }, 15000);

    type Ev = 'medicion' | 'sesion' | 'configuracion' | 'dispositivo' | 'resincronizar';
    const es = new EventSource<Ev>(`${api.base}/api/stream`, { headers: api.cabecerasStream(), withCredentials: EN_NAVEGADOR, pollingInterval: 3000 });
    const json = (e: any) => { try { return JSON.parse(e.data); } catch { return null; } };
    es.addEventListener('open', () => { setOnline(true); cargarActiva(); recargarDispositivo(); });
    es.addEventListener('error', () => setOnline(false));
    es.addEventListener('resincronizar', () => cargarActiva());
    es.addEventListener('medicion', (e: any) => {
      const m = json(e); if (!m) return;
      if (m.sesionId === datos.current.sesionId) unir([m]); else if (!enCursoRef.current) cargarActiva();
    });
    es.addEventListener('sesion', (e: any) => {
      const d = json(e); if (!d) return;
      setEventosSesion(n => n + 1);   // el historial se recarga solo
      if (d.tipo === 'iniciada') { seguir(d.sesion, []); setEnCurso(true); }
      else if (d.tipo === 'finalizada' && d.sesion.id === datos.current.sesionId) { setSesion({ ...d.sesion, motivo: d.motivo }); setEnCurso(false); }
    });
    es.addEventListener('configuracion', (e: any) => { const d = json(e); if (d) setConfig((c: any) => (c ? { ...c, [d.clave]: d.valor } : c)); });
    es.addEventListener('dispositivo', (e: any) => { const d = json(e); if (d) setDispositivo(d); });

    return () => { vivo = false; clearInterval(ping); es.removeAllEventListeners(); es.close(); };
  }, [fase, api, cargarActiva, recargarDispositivo, seguir, unir]);

  const finalizarLocal = useCallback(async (motivo: 'completa' | 'manual') => {
    const base = sesionLocal.current; if (!base) return;
    if (reloj.current) { clearTimeout(reloj.current); reloj.current = null; }
    datos.current.mediciones = datos.current.mediciones.slice(); datos.current.sucio = false;
    const med = datos.current.mediciones;
    const fin = { ...base, ...SL.estadisticas(base, med), terminada_en: new Date().toISOString(), motivo };
    sesionLocal.current = null; setSesion(fin); setEnCurso(false); setVersion(v => v + 1);
    await SL.guardarSesion(fin, med);
    setEventosSesion(n => n + 1);
  }, []);

  const iniciar = useCallback(async ({ modo, pasoMM, medio, zona }: any) => {
    if (origen === 'simulacion') {
      if (enCursoRef.current) return false;
      const malla = mallaDeZona(zona, pasoMM);
      const id = await SL.proximoId();
      const ses = Loc.nuevaSesion(id, { modo, pasoMM, medio, zona, malla });
      sesionLocal.current = ses; seguir(ses, []); setEnCurso(true); setErrorAccion('');
      motor.current?.detener();
      motor.current = new Loc.Motor(ses, config, m => unir([m]), () => finalizarLocal('completa'));
      motor.current.arrancar(); setEventosSesion(n => n + 1); return true;
    }
    if (ocupado.current || !api) return false;
    ocupado.current = true; setIniciando(true); setErrorAccion('');
    const r = await api.post('/sesiones', { modo, paso_mm: pasoMM, medio, zona_mm: zona });
    ocupado.current = false; setIniciando(false);
    if (r.ok) { if (r.json.sesion.id !== datos.current.sesionId) seguir(r.json.sesion, []); setEnCurso(true); return true; }
    setErrorAccion(r.status === 0 ? 'No se pudo conectar con el servidor para iniciar la medición.' : r.json.error || 'No se pudo iniciar la medición.'); return false;
  }, [api, seguir, origen, config, unir, finalizarLocal]);

  const detener = useCallback(async () => {
    if (origen === 'simulacion') { motor.current?.detener(); await finalizarLocal('manual'); return true; }
    const id = datos.current.sesionId;
    if (!id || ocupado.current || !api) return false;
    ocupado.current = true; setDeteniendo(true); setErrorAccion('');
    const r = await api.put(`/sesiones/${id}`);
    ocupado.current = false; setDeteniendo(false);
    if (r.ok) { setSesion((s: any) => ({ ...s, ...r.json.sesion, motivo: 'manual' })); setEnCurso(false); return true; }
    setErrorAccion(r.status === 0 ? 'No se pudo conectar con el servidor para detener la medición.' : r.json.error || 'No se pudo detener la medición.'); return false;
  }, [api, origen, finalizarLocal]);

  const fuente = useMemo<Fuente>(() => origen === 'simulacion' ? SL : {
    listar: async f => {
      if (!api) return { ok: false, data: [], activaId: null, error: 'Sin servidor.' };
      const q: string[] = []; const paso = f.paso.trim().replace(',', '.');
      if (f.modo) q.push(`modo=${f.modo}`); if (f.medio) q.push(`medio=${f.medio}`); if (f.origen) q.push(`origen=${f.origen}`);
      if (/^\d{1,3}(\.\d)?$/.test(paso)) q.push(`paso_mm=${Number(paso)}`); if (f.eliminadas) q.push('incluir_eliminadas=1');
      const r = await api.get(`/sesiones?${q.join('&')}`);
      return r.ok ? { ok: true, data: r.json.data, activaId: r.json.activa?.id ?? null } : { ok: false, data: [], activaId: null, error: r.json.error || 'No se pudo cargar el historial.' };
    },
    csv: async id => (await api!.texto(`/sesiones/${id}/csv`)),
    mediciones: async id => {
      const r = await api!.req(`/sesiones/${id}/mediciones`, 'GET', undefined, 30000);
      return r.ok ? { ok: true, data: (r.json.data ?? []).map((x: any) => comoLectura(x, id)) } : { ok: false, data: [], error: r.json.error || 'No se pudieron cargar las lecturas.' };
    },
    notas: async (id, t) => { const r = await api!.patch(`/sesiones/${id}`, { notas: t }); return r.ok ? { ok: true, sesion: r.json.sesion } : { ok: false, error: r.json.error || 'No se pudieron guardar las notas.' }; },
    eliminar: async id => { const r = await api!.del(`/sesiones/${id}`); return { ok: r.ok, error: r.json.error }; },
    restaurar: async id => { const r = await api!.post(`/sesiones/${id}/restaurar`); return { ok: r.ok, error: r.json.error }; },
  }, [origen, api]);

  const tmsValor = useMemo<Tms>(() => ({
    origen, cambiarOrigen, fuente, fase, perfiles, perfil, api, usuario, sesionExpirada, online, estadoServidor, config, opciones, dispositivo, eventosSesion,
    tema, cambiarTema, guardarPerfil, borrarPerfil, usarPerfil, iniciarSesion, cerrarSesion, reverificar, usuarioActualizado, guardarClave, recargarDispositivo,
  }), [origen, cambiarOrigen, fuente, fase, perfiles, perfil, api, usuario, sesionExpirada, online, estadoServidor, config, opciones, dispositivo, eventosSesion,
    tema, cambiarTema, guardarPerfil, borrarPerfil, usarPerfil, iniciarSesion, cerrarSesion, reverificar, usuarioActualizado, guardarClave, recargarDispositivo]);

  const mediciones = datos.current.mediciones;
  const medValor = useMemo<Med>(() => ({
    sesion, enCurso, mediciones, version, ultima: mediciones.length ? mediciones[mediciones.length - 1] : null,
    iniciando, deteniendo, errorAccion, iniciar, detener,
  }), [sesion, enCurso, version, iniciando, deteniendo, errorAccion, iniciar, detener]); // eslint-disable-line react-hooks/exhaustive-deps

  return <CtxTms.Provider value={tmsValor}><CtxMed.Provider value={medValor}>{children}</CtxMed.Provider></CtxTms.Provider>;
}
