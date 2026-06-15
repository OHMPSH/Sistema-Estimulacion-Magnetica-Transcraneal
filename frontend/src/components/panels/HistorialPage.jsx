/**
 * components/panels/HistorialPage.jsx
 * Vista de Mediciones Pasadas.
 * Los datos vienen de MariaDB (cargados en useAcquisition).
 * El botón Exportar CSV hace GET /api/sesiones/:id/mediciones.
 */
import React, { useState, useMemo } from 'react';
import { TOTAL_POINTS, Z_LEVELS } from '../../constants/system.js';

function formatDuracion(inicio, fin) {
  if (!fin) return '—';
  const seg = Math.round((new Date(fin) - new Date(inicio)) / 1000);
  return `${Math.floor(seg / 60)}m ${seg % 60}s`;
}

/** Descarga las mediciones de una sesión como CSV */
async function exportarCSV(sesionId) {
  try {
    const res  = await fetch(`/api/sesiones/${sesionId}/mediciones`);
    const json = await res.json();
    if (!json.ok || !json.data.length) {
      alert('Sin datos para exportar.'); return;
    }
    // Construir el archivo CSV
    const header = 'timestamp,x_mm,y_mm,z_mm,bx,by,bz,magnitud\n';
    const body   = json.data.map(p =>
      `${p.timestamp},${p.x_mm},${p.y_mm},${p.z_mm},${p.bx},${p.by},${p.bz},${p.magnitud}`
    ).join('\n');
    // Crear enlace de descarga temporal
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `tms_sesion_${sesionId}.csv`; a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Error al exportar.');
  }
}

function SesionCard({ sesion, numero, onDelete }) {
  const [abierta, setAbierta] = useState(false);
  const pct      = Math.round(((sesion.total_puntos ?? 0) / TOTAL_POINTS) * 100);
  const fechaStr = new Date(sesion.iniciada_en).toLocaleString('es-MX', {
    dateStyle: 'short', timeStyle: 'medium',
  });

  return (
    <div className="session-card">
      <div className="session-card-header" onClick={() => setAbierta(v => !v)}>
        <div>
          <div className="session-title">
            <i className="bi bi-database me-2" style={{ color: 'var(--guinda-bright)' }} />
            Sesión #{numero} — {fechaStr}
          </div>
          <div className="session-meta">
            <span className={`session-tag ${sesion.modo.toLowerCase()}`}>{sesion.modo}</span>
            <span className="session-tag">{sesion.total_puntos ?? 0} pts · {pct}%</span>
            <span className="session-tag">{formatDuracion(sesion.iniciada_en, sesion.terminada_en)}</span>
          </div>
        </div>
        <i className="bi bi-chevron-down"
          style={{ color: 'var(--text-dim)', transition: '.2s', transform: abierta ? 'rotate(180deg)' : 'none' }} />
      </div>

      {abierta && (
        <div className="session-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="session-stat">
                <strong>Modo</strong><br />
                {sesion.modo === 'DC' ? 'DC — Rápida' : 'AC — Normal'}
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="session-stat">
                <strong>Puntos</strong><br />
                {sesion.total_puntos ?? 0} / {TOTAL_POINTS}
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="session-stat">
                <strong>|B| máximo</strong><br />
                <span style={{ color: 'var(--yellow)' }}>
                  {sesion.max_magnitud ? Number(sesion.max_magnitud).toFixed(3) : '—'} μT
                </span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="session-stat">
                <strong>|B| mínimo</strong><br />
                {sesion.min_magnitud ? Number(sesion.min_magnitud).toFixed(3) : '—'} μT
              </div>
            </div>
            <div className="col-12">
              <div className="progress-tms" style={{ height: 4 }}>
                <div className="progress-tms-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="mode-btn" style={{ fontSize: 10, padding: '5px 12px' }}
                onClick={() => exportarCSV(sesion.id)}>
                <i className="bi bi-download" /> Exportar CSV
              </button>
              <button className="mode-btn"
                style={{ fontSize: 10, padding: '5px 12px', color: '#ff7070', borderColor: 'rgba(255,68,68,.3)' }}
                onClick={() => onDelete(sesion.id)}>
                <i className="bi bi-trash3" /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistorialPage({ sessions, onDelete, onRecargar }) {
  const [filterMode, setFilterMode] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filtradas = useMemo(() => sessions.filter(s => {
    if (filterMode && s.modo !== filterMode) return false;
    if (filterDate && !s.iniciada_en?.startsWith(filterDate)) return false;
    return true;
  }), [sessions, filterMode, filterDate]);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 mt-1">
        <p className="section-label mb-0"><span>//</span> SESIONES DE MEDICIÓN REGISTRADAS</p>
        <button className="btn-tms btn-start" style={{ padding: '6px 14px', fontSize: 11 }}
          onClick={onRecargar}>
          <i className="bi bi-arrow-clockwise" /> Recargar
        </button>
      </div>

      {/* Filtros */}
      <div className="control-panel mb-3" style={{ padding: '14px 18px' }}>
        <div className="row g-2 align-items-center">
          <div className="col-auto">
            <span className="kpi-label mb-0" style={{ display: 'inline-flex' }}>
              <i className="bi bi-funnel me-1" /> Filtrar por:
            </span>
          </div>
          <div className="col-auto">
            <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
              className="form-select form-select-sm"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <option value="">Todos los modos</option>
              <option value="DC">DC — Rápida</option>
              <option value="AC">AC — Normal</option>
            </select>
          </div>
          <div className="col-auto">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="form-control form-control-sm"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          </div>
          <div className="col-auto">
            <button className="mode-btn" style={{ padding: '5px 12px' }}
              onClick={() => { setFilterMode(''); setFilterDate(''); }}>
              <i className="bi bi-x-circle" /> Limpiar
            </button>
          </div>
          <div className="col-auto ms-auto">
            <span className="records-badge">{filtradas.length} sesiones</span>
          </div>
        </div>
      </div>

      {/* Lista de sesiones */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }} />
          No hay sesiones registradas.<br />Inicia una medición desde el Dashboard.
        </div>
      ) : (
        filtradas.map((s, i) => (
          <SesionCard key={s.id} sesion={s} numero={filtradas.length - i} onDelete={onDelete} />
        ))
      )}
    </>
  );
}
