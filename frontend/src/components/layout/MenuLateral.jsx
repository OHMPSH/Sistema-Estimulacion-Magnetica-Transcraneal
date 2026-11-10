/**
 * components/layout/MenuLateral.jsx
 * Panel lateral que se abre con el botón ☰ (role="dialog", aria-modal).
 * Mientras está abierto, el foco queda dentro; se cierra con Esc, con
 * el botón ✕ o al tocar fuera, y el foco vuelve al botón ☰.
 *
 * Contenido, en orden: usuario y rol · modo de operación (radios solo
 * para admin; desactivados con una sesión abierta) · tema · navegación ·
 * cerrar sesión.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ROLES_TEXTO } from '../../utils/formato.js';

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const NAVEGACION = [
  { vista: 'dashboard',     etiqueta: 'Dashboard en vivo',  icono: 'bi-broadcast' },
  { vista: 'historial',     etiqueta: 'Mediciones pasadas', icono: 'bi-archive' },
  { vista: 'configuracion', etiqueta: 'Configuración',      icono: 'bi-gear' },
];

export function MenuLateral({
  abierto, onCerrar, refRetorno, usuario, vista, onNavegar,
  modoOperacion, onCambiarModo, sesionAbierta, tema, onCambiarTema, onCerrarSesion,
}) {
  const panel = useRef(null);
  const [errorModo, setErrorModo] = useState('');
  const [cambiandoModo, setCambiandoModo] = useState(false);
  const esAdmin = usuario.rol === 'admin';

  // Foco: al abrir entra al panel; al cerrar vuelve al botón ☰
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = refRetorno?.current;
    const primero = panel.current?.querySelector(ENFOCABLES);
    primero?.focus();
    const alTeclear = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const lista = [...panel.current.querySelectorAll(ENFOCABLES)];
      if (lista.length === 0) return;
      const [a, z] = [lista[0], lista[lista.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', alTeclear);
    document.body.classList.add('menu-abierto');
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.classList.remove('menu-abierto');
      anterior?.focus();
    };
  }, [abierto, onCerrar, refRetorno]);

  const cambiarModo = async (modo) => {
    if (modo === modoOperacion) return;
    setCambiandoModo(true);
    setErrorModo('');
    const r = await onCambiarModo(modo);
    if (!r.ok) setErrorModo(r.error || 'No se pudo cambiar el modo.');
    setCambiandoModo(false);
  };

  if (!abierto) return null;

  return (
    <div className="menu-capa" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <nav id="menu-lateral" ref={panel} className="menu-lateral" role="dialog" aria-modal="true" aria-labelledby="menu-titulo">
        <div className="menu-cabecera">
          <h2 id="menu-titulo" className="menu-titulo">Menú</h2>
          <button type="button" className="btn-icono" onClick={onCerrar} aria-label="Cerrar el menú">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <section className="menu-seccion" aria-label="Usuario">
          <div className="menu-usuario">
            <i className="bi bi-person-circle" aria-hidden="true" />
            <div>
              <div className="menu-usuario-nombre">{usuario.nombre}</div>
              <div className="menu-usuario-rol">{ROLES_TEXTO[usuario.rol] ?? usuario.rol} · {usuario.usuario}</div>
            </div>
          </div>
        </section>

        <section className="menu-seccion">
          {esAdmin ? (
            <fieldset disabled={sesionAbierta || cambiandoModo}>
              <legend className="menu-subtitulo">Modo de operación</legend>
              {[['simulacion', 'Simulación', 'El simulador del servidor genera los datos'],
                ['real', 'Real (Pico W → servidor)', 'Las lecturas llegan de la Pico W']].map(([valor, etiqueta, ayuda]) => (
                <label key={valor} className="opcion-radio">
                  <input type="radio" name="modo-operacion" value={valor}
                    checked={modoOperacion === valor} onChange={() => cambiarModo(valor)} />
                  <span>
                    <span className="opcion-texto">{etiqueta}</span>
                    <span className="opcion-ayuda">{ayuda}</span>
                  </span>
                </label>
              ))}
              {sesionAbierta && (
                <p className="menu-nota">Hay una medición en curso: detenla para cambiar el modo. Cambiarlo a mitad de un barrido mezclaría datos simulados y reales.</p>
              )}
            </fieldset>
          ) : (
            <>
              <h3 className="menu-subtitulo">Modo de operación</h3>
              <p className="menu-valor">{modoOperacion === 'real' ? 'Real (Pico W → servidor)' : 'Simulación'}</p>
            </>
          )}
          <p className="texto-error" role="alert">{errorModo}</p>
        </section>

        <section className="menu-seccion">
          <fieldset>
            <legend className="menu-subtitulo">Tema</legend>
            <div className="grupo-segmentado">
              {[['oscuro', 'Oscuro', 'bi-moon-stars'], ['claro', 'Claro', 'bi-sun'], ['sistema', 'Sistema', 'bi-circle-half']].map(([valor, etiqueta, icono]) => (
                <label key={valor} className={`segmento${tema === valor ? ' activo' : ''}`}>
                  <input type="radio" name="tema" value={valor} checked={tema === valor} onChange={() => onCambiarTema(valor)} />
                  <i className={`bi ${icono}`} aria-hidden="true" /> {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="menu-seccion">
          <h3 className="menu-subtitulo">Navegación</h3>
          <ul className="menu-navegacion">
            {NAVEGACION.map(n => (
              <li key={n.vista}>
                <a href={`?vista=${n.vista}`} className={`menu-enlace${vista === n.vista ? ' activo' : ''}`}
                  aria-current={vista === n.vista ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); onNavegar(n.vista); onCerrar(); }}>
                  <i className={`bi ${n.icono}`} aria-hidden="true" /> {n.etiqueta}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="menu-seccion menu-pie">
          <button type="button" className="btn-tms btn-secundario w-100" onClick={onCerrarSesion}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Cerrar sesión
          </button>
        </section>
      </nav>
    </div>
  );
}
