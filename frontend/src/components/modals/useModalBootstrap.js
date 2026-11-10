/**
 * components/modals/useModalBootstrap.js
 * Crea un Modal de Bootstrap (bootstrap/js/dist/modal) sobre un elemento
 * y devuelve { mostrar, ocultar }. Sustituye a los globales
 * window.__startModalShow / __stopModalShow de las fases anteriores.
 */
import { useEffect, useRef, useCallback } from 'react';
import Modal from 'bootstrap/js/dist/modal';

export function useModalBootstrap(refElemento) {
  const modal = useRef(null);
  useEffect(() => {
    if (refElemento.current) modal.current = new Modal(refElemento.current);
    return () => { modal.current?.dispose(); modal.current = null; };
  }, [refElemento]);
  const mostrar = useCallback(() => modal.current?.show(), []);
  const ocultar = useCallback(() => modal.current?.hide(), []);
  return { mostrar, ocultar };
}
