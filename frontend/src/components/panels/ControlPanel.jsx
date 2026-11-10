/**
 * components/panels/ControlPanel.jsx
 * Panel de control: barra de configuración de la medición (velocidad
 * DC/AC, paso y medio; CLAUDE.md 7.0), botones de acción y progreso.
 *
 * Los tres parámetros se envían al iniciar y se guardan con la sesión.
 * Mientras hay un barrido en curso, la barra muestra los de la sesión
 * activa (que puede haber iniciado otra persona) y no se puede cambiar.
 */
import React from 'react';
import { PASOS, MEDIOS, etiquetaPaso, etiquetaMedio } from '../../utils/geometria.js';

const MODOS = [
  { valor: 'DC', etiqueta: 'DC — Rápida', icono: 'bi-lightning-charge-fill', clase: 'selected-dc' },
  { valor: 'AC', etiqueta: 'AC — Normal', icono: 'bi-activity',              clase: 'selected-ac' },
];

/** Grupo de botones de opción (uno elegido) */
function GrupoOpciones({ etiqueta, icono, opciones, valor, onCambio, deshabilitado, claseElegido = 'selected-param' }) {
  return (
    <div className="col-12 col-md-auto" role="group" aria-label={etiqueta}>
      <div className="kpi-label mb-2"><i className={`bi ${icono}`} aria-hidden="true" /> {etiqueta}</div>
      <div className="d-flex flex-wrap gap-2">
        {opciones.map(o => (
          <button key={o.valor} type="button"
            className={`mode-btn${valor === o.valor ? ` ${o.clase ?? claseElegido}` : ''}`}
            aria-pressed={valor === o.valor}
            onClick={() => onCambio(o.valor)} disabled={deshabilitado}>
            {o.icono && <i className={`bi ${o.icono}`} aria-hidden="true" />} {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ControlPanel({
  isActive, iniciando, deteniendo, parametros, onCambiarParametros, sesionActiva,
  totalScanned, totalPuntos, currentZIdx, zLevels,
  progressPct, scanLabel, onStart, onRequestStop, errorAccion,
  puedeControlar = false,
}) {
  // Con un barrido en curso se muestran los parámetros de esa sesión
  const vista = isActive && sesionActiva
    ? { modo: sesionActiva.modo, pasoMM: sesionActiva.paso_mm, medio: sesionActiva.medio }
    : parametros;
  const bloqueado = isActive || iniciando || !puedeControlar;
  const zActualMM = zLevels[currentZIdx] ?? 0;

  return (
    <div className="control-panel fade-in">
      <div className="control-panel-title">
        <i className="bi bi-sliders2" aria-hidden="true" style={{ color: 'var(--guinda-bright)' }} />
        Control de Adquisición
        {isActive && sesionActiva && (
          <span style={{ fontSize: '.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>
            [Sesión {sesionActiva.id}: {sesionActiva.modo} · {etiquetaPaso(sesionActiva.paso_mm)} · {etiquetaMedio(sesionActiva.medio)}]
          </span>
        )}
      </div>

      {/* Barra de configuración de la medición */}
      <div className="row g-3 align-items-end mb-3">
        <GrupoOpciones etiqueta="Velocidad" icono="bi-toggles"
          opciones={MODOS} valor={vista.modo}
          onCambio={modo => onCambiarParametros({ modo })} deshabilitado={bloqueado} />
        <GrupoOpciones etiqueta="Paso de medición (X, Y y Z)" icono="bi-grid-3x3"
          opciones={PASOS.map(p => ({ valor: p.mm, etiqueta: p.etiqueta }))} valor={vista.pasoMM}
          onCambio={pasoMM => onCambiarParametros({ pasoMM })} deshabilitado={bloqueado} />
        <GrupoOpciones etiqueta="Medio" icono="bi-droplet-half"
          opciones={MEDIOS.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))} valor={vista.medio}
          onCambio={medio => onCambiarParametros({ medio })} deshabilitado={bloqueado} />
      </div>

      <div className="row g-3 align-items-end">
        {/* Botones (solo operador y admin) */}
        {puedeControlar && (
          <div className="col-12 col-md-auto">
            <div className="kpi-label mb-2"><i className="bi bi-play-circle" aria-hidden="true" /> Acciones</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-tms btn-start" onClick={onStart}
                disabled={isActive || iniciando || !vista.modo}>
                <i className="bi bi-play-fill" aria-hidden="true" /> {iniciando ? 'Iniciando…' : 'Iniciar Medición'}
              </button>
              <button type="button" className="btn-tms btn-stop" onClick={onRequestStop} disabled={!isActive || deteniendo}>
                <i className="bi bi-stop-fill" aria-hidden="true" /> {deteniendo ? 'Deteniendo…' : 'Detener'}
              </button>
            </div>
          </div>
        )}

        {/* Barra de progreso */}
        <div className="col-12 col-md" style={{ opacity: totalScanned > 0 || isActive ? 1 : 0.4 }}>
          <div className="scan-progress">
            <div className="scan-info">
              <span>{scanLabel}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="progress-tms" role="progressbar" aria-label="Progreso del barrido"
              aria-valuemin={0} aria-valuemax={totalPuntos} aria-valuenow={totalScanned}>
              <div className="progress-tms-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="scan-info mt-1">
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {isActive ? `Z${currentZIdx} · ${zActualMM} mm` : ''}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {totalScanned} / {totalPuntos} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Errores de las acciones (por ejemplo, 409 si otra persona ya inició un barrido) */}
      <p className="auth-error mt-2 mb-0" role="alert" aria-live="assertive">{errorAccion}</p>
    </div>
  );
}
