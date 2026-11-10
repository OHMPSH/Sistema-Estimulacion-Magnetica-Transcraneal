/**
 * components/ui/KpiCards.jsx
 * Cuatro indicadores. La posición y el plano son los de la ÚLTIMA
 * lectura recibida (no la siguiente: así se corrige el desfase B1).
 */
import React, { memo } from 'react';
import { numero, duracion } from '../../utils/formato.js';
import { clasePlano, etiquetaZona } from '../../utils/geometria.js';

export const KpiCards = memo(function KpiCards({ estado, segundos, ultima, zLevels, decimales, zona }) {
  const zIdx = ultima ? ultima.zIdx : null;
  const textoEstado = { adquiriendo: 'Adquiriendo', terminada: 'Terminada', detenida: 'Detenida', inactiva: 'Inactiva' }[estado];

  return (
    <div className="kpi-grid">
      <article className="kpi-card acento-estado" aria-labelledby="kpi-estado">
        <h3 id="kpi-estado" className="kpi-label"><i className="bi bi-activity" aria-hidden="true" /> Estado</h3>
        <div className={`acquisition-badge estado-${estado}`}>
          <span className="status-dot" aria-hidden="true" /> {textoEstado}
        </div>
        <p className="kpi-unit">{estado === 'inactiva' ? 'Sin sesión' : `Duración ${duracion(segundos)}`}</p>
      </article>

      <article className="kpi-card acento-guinda" aria-labelledby="kpi-plano">
        <h3 id="kpi-plano" className="kpi-label"><i className="bi bi-layers" aria-hidden="true" /> Plano Z de la última lectura</h3>
        <p className="kpi-value cifra">{ultima ? `${ultima.zMM}\u00a0mm` : '—'}</p>
        <ol className="z-pills" aria-label="Planos de la sesión">
          {zLevels.map((z, i) => (
            <li key={z} className={`z-level-pill${i === zIdx ? ` activo ${clasePlano(i)}` : ''}`} aria-current={i === zIdx ? 'true' : undefined}>
              {z}{'\u00a0'}mm
            </li>
          ))}
        </ol>
      </article>

      <article className="kpi-card acento-mag" aria-labelledby="kpi-mag">
        <h3 id="kpi-mag" className="kpi-label"><i className="bi bi-lightning-charge" aria-hidden="true" /> |B| de la última lectura</h3>
        <p className="kpi-value cifra color-mag">
          {ultima ? (ultima.saturado ? 'Saturada' : numero(ultima.magnitud, decimales)) : '—'}
        </p>
        <p className="kpi-unit">µT (microtesla)</p>
      </article>

      <article className="kpi-card acento-bx" aria-labelledby="kpi-pos">
        <h3 id="kpi-pos" className="kpi-label"><i className="bi bi-geo-alt" aria-hidden="true" /> Posición de la última lectura</h3>
        <p className="kpi-value cifra kpi-value-chico">
          {ultima ? `(${numero(ultima.xMM, 1)}, ${numero(ultima.yMM, 1)})\u00a0mm` : '—'}
        </p>
        <p className="kpi-unit">En la zona de {etiquetaZona(zona)}{ultima?.seq ? ` · lectura ${ultima.seq}` : ''}</p>
      </article>
    </div>
  );
});
