/**
 * components/modals/StartModal.jsx
 * Confirmación antes de iniciar un barrido: muestra los parámetros
 * elegidos en la barra de configuración (velocidad, paso y medio) y
 * cuántos puntos se van a medir. (Los globales window.__*ModalShow se
 * reemplazan por refs en la Fase 6.)
 */
import React, { useEffect, useRef } from 'react';
// Solo el componente Modal de Bootstrap, empaquetado con Vite
import Modal from 'bootstrap/js/dist/modal';
import { etiquetaPaso, etiquetaMedio } from '../../utils/geometria.js';

export function StartModal({ parametros, geometria, modoOperacion, onConfirm }) {
  const modalRef = useRef(null);
  const bsModal  = useRef(null);

  useEffect(() => {
    if (modalRef.current) bsModal.current = new Modal(modalRef.current);
    return () => bsModal.current?.dispose();
  }, []);

  useEffect(() => {
    window.__startModalShow = () => bsModal.current?.show();
    return () => { delete window.__startModalShow; };
  }, []);

  const confirmar = () => {
    bsModal.current?.hide();
    onConfirm(parametros);
  };

  const filas = [
    ['Velocidad', parametros.modo === 'DC' ? 'DC — Rápida' : 'AC — Normal'],
    ['Paso (X, Y y Z)', etiquetaPaso(parametros.pasoMM)],
    ['Medio', etiquetaMedio(parametros.medio)],
    ['Malla', `${geometria.gridN} × ${geometria.gridN} puntos · ${geometria.zLevels.length} planos Z (${geometria.zLevels.join(', ')} mm)`],
    ['Total', `${geometria.totalPuntos} puntos`],
    ['Origen de los datos', modoOperacion === 'real' ? 'Pico W (modo real)' : 'Simulador del servidor'],
  ];

  return (
    <div className="modal fade modal-tms" ref={modalRef} tabIndex={-1} aria-hidden="true" aria-labelledby="titulo-inicio">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="titulo-inicio" className="modal-title-tms m-0" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-play-circle-fill me-2" aria-hidden="true" style={{ color: 'var(--guinda-bright)' }} />
              Iniciar Medición
            </h2>
          </div>
          <div className="modal-body p-4">
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
              Se iniciará un barrido con estos parámetros. Quedan guardados con la sesión.
            </p>
            <dl className="resumen-medicion">
              {filas.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-tms"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 16px' }}
              data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" className="btn-tms btn-start" onClick={confirmar}>
              <i className="bi bi-play-fill" aria-hidden="true" /> Sí, iniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
