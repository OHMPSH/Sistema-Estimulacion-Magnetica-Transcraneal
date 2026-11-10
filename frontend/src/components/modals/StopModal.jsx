/**
 * components/modals/StopModal.jsx
 * Modal Bootstrap de confirmación antes de detener la adquisición.
 * Usa el componente Modal de Bootstrap, instalado con npm.
 */
import React, { useEffect, useRef } from 'react';
// Solo el componente Modal de Bootstrap, empaquetado con Vite
import Modal from 'bootstrap/js/dist/modal';
import { TOTAL_POINTS, Z_LEVELS } from '../../constants/system.js';

export function StopModal({ totalScanned, currentZIdx, elapsedSec, onConfirm }) {
  const modalRef = useRef(null);
  const bsModal  = useRef(null);

  useEffect(() => {
    if (modalRef.current) {
      bsModal.current = new Modal(modalRef.current);
    }
    return () => bsModal.current?.dispose();
  }, []);

  // Exponer método show() al padre mediante el ref pattern
  // (el padre llama a window.__stopModalShow que definimos aquí)
  useEffect(() => {
    window.__stopModalShow = () => bsModal.current?.show();
    return () => { delete window.__stopModalShow; };
  }, []);

  const handleConfirm = () => {
    bsModal.current?.hide();
    onConfirm();
  };

  const formatElapsed = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="modal fade modal-tms" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-title-tms" style={{ color: '#ff7070' }}>
              <i className="bi bi-exclamation-triangle-fill me-2" />
              Confirmar detención
            </div>
          </div>
          <div className="modal-body p-4">
            <p>¿Estás seguro de que deseas <strong>detener la medición</strong>?</p>
            <p className="mt-2" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Los datos recopilados se <strong>guardarán</strong> en el historial. Esta acción no puede deshacerse.
            </p>
            <div
              className="mt-3 p-3"
              style={{ background: 'rgba(255,255,255,.03)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}
            >
              {totalScanned} pts · Z{currentZIdx} ({Z_LEVELS[currentZIdx]}mm) · {formatElapsed(elapsedSec)}
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
            <button type="button" className="btn-tms btn-stop" style={{ borderColor: '#ff4444' }} onClick={handleConfirm}>
              <i className="bi bi-stop-fill" /> Sí, detener
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
