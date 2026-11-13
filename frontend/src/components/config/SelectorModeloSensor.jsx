/**
 * components/config/SelectorModeloSensor.jsx
 * Modelo del magnetómetro (Configuración › Sensor): QMC5883P (el módulo
 * real) o HMC5883L (lo que espera el firmware del Hall 49E).
 *
 * Cambiar de modelo es un PUT /api/configuracion/sensor {modelo}: el
 * servidor deja los valores de ese modelo (QMC5883P en 30 G o HMC5883L
 * en 1,9 Ga) y conserva las lecturas por punto y el offset. Va aparte del
 * formulario del rango porque los campos dependen del modelo.
 */
import React, { useEffect, useState } from 'react';
import { useConfig } from '../../context/ConfigContext.jsx';

const DESCRIPCION = {
  QMC5883P: 'QMC5883P (módulo real)',
  HMC5883L: 'HMC5883L (firmware del Hall)',
};

const AYUDA = {
  QMC5883P: 'Cuentas de 16 bits con signo; la saturación llega como un bit aparte (−4096 es una cuenta válida).',
  HMC5883L: '«Cuentas HMC» de −4096 a 2047; −4096 en un eje es saturación. Lo usa el firmware del sensor Hall 49E.',
};

export function SelectorModeloSensor({ soloLectura, sesionAbierta }) {
  const { config, opciones, guardarClave } = useConfig();
  const actual = config?.sensor?.modelo ?? 'HMC5883L';
  const [elegido, setElegido] = useState(actual);
  const [estado, setEstado] = useState({ guardando: false, mensaje: '', error: '' });
  useEffect(() => { setElegido(actual); }, [actual]);

  const cambiar = async (e) => {
    e.preventDefault();
    if (elegido === actual) { setEstado({ guardando: false, mensaje: `El modelo ya es ${actual}.`, error: '' }); return; }
    setEstado({ guardando: true, mensaje: '', error: '' });
    const r = await guardarClave('sensor', { modelo: elegido });
    setEstado(r.ok
      ? { guardando: false, mensaje: `Modelo cambiado a ${elegido}.`, error: '' }
      : { guardando: false, mensaje: '', error: (r.status === 409 ? 'No se puede cambiar ahora: ' : '') + (r.errores?.join(' ') || r.error || 'No se pudo cambiar el modelo.') });
  };

  return (
    <form className="seccion-config" onSubmit={cambiar} noValidate>
      <h2 className="panel-titulo">Modelo del sensor</h2>
      <p className="texto-secundario">
        Define cómo el servidor interpreta las cuentas que manda la Pico W. Al cambiarlo se usan los valores
        de ese modelo (QMC5883P en 30 G; HMC5883L en 1,9 Ga) y se conservan las lecturas por punto y el offset.
      </p>
      <p className="aviso-lectura">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <span>
          Para usar el firmware del sensor Hall 49E (<span translate="no">firmware_hall_1d</span>), pon antes el
          modelo <span translate="no">HMC5883L</span>: ese firmware manda «cuentas HMC» y, con
          el <span translate="no">QMC5883P</span>, se guardarían mal sin ningún error.
        </span>
      </p>
      <fieldset disabled={soloLectura || Boolean(sesionAbierta)} className="campos-config">
        <div className="campo-config">
          <label htmlFor="cfg-sensor-modelo" className="etiqueta-campo">Modelo</label>
          <select id="cfg-sensor-modelo" name="modelo" className="form-select campo-tms" value={elegido}
            onChange={e => setElegido(e.target.value)} aria-describedby="cfg-sensor-modelo-ayuda">
            {(opciones?.modelos_sensor ?? ['QMC5883P', 'HMC5883L']).map(m => (
              <option key={m} value={m}>{DESCRIPCION[m] ?? m}</option>
            ))}
          </select>
          <p id="cfg-sensor-modelo-ayuda" className="texto-ayuda">
            Vigente: <strong translate="no">{actual}</strong>. {AYUDA[elegido]}{sesionAbierta ? ' No se puede cambiar con una medición en curso.' : ''}
          </p>
        </div>
      </fieldset>
      {!soloLectura && (
        <div className="fila-formulario">
          <button type="submit" className="btn-tms btn-start" disabled={estado.guardando || Boolean(sesionAbierta)}>
            <i className="bi bi-arrow-repeat" aria-hidden="true" /> {estado.guardando ? 'Cambiando…' : 'Cambiar modelo'}
          </button>
        </div>
      )}
      <p className="texto-exito mb-0" role="status" aria-live="polite">{estado.mensaje}</p>
      <p className="texto-error mb-0" role="alert">{estado.error}</p>
    </form>
  );
}
