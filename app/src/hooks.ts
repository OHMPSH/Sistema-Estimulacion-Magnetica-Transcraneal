import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useTms } from './store';
import type { Medicion } from './store';
import { duracionCorta } from './util';

const ESTADOS_PICO: Record<string, string> = { espera: 'en espera', homing: 'volviendo al origen', midiendo: 'midiendo', error: 'con error' };

/** Estado de la Pico W con el reloj de 1 s (mismo cálculo que useDispositivo de la web) */
export function useDispositivoVista() {
  const { dispositivo } = useTms();
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, []);
  const segundos = dispositivo?.ultimoLatido ? Math.max(0, Math.round((ahora - new Date(dispositivo.ultimoLatido).getTime()) / 1000)) : null;
  const enLinea = Boolean(dispositivo?.enLinea && segundos !== null && segundos <= (dispositivo.umbral_desconexion_s ?? 15));
  let texto: string;
  if (!dispositivo || !dispositivo.ultimoLatido) texto = 'Pico W nunca conectada';
  else if (!dispositivo.activo) texto = 'Pico W desactivada';
  else if (!enLinea) texto = `Pico W sin señal hace ${duracionCorta(segundos ?? 0)}`;
  else texto = ESTADOS_PICO[dispositivo.estadoPico] ? `Pico W en línea · ${ESTADOS_PICO[dispositivo.estadoPico]}` : `Pico W en línea · hace ${duracionCorta(segundos ?? 0)}`;
  return { estado: dispositivo ? { ...dispositivo, enLinea } : null, segundos, enLinea, texto };
}

/** Devuelve `valor`, pero actualizado como máximo cada `ms` mientras `activo` (para no redibujar gráficas pesadas en cada lectura) */
export function useLento<T>(valor: T, ms: number, activo: boolean): T {
  const [v, setV] = useState(valor);
  const ult = useRef(0), timer = useRef<any>(null), actual = useRef(valor);
  actual.current = valor;
  useEffect(() => {
    if (!activo) { setV(valor); return; }
    const falta = ms - (Date.now() - ult.current);
    if (falta <= 0) { ult.current = Date.now(); setV(valor); }
    else if (!timer.current) timer.current = setTimeout(() => { timer.current = null; ult.current = Date.now(); setV(actual.current); }, falta);
  }, [valor, ms, activo]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return v;
}

// ── Tiempo estimado (hooks/useTiempoEstimado.js de la web) ──
const SESIONES_RECIENTES = 20, MIN_LECTURAS_SESION = 10, LECTURAS_PARA_CONFIAR = 20;
const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); const m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };

export function ritmoHistorico(sesiones: any[], excluirId: number | null = null) {
  const ritmos = sesiones
    .filter(s => s.id !== excluirId && s.terminada_en && !s.eliminada_en)
    .map(s => ({ s, n: Number(s.puntos_recibidos ?? s.total_puntos ?? 0) }))
    .filter(({ n }) => n >= MIN_LECTURAS_SESION)
    .sort((a, b) => new Date(b.s.iniciada_en).getTime() - new Date(a.s.iniciada_en).getTime())
    .slice(0, SESIONES_RECIENTES)
    .map(({ s, n }) => (new Date(s.terminada_en).getTime() - new Date(s.iniciada_en).getTime()) / 1000 / n)
    .filter(r => Number.isFinite(r) && r > 0);
  return ritmos.length ? { sPorLectura: mediana(ritmos), sesiones: ritmos.length } : null;
}
function ritmoActual(mediciones: Medicion[]) {
  if (mediciones.length < 3) return null;
  const a = mediciones[0], b = mediciones[mediciones.length - 1];
  const pico = a.tsDispositivo && b.tsDispositivo;
  const t0 = new Date((pico ? a.tsDispositivo : a.timestamp) as string).getTime();
  const t1 = new Date((pico ? b.tsDispositivo : b.timestamp) as string).getTime();
  const r = (t1 - t0) / 1000 / (mediciones.length - 1);
  return Number.isFinite(r) && r > 0 ? r : null;
}
export interface Estimado { tipo: 'previo' | 'en_curso'; restanteS: number; sPorLectura: number; fuente: string; fin: Date | null }

export function useTiempoEstimado({ origen, modo, sesion, enCurso, mediciones, total, totalElegido }: {
  origen: 'sim' | 'hw' | null; modo: string | null; sesion: any; enCurso: boolean; mediciones: Medicion[]; total: number; totalElegido: number;
}): Estimado | null {
  const { fuente, eventosSesion, config, origen: origenApp } = useTms();
  const [historico, setHistorico] = useState<{ sPorLectura: number; sesiones: number } | null>(null);
  const sesionId = sesion?.id ?? null;

  useEffect(() => {
    if (!origen) return undefined;
    let vigente = true;
    fuente.listar({ modo: origen === 'sim' && modo ? modo : '', medio: '', origen, paso: '', eliminadas: false })
      .then(r => { if (vigente && r.ok) setHistorico(ritmoHistorico(r.data, enCurso ? sesionId : null)); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [origen, modo, sesionId, enCurso, fuente, eventosSesion]);

  // En la simulación local, sin sesiones previas, el ritmo se conoce: el tiempo por punto de la configuración
  const msLocal = origenApp === 'simulacion' && modo ? Number(config?.simulacion?.ms_por_punto?.[modo]) : NaN;
  const hist = historico ?? (Number.isFinite(msLocal) && msLocal > 0 ? { sPorLectura: Math.max(15, msLocal) / 1000, sesiones: 0 } : null);
  const textoHist = (h: { sesiones: number }) => (h.sesiones === 0 ? 'según la configuración de la simulación' : `según ${h.sesiones} ${h.sesiones === 1 ? 'sesión anterior' : 'sesiones anteriores'}`);

  const recibidas = mediciones.length;
  const calculo = useMemo(() => {
    if (!enCurso) {
      if (!hist || !totalElegido) return null;
      return { tipo: 'previo' as const, restanteS: totalElegido * hist.sPorLectura, sPorLectura: hist.sPorLectura, fuente: textoHist(hist) };
    }
    const actual = ritmoActual(mediciones);
    let s: number | null = null, f = '';
    if (actual !== null && hist) {
      const w = Math.min(1, (recibidas - 1) / LECTURAS_PARA_CONFIAR);
      s = w * actual + (1 - w) * hist.sPorLectura;
      f = w >= 1 ? 'según el ritmo actual' : 'según el ritmo actual y las sesiones anteriores';
    } else if (actual !== null) { s = actual; f = 'según el ritmo actual'; }
    else if (hist) { s = hist.sPorLectura; f = textoHist(hist); }
    if (s === null) return null;
    return { tipo: 'en_curso' as const, restanteS: Math.max(0, total - recibidas) * s, sPorLectura: s, fuente: f };
  }, [enCurso, hist?.sPorLectura, hist?.sesiones, totalElegido, recibidas, total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuenta atrás entre lecturas: se ancla cuando cambia la estimación
  const ancla = useRef({ t: Date.now(), s: 0 });
  useEffect(() => { ancla.current = { t: Date.now(), s: calculo?.restanteS ?? 0 }; }, [calculo]);
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!enCurso) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enCurso]);

  if (!calculo) return null;
  const restanteS = calculo.tipo === 'en_curso' ? Math.max(0, ancla.current.s - (ahora - ancla.current.t) / 1000) : calculo.restanteS;
  return { ...calculo, restanteS, fin: calculo.tipo === 'en_curso' ? new Date(Date.now() + restanteS * 1000) : null };
}

/** true mientras la app está en primer plano (en segundo plano se pausan las animaciones) */
export function useAppActiva() {
  const [activa, setActiva] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', e => setActiva(e === 'active'));
    return () => sub.remove();
  }, []);
  return activa;
}

/** Devuelve `valor` mientras `activo`; si no, el último valor que tuvo activo (las gráficas fuera de pantalla no se redibujan) */
export function useCongelado<T>(valor: T, activo: boolean): T {
  const r = useRef(valor);
  if (activo) r.current = valor;
  return r.current;
}
