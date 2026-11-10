/**
 * components/ui/Navbar.jsx
 */
import React from 'react';

export function Navbar({
  online, activePage, onPageChange, usuario, onLogout,
  modoOperacion, onCambiarModo, puedeCambiarModo = false, sesionAbierta = false,
}) {
  return (
    <>
      <nav className="tms-navbar">
        <div className="navbar-brand-block">
          <div className="navbar-logo">TMS</div>
          <div>
            <div className="navbar-title">Sistema de Adquisición de Datos</div>
            <div className="navbar-subtitle">Instituto Politécnico Nacional · ESIME</div>
          </div>
        </div>
        <div className="navbar-right">
          {/* Modo de operación: etiqueta para todos; selector provisional solo para admin (Fase 6: menú lateral) */}
          {modoOperacion && (puedeCambiarModo ? (
            <label className={`modo-operacion modo-${modoOperacion}`}
              title={sesionAbierta ? 'Detén la sesión en curso para cambiar el modo' : 'Modo de operación del sistema'}>
              <span className="visually-hidden">Modo de operación</span>
              <select value={modoOperacion} onChange={e => onCambiarModo(e.target.value)} disabled={sesionAbierta}>
                <option value="simulacion">SIMULACIÓN</option>
                <option value="real">REAL — Pico W</option>
              </select>
            </label>
          ) : (
            <span className={`modo-operacion modo-${modoOperacion}`}>
              {modoOperacion === 'simulacion' ? 'SIMULACIÓN' : 'REAL — Pico W'}
            </span>
          ))}
          <span className="version-badge">v2.0.0</span>
          <div className="server-status">
            <div className={`status-dot${online ? '' : ' offline'}`} />
            <span style={{ color: online ? 'var(--emerald)' : '#ff7070' }}>
              {online ? 'SERVIDOR EN LÍNEA' : 'SIN CONEXIÓN'}
            </span>
          </div>
          {usuario && (
            <div className="navbar-usuario">
              <i className="bi bi-person-circle" aria-hidden="true" />
              <span className="navbar-usuario-nombre">{usuario.nombre}</span>
              <span className="navbar-usuario-rol">{usuario.rol}</span>
              <button type="button" className="btn-logout" onClick={onLogout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" /> Salir
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="page-nav">
        <button
          className={`page-tab${activePage === 'dashboard' ? ' active' : ''}`}
          onClick={() => onPageChange('dashboard')}
        >
          <i className="bi bi-broadcast" /> Dashboard en Vivo
        </button>
        <button
          className={`page-tab${activePage === 'historial' ? ' active' : ''}`}
          onClick={() => onPageChange('historial')}
        >
          <i className="bi bi-archive" /> Mediciones Pasadas
        </button>
      </div>
    </>
  );
}
