/**
 * hooks/useServerStatus.js
 * ─────────────────────────────────────────────────────────────
 * Consulta GET /api/status cada 15 segundos para saber si el
 * backend está encendido. El Navbar muestra el resultado.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from 'react';

export function useServerStatus() {
  // true = servidor respondió OK, false = no hay conexión
  const [online, setOnline] = useState(false);

  const checkStatus = async () => {
    try {
      // fetch hace una petición GET al backend
      const res  = await fetch('/api/status');
      const json = await res.json();
      setOnline(json.ok === true);
    } catch {
      // Si fetch lanza error (servidor apagado), marcar offline
      setOnline(false);
    }
  };

  useEffect(() => {
    checkStatus();                                // verificar al montar
    const id = setInterval(checkStatus, 15_000); // repetir cada 15 s
    return () => clearInterval(id);              // limpiar al desmontar
  }, []);

  return { online };
}
