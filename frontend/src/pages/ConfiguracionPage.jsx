/**
 * pages/ConfiguracionPage.jsx
 * Configuración del sistema por secciones (?vista=configuracion&seccion=…):
 * Barrido, Sensor, Simulación, Dispositivo, Visualización y Usuarios.
 * Usa GET/PUT /api/configuracion/:clave y las rutas de usuarios y del
 * dispositivo. Para quien no es admin, todo es de solo lectura, y
 * Usuarios muestra un aviso.
 */
import React from 'react';
import { useConfig } from '../context/ConfigContext.jsx';
import { SeccionFormulario } from '../components/config/SeccionFormulario.jsx';
import { SeccionUsuarios } from '../components/config/SeccionUsuarios.jsx';
import { SeccionDispositivo } from '../components/config/SeccionDispositivo.jsx';
import { SelectorModeloSensor } from '../components/config/SelectorModeloSensor.jsx';
import { numero } from '../utils/formato.js';

const SECCIONES = [
  ['barrido', 'Barrido', 'bi-grid-3x3'],
  ['sensor', 'Sensor', 'bi-magnet'],
  ['simulacion', 'Simulación', 'bi-cpu'],
  ['dispositivo', 'Dispositivo', 'bi-broadcast-pin'],
  ['visualizacion', 'Visualización', 'bi-graph-up'],
  ['usuarios', 'Usuarios', 'bi-people'],
];

const AVISO_SESION = 'No se puede cambiar con una medición en curso (el servidor responde 409).';

export function ConfiguracionPage({ usuario, seccion, onNavegar, sesionAbierta }) {
  const { config, opciones } = useConfig();
  const esAdmin = usuario.rol === 'admin';
  const zona = config?.datos?.zona_horaria;
  const sensor = config?.sensor;
  const esQMC = sensor?.modelo === 'QMC5883P';

  let contenido;
  switch (seccion) {
    case 'sensor': {
      const camposComunes = [
        { ruta: ['lecturas_por_punto'], etiqueta: 'Lecturas por punto', tipo: 'entero', ayuda: 'De 1 a 100.' },
        { ruta: ['offset_ut', 'x'], etiqueta: 'Offset X', tipo: 'numero', unidad: 'µT', ayuda: 'Se resta a cada lectura convertida. La Pico imprime el fondo (Tierra y entorno, con la bobina apagada) al arrancar: cópialo aquí.' },
        { ruta: ['offset_ut', 'y'], etiqueta: 'Offset Y', tipo: 'numero', unidad: 'µT' },
        { ruta: ['offset_ut', 'z'], etiqueta: 'Offset Z', tipo: 'numero', unidad: 'µT' },
      ];
      const rango = esQMC
        ? { ruta: ['rango_g'], etiqueta: 'Rango', tipo: 'select',
            opciones: (opciones?.rangos_qmc5883p ?? []).map(r => ({ valor: r.rango_g, etiqueta: `±${r.rango_g}\u00a0G (fondo ${numero(r.fondo_ut, 1)}\u00a0µT)` })),
            ayuda: 'Las cuentas por gauss salen del rango: 15000 (2 G), 3750 (8 G), 2500 (12 G) y 1000 (30 G).' }
        : { ruta: ['rango_ga'], etiqueta: 'Rango (ganancia)', tipo: 'select',
            opciones: (opciones?.ganancias_hmc5883l ?? []).map(g => ({ valor: g.rango_ga, etiqueta: `±${numero(g.rango_ga, 2)}\u00a0Ga (fondo ${numero(2047 / g.lsb_por_ga * 100, 1)}\u00a0µT)` })) };
      contenido = (
        <>
          <SelectorModeloSensor soloLectura={!esAdmin} sesionAbierta={sesionAbierta} />
          <SeccionFormulario key={sensor?.modelo ?? 'sin-modelo'} clave="sensor" titulo={`Rango y calibración (${sensor?.modelo ?? '—'})`} soloLectura={!esAdmin}
            descripcion={esQMC
              ? `El rango fija el fondo de escala: por encima, el QMC5883P avisa con su bit de saturación y la lectura se guarda como saturada (sin Bx, By ni Bz). µT = cuentas / cuentas por gauss × 100 − offset. ${sesionAbierta ? AVISO_SESION : ''}`
              : `La ganancia fija el fondo de escala: por encima, el registro se desborda (−4096) y la lectura se guarda como saturada. µT = cuentas / LSB por gauss × 100 − offset. ${sesionAbierta ? AVISO_SESION : ''}`}
            campos={[rango, ...camposComunes]}
            extra={(
              <p className="texto-secundario">
                {esQMC ? 'Cuentas por gauss' : 'LSB por gauss'} vigentes (se calculan del rango):{' '}
                <strong className="cifra">{(esQMC ? sensor?.cuentas_por_g : sensor?.lsb_por_ga) ?? '—'}</strong>.
                El botón «Medir cero» queda pendiente: el servidor todavía no lo soporta.
              </p>
            )}
          />
        </>
      );
      break;
    }
    case 'simulacion':
      contenido = (
        <SeccionFormulario clave="simulacion" titulo="Simulación" soloLectura={!esAdmin}
          descripcion="Parámetros del simulador del servidor. Se copian en cada sesión al iniciarla (incluida la semilla), así la sesión se puede reproducir."
          campos={[
            { ruta: ['ms_por_punto', 'DC'], etiqueta: 'Tiempo por punto en DC (rápida)', tipo: 'entero', unidad: 'ms' },
            { ruta: ['ms_por_punto', 'AC'], etiqueta: 'Tiempo por punto en AC (normal)', tipo: 'entero', unidad: 'ms' },
            { ruta: ['semilla'], etiqueta: 'Semilla', tipo: 'entero', ayuda: 'La misma semilla con la misma configuración reproduce el mismo barrido.' },
            { ruta: ['ruido_sigma_ut'], etiqueta: 'Ruido (σ)', tipo: 'numero', unidad: 'µT' },
            { ruta: ['radio_bobina_mm'], etiqueta: 'Radio de la bobina', tipo: 'numero', unidad: 'mm' },
            { ruta: ['campo_centro_ut'], etiqueta: '|B| en el centro (Z = 0)', tipo: 'numero', unidad: 'µT' },
            { ruta: ['prob_hueco'], etiqueta: 'Probabilidad de hueco', tipo: 'numero', ayuda: 'De 0 a 1.' },
            { ruta: ['prob_saturacion'], etiqueta: 'Probabilidad de saturación', tipo: 'numero', ayuda: 'De 0 a 1.' },
          ]}
        />
      );
      break;
    case 'dispositivo':
      contenido = <SeccionDispositivo esAdmin={esAdmin} zona={zona} />;
      break;
    case 'visualizacion':
      contenido = (
        <SeccionFormulario clave="visualizacion" titulo="Visualización" soloLectura={!esAdmin}
          descripcion="Afecta a todos los que miran el dashboard."
          campos={[
            { ruta: ['ventana_grafica'], etiqueta: 'Lecturas en la gráfica de líneas', tipo: 'entero' },
            { ruta: ['filas_tabla'], etiqueta: 'Filas de la tabla', tipo: 'entero' },
            { ruta: ['decimales'], etiqueta: 'Decimales', tipo: 'entero', ayuda: 'Solo para mostrar: los datos se guardan sin redondear.' },
            { ruta: ['escala_superficie'], etiqueta: 'Escala de color de la superficie', tipo: 'select',
              opciones: [{ valor: 'Jet', etiqueta: 'Jet (por defecto)' }, { valor: 'Viridis', etiqueta: 'Viridis (apta para daltonismo)' }] },
            { ruta: ['rotacion_auto'], etiqueta: 'Rotación automática del mapa 3D', tipo: 'bool', ayuda: 'Nunca rota si el sistema pide reducir el movimiento.' },
            { ruta: ['reducir_animaciones'], etiqueta: 'Reducir animaciones', tipo: 'bool' },
          ]}
        />
      );
      break;
    case 'usuarios':
      contenido = esAdmin
        ? <SeccionUsuarios usuario={usuario} zona={zona} />
        : (
          <div className="seccion-config">
            <h2 className="panel-titulo">Usuarios</h2>
            <p className="aviso-lectura" role="alert"><i className="bi bi-shield-lock" aria-hidden="true" /> Esta sección es solo para administradores. Pide a un admin que cree o cambie usuarios.</p>
          </div>
        );
      break;
    default:
      contenido = (
        <SeccionFormulario clave="barrido" titulo="Barrido" soloLectura={!esAdmin}
          descripcion={`Los límites de la base son lo más que puede recorrer la mesa en cada eje. En cada medición el operador elige la zona de muestreo (X × Y × Z) y el sistema no deja que pase de estos límites; si cambias de base, ajústalos aquí. La zona va centrada bajo la bobina. ${sesionAbierta ? AVISO_SESION : ''}`}
          campos={[
            { ruta: ['limite_x_mm'], etiqueta: 'Límite de la base en X', tipo: 'numero', unidad: 'mm',
              ayuda: 'Recorrido máximo de la mesa en X. Entre 1 y 1000 mm, con un decimal.' },
            { ruta: ['limite_y_mm'], etiqueta: 'Límite de la base en Y', tipo: 'numero', unidad: 'mm',
              ayuda: 'Recorrido máximo de la mesa en Y. Entre 1 y 1000 mm, con un decimal.' },
            { ruta: ['limite_z_mm'], etiqueta: 'Límite de la base en Z (altura)', tipo: 'numero', unidad: 'mm',
              ayuda: 'Altura máxima sobre el standoff. Entre 0 y 500 mm; 0 = un solo plano.' },
            { ruta: ['standoff_mm'], etiqueta: 'Separación bobina–sensor (standoff)', tipo: 'numero', unidad: 'mm' },
            { ruta: ['paso_predeterminado_mm'], etiqueta: 'Paso predeterminado', tipo: 'numero', unidad: 'mm',
              ayuda: 'El que aparece al abrir el dashboard; el operador puede escribir otro en cada medición. Los más usados: 5, 10 y 20 mm. Desde 1 mm, con un decimal.' },
          ]}
        />
      );
  }

  return (
    <>
      <h1 className="titulo-pagina">Configuración</h1>
      <div className="config-layout">
        <nav className="config-nav" aria-label="Secciones de la configuración">
          <ul>
            {SECCIONES.map(([clave, etiqueta, icono]) => (
              <li key={clave}>
                <a href={`?vista=configuracion&seccion=${clave}`} className={`config-enlace${seccion === clave ? ' activo' : ''}`}
                  aria-current={seccion === clave ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); onNavegar('configuracion', clave); }}>
                  <i className={`bi ${icono}`} aria-hidden="true" /> {etiqueta}
                  {clave === 'usuarios' && !esAdmin && <span className="visually-hidden"> (solo admin)</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="config-contenido control-panel">{contenido}</div>
      </div>
    </>
  );
}
