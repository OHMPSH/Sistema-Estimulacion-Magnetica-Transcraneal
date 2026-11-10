/**
 * hooks/useAcquisition.js
 * ─────────────────────────────────────────────────────────────
 * ESTADO DEL BARRIDO EN VIVO (desde la Fase 3)
 *
 * El navegador ya NO genera muestras: la simulación corre en el
 * servidor (o los datos llegan de la Pico W en modo real). Este hook:
 *   1. Lee la configuración y la sesión abierta (GET /api/configuracion).
 *   2. Escucha el SSE /api/stream:
 *        medicion       → dibuja la lectura (solo si es de la sesión activa)
 *        sesion         → iniciada / finalizada (para todos los navegadores)
 *        configuracion  → actualiza la configuración en vivo
 *   3. Iniciar = POST /api/sesiones {modo, paso_mm, medio}.
 *      Detener = PUT /api/sesiones/:id.
 *   4. Carga el historial (GET /api/sesiones).
 *
 * Así, todas las personas conectadas ven exactamente el mismo barrido.
 * Quien abre la página a mitad de un barrido sigue recibiendo los
 * puntos nuevos; los anteriores llegan en la Fase 5 (GET /sesiones/activa).
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MAX_CHART_POINTS, MAX_TABLE_ROWS } from '../constants/system.js';
import { apiFetch, enviarJSON, leerJSON } from '../api/cliente.js';
import { mallaDePaso } from '../utils/geometria.js';

const formatoHora = ts => new Date(ts).toLocaleTimeString('es-MX', {
  hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2,
});

export function useAcquisition() {
  // ── Configuración y sesión ────────────────────────────────
  const [configuracion, setConfiguracion] = useState(null);   // { data, opciones }
  const [sesionActiva,  setSesionActiva]  = useState(null);   // sesión abierta con su geometría
  const [ultimaSesion,  setUltimaSesion]  = useState(null);   // la última que se vio (para mostrar al terminar)
  const [iniciando,     setIniciando]     = useState(false);
  const [deteniendo,    setDeteniendo]    = useState(false);
  const [errorAccion,   setErrorAccion]   = useState('');

  // ── Datos dibujados ───────────────────────────────────────
  const [totalScanned, setTotalScanned] = useState(0);
  const [currentZIdx,  setCurrentZIdx]  = useState(0);
  const [currentPos,   setCurrentPos]   = useState(null);
  const [elapsedSec,   setElapsedSec]   = useState(0);
  const [chartLabels,  setChartLabels]  = useState([]);
  const [chartBx,      setChartBx]      = useState([]);
  const [chartBy,      setChartBy]      = useState([]);
  const [chartBz,      setChartBz]      = useState([]);
  const [tableRows,    setTableRows]    = useState([]);
  const [points3D,     setPoints3D]     = useState([]);
  const [sessions,     setSessions]     = useState([]);

  const sesionRef  = useRef(null);   // id de la sesión activa (para filtrar eventos del SSE)
  const contadorRef = useRef(0);

  // ── Historial ─────────────────────────────────────────────
  const cargarSesiones = useCallback(async () => {
    try {
      const json = await leerJSON(await apiFetch('/api/sesiones'));
      if (json.ok) setSessions(json.data);
    } catch {
      setSessions([]);
    }
  }, []);

  // ── Empezar a seguir una sesión (vacía las vistas si es otra) ──
  const seguirSesion = useCallback((sesion) => {
    setUltimaSesion(sesion);
    if (sesionRef.current === sesion.id) {
      setSesionActiva(sesion);
      return;
    }
    sesionRef.current = sesion.id;
    contadorRef.current = 0;
    setSesionActiva(sesion);
    setTotalScanned(0);
    setCurrentZIdx(0);
    setCurrentPos(null);
    setChartLabels([]); setChartBx([]); setChartBy([]); setChartBz([]);
    setTableRows([]);
    setPoints3D([]);
  }, []);

  // ── Aplicar una medición recibida por SSE ─────────────────
  const aplicarMedicion = useCallback((m) => {
    const { xMM, yMM, zMM, zIdx, bx, by, bz, magnitud, timestamp } = m;
    const tsStr = formatoHora(timestamp);
    contadorRef.current += 1;
    const n = contadorRef.current;

    // KPI: la posición mostrada es la de la ÚLTIMA lectura recibida
    setCurrentZIdx(zIdx);
    setCurrentPos({ xMM, yMM, tsStr });
    setTotalScanned(n);

    const deslizar = (arr, v) => {
      const sig = [...arr, v];
      return sig.length > MAX_CHART_POINTS ? sig.slice(-MAX_CHART_POINTS) : sig;
    };
    setChartLabels(p => deslizar(p, tsStr));
    setChartBx(p => deslizar(p, bx));
    setChartBy(p => deslizar(p, by));
    setChartBz(p => deslizar(p, bz));

    setPoints3D(p => [...p, { xMM, yMM, zIdx, zMM, bx, by, bz, magnitud }]);
    setTableRows(p => {
      const sig = [{ tsStr, xMM, yMM, zIdx, zMM, bx, by, bz, magnitud, key: `${m.sesionId}-${n}` }, ...p];
      return sig.length > MAX_TABLE_ROWS ? sig.slice(0, MAX_TABLE_ROWS) : sig;
    });
  }, []);

  // ── Carga inicial: configuración (incluye la sesión abierta) e historial ──
  useEffect(() => {
    (async () => {
      try {
        const json = await leerJSON(await apiFetch('/api/configuracion'));
        if (json.ok) {
          setConfiguracion({ data: json.data, opciones: json.opciones });
          if (json.sesion_activa) seguirSesion(json.sesion_activa);
        }
      } catch { /* servidor apagado: lo indica la Navbar */ }
    })();
    cargarSesiones();
  }, [cargarSesiones, seguirSesion]);

  // ── SSE ───────────────────────────────────────────────────
  useEffect(() => {
    const evt = new EventSource('/api/stream', { withCredentials: true });
    const leer = (e) => { try { return JSON.parse(e.data); } catch { return null; } };

    evt.addEventListener('medicion', (e) => {
      const m = leer(e);
      // Se descartan las lecturas de cualquier sesión que no sea la activa
      if (m && m.sesionId === sesionRef.current) aplicarMedicion(m);
    });

    evt.addEventListener('sesion', (e) => {
      const d = leer(e);
      if (!d) return;
      if (d.tipo === 'iniciada') {
        seguirSesion(d.sesion);
      } else if (d.tipo === 'finalizada' && d.sesion.id === sesionRef.current) {
        setSesionActiva(null);
        setUltimaSesion({ ...d.sesion, motivo: d.motivo });
        cargarSesiones();
      }
    });

    evt.addEventListener('configuracion', (e) => {
      const d = leer(e);
      if (d) setConfiguracion(c => (c ? { ...c, data: { ...c.data, [d.clave]: d.valor } } : c));
    });

    return () => evt.close();
  }, [aplicarMedicion, seguirSesion, cargarSesiones]);

  // ── Cronómetro: desde la hora de inicio que guardó el servidor ──
  useEffect(() => {
    if (!sesionActiva) return undefined;
    const inicio = new Date(sesionActiva.iniciada_en).getTime();
    const tic = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [sesionActiva]);

  // ── Acciones ──────────────────────────────────────────────
  /** Inicia un barrido. parametros = { modo, pasoMM, medio } */
  const startAcquisition = useCallback(async ({ modo, pasoMM, medio }) => {
    if (iniciando) return;
    setIniciando(true);
    setErrorAccion('');
    try {
      const json = await leerJSON(await enviarJSON('/api/sesiones', { modo, paso_mm: pasoMM, medio }));
      if (json.ok) seguirSesion(json.sesion);
      else setErrorAccion(json.error || 'No se pudo iniciar la medición.');
    } catch {
      setErrorAccion('No se pudo conectar con el servidor para iniciar la medición.');
    } finally {
      setIniciando(false);
    }
  }, [iniciando, seguirSesion]);

  const stopAcquisition = useCallback(async () => {
    const id = sesionRef.current;
    if (!id || deteniendo) return;
    setDeteniendo(true);
    setErrorAccion('');
    try {
      const json = await leerJSON(await apiFetch(`/api/sesiones/${id}`, { method: 'PUT' }));
      if (json.ok) {
        setSesionActiva(null);
        setUltimaSesion(json.sesion);
        cargarSesiones();
      } else {
        setErrorAccion(json.error || 'No se pudo detener la medición.');
      }
    } catch {
      setErrorAccion('No se pudo conectar con el servidor para detener la medición.');
    } finally {
      setDeteniendo(false);
    }
  }, [deteniendo, cargarSesiones]);

  const deleteSession = useCallback(async (id) => {
    try {
      const json = await leerJSON(await apiFetch(`/api/sesiones/${id}`, { method: 'DELETE' }));
      if (!json.ok) setErrorAccion(json.error || 'No se pudo eliminar la sesión.');
      await cargarSesiones();
    } catch { /* sin conexión */ }
  }, [cargarSesiones]);

  const cambiarModoOperacion = useCallback(async (modo) => {
    setErrorAccion('');
    try {
      const json = await leerJSON(await enviarJSON('/api/configuracion/modo_operacion', { valor: modo }, 'PUT'));
      if (!json.ok) setErrorAccion(json.error || 'No se pudo cambiar el modo de operación.');
    } catch {
      setErrorAccion('No se pudo conectar con el servidor para cambiar el modo.');
    }
  }, []);

  // ── Geometría: la de la sesión activa, la última vista o la predeterminada ──
  const barrido = configuracion?.data?.barrido;
  const geometria = useMemo(() => {
    const ref = sesionActiva ?? ultimaSesion;
    if (ref) {
      const m = mallaDePaso(barrido, ref.paso_mm);
      return { ...m, zLevels: ref.z_levels_mm ?? m.zLevels, totalPuntos: ref.puntos_esperados ?? m.totalPuntos };
    }
    return mallaDePaso(barrido, barrido?.paso_predeterminado_mm ?? 5);
  }, [sesionActiva, ultimaSesion, barrido]);

  const isActive    = sesionActiva !== null;
  const progressPct = Math.min(100, Math.round((totalScanned / geometria.totalPuntos) * 100));
  const porPlano    = geometria.gridN * geometria.gridN;
  const enPlano     = totalScanned > 0 ? (((totalScanned - 1) % porPlano) + 1) : 0;
  const zActualMM   = geometria.zLevels[currentZIdx] ?? 0;
  const scanLabel   = isActive
    ? `Escaneando Z${currentZIdx} (${zActualMM} mm) — ${Math.round((enPlano / porPlano) * 100)}% del plano`
    : totalScanned > 0
      ? (ultimaSesion?.motivo === 'completa' || totalScanned >= geometria.totalPuntos ? '✓ Barrido terminado' : 'Detenido')
      : 'Detenido';

  return {
    configuracion, modoOperacion: configuracion?.data?.modo_operacion ?? null,
    sesionActiva, ultimaSesion, geometria,
    isActive, iniciando, deteniendo, errorAccion, limpiarError: () => setErrorAccion(''),
    totalScanned, currentZIdx, currentPos, elapsedSec, progressPct, scanLabel,
    chartLabels, chartBx, chartBy, chartBz,
    tableRows, points3D, sessions,
    startAcquisition, stopAcquisition, deleteSession, recargarHistorial: cargarSesiones,
    cambiarModoOperacion,
  };
}
