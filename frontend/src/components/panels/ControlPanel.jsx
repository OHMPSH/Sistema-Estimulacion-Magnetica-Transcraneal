/**
 * components/panels/ControlPanel.jsx
 * Panel de control: selector de modo, botones de acción y barra de progreso.
 */
import React from 'react';
import { TOTAL_POINTS, Z_LEVELS } from '../../constants/system.js';

export function ControlPanel({
  isActive, selectedMode, totalScanned, currentZIdx,
  progressPct, scanLabel, onSelectMode, onStart, onRequestStop,
  puedeControlar = false,
}) {
  const currentZMM = Z_LEVELS[currentZIdx] ?? 0;

  return (
    <div className="control-panel fade-in">
      <div className="control-panel-title">
        <i className="bi bi-sliders2" style={{ color: 'var(--guinda-bright)' }} />
        Control de Adquisición
        {selectedMode && (
          <span style={{ fontSize: '.75rem', fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>
            [Modo: {selectedMode}]
          </span>
        )}
      </div>

      <div className="row g-3 align-items-end">
        {/* Selector de modo */}
        <div className="col-12 col-md-auto">
          <div className="kpi-label mb-2"><i className="bi bi-toggles" /> Modo de Medición</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`mode-btn${selectedMode === 'DC' ? ' selected-dc' : ''}`}
              onClick={() => !isActive && onSelectMode('DC')} disabled={isActive}>
              <i className="bi bi-lightning-charge-fill" /> DC — Rápida
            </button>
            <button className={`mode-btn${selectedMode === 'AC' ? ' selected-ac' : ''}`}
              onClick={() => !isActive && onSelectMode('AC')} disabled={isActive}>
              <i className="bi bi-activity" /> AC — Normal
            </button>
          </div>
        </div>

        {/* Botones (solo operador y admin) */}
        {puedeControlar && (
        <div className="col-12 col-md-auto">
          <div className="kpi-label mb-2"><i className="bi bi-play-circle" /> Acciones</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-tms btn-start" onClick={onStart}
              disabled={isActive || !selectedMode}>
              <i className="bi bi-play-fill" /> Iniciar Medición
            </button>
            <button className="btn-tms btn-stop" onClick={onRequestStop} disabled={!isActive}>
              <i className="bi bi-stop-fill" /> Detener
            </button>
          </div>
        </div>
        )}

        {/* Barra de progreso */}
        <div className="col-12 col-md" style={{ opacity: totalScanned > 0 ? 1 : 0.4 }}>
          <div className="scan-progress">
            <div className="scan-info">
              <span>{scanLabel}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="progress-tms">
              <div className="progress-tms-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="scan-info mt-1">
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {isActive ? `Z${currentZIdx} · ${currentZMM}mm` : ''}
              </span>
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {totalScanned} / {TOTAL_POINTS} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
