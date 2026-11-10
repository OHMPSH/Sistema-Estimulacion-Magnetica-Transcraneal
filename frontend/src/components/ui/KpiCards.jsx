/**
 * components/ui/KpiCards.jsx
 * Cuatro tarjetas de indicadores en tiempo real.
 */
import React from 'react';
import { Z_COLORS_HEX } from '../../constants/system.js';

function formatElapsed(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function KpiCards({ isActive, currentZIdx, zLevels, currentPos, magnitudeValue, lastTimestamp, elapsedSec, totalScanned }) {
  const zMM     = zLevels[currentZIdx] ?? 0;
  const zColor  = Z_COLORS_HEX[currentZIdx] ?? Z_COLORS_HEX[0];

  return (
    <div className="row g-3 mb-4">

      {/* Estado de adquisición */}
      <div className="col-6 col-lg-3 fade-in">
        <div className="kpi-card accent-emerald">
          <div className="kpi-label">
            <i className="bi bi-activity" /> Estado
          </div>
          <div className={`acquisition-badge${isActive ? ' active' : ''}`}>
            <div className={`status-dot${isActive ? ' blink' : ''}`} />
            <span>{isActive ? 'ADQUIRIENDO' : 'INACTIVO'}</span>
          </div>
          <div className="kpi-unit mt-2">
            {isActive ? `Sesión: ${formatElapsed(elapsedSec)}` : totalScanned > 0 ? `Completado: ${formatElapsed(elapsedSec)}` : '—'}
          </div>
        </div>
      </div>

      {/* Plano Z actual */}
      <div className="col-6 col-lg-3 fade-in" style={{ animationDelay: '.05s' }}>
        <div className="kpi-card accent-guinda">
          <div className="kpi-label">
            <i className="bi bi-layers" /> Plano Z Actual
          </div>
          <div className="kpi-value" style={{ color: zColor }}>
            {isActive || totalScanned > 0 ? `Z${currentZIdx}` : '—'}
          </div>
          <div className="kpi-unit">
            {isActive || totalScanned > 0 ? `${zMM} mm sobre base` : '— mm sobre base'}
          </div>
          {/* Indicador de 5 niveles */}
          <div className="d-flex gap-1 mt-2">
            {zLevels.map((_, zi) => (
              <div
                key={zi}
                className={`z-level-pill${(isActive || totalScanned > 0) && zi === currentZIdx ? ` active-z${zi}` : ''}`}
                title={`Z${zi} = ${zLevels[zi]}mm`}
              >
                Z{zi}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Magnitud |B| */}
      <div className="col-6 col-lg-3 fade-in" style={{ animationDelay: '.10s' }}>
        <div className="kpi-card accent-yellow">
          <div className="kpi-label">
            <i className="bi bi-lightning-charge" /> Magnitud Total |B|
          </div>
          <div className="kpi-value mono" style={{ color: 'var(--yellow)' }}>
            {magnitudeValue ?? '—'}
          </div>
          <div className="kpi-unit">μT (microtesla)</div>
        </div>
      </div>

      {/* Posición XY + Timestamp */}
      <div className="col-6 col-lg-3 fade-in" style={{ animationDelay: '.15s' }}>
        <div className="kpi-card accent-cyan">
          <div className="kpi-label">
            <i className="bi bi-geo-alt" /> Posición XY
          </div>
          <div className="kpi-value mono" style={{ fontSize: '1.2rem' }}>
            {currentPos ? `(${currentPos.xMM}, ${currentPos.yMM})` : '—'}
          </div>
          <div className="kpi-unit">posición en placa 6×6 cm</div>
          <div className="kpi-unit mt-1" style={{ color: 'var(--text-dim)' }}>
            {lastTimestamp ?? '—'}
          </div>
        </div>
      </div>

    </div>
  );
}
