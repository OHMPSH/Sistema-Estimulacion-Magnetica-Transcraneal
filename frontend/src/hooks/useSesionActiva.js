/**
 * hooks/useSesionActiva.js
 * ─────────────────────────────────────────────────────────────
 * Estado del barrido en vivo (Fases 5 y 6). El navegador NO genera
 * datos: solo dibuja lo que manda el servidor.
 *
 *   1. Al conectarse (y en cada reconexión del SSE, o con el evento
 *      `resincronizar`) carga GET /api/sesiones/activa: la sesión abierta
 *      con todo lo medido hasta ahora. Así, quien abre o recarga la página
 *      a mitad del barrido ve todos los puntos anteriores.
 *   2. Aplica los eventos `medicion` de la sesión que sigue (descarta los
 *      de otras sesiones) y `sesion` (iniciada / finalizada).
 *   3. Deduplica por `seq`: lo que llega dos veces (reenvío del SSE tras
 *      reconectar + la carga de /activa) se dibuja una sola vez.
 *   4. Agrupa las actualizaciones por cuadro (requestAnimationFrame): un
 *      lote de 200 lecturas de la Pico provoca UN render, no 200.
 *
 * Devuelve:
 *   sesion, enCurso, mediciones (todas, en orden de seq), version (cambia
 *   en cada cuadro con datos nuevos), ultima, iniciando, deteniendo,
 *   errorAccion, iniciar({modo, pasoMM, medio, zona}), detener(), limpiarError()
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, enviarJSON, leerJSON } from '../api/cliente.js';
import { useEventoStream, useAlConectarStream } from './useStream.js';

/** Clave para deduplicar: seq, o (si no hay) hora + posición */
const claveDe = m => (m.seq !== null && m.seq !== undefined ? `s${m.seq}` : `t${m.timestamp}|${m.xMM}|${m.yMM}|${m.zMM}`);
const porSeq = (a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity);

export function useSesionActiva() {
  const [sesion, setSesion] = useState(null);       // la que se sigue (abierta o la última vista)
  const [enCurso, setEnCurso] = useState(false);
  const [version, setVersion] = useState(0);
  const [iniciando, setIniciando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const datos = useRef({ sesionId: null, mediciones: [], vistos: new Set(), sucio: false });
  const cuadro = useRef(0);
  const ocupado = useRef(false);   // evita el doble inicio o la doble detención
  const enCursoRef = useRef(false);
  enCursoRef.current = enCurso;

  /** Pide un render en el próximo cuadro (uno solo, aunque lleguen muchas lecturas) */
  const programar = useCallback(() => {
    if (cuadro.current) return;
    const hacer = () => {
      cuadro.current = 0;
      // Un array nuevo por cuadro (no por lectura) para que los useMemo se recalculen
      if (datos.current.sucio) {
        datos.current.mediciones = datos.current.mediciones.slice();
        datos.current.sucio = false;
      }
      setVersion(v => v + 1);
    };
    cuadro.current = document.hidden ? setTimeout(hacer, 250) : requestAnimationFrame(hacer);
  }, []);

  useEffect(() => () => { cancelAnimationFrame(cuadro.current); clearTimeout(cuadro.current); }, []);

  /** Empieza a seguir otra sesión (vacía las vistas) */
  const seguir = useCallback((s, mediciones = []) => {
    const ordenadas = [...mediciones].sort(porSeq);
    datos.current = { sesionId: s.id, mediciones: ordenadas, vistos: new Set(ordenadas.map(claveDe)), sucio: false };
    setSesion(s);
    programar();
  }, [programar]);

  /** Une lecturas a la sesión actual sin repetir */
  const unir = useCallback((lista) => {
    const d = datos.current;
    let nuevas = 0;
    let desordenada = false;
    for (const m of lista) {
      const k = claveDe(m);
      if (d.vistos.has(k)) continue;
      d.vistos.add(k);
      const ultima = d.mediciones[d.mediciones.length - 1];
      if (ultima && (m.seq ?? Infinity) < (ultima.seq ?? Infinity)) desordenada = true;
      d.mediciones.push(m);
      nuevas += 1;
    }
    if (desordenada) d.mediciones.sort(porSeq);
    if (nuevas > 0) {
      d.sucio = true;
      programar();
    }
  }, [programar]);

  const cargarActiva = useCallback(async () => {
    try {
      const json = await leerJSON(await apiFetch('/api/sesiones/activa'));
      if (!json.ok) return;
      if (json.sesion) {
        if (json.sesion.id === datos.current.sesionId) {
          setSesion(s => ({ ...s, ...json.sesion }));
          unir(json.mediciones);
        } else {
          seguir(json.sesion, json.mediciones);
        }
        setEnCurso(true);
      } else if (enCursoRef.current) {
        // La sesión terminó mientras no escuchábamos: se conservan los datos y se marca terminada
        setEnCurso(false);
      }
    } catch { /* sin conexión: lo indica la Navbar */ }
  }, [seguir, unir]);

  useEffect(() => { cargarActiva(); }, [cargarActiva]);
  useAlConectarStream(cargarActiva);
  useEventoStream('resincronizar', () => cargarActiva());

  useEventoStream('medicion', (m) => {
    if (!m) return;
    if (m.sesionId === datos.current.sesionId) unir([m]);
    // Lectura de una sesión que no conocemos (se perdió el evento "iniciada"): resincronizar
    else if (!enCursoRef.current) cargarActiva();
  });

  useEventoStream('sesion', (d) => {
    if (!d) return;
    if (d.tipo === 'iniciada') {
      seguir(d.sesion, []);
      setEnCurso(true);
    } else if (d.tipo === 'finalizada' && d.sesion.id === datos.current.sesionId) {
      setSesion({ ...d.sesion, motivo: d.motivo });
      setEnCurso(false);
    }
  });

  const iniciar = useCallback(async ({ modo, pasoMM, medio, zona }) => {
    if (ocupado.current) return false;
    ocupado.current = true;
    setIniciando(true);
    setErrorAccion('');
    try {
      const json = await leerJSON(await enviarJSON('/api/sesiones', { modo, paso_mm: pasoMM, medio, zona_mm: zona }));
      if (json.ok) {
        if (json.sesion.id !== datos.current.sesionId) seguir(json.sesion, []);
        setEnCurso(true);
        return true;
      }
      setErrorAccion(json.error || 'No se pudo iniciar la medición.');
      return false;
    } catch {
      setErrorAccion('No se pudo conectar con el servidor para iniciar la medición.');
      return false;
    } finally {
      ocupado.current = false;
      setIniciando(false);
    }
  }, [seguir]);

  const detener = useCallback(async () => {
    const id = datos.current.sesionId;
    if (!id || ocupado.current) return false;
    ocupado.current = true;
    setDeteniendo(true);
    setErrorAccion('');
    try {
      const json = await leerJSON(await apiFetch(`/api/sesiones/${id}`, { method: 'PUT' }));
      if (json.ok) {
        setSesion(s => ({ ...s, ...json.sesion, motivo: 'manual' }));
        setEnCurso(false);
        return true;
      }
      setErrorAccion(json.error || 'No se pudo detener la medición.');
      return false;
    } catch {
      setErrorAccion('No se pudo conectar con el servidor para detener la medición.');
      return false;
    } finally {
      ocupado.current = false;
      setDeteniendo(false);
    }
  }, []);

  const mediciones = datos.current.mediciones;
  return {
    sesion, enCurso, mediciones, version,
    ultima: mediciones.length ? mediciones[mediciones.length - 1] : null,
    iniciando, deteniendo, errorAccion, limpiarError: () => setErrorAccion(''),
    iniciar, detener,
  };
}
