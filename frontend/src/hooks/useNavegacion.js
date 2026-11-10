/**
 * hooks/useNavegacion.js
 * ─────────────────────────────────────────────────────────────
 * Navegación en la URL con la History API, sin react-router:
 *   ?vista=dashboard|historial|configuracion&seccion=barrido|sensor|…
 * Funcionan el botón de atrás del navegador y los enlaces directos.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react';

export const VISTAS = ['dashboard', 'historial', 'configuracion'];
export const SECCIONES = ['barrido', 'sensor', 'simulacion', 'dispositivo', 'visualizacion', 'usuarios'];

function leer() {
  const p = new URLSearchParams(window.location.search);
  const vista = VISTAS.includes(p.get('vista')) ? p.get('vista') : 'dashboard';
  const seccion = vista === 'configuracion'
    ? (SECCIONES.includes(p.get('seccion')) ? p.get('seccion') : 'barrido')
    : null;
  return { vista, seccion };
}

export function useNavegacion() {
  const [ruta, setRuta] = useState(leer);

  useEffect(() => {
    const alVolver = () => setRuta(leer());
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const navegar = useCallback((vista, seccion = null) => {
    const p = new URLSearchParams();
    p.set('vista', vista);
    if (vista === 'configuracion') p.set('seccion', seccion ?? 'barrido');
    const url = `${window.location.pathname}?${p.toString()}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', url);
    }
    setRuta(leer());
  }, []);

  return { ...ruta, navegar };
}
