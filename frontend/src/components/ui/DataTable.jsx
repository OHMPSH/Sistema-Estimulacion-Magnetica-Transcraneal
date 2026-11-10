/**
 * components/ui/DataTable.jsx
 * Últimas lecturas, la más nueva arriba. Muestra seq, posición, la
 * marca de saturado y los valores con sus unidades. El número de filas
 * sale de la configuración de visualización.
 */
import React, { memo, useMemo } from 'react';
import { numero, horaPrecisa } from '../../utils/formato.js';

export const DataTable = memo(function DataTable({ mediciones, filas, decimales, zona }) {
  const visibles = useMemo(() => mediciones.slice(-filas).reverse(), [mediciones, filas]);
  const v = x => (x === null || x === undefined ? <span className="texto-saturado">SAT</span> : numero(x, decimales));

  return (
    <section className="data-table-card" aria-labelledby="titulo-tabla">
      <div className="data-table-header">
        <h2 id="titulo-tabla" className="chart-title"><i className="bi bi-table me-2 icono-guinda" aria-hidden="true" /> Últimas lecturas</h2>
        <span className="records-badge cifra">{visibles.length} de {mediciones.length}</span>
      </div>
      <div className="data-table-scroll" tabIndex={0} role="region" aria-label="Tabla de las últimas lecturas (se puede desplazar)">
        <table className="tms-table">
          <caption className="visually-hidden">Últimas {filas} lecturas de la sesión, de la más nueva a la más antigua</caption>
          <thead>
            <tr>
              <th scope="col">Seq</th>
              <th scope="col">Hora</th>
              <th scope="col">X (mm)</th>
              <th scope="col">Y (mm)</th>
              <th scope="col">Z (mm)</th>
              <th scope="col">Bx (µT)</th>
              <th scope="col">By (µT)</th>
              <th scope="col">Bz (µT)</th>
              <th scope="col">|B| (µT)</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr><td colSpan={10} className="tabla-vacia">Esperando lecturas…</td></tr>
            ) : visibles.map((r, i) => (
              <tr key={r.seq ?? `${r.timestamp}-${i}`} className={i === 0 ? 'new-row' : ''}>
                <td>{r.seq ?? '—'}</td>
                <td>{horaPrecisa(r.timestamp, zona)}</td>
                <td>{numero(r.xMM, 1)}</td>
                <td>{numero(r.yMM, 1)}</td>
                <td>{numero(r.zMM, 1)}</td>
                <td className="val-bx">{v(r.bx)}</td>
                <td className="val-by">{v(r.by)}</td>
                <td className="val-bz">{v(r.bz)}</td>
                <td className="val-mag">{r.saturado ? <span className="texto-saturado">—</span> : numero(r.magnitud, decimales)}</td>
                <td>{r.saturado ? <span className="marca-saturado">Saturada</span> : 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
