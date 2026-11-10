/**
 * hooks/useStream.js
 * ─────────────────────────────────────────────────────────────
 * Un ÚNICO EventSource (/api/stream) para toda la aplicación, que
 * reparte los eventos del servidor a quien se suscriba:
 *   medicion, sesion, configuracion, dispositivo, resincronizar
 *
 *   useEventoStream('dispositivo', datos => …)
 *
 * El EventSource se abre con la primera suscripción y se cierra cuando
 * ya no queda ninguna. Si la conexión se corta, el navegador se
 * reconecta solo (y manda Last-Event-ID; ver Fase 5).
 * ─────────────────────────────────────────────────────────────
 */
import { useEffect, useRef } from 'react';

const EVENTOS = ['medicion', 'sesion', 'configuracion', 'dispositivo', 'resincronizar'];

const suscriptores = new Map(EVENTOS.map(e => [e, new Set()]));
const alConectar = new Set();
let fuente = null;
let usuarios = 0;

function abrir() {
  fuente = new EventSource('/api/stream', { withCredentials: true });
  for (const evento of EVENTOS) {
    fuente.addEventListener(evento, e => {
      let datos = null;
      try { datos = JSON.parse(e.data); } catch { return; }
      for (const fn of suscriptores.get(evento)) fn(datos, e);
    });
  }
  fuente.addEventListener('open', () => { for (const fn of alConectar) fn(); });
}

function cerrar() {
  fuente?.close();
  fuente = null;
}

/** Suscribe una función a un evento del SSE mientras el componente esté montado */
export function useEventoStream(evento, manejador) {
  const ref = useRef(manejador);
  ref.current = manejador;

  useEffect(() => {
    const fn = (datos, e) => ref.current(datos, e);
    suscriptores.get(evento).add(fn);
    usuarios += 1;
    if (!fuente) abrir();
    return () => {
      suscriptores.get(evento).delete(fn);
      usuarios -= 1;
      if (usuarios === 0) cerrar();
    };
  }, [evento]);
}

/** Llama a la función cada vez que el SSE (re)conecta */
export function useAlConectarStream(manejador) {
  const ref = useRef(manejador);
  ref.current = manejador;
  useEffect(() => {
    const fn = () => ref.current();
    alConectar.add(fn);
    return () => alConectar.delete(fn);
  }, []);
}
