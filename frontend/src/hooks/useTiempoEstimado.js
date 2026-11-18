/**
 * hooks/useTiempoEstimado.js
 * Tiempo estimado del barrido para la barra de progreso.
 *
 * Dos fuentes, sin endpoints nuevos:
 *   - Ritmo histórico: la mediana de segundos por lectura de las sesiones
 *     ya cerradas del mismo origen (y, en simulación, de la misma
 *     velocidad), leída de GET /api/sesiones: duración / puntos recibidos.
 *   - Ritmo actual: en la sesión abierta, el tiempo entre la primera y la
 *     última lectura recibidas, entre las lecturas que hubo. Usa la hora
 *     de la Pico (tsDispositivo) si viene, porque el servidor pone la misma
 *     hora a todo un lote.
 * Al principio manda el histórico; conforme llegan lecturas pesa más el
 * ritmo actual (del todo a partir de unas 20).
 *
 * Sin sesión en curso, estima la duración de la malla elegida con el
 * ritmo histórico.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, leerJSON } from '../api/cliente.js';

const SESIONES_RECIENTES = 20;      // cuántas sesiones cerradas entran en la mediana
const MIN_LECTURAS_SESION = 10;     // las más cortas no dicen nada del ritmo
const LECTURAS_PARA_CONFIAR = 20;   // a partir de aquí manda el ritmo actual

const mediana = v => {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/** { sPorLectura, sesiones } de las sesiones cerradas, o null si no hay datos */
export function ritmoHistorico(sesiones, excluirId = null) {
  const ritmos = sesiones
    .filter(s => s.id !== excluirId && s.terminada_en && !s.eliminada_en)
    .map(s => ({ s, n: Number(s.puntos_recibidos ?? s.total_puntos ?? 0) }))
    .filter(({ n }) => n >= MIN_LECTURAS_SESION)
    .sort((a, b) => new Date(b.s.iniciada_en) - new Date(a.s.iniciada_en))
    .slice(0, SESIONES_RECIENTES)
    .map(({ s, n }) => (new Date(s.terminada_en) - new Date(s.iniciada_en)) / 1000 / n)
    .filter(r => Number.isFinite(r) && r > 0);
  return ritmos.length ? { sPorLectura: mediana(ritmos), sesiones: ritmos.length } : null;
}

const instante = m => new Date(m.tsDispositivo ?? m.timestamp).getTime();

/** Segundos por lectura en la sesión abierta, o null con muy pocas lecturas */
function ritmoActual(mediciones) {
  if (mediciones.length < 3) return null;
  const primera = mediciones[0];
  const ultima = mediciones[mediciones.length - 1];
  const usarPico = primera.tsDispositivo && ultima.tsDispositivo;
  const t0 = usarPico ? instante(primera) : new Date(primera.timestamp).getTime();
  const t1 = usarPico ? instante(ultima) : new Date(ultima.timestamp).getTime();
  const r = (t1 - t0) / 1000 / (mediciones.length - 1);
  return Number.isFinite(r) && r > 0 ? r : null;
}

/**
 * @param {object} p
 * @param {'sim'|'hw'|null} p.origen   de la sesión abierta, o el del modo de operación
 * @param {'DC'|'AC'|null}  p.modo
 * @param {object|null}     p.sesion   la sesión que se muestra
 * @param {boolean}         p.enCurso
 * @param {Array}           p.mediciones  lecturas de la sesión (ordenadas como llegaron)
 * @param {number}          p.total    lecturas esperadas
 * @param {number}          p.totalElegido  puntos de la malla elegida (sin sesión en curso)
 */
export function useTiempoEstimado({ origen, modo, sesion, enCurso, mediciones, total, totalElegido }) {
  const [historico, setHistorico] = useState(null);
  const sesionId = sesion?.id ?? null;

  // Ritmo histórico: se vuelve a leer al cambiar de origen o velocidad y al abrir o cerrar una sesión
  useEffect(() => {
    if (!origen) return undefined;
    let vigente = true;
    const q = new URLSearchParams({ origen });
    if (origen === 'sim' && modo) q.set('modo', modo);
    apiFetch(`/api/sesiones?${q}`)
      .then(leerJSON)
      .then(json => { if (vigente && json.ok) setHistorico(ritmoHistorico(json.data, enCurso ? sesionId : null)); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [origen, modo, sesionId, enCurso]);

  const recibidas = mediciones.length;
  const calculo = useMemo(() => {
    if (!enCurso) {
      if (!historico || !totalElegido) return null;
      return { tipo: 'previo', restanteS: totalElegido * historico.sPorLectura, sPorLectura: historico.sPorLectura, fuente: `según ${historico.sesiones} ${historico.sesiones === 1 ? 'sesión anterior' : 'sesiones anteriores'}` };
    }
    const actual = ritmoActual(mediciones);
    let sPorLectura = null;
    let fuente = '';
    if (actual !== null && historico) {
      const w = Math.min(1, (recibidas - 1) / LECTURAS_PARA_CONFIAR);
      sPorLectura = w * actual + (1 - w) * historico.sPorLectura;
      fuente = w >= 1 ? 'según el ritmo actual' : 'según el ritmo actual y las sesiones anteriores';
    } else if (actual !== null) {
      sPorLectura = actual; fuente = 'según el ritmo actual';
    } else if (historico) {
      sPorLectura = historico.sPorLectura;
      fuente = `según ${historico.sesiones} ${historico.sesiones === 1 ? 'sesión anterior' : 'sesiones anteriores'}`;
    }
    if (sPorLectura === null) return null;
    return { tipo: 'en_curso', restanteS: Math.max(0, total - recibidas) * sPorLectura, sPorLectura, fuente };
    // mediciones cambia con cada lectura; recibidas basta para recalcular
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCurso, historico, totalElegido, recibidas, total]);

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
  const restanteS = calculo.tipo === 'en_curso'
    ? Math.max(0, ancla.current.s - (ahora - ancla.current.t) / 1000)
    : calculo.restanteS;
  return { ...calculo, restanteS, fin: calculo.tipo === 'en_curso' ? new Date(Date.now() + restanteS * 1000) : null };
}

/** "≈ 2 min 15 s", "≈ 1 h 05 min", "≈ 40 s" */
export function tiempoAproximado(seg) {
  if (seg === null || seg === undefined || !Number.isFinite(seg)) return '—';
  const s = Math.round(seg);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}
