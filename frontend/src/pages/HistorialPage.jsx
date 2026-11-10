/**
 * pages/HistorialPage.jsx
 * Mediciones pasadas (Fase 5):
 *   - filtros por velocidad, paso, medio y origen (en el servidor) y por día;
 *   - el id real de cada sesión, su origen, los puntos recibidos sobre los
 *     esperados, las lecturas saturadas y los huecos;
 *   - notas editables (admin, o el operador que inició la sesión);
 *   - Exportar CSV: enlace al CSV que genera el servidor, con metadatos;
 *   - Eliminar (admin) con un modal que explica que es un borrado lógico;
 *   - "Ver eliminadas" y Restaurar, solo para admin.
 * La lista se recarga sola con los eventos `sesion` del SSE.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, enviarJSON, leerJSON } from '../api/cliente.js';
import { useConfig } from '../context/ConfigContext.jsx';
import { useEventoStream } from '../hooks/useStream.js';
import { ModalConfirmacion } from '../components/modals/ModalConfirmacion.jsx';
import { PASOS_SUGERIDOS, MEDIOS, MODOS, etiquetaPaso, etiquetaZona, etiquetaMedio, etiquetaMedioCorta, etiquetaModo } from '../utils/geometria.js';
import { numero, entero, fechaHora, diaLocal, duracion } from '../utils/formato.js';

const NOTAS_MAXIMO = 5000;

function EditorNotas({ sesion, puedeEditar, onGuardada }) {
  const [texto, setTexto] = useState(sesion.notas ?? '');
  const [estado, setEstado] = useState({ guardando: false, mensaje: '', error: '' });
  useEffect(() => { setTexto(sesion.notas ?? ''); }, [sesion.notas]);
  const id = `notas-${sesion.id}`;

  if (!puedeEditar) {
    return (
      <div className="notas-lectura">
        <h4 className="etiqueta-campo">Notas</h4>
        <p className="mb-0 texto-preformateado">{sesion.notas || <span className="texto-secundario">Sin notas.</span>}</p>
      </div>
    );
  }

  const guardar = async (e) => {
    e.preventDefault();
    setEstado({ guardando: true, mensaje: '', error: '' });
    try {
      const json = await leerJSON(await enviarJSON(`/api/sesiones/${sesion.id}`, { notas: texto }, 'PATCH'));
      if (json.ok) { setEstado({ guardando: false, mensaje: 'Notas guardadas.', error: '' }); onGuardada(json.sesion); }
      else setEstado({ guardando: false, mensaje: '', error: json.error || 'No se pudieron guardar las notas.' });
    } catch {
      setEstado({ guardando: false, mensaje: '', error: 'No se pudo conectar con el servidor.' });
    }
  };

  return (
    <form className="notas-editor" onSubmit={guardar}>
      <label htmlFor={id} className="etiqueta-campo">Notas</label>
      <textarea id={id} name="notas" className="campo-tms" rows={3} maxLength={NOTAS_MAXIMO} value={texto}
        onChange={e => setTexto(e.target.value)} aria-describedby={`${id}-ayuda`} />
      <div className="fila-formulario">
        <span id={`${id}-ayuda`} className="texto-ayuda cifra">{texto.length} / {NOTAS_MAXIMO} caracteres</span>
        <button type="submit" className="btn-tms btn-secundario" disabled={estado.guardando || texto === (sesion.notas ?? '')}>
          {estado.guardando ? 'Guardando…' : 'Guardar notas'}
        </button>
      </div>
      <p className="texto-exito mb-0" role="status" aria-live="polite">{estado.mensaje}</p>
      <p className="texto-error mb-0" role="alert">{estado.error}</p>
    </form>
  );
}

function SesionCard({ sesion, usuario, zona, onEliminar, onRestaurar, onActualizada }) {
  const [abierta, setAbierta] = useState(false);
  const esAdmin = usuario.rol === 'admin';
  const puedeEditar = esAdmin || (usuario.rol === 'operador' && sesion.usuario_id === usuario.id);
  const esperados = sesion.puntos_esperados;
  const recibidos = sesion.puntos_recibidos ?? sesion.total_puntos ?? 0;
  const pct = esperados ? Math.round((recibidos / esperados) * 100) : null;
  const huecos = sesion.huecos;
  const segundos = sesion.terminada_en ? (new Date(sesion.terminada_en) - new Date(sesion.iniciada_en)) / 1000 : null;
  const idCuerpo = `sesion-cuerpo-${sesion.id}`;
  const eliminada = Boolean(sesion.eliminada_en);

  return (
    <article className={`session-card${eliminada ? ' eliminada' : ''}`}>
      <h3 className="m-0">
        <button type="button" className="session-card-header" aria-expanded={abierta} aria-controls={idCuerpo}
          onClick={() => setAbierta(v => !v)}>
          <span>
            <span className="session-title">
              Sesión {sesion.id} · {fechaHora(sesion.iniciada_en, zona)}
              {sesion.activa && <span className="session-tag en-curso">En curso</span>}
              {eliminada && <span className="session-tag tag-eliminada">Eliminada</span>}
            </span>
            <span className="session-meta">
              <span className={`session-tag ${sesion.modo.toLowerCase()}`}>{sesion.modo}</span>
              <span className="session-tag">{etiquetaPaso(sesion.paso_mm)}</span>
              <span className={`session-tag${sesion.medio === 'solucion_salina' ? ' salina' : ''}`}>{etiquetaMedioCorta(sesion.medio)}</span>
              <span className={`session-tag${sesion.origen === 'hw' ? ' hw' : ''}`}>{sesion.origen === 'hw' ? 'Real (Pico W)' : 'Simulada'}</span>
              <span className="session-tag cifra">{entero(recibidos)}{esperados ? ` / ${entero(esperados)}` : ''} puntos{pct !== null ? ` · ${pct} %` : ''}</span>
              {huecos && <span className={`session-tag cifra${huecos.total > 0 ? ' con-huecos' : ''}`}>{huecos.total} huecos</span>}
            </span>
          </span>
          <i className={`bi bi-chevron-down chevron${abierta ? ' girado' : ''}`} aria-hidden="true" />
        </button>
      </h3>

      {abierta && (
        <div className="session-body" id={idCuerpo}>
          <dl className="session-stats">
            <div><dt>Velocidad</dt><dd>{etiquetaModo(sesion.modo)}</dd></div>
            <div><dt>Zona</dt><dd className="cifra">{sesion.zona_x_mm != null ? etiquetaZona({ x: sesion.zona_x_mm, y: sesion.zona_y_mm, z: sesion.zona_z_mm }) : '—'}</dd></div>
            <div><dt>Paso</dt><dd>{etiquetaPaso(sesion.paso_mm)} (X, Y y Z)</dd></div>
            <div><dt>Medio</dt><dd>{etiquetaMedio(sesion.medio)}</dd></div>
            <div><dt>Origen</dt><dd>{sesion.origen === 'hw' ? 'Pico W (real)' : 'Simulador del servidor'}</dd></div>
            <div><dt>Puntos</dt><dd className="cifra">{entero(recibidos)} recibidos de {esperados ? entero(esperados) : '—'}</dd></div>
            <div><dt>Saturadas</dt><dd className="cifra">{entero(Number(sesion.saturadas ?? 0))}</dd></div>
            <div><dt>|B| máximo</dt><dd className="cifra color-mag">{numero(sesion.max_magnitud, 3)} µT</dd></div>
            <div><dt>|B| mínimo</dt><dd className="cifra">{numero(sesion.min_magnitud, 3)} µT</dd></div>
            <div><dt>Duración</dt><dd className="cifra">{duracion(segundos)}</dd></div>
            <div><dt>Inició</dt><dd>{sesion.iniciada_por ?? '—'}</dd></div>
            <div><dt>Software</dt><dd className="cifra" translate="no">{sesion.version_software ?? '—'}</dd></div>
            {sesion.origen === 'hw' && <div><dt>Firmware</dt><dd className="cifra" translate="no">{sesion.version_firmware ?? '—'}</dd></div>}
          </dl>

          {huecos && huecos.total > 0 && (
            <details className="huecos">
              <summary>Ver las posiciones sin lectura válida ({huecos.total}{huecos.posiciones.length < huecos.total ? `, se listan ${huecos.posiciones.length}` : ''})</summary>
              <ul className="lista-huecos cifra">
                {huecos.posiciones.map(p => <li key={`${p.xMM}-${p.yMM}-${p.zMM}`}>({p.xMM}, {p.yMM}, {p.zMM}) mm</li>)}
              </ul>
            </details>
          )}
          {!huecos && sesion.terminada_en && (
            <p className="texto-secundario">Los huecos no se calcularon para esta sesión (es anterior a la Fase 5).</p>
          )}

          <EditorNotas sesion={sesion} puedeEditar={puedeEditar && !eliminada} onGuardada={onActualizada} />

          <div className="acciones mt-3">
            {!eliminada && (
              <a className="btn-tms btn-secundario" href={`/api/sesiones/${sesion.id}/csv`} download>
                <i className="bi bi-download" aria-hidden="true" /> Exportar CSV
              </a>
            )}
            {esAdmin && !eliminada && !sesion.activa && (
              <button type="button" className="btn-tms btn-stop" onClick={() => onEliminar(sesion)}>
                <i className="bi bi-trash3" aria-hidden="true" /> Eliminar
              </button>
            )}
            {esAdmin && eliminada && (
              <button type="button" className="btn-tms btn-start" onClick={() => onRestaurar(sesion)}>
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Restaurar
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** Paso del filtro: vacío (todos) o mm con un decimal como máximo */
const pasoValido = t => t === '' || (/^\d{1,3}([.,]\d)?$/.test(t) && Number(t.replace(',', '.')) > 0);

export function HistorialPage({ usuario }) {
  const { config } = useConfig();
  const zona = config?.datos?.zona_horaria;
  const esAdmin = usuario.rol === 'admin';
  // Los filtros viven en la URL (?vista=historial&modo=DC&paso_mm=10…): se pueden enlazar y sobreviven a la recarga
  const [filtros, setFiltros] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      modo: p.get('modo') ?? '', paso_mm: p.get('paso_mm') ?? '', medio: p.get('medio') ?? '',
      origen: p.get('origen') ?? '', dia: p.get('dia') ?? '', eliminadas: esAdmin && p.get('eliminadas') === '1',
    };
  });
  useEffect(() => {
    const p = new URLSearchParams({ vista: 'historial' });
    for (const k of ['modo', 'paso_mm', 'medio', 'origen', 'dia']) if (filtros[k]) p.set(k, filtros[k]);
    if (filtros.eliminadas) p.set('eliminadas', '1');
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`);
  }, [filtros]);
  const [sesiones, setSesiones] = useState([]);
  const [activaId, setActivaId] = useState(null);
  // Paso: se escribe libre (con sugerencias de los más usados y de los que ya hay en el historial)
  const [textoPaso, setTextoPaso] = useState(() => filtros.paso_mm);
  const [pasosConocidos, setPasosConocidos] = useState(PASOS_SUGERIDOS);
  const errorPaso = pasoValido(textoPaso.trim()) ? '' : 'Escribe el paso en mm, con un decimal como máximo (por ejemplo 5 o 2.5).';
  useEffect(() => {
    // Se aplica medio segundo después de dejar de escribir, y solo si es válido
    const t = textoPaso.trim();
    if (!pasoValido(t)) return undefined;
    const id = setTimeout(() => setFiltros(f => {
      const nuevo = t === '' ? '' : String(Number(t.replace(',', '.')));
      return f.paso_mm === nuevo ? f : { ...f, paso_mm: nuevo };
    }), 500);
    return () => clearTimeout(id);
  }, [textoPaso]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState({ texto: '', error: false });
  const confirmacion = useRef(null);
  const peticion = useRef(0);   // descarta respuestas viejas si los filtros cambian rápido

  const cargar = useCallback(async () => {
    const idPeticion = ++peticion.current;
    const q = new URLSearchParams();
    for (const k of ['modo', 'paso_mm', 'medio', 'origen']) if (filtros[k]) q.set(k, filtros[k]);
    if (filtros.eliminadas) q.set('incluir_eliminadas', '1');
    try {
      const json = await leerJSON(await apiFetch(`/api/sesiones?${q}`));
      if (idPeticion !== peticion.current) return;
      if (json.ok) {
        setSesiones(json.data); setActivaId(json.activa?.id ?? null);
        setPasosConocidos(prev => {
          const todos = new Set([...prev, ...json.data.map(s => Number(s.paso_mm))]);
          return todos.size === prev.length ? prev : [...todos].sort((a, b) => a - b);
        });
      }
      else setAviso({ texto: json.error || 'No se pudo cargar el historial.', error: true });
    } catch {
      setAviso({ texto: 'No se pudo conectar con el servidor.', error: true });
    } finally {
      if (idPeticion === peticion.current) setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);
  useEventoStream('sesion', () => cargar());

  const visibles = useMemo(() => sesiones
    .filter(s => !filtros.dia || diaLocal(s.iniciada_en, zona) === filtros.dia)
    .map(s => ({ ...s, activa: s.id === activaId })), [sesiones, filtros.dia, zona, activaId]);

  const cambiar = (k, v) => setFiltros(f => ({ ...f, [k]: v }));
  const limpiar = () => {
    setTextoPaso('');
    setFiltros(f => ({ modo: '', paso_mm: '', medio: '', origen: '', dia: '', eliminadas: f.eliminadas }));
  };

  const eliminar = async (s) => {
    const ok = await confirmacion.current.confirmar({
      titulo: `Eliminar la sesión ${s.id}`,
      mensaje: (
        <>
          <p>La sesión dejará de aparecer en el historial y no se podrá exportar.</p>
          <p className="mb-0 texto-secundario">Es un <strong>borrado lógico</strong>: las mediciones se conservan en la base de datos y un admin puede restaurarla desde «Ver eliminadas».</p>
        </>
      ),
      textoConfirmar: 'Sí, eliminar', peligro: true,
    });
    if (!ok) return;
    const json = await leerJSON(await apiFetch(`/api/sesiones/${s.id}`, { method: 'DELETE' })).catch(() => ({ ok: false }));
    setAviso(json.ok ? { texto: `Sesión ${s.id} eliminada.`, error: false } : { texto: json.error || 'No se pudo eliminar.', error: true });
    cargar();
  };

  const restaurar = async (s) => {
    const json = await leerJSON(await apiFetch(`/api/sesiones/${s.id}/restaurar`, { method: 'POST' })).catch(() => ({ ok: false }));
    setAviso(json.ok ? { texto: `Sesión ${s.id} restaurada.`, error: false } : { texto: json.error || 'No se pudo restaurar.', error: true });
    cargar();
  };

  const actualizada = (nueva) => setSesiones(lista => lista.map(s => (s.id === nueva.id ? { ...s, ...nueva } : s)));

  return (
    <>
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">Mediciones pasadas</h1>
        <button type="button" className="btn-tms btn-secundario" onClick={cargar}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Recargar
        </button>
      </div>

      <form className="control-panel filtros" onSubmit={e => e.preventDefault()} aria-label="Filtros del historial">
        <div className="campo-compacto">
          <label htmlFor="f-modo" className="etiqueta-campo">Velocidad</label>
          <select id="f-modo" name="modo" className="form-select form-select-sm campo-tms" value={filtros.modo} onChange={e => cambiar('modo', e.target.value)}>
            <option value="">Todas</option>
            {MODOS.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
        </div>
        <div className="campo-compacto">
          <label htmlFor="f-paso" className="etiqueta-campo">Paso (mm)</label>
          <input id="f-paso" name="paso_mm" list="f-paso-opciones" className="form-control form-control-sm campo-tms cifra campo-paso-filtro"
            inputMode="decimal" autoComplete="off" spellCheck={false} placeholder="Todos"
            value={textoPaso} onChange={e => setTextoPaso(e.target.value)}
            aria-invalid={errorPaso ? true : undefined} aria-describedby={errorPaso ? 'f-paso-error' : undefined} />
          <datalist id="f-paso-opciones">
            {pasosConocidos.map(mm => <option key={mm} value={String(mm)}>{etiquetaPaso(mm)}</option>)}
          </datalist>
          {errorPaso && <p id="f-paso-error" className="texto-error texto-paso mb-0">{errorPaso}</p>}
        </div>
        <div className="campo-compacto">
          <label htmlFor="f-medio" className="etiqueta-campo">Medio</label>
          <select id="f-medio" name="medio" className="form-select form-select-sm campo-tms" value={filtros.medio} onChange={e => cambiar('medio', e.target.value)}>
            <option value="">Todos</option>
            {MEDIOS.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
        </div>
        <div className="campo-compacto">
          <label htmlFor="f-origen" className="etiqueta-campo">Origen</label>
          <select id="f-origen" name="origen" className="form-select form-select-sm campo-tms" value={filtros.origen} onChange={e => cambiar('origen', e.target.value)}>
            <option value="">Simuladas y reales</option>
            <option value="sim">Solo simuladas</option>
            <option value="hw">Solo reales (Pico W)</option>
          </select>
        </div>
        <div className="campo-compacto">
          <label htmlFor="f-dia" className="etiqueta-campo">Día</label>
          <input id="f-dia" name="dia" type="date" className="form-control form-control-sm campo-tms" value={filtros.dia} onChange={e => cambiar('dia', e.target.value)} />
        </div>
        {esAdmin && (
          <label className="opcion-casilla">
            <input type="checkbox" name="eliminadas" checked={filtros.eliminadas} onChange={e => cambiar('eliminadas', e.target.checked)} /> Ver eliminadas
          </label>
        )}
        <button type="button" className="btn-tms btn-secundario" onClick={limpiar}>
          <i className="bi bi-x-circle" aria-hidden="true" /> Limpiar
        </button>
        <span className="records-badge cifra ms-auto" role="status" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? 'sesión' : 'sesiones'}
        </span>
      </form>

      <p className={aviso.error ? 'texto-error' : 'texto-exito'} role={aviso.error ? 'alert' : 'status'} aria-live="polite">{aviso.texto}</p>

      {cargando ? (
        <p className="texto-secundario">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="lista-vacia">
          <i className="bi bi-inbox" aria-hidden="true" />
          <p>No hay sesiones con estos filtros.</p>
        </div>
      ) : (
        visibles.map(s => (
          <SesionCard key={s.id} sesion={s} usuario={usuario} zona={zona}
            onEliminar={eliminar} onRestaurar={restaurar} onActualizada={actualizada} />
        ))
      )}

      <ModalConfirmacion ref={confirmacion} />
    </>
  );
}
