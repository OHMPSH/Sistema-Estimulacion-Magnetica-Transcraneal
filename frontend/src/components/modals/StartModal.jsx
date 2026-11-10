/**
 * components/modals/StartModal.jsx
 * Confirmación antes de iniciar un barrido: los parámetros elegidos
 * (velocidad, paso y medio) y cuántos puntos se van a medir.
 * El padre lo abre con ref.current.abrir().
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useModalBootstrap } from './useModalBootstrap.js';
import { etiquetaPaso, etiquetaMedio, etiquetaModo, etiquetaZona } from '../../utils/geometria.js';

export const StartModal = forwardRef(function StartModal({ parametros, geometria, modoOperacion, onConfirm }, ref) {
  const elemento = useRef(null);
  const { mostrar, ocultar } = useModalBootstrap(elemento);
  useImperativeHandle(ref, () => ({ abrir: mostrar }), [mostrar]);

  const confirmar = () => { ocultar(); onConfirm(parametros); };

  const filas = [
    ['Velocidad', etiquetaModo(parametros.modo)],
    ['Zona (X × Y × Z)', etiquetaZona(parametros.zona)],
    ['Paso (X, Y y Z)', etiquetaPaso(parametros.pasoMM)],
    ['Medio', etiquetaMedio(parametros.medio)],
    ['Malla', `${geometria.gridNx} × ${geometria.gridNy} puntos · ${geometria.zLevels.length} planos Z (${geometria.zLevels.join(', ')} mm)`],
    ['Total', `${geometria.totalPuntos} puntos`],
    ['Origen de los datos', modoOperacion === 'real' ? 'Pico W (modo real)' : 'Simulador del servidor'],
  ];

  return (
    <div className="modal fade modal-tms" ref={elemento} tabIndex={-1} aria-hidden="true" aria-labelledby="titulo-inicio">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="titulo-inicio" className="modal-title-tms m-0">
              <i className="bi bi-play-circle-fill me-2 icono-guinda" aria-hidden="true" /> Iniciar medición
            </h2>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cancelar" />
          </div>
          <div className="modal-body">
            <p className="texto-secundario mb-3">Se iniciará un barrido con estos parámetros. Quedan guardados con la sesión.</p>
            <dl className="resumen-medicion">
              {filas.map(([k, v]) => (
                <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>
              ))}
            </dl>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-tms btn-secundario" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" className="btn-tms btn-start" onClick={confirmar}>
              <i className="bi bi-play-fill" aria-hidden="true" /> Sí, iniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
