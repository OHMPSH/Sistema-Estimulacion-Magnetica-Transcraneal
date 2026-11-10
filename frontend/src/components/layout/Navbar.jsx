/**
 * components/layout/Navbar.jsx
 * Barra superior: botón ☰ del menú lateral, nombre del sistema,
 * etiqueta SIMULACIÓN (muy visible en ese modo), estado del servidor y,
 * solo en modo real, el estado de la Pico W. Los estados siempre llevan
 * texto además del punto de color y se anuncian con aria-live.
 */
import React, { forwardRef } from 'react';

export const Navbar = forwardRef(function Navbar({ online, modoOperacion, dispositivo, onAbrirMenu, menuAbierto }, refBoton) {
  const enLineaPico = Boolean(dispositivo?.estado?.enLinea);
  return (
    <header className="tms-navbar">
      <div className="navbar-brand-block">
        <button ref={refBoton} type="button" className="btn-menu" onClick={onAbrirMenu}
          aria-label="Abrir el menú" aria-haspopup="dialog" aria-expanded={menuAbierto} aria-controls="menu-lateral">
          <i className="bi bi-list" aria-hidden="true" />
        </button>
        <div className="navbar-logo" aria-hidden="true" translate="no">TMS</div>
        <div className="navbar-nombre">
          <span className="navbar-title">Sistema de Adquisición de Datos</span>
          <span className="navbar-subtitle">IPN · ESIME Zacatenco</span>
        </div>
      </div>

      <div className="navbar-right">
        {modoOperacion === 'simulacion' && (
          <span className="etiqueta-simulacion" title="Los datos los genera el simulador del servidor, no el sensor">
            <i className="bi bi-cpu" aria-hidden="true" /> SIMULACIÓN
          </span>
        )}
        {modoOperacion === 'real' && (
          <span className="etiqueta-real" title="Las lecturas llegan de la Pico W">
            <i className="bi bi-broadcast-pin" aria-hidden="true" /> <span className="texto-largo">Modo </span>real
          </span>
        )}

        <div className="estado-indicador" role="status" aria-live="polite">
          <span className={`status-dot${online ? '' : ' offline'}`} aria-hidden="true" />
          <span><span className="texto-largo">Servidor </span>{online ? 'en línea' : 'sin conexión'}</span>
        </div>

        {modoOperacion === 'real' && dispositivo && (
          <div className="estado-indicador" role="status" aria-live="polite">
            <span className={`status-dot${enLineaPico ? '' : ' offline'}`} aria-hidden="true" />
            <span translate="no">{dispositivo.texto}</span>
          </div>
        )}
      </div>
    </header>
  );
});
