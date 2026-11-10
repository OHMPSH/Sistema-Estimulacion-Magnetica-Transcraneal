/**
 * components/config/SeccionFormulario.jsx
 * Formulario de una clave de la configuración (PUT /api/configuracion/:clave).
 *
 * - Cada campo con su <label>, su ayuda y su error al lado (los errores
 *   422 del servidor se asignan al campo cuyo nombre empieza el mensaje).
 * - Un botón "Guardar cambios" que se desactiva solo mientras se guarda.
 * - Confirmación del guardado con aria-live.
 * - Para quien no es admin, todo es de solo lectura.
 *
 * campos: [{ ruta: ['ms_por_punto', 'DC'], etiqueta, tipo: 'entero'|'numero'|'select'|'bool',
 *            opciones?: [{valor, etiqueta}], unidad?, ayuda?, paso? }]
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../../context/ConfigContext.jsx';

const leerRuta = (obj, ruta) => ruta.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function escribirRuta(obj, ruta, valor) {
  const copia = structuredClone(obj ?? {});
  let o = copia;
  ruta.slice(0, -1).forEach(k => { o[k] = { ...(o[k] ?? {}) }; o = o[k]; });
  o[ruta[ruta.length - 1]] = valor;
  return copia;
}
const aTexto = v => (v === undefined || v === null ? '' : String(v));

export function SeccionFormulario({ clave, titulo, descripcion, campos, soloLectura, extra = null, transformar }) {
  const { config, guardarClave } = useConfig();
  const actual = config?.[clave];
  const [borrador, setBorrador] = useState({});
  const [estado, setEstado] = useState({ guardando: false, mensaje: '', error: '', errores: {} });
  const formulario = useRef(null);

  // Al cargar o cuando otro admin cambia la configuración (SSE), se toma el valor del servidor
  const firma = JSON.stringify(actual);
  useEffect(() => {
    const b = {};
    for (const c of campos) b[c.ruta.join('.')] = aTexto(leerRuta(actual, c.ruta));
    setBorrador(b);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  const cambiado = useMemo(() => campos.some(c => borrador[c.ruta.join('.')] !== aTexto(leerRuta(actual, c.ruta))),
    [borrador, actual, campos]);

  // Avisa antes de cerrar o recargar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!cambiado || soloLectura) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [cambiado, soloLectura]);

  // Tras un error de validación, el foco va al primer campo marcado
  useEffect(() => {
    const primero = formulario.current?.querySelector('[aria-invalid="true"]');
    primero?.focus();
  }, [estado.errores]);

  const guardar = async (e) => {
    e.preventDefault();
    let valor = {};
    for (const c of campos) {
      const texto = borrador[c.ruta.join('.')];
      let v;
      if (c.tipo === 'bool') v = texto === 'true';
      else if (c.tipo === 'select') v = c.opciones.find(o => String(o.valor) === texto)?.valor ?? texto;
      else v = texto.trim() === '' ? null : Number(texto.replace(',', '.'));
      valor = escribirRuta(valor, c.ruta, v);
    }
    if (transformar) valor = transformar(valor);
    setEstado({ guardando: true, mensaje: '', error: '', errores: {} });
    const r = await guardarClave(clave, valor);
    if (r.ok) {
      setEstado({ guardando: false, mensaje: 'Cambios guardados.', error: '', errores: {} });
      return;
    }
    const porCampo = {};
    const generales = [];
    for (const msg of r.errores?.length ? r.errores : [r.error]) {
      const c = campos.find(x => msg?.startsWith(x.ruta.join('.')));
      if (c) porCampo[c.ruta.join('.')] = msg; else generales.push(msg);
    }
    const prefijo = r.status === 409 ? 'No se puede guardar ahora: ' : '';
    setEstado({
      guardando: false, mensaje: '', errores: porCampo,
      error: generales.length ? prefijo + generales.join(' ') : (Object.keys(porCampo).length ? 'Revisa los campos marcados.' : ''),
    });
  };

  if (!actual) return <p className="texto-secundario">Cargando la configuración…</p>;

  return (
    <form ref={formulario} className="seccion-config" onSubmit={guardar} noValidate>
      <h2 className="panel-titulo">{titulo}</h2>
      {descripcion && <p className="texto-secundario">{descripcion}</p>}
      {soloLectura && <p className="aviso-lectura"><i className="bi bi-eye" aria-hidden="true" /> Solo lectura: únicamente un admin puede cambiar la configuración.</p>}

      <fieldset disabled={soloLectura} className="campos-config">
        {campos.map(c => {
          const k = c.ruta.join('.');
          const id = `cfg-${clave}-${k.replace('.', '-')}`;
          const error = estado.errores[k];
          const describe = [c.ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
          return (
            <div key={k} className="campo-config">
              {c.tipo === 'bool' ? (
                <label className="opcion-casilla" htmlFor={id}>
                  <input id={id} name={k} type="checkbox" checked={borrador[k] === 'true'}
                    onChange={e => setBorrador(b => ({ ...b, [k]: String(e.target.checked) }))}
                    aria-describedby={describe} aria-invalid={error ? true : undefined} />
                  {c.etiqueta}
                </label>
              ) : (
                <>
                  <label htmlFor={id} className="etiqueta-campo">{c.etiqueta}{c.unidad ? ` (${c.unidad})` : ''}</label>
                  {c.tipo === 'select' ? (
                    <select id={id} name={k} className="form-select campo-tms" value={borrador[k] ?? ''}
                      onChange={e => setBorrador(b => ({ ...b, [k]: e.target.value }))}
                      aria-describedby={describe} aria-invalid={error ? true : undefined}>
                      {c.opciones.map(o => <option key={String(o.valor)} value={String(o.valor)}>{o.etiqueta}</option>)}
                    </select>
                  ) : (
                    <input id={id} name={k} className="form-control campo-tms cifra" inputMode={c.tipo === 'entero' ? 'numeric' : 'decimal'}
                      value={borrador[k] ?? ''} autoComplete="off" spellCheck={false}
                      onChange={e => setBorrador(b => ({ ...b, [k]: e.target.value }))}
                      aria-describedby={describe} aria-invalid={error ? true : undefined} />
                  )}
                </>
              )}
              {c.ayuda && <p id={`${id}-ayuda`} className="texto-ayuda">{c.ayuda}</p>}
              {error && <p id={`${id}-error`} className="texto-error">{error}</p>}
            </div>
          );
        })}
      </fieldset>

      {extra}

      {!soloLectura && (
        <div className="fila-formulario">
          <button type="submit" className="btn-tms btn-start" disabled={estado.guardando}>
            <i className="bi bi-check2" aria-hidden="true" /> {estado.guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {cambiado && !estado.guardando && <span className="texto-ayuda">Hay cambios sin guardar.</span>}
        </div>
      )}
      <p className="texto-exito mb-0" role="status" aria-live="polite">{estado.mensaje}</p>
      <p className="texto-error mb-0" role="alert">{estado.error}</p>
    </form>
  );
}
