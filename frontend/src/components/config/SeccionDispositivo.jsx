/**
 * components/config/SeccionDispositivo.jsx
 * Estado de la Pico W, su token (se muestra una sola vez), activarla o
 * desactivarla, y el intervalo de latido y el umbral de desconexión.
 */
import React, { useRef, useState } from 'react';
import { apiFetch, enviarJSON, leerJSON } from '../../api/cliente.js';
import { useDispositivo, duracionCorta } from '../../hooks/useDispositivo.js';
import { TokenDispositivo } from './TokenDispositivo.jsx';
import { SeccionFormulario } from './SeccionFormulario.jsx';
import { ModalConfirmacion } from '../modals/ModalConfirmacion.jsx';
import { fechaHora } from '../../utils/formato.js';

export function SeccionDispositivo({ esAdmin, zona }) {
  const { estado, segundos, texto, recargar } = useDispositivo();
  const confirmacion = useRef(null);
  const [aviso, setAviso] = useState({ texto: '', error: false });
  const confirmar = op => confirmacion.current.confirmar(op);

  const revocar = async () => {
    if (!(await confirmar({ titulo: 'Revocar el token', mensaje: 'La Pico W recibirá 401 y dejará de enviar lecturas hasta que generes otro token.', textoConfirmar: 'Sí, revocar', peligro: true }))) return;
    const json = await leerJSON(await apiFetch('/api/dispositivo/token', { method: 'DELETE' })).catch(() => ({ ok: false }));
    setAviso(json.ok ? { texto: 'Token revocado.', error: false } : { texto: json.error || 'No se pudo revocar.', error: true });
    recargar();
  };

  const cambiarActivo = async () => {
    const json = await leerJSON(await enviarJSON('/api/dispositivo', { activo: !estado.activo }, 'PATCH')).catch(() => ({ ok: false }));
    setAviso(json.ok ? { texto: `Pico W ${estado.activo ? 'desactivada' : 'activada'}.`, error: false } : { texto: json.error || 'No se pudo cambiar.', error: true });
    recargar();
  };

  return (
    <>
      <SeccionFormulario
        clave="dispositivo" titulo="Dispositivo (Pico W)" soloLectura={!esAdmin}
        descripcion="La Pico W manda un latido cada cierto tiempo; si deja de llegar más tiempo que el umbral, se muestra «sin señal»."
        campos={[
          { ruta: ['intervalo_latido_s'], etiqueta: 'Intervalo de latido', tipo: 'entero', unidad: 's', ayuda: 'Cada cuánto pregunta la Pico al servidor (1 a 300 s).' },
          { ruta: ['umbral_desconexion_s'], etiqueta: 'Umbral de desconexión', tipo: 'entero', unidad: 's', ayuda: 'Debe ser mayor que el intervalo de latido.' },
        ]}
        extra={(
          <div className="estado-dispositivo">
            <h3 className="menu-subtitulo">Estado</h3>
            <dl className="session-stats">
              <div><dt>Dispositivo</dt><dd>{estado?.nombre ?? '—'}</dd></div>
              <div><dt>Conexión</dt><dd role="status" aria-live="polite">{texto}</dd></div>
              <div><dt>Último latido</dt><dd className="cifra">{estado?.ultimoLatido ? `${fechaHora(estado.ultimoLatido, zona)} (hace ${duracionCorta(segundos)})` : '—'}</dd></div>
              <div><dt>IP</dt><dd className="cifra">{estado?.ip ?? '—'}</dd></div>
              <div><dt>Firmware</dt><dd className="cifra" translate="no">{estado?.firmware ?? '—'}</dd></div>
              <div><dt>Señal Wi-Fi</dt><dd className="cifra">{estado?.rssi != null ? `${estado.rssi} dBm` : '—'}</dd></div>
              <div><dt>Desfase de reloj</dt><dd className="cifra">{estado?.desfase_ms != null ? `${estado.desfase_ms} ms` : '—'}</dd></div>
              <div><dt>Token</dt><dd>{estado?.tieneToken ? 'Configurado' : 'Sin token'}</dd></div>
              <div><dt>Activa</dt><dd>{estado?.activo ? 'Sí' : 'No'}</dd></div>
            </dl>
          </div>
        )}
      />

      {esAdmin && (
        <div className="seccion-config">
          <h3 className="menu-subtitulo">Token de la Pico W</h3>
          <TokenDispositivo tieneToken={estado?.tieneToken} onCambio={recargar} confirmar={confirmar} />
          <div className="acciones mt-3">
            {estado?.tieneToken && (
              <button type="button" className="btn-tms btn-stop" onClick={revocar}>
                <i className="bi bi-x-octagon" aria-hidden="true" /> Revocar token
              </button>
            )}
            {estado?.existe && (
              <button type="button" className="btn-tms btn-secundario" onClick={cambiarActivo}>
                {estado.activo ? 'Desactivar la Pico W' : 'Activar la Pico W'}
              </button>
            )}
          </div>
          <p className={aviso.error ? 'texto-error' : 'texto-exito'} role={aviso.error ? 'alert' : 'status'} aria-live="polite">{aviso.texto}</p>
        </div>
      )}
      <ModalConfirmacion ref={confirmacion} />
    </>
  );
}
