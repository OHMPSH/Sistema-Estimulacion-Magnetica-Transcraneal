/**
 * components/config/TokenDispositivo.jsx
 * Genera (o regenera) el token de la Pico W. Solo para admin.
 * El token se muestra UNA sola vez, con un botón para copiarlo.
 */
import React, { useState } from 'react';
import { apiFetch, leerJSON } from '../../api/cliente.js';

export function TokenDispositivo({ tieneToken, onCambio, confirmar }) {
  const [token, setToken] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const generar = async () => {
    if (tieneToken && confirmar && !(await confirmar({
      titulo: 'Regenerar el token de la Pico W',
      mensaje: 'El token anterior deja de funcionar al instante: la Pico W no podrá enviar lecturas hasta que le pongas el nuevo.',
      textoConfirmar: 'Sí, generar otro', peligro: true,
    }))) return;
    setTrabajando(true); setError(''); setMensaje('');
    try {
      const json = await leerJSON(await apiFetch('/api/dispositivo/token', { method: 'POST' }));
      if (json.ok) { setToken(json.token); onCambio?.(); }
      else setError(json.error || 'No se pudo generar el token.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setTrabajando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setMensaje('Token copiado al portapapeles.');
    } catch {
      setMensaje('No se pudo copiar automáticamente: selecciónalo y cópialo a mano.');
    }
  };

  return (
    <div className="token-dispositivo">
      <p className="mb-2">
        {tieneToken ? 'La Pico W ya tiene un token.' : 'La Pico W todavía no tiene token: genera uno para que pueda enviar lecturas.'}
      </p>
      <button type="button" className="btn-tms btn-start" onClick={generar} disabled={trabajando}>
        <i className="bi bi-key" aria-hidden="true" /> {trabajando ? 'Generando…' : tieneToken ? 'Regenerar token' : 'Generar token'}
      </button>
      {token && (
        <div className="token-mostrado mt-3" role="region" aria-label="Token nuevo de la Pico W">
          <p className="token-aviso mb-2">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Cópialo ahora: <strong>no se volverá a mostrar</strong>.
            Guárdalo en la constante TOKEN del firmware (ver docs/firmware-pico-w.md).
          </p>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <code className="token-valor" translate="no">{token}</code>
            <button type="button" className="mode-btn" onClick={copiar}>
              <i className="bi bi-clipboard" aria-hidden="true" /> Copiar
            </button>
            <button type="button" className="mode-btn" onClick={() => { setToken(''); setMensaje(''); }}>
              Ocultar
            </button>
          </div>
        </div>
      )}
      <p className="small mt-2 mb-0" role="status" aria-live="polite">{mensaje}</p>
      <p className="auth-error mt-1 mb-0" role="alert">{error}</p>
    </div>
  );
}
