/**
 * components/modals/ModalConfirmacion.jsx
 * Confirmación genérica (reemplaza a window.confirm y alert).
 *   const ok = await ref.current.confirmar({ titulo, mensaje, textoConfirmar, peligro })
 * Devuelve una promesa con true (confirmó) o false (canceló o cerró).
 */
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { useModalBootstrap } from './useModalBootstrap.js';

export const ModalConfirmacion = forwardRef(function ModalConfirmacion(_props, ref) {
  const elemento = useRef(null);
  const { mostrar, ocultar } = useModalBootstrap(elemento);
  const [opciones, setOpciones] = useState({ titulo: '', mensaje: '', textoConfirmar: 'Confirmar', peligro: false });
  const resolver = useRef(null);

  useImperativeHandle(ref, () => ({
    confirmar: (op) => new Promise((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOpciones({ textoConfirmar: 'Confirmar', peligro: false, ...op });
      mostrar();
    }),
  }), [mostrar]);

  // Si se cierra con Esc, con la X o tocando fuera, cuenta como "cancelar"
  useEffect(() => {
    const el = elemento.current;
    const alOcultar = () => { resolver.current?.(false); resolver.current = null; };
    el?.addEventListener('hidden.bs.modal', alOcultar);
    return () => el?.removeEventListener('hidden.bs.modal', alOcultar);
  }, []);

  const responder = (valor) => {
    resolver.current?.(valor);
    resolver.current = null;
    ocultar();
  };

  return (
    <div className="modal fade modal-tms" ref={elemento} tabIndex={-1} aria-hidden="true" aria-labelledby="titulo-confirmacion">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="titulo-confirmacion" className={`modal-title-tms m-0${opciones.peligro ? ' texto-peligro' : ''}`}>{opciones.titulo}</h2>
            <button type="button" className="btn-close" onClick={() => responder(false)} aria-label="Cancelar" />
          </div>
          <div className="modal-body">
            {typeof opciones.mensaje === 'string' ? <p className="mb-0">{opciones.mensaje}</p> : opciones.mensaje}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-tms btn-secundario" onClick={() => responder(false)}>Cancelar</button>
            <button type="button" className={`btn-tms ${opciones.peligro ? 'btn-stop' : 'btn-start'}`} onClick={() => responder(true)}>
              {opciones.textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
