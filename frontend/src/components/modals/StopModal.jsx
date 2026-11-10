/**
 * components/modals/StopModal.jsx
 * Confirmación antes de detener la adquisición. ref.current.abrir().
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useModalBootstrap } from './useModalBootstrap.js';
import { duracion } from '../../utils/formato.js';

export const StopModal = forwardRef(function StopModal({ recibidas, totalPuntos, zActualMM, segundos, onConfirm }, ref) {
  const elemento = useRef(null);
  const { mostrar, ocultar } = useModalBootstrap(elemento);
  useImperativeHandle(ref, () => ({ abrir: mostrar }), [mostrar]);

  const confirmar = () => { ocultar(); onConfirm(); };

  return (
    <div className="modal fade modal-tms" ref={elemento} tabIndex={-1} aria-hidden="true" aria-labelledby="titulo-detener">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="titulo-detener" className="modal-title-tms m-0 texto-peligro">
              <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" /> Confirmar detención
            </h2>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cancelar" />
          </div>
          <div className="modal-body">
            <p>¿Deseas <strong>detener la medición</strong>?</p>
            <p className="texto-secundario mt-2">
              Lo medido hasta ahora se <strong>guarda</strong> en el historial, con los puntos que falten marcados como huecos.
              La sesión no se puede reanudar.
            </p>
            <p className="caja-dato mt-3 mb-0">
              {recibidas} / {totalPuntos} puntos · plano Z = {zActualMM ?? '—'} mm · {duracion(segundos)}
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-tms btn-secundario" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" className="btn-tms btn-stop" onClick={confirmar}>
              <i className="bi bi-stop-fill" aria-hidden="true" /> Sí, detener
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
