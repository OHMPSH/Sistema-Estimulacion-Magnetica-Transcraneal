/**
 * components/ui/Navbar.jsx
 */
import React from 'react';

export function Navbar({ online, activePage, onPageChange }) {
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
          <span className="version-badge">v2.0.0</span>
          <div className="server-status">
            <div className={`status-dot${online ? '' : ' offline'}`} />
            <span style={{ color: online ? 'var(--emerald)' : '#ff7070' }}>
              {online ? 'SERVIDOR EN LÍNEA' : 'SIN CONEXIÓN'}
            </span>
          </div>
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
