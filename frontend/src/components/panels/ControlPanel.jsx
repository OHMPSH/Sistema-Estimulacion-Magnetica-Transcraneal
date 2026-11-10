/**
 * components/panels/ControlPanel.jsx
 * Barra de configuración de la medición (velocidad DC/AC, paso y medio;
 * CLAUDE.md 7.0), acciones y progreso del barrido.
 *
 * Los tres parámetros se envían al iniciar y se guardan con la sesión.
 * Con un barrido en curso, la barra muestra los de esa sesión (que
 * pudo iniciar otra persona) y no se puede cambiar.
 */
import React from 'react';
import { PASOS, MEDIOS, MODOS, etiquetaPaso, etiquetaMedio, etiquetaModo } from '../../utils/geometria.js';
import { entero } from '../../utils/formato.js';

/** Grupo de opciones como radios con aspecto de botones */
function GrupoOpciones({ nombre, leyenda, icono, opciones, valor, onCambio, deshabilitado }) {
  return (
    <fieldset className="grupo-opciones" disabled={deshabilitado}>
      <legend className="etiqueta-campo"><i className={`bi ${icono}`} aria-hidden="true" /> {leyenda}</legend>
      <div className="opciones-botones">
        {opciones.map(o => (
          <label key={o.valor} className={`opcion-boton${valor === o.valor ? ' activa' : ''}`}>
            <input type="radio" name={nombre} value={o.valor} checked={valor === o.valor} onChange={() => onCambio(o.valor)} />
            {o.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ControlPanel({
  enCurso, iniciando, deteniendo, parametros, onCambiarParametros, sesion,
  recibidas, totalPuntos, zActualMM, progreso, etiquetaEstado,
  onIniciar, onDetener, errorAccion, puedeControlar,
}) {
  const vista = enCurso && sesion
    ? { modo: sesion.modo, pasoMM: sesion.paso_mm, medio: sesion.medio }
    : parametros;
  const bloqueado = enCurso || iniciando || !puedeControlar;

  return (
    <section className="control-panel" aria-labelledby="titulo-control">
      <div className="panel-cabecera">
        <h2 id="titulo-control" className="panel-titulo">
          <i className="bi bi-sliders2 icono-guinda" aria-hidden="true" /> Configuración de la medición
        </h2>
        {enCurso && sesion && (
          <span className="panel-detalle">
            Sesión {sesion.id}: {etiquetaModo(sesion.modo)} · {etiquetaPaso(sesion.paso_mm)} · {etiquetaMedio(sesion.medio)}
            {sesion.iniciada_por ? ` · ${sesion.iniciada_por}` : ''}
          </span>
        )}
      </div>

      <div className="control-fila">
        <GrupoOpciones nombre="velocidad" leyenda="Velocidad" icono="bi-speedometer2"
          opciones={MODOS} valor={vista.modo}
          onCambio={modo => onCambiarParametros({ modo })} deshabilitado={bloqueado} />
        <GrupoOpciones nombre="paso" leyenda="Paso (X, Y y Z)" icono="bi-grid-3x3"
          opciones={PASOS.map(p => ({ valor: p.mm, etiqueta: p.etiqueta }))} valor={vista.pasoMM}
          onCambio={pasoMM => onCambiarParametros({ pasoMM })} deshabilitado={bloqueado} />
        <GrupoOpciones nombre="medio" leyenda="Medio" icono="bi-droplet-half"
          opciones={MEDIOS.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))} valor={vista.medio}
          onCambio={medio => onCambiarParametros({ medio })} deshabilitado={bloqueado} />
      </div>

      <div className="control-fila control-fila-acciones">
        {puedeControlar ? (
          <div className="acciones">
            <button type="button" className="btn-tms btn-start" onClick={onIniciar}
              disabled={enCurso || iniciando || !vista.modo}
              title={!vista.modo ? 'Elige la velocidad (DC o AC) para iniciar' : undefined}>
              <i className="bi bi-play-fill" aria-hidden="true" /> {iniciando ? 'Iniciando…' : 'Iniciar medición'}
            </button>
            <button type="button" className="btn-tms btn-stop" onClick={onDetener} disabled={!enCurso || deteniendo}>
              <i className="bi bi-stop-fill" aria-hidden="true" /> {deteniendo ? 'Deteniendo…' : 'Detener'}
            </button>
          </div>
        ) : (
          <p className="texto-secundario mb-0">Tu rol solo permite observar: las mediciones las inicia un operador o un admin.</p>
        )}

        <div className="scan-progress">
          <div className="scan-info">
            <span role="status" aria-live="polite">{etiquetaEstado}</span>
            <span className="cifra">{progreso}%</span>
          </div>
          <div className="progress-tms" role="progressbar" aria-label="Progreso del barrido"
            aria-valuemin={0} aria-valuemax={totalPuntos} aria-valuenow={recibidas}
            aria-valuetext={`${recibidas} de ${totalPuntos} puntos`}>
            <div className="progress-tms-bar" style={{ transform: `scaleX(${progreso / 100})` }} />
          </div>
          <div className="scan-info mt-1">
            <span className="cifra">{enCurso && zActualMM !== null ? `Plano Z = ${zActualMM}\u00a0mm` : ''}</span>
            <span className="cifra">{entero(recibidas)} / {entero(totalPuntos)}{'\u00a0'}puntos</span>
          </div>
        </div>
      </div>

      <p className="texto-error mt-2 mb-0" role="alert">{errorAccion}</p>
    </section>
  );
}
