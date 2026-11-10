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
import { MEDIOS, MODOS, etiquetaPaso, etiquetaMedio, etiquetaModo, etiquetaZona } from '../../utils/geometria.js';
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

/**
 * Paso de la malla: se escribe en mm (libre, con un decimal). El de
 * 5 mm, el más usado, está a un clic.
 */
const PASO_RAPIDO_MM = 5;

function CampoPaso({ texto, valor, error, malla, onCambio, deshabilitado }) {
  const descripcion = error ? 'paso-error' : 'paso-malla';
  return (
    <fieldset className="grupo-opciones grupo-paso" disabled={deshabilitado}>
      <legend className="etiqueta-campo"><i className="bi bi-grid-3x3" aria-hidden="true" /> Paso (X, Y y Z)</legend>
      <div className="opciones-botones">
        <div className="campo-paso">
          <label htmlFor="paso-mm" className="visually-hidden">Paso en milímetros</label>
          <input id="paso-mm" name="paso_mm" className="form-control campo-tms cifra" inputMode="decimal"
            autoComplete="off" spellCheck={false} value={texto}
            onChange={e => onCambio(e.target.value)}
            aria-invalid={error ? true : undefined} aria-describedby={descripcion} />
          <span className="campo-paso-unidad" aria-hidden="true">mm</span>
        </div>
        {[PASO_RAPIDO_MM].map(mm => (
          <button key={mm} type="button" className={`opcion-boton${valor === mm && !error ? ' activa' : ''}`}
            aria-pressed={valor === mm && !error} onClick={() => onCambio(String(mm))}
            aria-label={`Usar paso de ${mm} mm`}>
            {etiquetaPaso(mm)}
          </button>
        ))}
      </div>
      {error
        ? <p id="paso-error" className="texto-error texto-paso mb-0">{error}</p>
        : <p id="paso-malla" className="texto-ayuda texto-paso mb-0 cifra">
            {malla.gridNx}{'\u00a0'}×{'\u00a0'}{malla.gridNy} · {malla.zLevels.length} {malla.zLevels.length === 1 ? 'plano' : 'planos'} Z = {entero(malla.totalPuntos)}{'\u00a0'}puntos
          </p>}
    </fieldset>
  );
}

/**
 * Zona de muestreo: tamaño en X, Y y Z (mm). No puede pasar de los
 * límites de la base (Configuración › Barrido); por defecto, toda la base.
 */
function CampoZona({ textos, errores, limites, onCambio, deshabilitado }) {
  const ejes = [['x', 'X'], ['y', 'Y'], ['z', 'Z']];
  const hayError = ejes.some(([e]) => errores?.[e]);
  return (
    <fieldset className="grupo-opciones grupo-zona" disabled={deshabilitado}>
      <legend className="etiqueta-campo"><i className="bi bi-bounding-box" aria-hidden="true" /> Zona de muestreo</legend>
      <div className="opciones-botones">
        {ejes.map(([e, nombre]) => (
          <div key={e} className="campo-paso campo-zona">
            <label htmlFor={`zona-${e}`} className="campo-zona-eje">{nombre}</label>
            <input id={`zona-${e}`} name={`zona_${e}_mm`} className="form-control campo-tms cifra" inputMode="decimal"
              autoComplete="off" spellCheck={false} value={textos[e]}
              onChange={ev => onCambio({ ...textos, [e]: ev.target.value })}
              aria-invalid={errores?.[e] ? true : undefined} aria-describedby={errores?.[e] ? `zona-${e}-error` : 'zona-limites'} />
            <span className="campo-paso-unidad" aria-hidden="true">mm</span>
          </div>
        ))}
        <button type="button" className="opcion-boton"
          onClick={() => onCambio({ x: String(limites.x), y: String(limites.y), z: String(limites.z) })}>
          Toda la base
        </button>
      </div>
      {hayError
        ? ejes.filter(([e]) => errores[e]).map(([e, nombre]) => (
            <p key={e} id={`zona-${e}-error`} className="texto-error texto-paso mb-0">{nombre}: {errores[e]}</p>))
        : <p id="zona-limites" className="texto-ayuda texto-paso mb-0">Límites de la base: {etiquetaZona(limites)}</p>}
    </fieldset>
  );
}

export function ControlPanel({
  enCurso, iniciando, deteniendo, parametros, onCambiarParametros, sesion, mallaElegida,
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
            Sesión {sesion.id}: {etiquetaModo(sesion.modo)} · {etiquetaZona(sesion.zona_mm)} · paso {etiquetaPaso(sesion.paso_mm)} · {etiquetaMedio(sesion.medio)}
            {sesion.iniciada_por ? ` · ${sesion.iniciada_por}` : ''}
          </span>
        )}
      </div>

      <div className="control-fila">
        <GrupoOpciones nombre="velocidad" leyenda="Velocidad" icono="bi-speedometer2"
          opciones={MODOS} valor={vista.modo}
          onCambio={modo => onCambiarParametros({ modo })} deshabilitado={bloqueado} />
        {enCurso && sesion ? (
          <CampoZona textos={{ x: String(sesion.zona_mm?.x ?? ''), y: String(sesion.zona_mm?.y ?? ''), z: String(sesion.zona_mm?.z ?? '') }}
            errores={{}} limites={parametros.limites} onCambio={() => {}} deshabilitado />
        ) : (
          <CampoZona textos={parametros.zonaTexto} errores={parametros.erroresZona} limites={parametros.limites}
            onCambio={zonaTexto => onCambiarParametros({ zonaTexto })} deshabilitado={bloqueado} />
        )}
        {enCurso && sesion ? (
          <CampoPaso texto={String(sesion.paso_mm)} valor={sesion.paso_mm} error=""
            malla={{ gridNx: sesion.grid_nx ?? 0, gridNy: sesion.grid_ny ?? 0, zLevels: sesion.z_levels_mm ?? [], totalPuntos: sesion.puntos_esperados ?? 0 }}
            onCambio={() => {}} deshabilitado />
        ) : (
          <CampoPaso texto={parametros.pasoTexto} valor={parametros.pasoMM} error={parametros.errorPaso}
            malla={mallaElegida} onCambio={pasoTexto => onCambiarParametros({ pasoTexto })} deshabilitado={bloqueado} />
        )}
        <GrupoOpciones nombre="medio" leyenda="Medio" icono="bi-droplet-half"
          opciones={MEDIOS.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))} valor={vista.medio}
          onCambio={medio => onCambiarParametros({ medio })} deshabilitado={bloqueado} />
      </div>

      <div className="control-fila control-fila-acciones">
        {puedeControlar ? (
          <div className="acciones">
            <button type="button" className="btn-tms btn-start" onClick={onIniciar}
              disabled={enCurso || iniciando || !vista.modo || Boolean(parametros.errorPaso) || Object.keys(parametros.erroresZona ?? {}).length > 0}
              title={!vista.modo ? 'Elige la velocidad (DC o AC) para iniciar'
                : (parametros.errorPaso || Object.keys(parametros.erroresZona ?? {}).length ? 'Corrige la zona o el paso para iniciar' : undefined)}>
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
