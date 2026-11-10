/**
 * hooks/useAcquisition.js
 * ─────────────────────────────────────────────────────────────
 * LÓGICA CENTRAL DE ADQUISICIÓN
 *
 * Este hook maneja todo el ciclo de vida de una medición:
 *   1. Crear sesión en MariaDB (POST /api/sesiones)
 *   2. Simular lecturas del sensor Hall de la bobina TMS
 *   3. Enviar cada muestra al backend (POST /api/mediciones)
 *   4. Recibir datos en tiempo real vía SSE (/api/stream)
 *   5. Cerrar sesión en MariaDB al terminar
 *   6. Cargar historial de sesiones desde la BD
 *
 * La simulación replica físicamente el campo de una bobina
 * circular con sensor de efecto Hall:
 *   - Bz es la componente dominante (axial de la bobina)
 *   - Bx, By son componentes radiales (menores cerca del centro)
 *   - El campo decae con la distancia al centro y con la altura Z
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GRID_N, STEP_MM, Z_LEVELS, TOTAL_POINTS,
  MAX_CHART_POINTS, MAX_TABLE_ROWS, SIM_RATE_MS,
  BOBINA_RADIO_MM, CAMPO_MAXIMO_UT,
} from '../constants/system.js';
import { apiFetch, enviarJSON } from '../api/cliente.js';

// ─────────────────────────────────────────────────────────────
// SIMULACIÓN FÍSICA DEL CAMPO DE LA BOBINA TMS
//
// Modelo: bobina circular de radio R en el plano Z=0.
// Campo calculado con la ley de Biot-Savart simplificada.
//
//   Bz (axial) ∝ R² / (R² + r² + z²)^(3/2)
//   Br (radial) ∝ r·z / (R² + r² + z²)^(3/2)
//
// donde r = distancia radial al eje de la bobina, z = altura.
// ─────────────────────────────────────────────────────────────

/**
 * Genera una muestra realista del sensor Hall en un punto (x, y, z).
 * @param {number} xIdx  índice de columna (0..GRID_N-1)
 * @param {number} yIdx  índice de fila    (0..GRID_N-1)
 * @param {number} zIdx  índice de plano Z (0..4)
 * @returns {object}     medición con bx, by, bz, magnitud, etc.
 */
const generarMuestra = (xIdx, yIdx, zIdx) => {
  // Convertir índices a coordenadas en mm, centradas en 30,30
  const xMM = xIdx * STEP_MM;
  const yMM = yIdx * STEP_MM;
  const zMM = Z_LEVELS[zIdx];

  // Coordenadas relativas al centro de la placa (el eje de la bobina)
  const dx = xMM - 30;   // desplazamiento en X desde el centro
  const dy = yMM - 30;   // desplazamiento en Y desde el centro
  const r  = Math.sqrt(dx * dx + dy * dy); // distancia radial en mm
  const z  = zMM + 5;    // +5 para evitar singularidad en z=0

  // Radio de la bobina
  const R = BOBINA_RADIO_MM;

  // Denominador de Biot-Savart: (R² + r² + z²)^(3/2)
  const denom = Math.pow(R * R + r * r + z * z, 1.5);

  // Campo axial Bz (componente dominante, perpendicular a la placa)
  const bzBase = CAMPO_MAXIMO_UT * (R * R) / denom;

  // Campo radial Br (en el plano XY, apunta desde el centro hacia r)
  const brBase = CAMPO_MAXIMO_UT * 0.5 * (r * z) / denom;

  // Descomponer Br en sus componentes Bx y By según el ángulo
  // Si r=0 (centro exacto) no hay componente radial
  const angulo = r > 0 ? Math.atan2(dy, dx) : 0;
  const bxBase = brBase * Math.cos(angulo);
  const byBase = brBase * Math.sin(angulo);

  // Agregar ruido de medición del sensor Hall (±0.5 μT)
  const ruido = () => (Math.random() - 0.5) * 0.5;

  const bx = parseFloat((bxBase + ruido()).toFixed(4));
  const by = parseFloat((byBase + ruido()).toFixed(4));
  const bz = parseFloat((bzBase + ruido()).toFixed(4));
  const magnitud = parseFloat(Math.sqrt(bx**2 + by**2 + bz**2).toFixed(4));

  return {
    xMM:      parseFloat(xMM.toFixed(2)),
    yMM:      parseFloat(yMM.toFixed(2)),
    zMM,
    zIdx,
    bx, by, bz, magnitud,
    timestamp: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function useAcquisition() {

  // ── Estado visible para los componentes ───────────────────
  const [isActive,     setIsActive]     = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);   // 'DC' | 'AC'
  const [totalScanned, setTotalScanned] = useState(0);
  const [currentZIdx,  setCurrentZIdx]  = useState(0);
  const [currentPos,   setCurrentPos]   = useState({ xMM: 0, yMM: 0 });
  const [elapsedSec,   setElapsedSec]   = useState(0);

  // Datos para la gráfica de líneas (Bx, By, Bz vs tiempo)
  const [chartLabels, setChartLabels] = useState([]);
  const [chartBx,     setChartBx]     = useState([]);
  const [chartBy,     setChartBy]     = useState([]);
  const [chartBz,     setChartBz]     = useState([]);

  // Filas para la tabla de lecturas
  const [tableRows,  setTableRows]  = useState([]);

  // Puntos 3D: cada punto tiene posición + vector (bx,by,bz)
  const [points3D,   setPoints3D]   = useState([]);

  // Sesiones pasadas cargadas desde MariaDB
  const [sessions,   setSessions]   = useState([]);

  // ── Refs: valores que cambian frecuentemente sin causar render
  const simRef        = useRef(null);   // ID del setInterval de simulación
  const timerRef      = useRef(null);   // ID del setInterval del cronómetro
  const startTimeRef  = useRef(null);   // timestamp de inicio
  const sesionIdRef   = useRef(null);   // ID de sesión activa en MariaDB
  const xIdxRef       = useRef(0);      // posición actual del barrido
  const yIdxRef       = useRef(0);
  const zIdxRef       = useRef(0);
  const scannedRef    = useRef(0);      // contador total de muestras

  // ── Cargar sesiones desde MariaDB al montar ────────────────
  useEffect(() => {
    cargarSesiones();
  }, []);

  /** Llama GET /api/sesiones y actualiza el estado */
  const cargarSesiones = async () => {
    try {
      const res  = await apiFetch('/api/sesiones');
      const json = await res.json();
      if (json.ok) setSessions(json.data);
    } catch {
      // Si el servidor está apagado, mostrar array vacío
      setSessions([]);
    }
  };

  // ── Suscripción SSE ────────────────────────────────────────
  // Se conecta al stream del backend para recibir mediciones
  // del Pico 2W en tiempo real (cuando no estamos simulando)
  useEffect(() => {
    const evt = new EventSource('/api/stream', { withCredentials: true });

    evt.addEventListener('medicion', (e) => {
      try {
        const data = JSON.parse(e.data);
        // Si la simulación está activa, ignorar (los datos los genera ella)
        if (!simRef.current) aplicarMedicion(data);
      } catch (_) {}
    });

    // Limpiar la conexión SSE al desmontar el componente
    return () => evt.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Aplicar una medición al estado de la UI ────────────────
  const aplicarMedicion = useCallback((m) => {
    const { xMM, yMM, zIdx, bx, by, bz, magnitud, timestamp } = m;

    // Formatear timestamp para mostrar en la tabla
    const tsStr = new Date(timestamp).toLocaleTimeString('es-MX', {
      hour12: false,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      fractionalSecondDigits: 2,
    });

    // Actualizar indicadores KPI
    setCurrentZIdx(zIdx ?? 0);
    setCurrentPos({ xMM, yMM });
    scannedRef.current += 1;
    setTotalScanned(scannedRef.current);

    // Actualizar gráfica de líneas (ventana deslizante de MAX_CHART_POINTS)
    const slide = (arr, val) => {
      const next = [...arr, val];
      return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
    };
    setChartLabels(p => slide(p, tsStr));
    setChartBx(p    => slide(p, bx));
    setChartBy(p    => slide(p, by));
    setChartBz(p    => slide(p, bz));

    // Actualizar puntos 3D — incluye el vector completo (bx, by, bz)
    // para dibujar flechas que representen la dirección del campo
    setPoints3D(prev => {
      const next = [...prev, {
        xMM, yMM,
        zIdx:     zIdx ?? 0,
        zMM:      Z_LEVELS[zIdx ?? 0],
        bx, by, bz, magnitud,
      }];
      // Limitar a 845 puntos (un barrido completo)
      return next.length > TOTAL_POINTS ? next.slice(-TOTAL_POINTS) : next;
    });

    // Actualizar tabla (más reciente primero)
    setTableRows(prev => {
      const row = { tsStr, xMM, yMM, zIdx: zIdx ?? 0,
                    zMM: Z_LEVELS[zIdx ?? 0], bx, by, bz, magnitud,
                    key: `${timestamp}-${scannedRef.current}` };
      const next = [row, ...prev];
      return next.length > MAX_TABLE_ROWS ? next.slice(0, MAX_TABLE_ROWS) : next;
    });
  }, []);

  // ── Iniciar adquisición ────────────────────────────────────
  const startAcquisition = useCallback(async (modo) => {
    // 1. Crear sesión en MariaDB
    let sesionId = null;
    try {
      const res  = await enviarJSON('/api/sesiones', { modo });
      const json = await res.json();
      if (json.ok) {
        sesionId = json.sesionId;
        sesionIdRef.current = sesionId;
      }
    } catch {
      // Si no hay BD, continuar solo con simulación visual
      console.warn('[useAcquisition] Sin BD — modo solo visual');
    }

    // 2. Resetear estado
    xIdxRef.current    = 0;
    yIdxRef.current    = 0;
    zIdxRef.current    = 0;
    scannedRef.current = 0;
    startTimeRef.current = Date.now();

    setSelectedMode(modo);
    setIsActive(true);
    setTotalScanned(0);
    setCurrentZIdx(0);
    setCurrentPos({ xMM: 0, yMM: 0 });
    setElapsedSec(0);
    setChartLabels([]); setChartBx([]); setChartBy([]); setChartBz([]);
    setTableRows([]);
    setPoints3D([]);

    // 3. Cronómetro (actualiza cada segundo)
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // 4. Simulación de barrido sistemático XY → Z
    const rate = SIM_RATE_MS[modo] ?? 100;
    simRef.current = setInterval(async () => {
      const xi = xIdxRef.current;
      const yi = yIdxRef.current;
      const zi = zIdxRef.current;

      // Generar muestra con física de la bobina
      const muestra = generarMuestra(xi, yi, zi);

      // Aplicar a la UI inmediatamente (sin esperar la BD)
      aplicarMedicion(muestra);

      // Enviar al backend (que guarda en MariaDB y reenvía por SSE)
      if (sesionId) {
        enviarJSON('/api/mediciones', { sesionId, ...muestra })
          .catch(() => {}); // ignorar errores de red silenciosamente (se corrige en las Fases 3 a 6)
      }

      // Avanzar al siguiente punto del barrido
      xIdxRef.current += 1;
      if (xIdxRef.current >= GRID_N) {
        xIdxRef.current = 0;
        yIdxRef.current += 1;
      }
      if (yIdxRef.current >= GRID_N) {
        yIdxRef.current = 0;
        zIdxRef.current += 1;
        // Si ya recorrimos todos los planos Z, terminar
        if (zIdxRef.current >= Z_LEVELS.length) {
          _finalizar(sesionId);
          return;
        }
      }

      // Actualizar posición mostrada en los KPIs
      setCurrentPos({
        xMM: parseFloat((xIdxRef.current * STEP_MM).toFixed(1)),
        yMM: parseFloat((yIdxRef.current * STEP_MM).toFixed(1)),
      });
      setCurrentZIdx(zIdxRef.current < Z_LEVELS.length ? zIdxRef.current : Z_LEVELS.length - 1);
    }, rate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicarMedicion]);

  // ── Finalizar (completo o stop manual) ────────────────────
  const _finalizar = useCallback(async (sesionId) => {
    clearInterval(simRef.current);
    clearInterval(timerRef.current);
    simRef.current   = null;
    timerRef.current = null;

    // Cerrar sesión en MariaDB
    const idToClose = sesionId ?? sesionIdRef.current;
    if (idToClose) {
      try {
        await apiFetch(`/api/sesiones/${idToClose}`, { method: 'PUT' });
      } catch (_) {}
      sesionIdRef.current = null;
    }

    setIsActive(false);
    // Recargar historial desde la BD
    await cargarSesiones();
  }, []);

  const stopAcquisition = useCallback(() => {
    _finalizar(sesionIdRef.current);
  }, [_finalizar]);

  // ── Acciones del historial ─────────────────────────────────
  const deleteSession = useCallback(async (id) => {
    try {
      await apiFetch(`/api/sesiones/${id}`, { method: 'DELETE' });
      // Recargar la lista para reflejar el borrado
      await cargarSesiones();
    } catch (_) {}
  }, []);

  // Recarga manual del historial (botón de refresh en la UI)
  const recargarHistorial = useCallback(() => cargarSesiones(), []);

  // ── Cálculo de progreso del barrido ───────────────────────
  const progressPct = Math.min(100, Math.round((totalScanned / TOTAL_POINTS) * 100));
  const inPlane     = ((xIdxRef.current + yIdxRef.current * GRID_N) / (GRID_N * GRID_N) * 100).toFixed(0);
  const scanLabel   = isActive
    ? `Escaneando Z${currentZIdx} (${Z_LEVELS[currentZIdx]}mm) — ${inPlane}% del plano`
    : totalScanned >= TOTAL_POINTS ? '✓ Barrido completo' : 'Detenido';

  // ── Cleanup al cerrar la página ────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(simRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  return {
    isActive, selectedMode, totalScanned, currentZIdx,
    currentPos, elapsedSec, progressPct, scanLabel,
    chartLabels, chartBx, chartBy, chartBz,
    tableRows, points3D, sessions,
    startAcquisition, stopAcquisition, deleteSession, recargarHistorial,
  };
}
