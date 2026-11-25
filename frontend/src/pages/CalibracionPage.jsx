/**
 * pages/CalibracionPage.jsx — Previsualizar bobina (2026-11-24)
 *
 * Antes de un barrido, el operador lleva el sensor a un punto de la mesa
 * con tres sliders y mira en vivo cuánto campo mide, para saber si la
 * corriente de la bobina es poca o demasiada para el rango del sensor.
 *
 * El estado vive en el servidor (services/calibracion.js): GET /api/calibracion
 * al entrar y al reconectar el SSE, y el evento `calibracion` después.
 * La orden de moverse sale al soltar el slider (PATCH /api/calibracion).
 * Nada de esto se guarda en la base ni crea sesiones.
 *
 * Los ejes llevan los nombres que ve el usuario (utils/geometria.js,
 * NOMBRE_EJE): el slider «X» mueve el eje largo (y_mm del sistema).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConfig } from '../context/ConfigContext.jsx';
import { apiFetch, enviarJSON, leerJSON } from '../api/cliente.js';
import { useAlConectarStream, useEventoStream } from '../hooks/useStream.js';
import { EJES_VISTA } from '../utils/geometria.js';
import { numero } from '../utils/formato.js';
import { calibracionAReal, xyzMMASistema } from '../utils/escalaMM.js';

/** Umbrales del medidor, en % del fondo de escala nominal */
const SENAL_BAJA_PCT = 2;
const CERCA_TOPE_PCT = 80;
/** Qué describe cada eje físico (por el nombre del sistema) */
const DESCRIPCION_EJE = { x: 'eje corto', y: 'eje largo', z: 'altura; 0 = abajo, junto a la bobina' };
const ESTADOS = {
  moviendo:    { texto: 'Moviéndose', clase: 'estado-moviendo', icono: 'bi-arrows-move' },
  en_posicion: { texto: 'En posición', clase: 'estado-en-posicion', icono: 'bi-geo-alt' },
  error:       { texto: 'Error', clase: 'estado-error', icono: 'bi-exclamation-triangle' },
};

/** Fondo de escala nominal del sensor vigente: ±rango (QMC5883P) o el del ADC (HMC5883L) */
function fondoDeEscala(sensor) {
  if (!sensor) return null;
  if (sensor.modelo === 'QMC5883P') return { ut: sensor.rango_g * 100, texto: `${sensor.rango_g} G = ±${numero(sensor.rango_g * 100, 0)} µT` };
  if (sensor.lsb_por_ga) {
    const ut = (2047 / sensor.lsb_por_ga) * 100;
    return { ut, texto: `${String(sensor.rango_ga).replace('.', ',')} Ga = ±${numero(ut, 1)} µT` };
  }
  return null;
}

/** Cómo está la señal respecto del rango */
function diagnostico(lectura, fondo) {
  if (!lectura || !fondo) return null;
  if (lectura.saturado) {
    return { clase: 'nivel-saturado', titulo: 'Saturado', texto: 'El sensor se salió de su rango (bit OVFL). Baja la corriente de la bobina o elige un rango mayor.' };
  }
  const pico = Math.max(Math.abs(lectura.bx), Math.abs(lectura.by), Math.abs(lectura.bz));
  const pct = (pico / fondo.ut) * 100;
  if (pct >= CERCA_TOPE_PCT) {
    return { clase: 'nivel-alto', pct, titulo: 'Cerca del tope', texto: `La componente mayor usa el ${numero(pct, 0)} % del rango: un poco más de corriente y saturará.` };
  }
  if ((lectura.magnitud / fondo.ut) * 100 < SENAL_BAJA_PCT) {
    return { clase: 'nivel-bajo', pct, titulo: 'Señal baja', texto: `|B| queda por debajo del ${SENAL_BAJA_PCT} % del rango: sube la corriente o elige un rango menor.` };
  }
  return { clase: 'nivel-ok', pct, titulo: 'Corriente adecuada', texto: `La componente mayor usa el ${numero(pct, 0)} % del rango.` };
}

/** Un slider de posición: muestra mm y % y manda la orden al soltar */
function SliderEje({ eje, nombre, limite, valor, onCambio, onSoltar, deshabilitado }) {
  const id = `cal-${eje}`;
  const control = useRef(null);
  const soltar = useRef(onSoltar);
  soltar.current = onSoltar;
  // El evento nativo «change» de un range llega al soltarlo (ratón, dedo o tecla),
  // también si se suelta fuera del control; React solo expone «input».
  useEffect(() => {
    const el = control.current;
    const alSoltar = () => soltar.current();
    el?.addEventListener('change', alSoltar);
    return () => el?.removeEventListener('change', alSoltar);
  }, []);
  const pct = limite ? Math.round((valor / limite) * 100) : 0;
  return (
    <div className="cal-eje">
      <div className="cal-eje-cabecera">
        <label htmlFor={id} className="cal-eje-nombre">{nombre} <span className="cal-eje-desc">({DESCRIPCION_EJE[eje]})</span></label>
        <output htmlFor={id} className="cal-eje-valor cifra" translate="no">
          {numero(valor, 1)}{' '}mm <span className="cal-eje-pct">{pct}{' '}%</span>
        </output>
      </div>
      <input ref={control} id={id} type="range" className="cal-slider" min={0} max={limite ?? 0} step={0.5}
        value={valor} disabled={deshabilitado || !limite}
        aria-valuetext={`${numero(valor, 1)} milímetros, ${pct} % del recorrido`}
        onChange={e => onCambio(eje, Number(e.target.value))} />
      <div className="cal-marcas cifra" aria-hidden="true">
        <span>0{' '}%</span><span>50{' '}%</span><span>100{' '}%</span>
      </div>
      <div className="cal-marcas-mm cifra" aria-hidden="true">
        <span>0</span><span>{limite ? numero(limite / 2, 0) : '—'}</span><span>{limite ? `${numero(limite, 0)} mm` : '—'}</span>
      </div>
    </div>
  );
}

export function CalibracionPage({ usuario, dispositivo, sesionAbierta, onNavegar }) {
  const { config, modoOperacion } = useConfig();
  const puedeControlar = usuario.rol === 'operador' || usuario.rol === 'admin';
  const [cal, setCal] = useState(null);
  const [borrador, setBorrador] = useState(null);     // {x_mm, y_mm, z_mm} mientras se arrastra
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const arrastrando = useRef(false);
  const ultimo = useRef(null);                       // el borrador más reciente, sin esperar al render

  const cargar = useCallback(async () => {
    const json = await leerJSON(await apiFetch('/api/calibracion'));
    if (json.ok) setCal(calibracionAReal(json.calibracion));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useAlConectarStream(cargar);
  useEventoStream('calibracion', datos => { if (datos?.calibracion) setCal(calibracionAReal(datos.calibracion)); });

  // El borrador sigue al objetivo del servidor, salvo mientras el usuario arrastra
  useEffect(() => {
    if (!arrastrando.current) setBorrador(cal?.objetivo ?? null);
  }, [cal?.objetivo]);

  const limites = cal?.limites_mm;
  const real = modoOperacion === 'real';
  const enLinea = Boolean(dispositivo?.enLinea);
  const activa = Boolean(cal?.activa);
  const bloqueo = !real
    ? 'El sistema está en modo simulación. El previsualizador mueve la mesa real: un admin debe cambiar el modo a Real en el menú.'
    : sesionAbierta ? 'Hay una medición en curso. Detenla en el dashboard para previsualizar la bobina.'
      : null;
  // Sin «ocupado»: desactivar el slider mientras viaja la orden le quitaría el foco a quien usa el teclado
  const puedeMover = puedeControlar && activa && !bloqueo;

  const pedir = async (metodo, cuerpo) => {
    setOcupado(true);
    setError('');
    const res = cuerpo === undefined
      ? await apiFetch('/api/calibracion', { method: metodo })
      : await enviarJSON('/api/calibracion', cuerpo, metodo);
    const json = await leerJSON(res);
    setOcupado(false);
    if (!json.ok) { setError(json.error || 'El servidor no aceptó la orden.'); return false; }
    if (json.calibracion) setCal(calibracionAReal(json.calibracion));
    return true;
  };

  const cambiar = (eje, v) => {
    arrastrando.current = true;
    ultimo.current = { ...(ultimo.current ?? borrador ?? { x_mm: 0, y_mm: 0, z_mm: 0 }), [`${eje}_mm`]: v };
    setBorrador(ultimo.current);
  };
  const soltar = async () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    const destino = ultimo.current;
    ultimo.current = null;
    const o = cal?.objetivo;
    if (!destino || (o && ['x_mm', 'y_mm', 'z_mm'].every(k => o[k] === destino[k]))) return;
    // Rieles al doble (utils/escalaMM.js): los sliders van en mm reales
    if (!(await pedir('PATCH', xyzMMASistema(destino)))) setBorrador(cal?.objetivo ?? null);
  };

  const iniciar = () => pedir('POST', {});
  const terminarEIrAlDashboard = async () => {
    if (await pedir('DELETE')) onNavegar('dashboard');
  };

  const sensor = config?.sensor;
  const fondo = fondoDeEscala(sensor);
  const lectura = activa ? cal?.ultima_lectura : null;
  const diag = diagnostico(lectura, fondo);
  const estadoPico = activa && cal?.pico?.estado ? ESTADOS[cal.pico.estado] : null;
  const posicion = cal?.pico?.posicion_mm;
  const valores = borrador ?? { x_mm: 0, y_mm: 0, z_mm: 0 };
  const agujaPct = diag?.pct !== undefined ? Math.min(100, diag.pct) : (lectura?.saturado ? 100 : null);

  return (
    <div className="pagina-calibracion">
      <div className="cabecera-pagina">
        <h1 className="titulo-pagina">Previsualizar bobina</h1>
      </div>
      <p className="texto-secundario cal-intro">
        Lleva el sensor a un punto de la mesa y mira cuánto campo mide antes de empezar un barrido. Así sabes si la
        corriente de la bobina es poca o demasiada para el rango del sensor. Estas lecturas no se guardan.
      </p>

      {bloqueo && <p className="aviso-lectura cal-aviso" role="status"><i className="bi bi-info-circle" aria-hidden="true" /> {bloqueo}</p>}
      {!bloqueo && !enLinea && (
        <p className="aviso-lectura cal-aviso" role="status">
          <i className="bi bi-wifi-off" aria-hidden="true" /> La Pico W no está en línea: las órdenes se aplicarán cuando vuelva a conectarse.
        </p>
      )}
      {!puedeControlar && <p className="aviso-lectura cal-aviso"><i className="bi bi-eye" aria-hidden="true" /> Solo lectura: mover la mesa es para operadores y admins.</p>}

      <div className="cal-rejilla">
        <section className="control-panel cal-panel" aria-labelledby="cal-titulo-posicion">
          <div className="panel-cabecera">
            <h2 id="cal-titulo-posicion" className="panel-titulo"><i className="bi bi-arrows-move" aria-hidden="true" /> Posición del sensor</h2>
            <span className={`cal-estado ${estadoPico ? estadoPico.clase : 'estado-inactiva'}`} role="status" aria-live="polite">
              <i className={`bi ${estadoPico ? estadoPico.icono : 'bi-pause-circle'}`} aria-hidden="true" />
              {activa ? (estadoPico?.texto ?? 'Esperando a la Pico W') : 'Inactiva'}
            </span>
          </div>
          <p className="panel-detalle cal-detalle">
            Coordenadas de la mesa (mm). La orden de moverse sale al soltar el control.
            {posicion && activa && <> Ahora en <span className="cifra" translate="no">({numero(posicion.y_mm, 1)}, {numero(posicion.x_mm, 1)}, {numero(posicion.z_mm, 1)})</span>.</>}
          </p>

          {limites ? (
            <div className="cal-ejes">
              {EJES_VISTA.map(([eje, nombre]) => (
                <SliderEje key={eje} eje={eje} nombre={nombre} limite={limites[`${eje}_mm`]}
                  valor={valores[`${eje}_mm`] ?? 0} onCambio={cambiar} onSoltar={soltar} deshabilitado={!puedeMover} />
              ))}
            </div>
          ) : (
            <p className="texto-ayuda">Falta el recorrido de la mesa: llega con el primer latido de la Pico W (firmware 2.4 o posterior).</p>
          )}

          {cal?.pico?.estado === 'error' && activa && (
            <p className="texto-error" role="alert">La Pico W no pudo ir a ese punto: {cal.pico.error}. Elige otro punto dentro del recorrido.</p>
          )}
          <p className="texto-error" role="alert">{error}</p>

          {puedeControlar && (
            <div className="acciones cal-acciones">
              {activa ? (
                <button type="button" className="btn-tms btn-start" onClick={terminarEIrAlDashboard} disabled={ocupado}>
                  <i className="bi bi-check2-circle" aria-hidden="true" /> Terminar y volver al dashboard
                </button>
              ) : (
                <button type="button" className="btn-tms btn-start" onClick={iniciar} disabled={ocupado || Boolean(bloqueo)}>
                  <i className="bi bi-play-fill" aria-hidden="true" /> Empezar a previsualizar
                </button>
              )}
              <span className="texto-ayuda cal-ayuda-acciones">
                {activa ? 'La mesa vuelve al descanso (0, 0, 0) y puedes iniciar la medición.' : 'La mesa sale del descanso (0, 0, 0).'}
              </span>
            </div>
          )}
        </section>

        <section className="control-panel cal-panel" aria-labelledby="cal-titulo-lectura">
          <div className="panel-cabecera">
            <h2 id="cal-titulo-lectura" className="panel-titulo"><i className="bi bi-magnet" aria-hidden="true" /> Lectura en vivo</h2>
            {fondo && <span className="panel-detalle cifra" translate="no">Rango {fondo.texto}</span>}
          </div>

          <dl className="cal-valores" aria-live="off">
            {[['Bx', 'bx', 'color-bx'], ['By', 'by', 'color-by'], ['Bz', 'bz', 'color-bz'], ['|B|', 'magnitud', 'color-mag']].map(([etq, k, clase]) => (
              <div key={k} className="cal-valor">
                <dt className={clase}>{etq}</dt>
                <dd className="cifra" translate="no">
                  {lectura && lectura[k] !== null ? numero(lectura[k], 2) : '—'}<span className="cal-unidad">{' '}µT</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="cal-medidor">
            <div className="cal-medidor-titulo">
              <span>Uso del rango (componente mayor)</span>
              <span className="cifra">{diag?.pct !== undefined ? `${numero(diag.pct, 1)} %` : lectura?.saturado ? '> 100 %' : '—'}</span>
            </div>
            <div className="cal-escala" role="meter" aria-label="Uso del rango del sensor" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={agujaPct ?? undefined} aria-valuetext={diag ? diag.titulo : 'Sin lectura'}>
              <span className="cal-zona cal-zona-baja" style={{ width: `${SENAL_BAJA_PCT}%` }} />
              <span className="cal-zona cal-zona-ok" style={{ left: `${SENAL_BAJA_PCT}%`, width: `${CERCA_TOPE_PCT - SENAL_BAJA_PCT}%` }} />
              <span className="cal-zona cal-zona-alta" style={{ left: `${CERCA_TOPE_PCT}%`, width: `${100 - CERCA_TOPE_PCT}%` }} />
              {agujaPct !== null && (
                <span className="cal-aguja-pista" style={{ transform: `translateX(${agujaPct}%)` }}>
                  <span className={`cal-aguja ${diag?.clase ?? ''}`} />
                </span>
              )}
            </div>
            <div className="cal-escala-marcas cifra" aria-hidden="true">
              <span>0</span><span style={{ left: `${CERCA_TOPE_PCT}%` }}>{CERCA_TOPE_PCT}{' '}%</span><span>100{' '}%</span>
            </div>
          </div>

          {diag ? (
            <div className={`cal-diagnostico ${diag.clase}`}>
              {/* Solo se anuncia el cambio de nivel, no cada lectura (llegan varias por segundo) */}
              <strong role="status">{diag.titulo}.</strong> {diag.texto}
            </div>
          ) : (
            <p className="texto-ayuda">
              {activa ? 'Esperando la primera lectura de la Pico W…' : 'Empieza a previsualizar para ver las lecturas.'}
            </p>
          )}
          {usuario.rol === 'admin' && (
            <p className="texto-ayuda">
              El rango se cambia en{' '}
              <a href="?vista=configuracion&seccion=sensor" onClick={e => { e.preventDefault(); onNavegar('configuracion', 'sensor'); }}>Configuración › Sensor</a>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
