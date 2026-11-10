/**
 * hooks/useDispositivo.js
 * ─────────────────────────────────────────────────────────────
 * Estado de la Pico W (Fase 4).
 *   - Lo carga de GET /api/dispositivo/estado al montar.
 *   - Lo actualiza con el evento `dispositivo` del SSE (el servidor lo
 *     difunde con cada latido y al pasar a sin señal).
 *   - Recalcula cada segundo el texto "hace N s" sin pedir nada al servidor.
 *
 * Devuelve { estado, segundos, texto, recargar }:
 *   texto: "Pico W en línea · midiendo" (o "· hace 2 s" si el firmware no informa su estado)
 *          | "Pico W sin señal hace 40 s" | "Pico W nunca conectada"
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch, leerJSON } from '../api/cliente.js';
import { useEventoStream, useAlConectarStream } from './useStream.js';

/** "40 s", "3 min", "2 h" */
export function duracionCorta(seg) {
  if (seg < 60) return `${seg} s`;
  if (seg < 3600) return `${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `${Math.floor(seg / 3600)} h`;
  return `${Math.floor(seg / 86400)} d`;
}

/** Lo que informa el firmware en el latido (estadoPico) */
export const ESTADOS_PICO = {
  espera: 'en espera',
  homing: 'volviendo al origen',
  midiendo: 'midiendo',
  error: 'con error',
};

export function textoDispositivo(estado, segundos) {
  if (!estado || !estado.ultimoLatido) return 'Pico W nunca conectada';
  if (!estado.activo) return 'Pico W desactivada';
  if (!estado.enLinea) return `Pico W sin señal hace ${duracionCorta(segundos)}`;
  const actividad = ESTADOS_PICO[estado.estadoPico];
  return actividad ? `Pico W en línea · ${actividad}` : `Pico W en línea · hace ${duracionCorta(segundos)}`;
}

export function useDispositivo() {
  const [estado, setEstado] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const recargar = useCallback(async () => {
    try {
      const json = await leerJSON(await apiFetch('/api/dispositivo/estado'));
      if (json.ok) {
        const { ok: _ok, ...resto } = json;
        setEstado(resto);
      }
    } catch { /* servidor apagado: lo indica la Navbar */ }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);
  useEventoStream('dispositivo', datos => setEstado(datos));
  useAlConectarStream(recargar);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segundos = estado?.ultimoLatido
    ? Math.max(0, Math.round((ahora - new Date(estado.ultimoLatido).getTime()) / 1000))
    : null;
  // Sin señal en vivo: si el umbral pasó y el evento aún no llega, se muestra igual
  const enLinea = Boolean(estado?.enLinea && segundos !== null && segundos <= (estado.umbral_desconexion_s ?? 15));
  const estadoVisible = estado ? { ...estado, enLinea } : null;

  return { estado: estadoVisible, segundos, texto: textoDispositivo(estadoVisible, segundos), recargar };
}
