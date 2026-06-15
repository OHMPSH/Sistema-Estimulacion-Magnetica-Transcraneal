/**
 * components/ui/DataTable.jsx
 * Tabla de las últimas mediciones con highlight de fila nueva.
 */
import React from 'react';
import { Z_COLORS_HEX, Z_LEVELS } from '../../constants/system.js';

export function DataTable({ rows }) {
  return (
    <div className="data-table-card fade-in">
      <div className="data-table-header">
        <div className="chart-title">
          <i className="bi bi-table me-2" style={{ color: 'var(--guinda-bright)' }} />
          Últimas Lecturas
        </div>
        <span className="records-badge">{rows.length} registros</span>
      </div>

      <div className="data-table-scroll">
        <table className="tms-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp</th>
              <th>Nivel Z</th>
              <th>Bx (μT)</th>
              <th>By (μT)</th>
              <th>Bz (μT)</th>
              <th>|B| (μT)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 30 }}>
                  <i className="bi bi-broadcast me-2" />
                  Esperando inicio de medición…
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const zColor = Z_COLORS_HEX[r.zIdx] ?? Z_COLORS_HEX[0];
                return (
                  <tr key={r.key} className={i === 0 ? 'new-row' : ''}>
                    <td style={{ color: 'var(--text-dim)' }}>{rows.length - i}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.tsStr}</td>
                    <td>
                      <span className="z-badge"
                        style={{ background: `${zColor}22`, border: `1px solid ${zColor}`, color: zColor }}>
                        Z{r.zIdx} · {r.zMM}mm
                      </span>
                    </td>
                    <td className="val-bx">{r.bx.toFixed(4)}</td>
                    <td className="val-by">{r.by.toFixed(4)}</td>
                    <td className="val-bz">{r.bz.toFixed(4)}</td>
                    <td className="val-mag">{r.magnitud.toFixed(4)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
