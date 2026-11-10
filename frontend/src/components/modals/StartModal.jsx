/**
 * components/modals/StartModal.jsx
 * Modal de selección de modo de medición (DC / AC).
 */
import React, { useEffect, useRef } from 'react';
// Solo el componente Modal de Bootstrap, empaquetado con Vite
import Modal from 'bootstrap/js/dist/modal';

export function StartModal({ onConfirm }) {
  const modalRef = useRef(null);
  const bsModal  = useRef(null);

  useEffect(() => {
    if (modalRef.current) {
      bsModal.current = new Modal(modalRef.current);
    }
    return () => bsModal.current?.dispose();
  }, []);

  useEffect(() => {
    window.__startModalShow = () => bsModal.current?.show();
    return () => { delete window.__startModalShow; };
  }, []);

  const handleSelect = (mode) => {
    bsModal.current?.hide();
    onConfirm(mode);
  };

  return (
    <div className="modal fade modal-tms" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-title-tms" style={{ color: 'var(--text-primary)' }}>
              <i className="bi bi-play-circle-fill me-2" style={{ color: 'var(--guinda-bright)' }} />
              Iniciar Medición
            </div>
          </div>
          <div className="modal-body p-4">
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
              Selecciona el tipo de medición a realizar:
            </p>
            <div className="row g-3">
              <div className="col-6">
                <div className="mode-card" onClick={() => handleSelect('DC')}>
                  <i className="bi bi-lightning-charge-fill" style={{ fontSize: '1.8rem', color: 'var(--cyan)', display: 'block', marginBottom: 10 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--cyan)' }}>DC — Rápida</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    Campo estático<br />Mayor velocidad de barrido
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="mode-card" onClick={() => handleSelect('AC')}>
                  <i className="bi bi-activity" style={{ fontSize: '1.8rem', color: 'var(--magenta)', display: 'block', marginBottom: 10 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--magenta)' }}>AC — Normal</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    Campo pulsado<br />Caracterización completa
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn-tms"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 16px' }}
              data-bs-dismiss="modal"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
