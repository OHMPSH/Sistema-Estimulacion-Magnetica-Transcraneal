/**
 * components/charts/Superficie3D.jsx
 * Superficie |B|(x, y) por plano Z, con Plotly (variante aprobada
 * plotly.js-gl3d-dist-min y el factory de react-plotly.js).
 *
 * - Rango de color (cmin, cmax) FIJO para toda la sesión: el mínimo y
 *   el máximo de |B| de todas sus lecturas válidas. Así los planos se
 *   pueden comparar entre sí.
 * - Escala de color según visualizacion.escala_superficie (Jet o Viridis).
 * - "Huella máxima total": en cada (x, y), el MÁXIMO de |B| entre todas
 *   las alturas medidas (no una suma).
 * - Se redibuja como máximo unas 3 veces por segundo (la tabla y la
 *   gráfica de líneas sí van a cada cuadro).
 * - Se carga aparte (React.lazy en DashboardPage) porque Plotly pesa.
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-gl3d-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { useTokensTema } from '../../hooks/useTokensTema.js';
import { numero } from '../../utils/formato.js';

const Plot = createPlotlyComponent(Plotly);
const INTERVALO_MS = 350;

/** Devuelve `valor`, pero cambia como máximo cada `ms` (con el último valor al final) */
function useLimitado(valor, ms) {
  const [limitado, setLimitado] = useState(valor);
  const ultimo = useRef(0);
  const pendiente = useRef(null);
  useEffect(() => {
    const ahora = Date.now();
    const espera = ms - (ahora - ultimo.current);
    clearTimeout(pendiente.current);
    if (espera <= 0) {
      ultimo.current = ahora;
      setLimitado(valor);
    } else {
      pendiente.current = setTimeout(() => { ultimo.current = Date.now(); setLimitado(valor); }, espera);
    }
    return () => clearTimeout(pendiente.current);
  }, [valor, ms]);
  return limitado;
}

const Superficie3D = memo(function Superficie3D({ mediciones, malla, enCurso, escala = 'Jet', decimales = 3, sesionId }) {
  const t = useTokensTema();
  const datos = useLimitado(mediciones, INTERVALO_MS);
  const [plano, setPlano] = useState('ALL');
  const ultimoZ = datos.length ? datos[datos.length - 1].zMM : null;

  // Al cambiar de sesión vuelve a la huella total
  useEffect(() => { setPlano('ALL'); }, [sesionId]);

  // Si se eligió un plano, durante el barrido sigue al plano del sensor
  useEffect(() => {
    if (enCurso && plano !== 'ALL' && ultimoZ !== null && plano !== ultimoZ) setPlano(ultimoZ);
  }, [enCurso, ultimoZ, plano]);

  const validas = useMemo(() => datos.filter(m => !m.saturado && m.magnitud !== null && m.magnitud !== undefined), [datos]);

  // Rango de color fijo para toda la sesión
  const rango = useMemo(() => {
    if (validas.length === 0) return null;
    let min = Infinity; let max = -Infinity;
    for (const m of validas) { if (m.magnitud < min) min = m.magnitud; if (m.magnitud > max) max = m.magnitud; }
    return { min, max };
  }, [validas]);

  const ejes = useMemo(() => Array.from({ length: malla.gridN }, (_, i) => i * malla.pasoMM), [malla]);

  const matriz = useMemo(() => {
    const z = Array.from({ length: malla.gridN }, () => Array(malla.gridN).fill(null));
    for (const m of validas) {
      if (plano !== 'ALL' && m.zMM !== plano) continue;
      const ix = Math.round(m.xMM / malla.pasoMM);
      const iy = Math.round(m.yMM / malla.pasoMM);
      if (ix < 0 || iy < 0 || ix >= malla.gridN || iy >= malla.gridN) continue;
      const actual = z[iy][ix];
      z[iy][ix] = plano === 'ALL' ? Math.max(actual ?? -Infinity, m.magnitud) : m.magnitud;
    }
    return z;
  }, [validas, plano, malla]);

  const fuente = { family: t.fuenteCuerpo || 'sans-serif', color: t.texto, size: 12 };
  const eje = (titulo) => ({
    title: { text: titulo, font: { ...fuente, color: t.textoSecundario } },
    color: t.textoSecundario, gridcolor: t.rejilla, zerolinecolor: t.bordeFuerte, backgroundcolor: t.lienzo3d, showbackground: true,
  });

  const resumen = rango
    ? `Superficie de |B| ${plano === 'ALL' ? 'máxima entre todas las alturas' : `en el plano Z = ${plano} mm`}; ${validas.length} lecturas; |B| de ${numero(rango.min, 1)} a ${numero(rango.max, 1)} µT.`
    : 'Superficie de |B|: todavía no hay lecturas.';

  return (
    <section className="chart-card" aria-labelledby="titulo-superficie">
      <div className="chart-header">
        <div>
          <h2 id="titulo-superficie" className="chart-title">Superficie de |B| por plano</h2>
          <p className="chart-desc">
            {plano === 'ALL'
              ? 'Huella máxima total: en cada (x, y), el mayor |B| entre todas las alturas medidas.'
              : `Plano Z = ${plano} mm.`} Escala de color fija para toda la sesión.
          </p>
        </div>
        <div className="campo-compacto">
          <label htmlFor="selector-plano" className="etiqueta-campo">Vista</label>
          <select id="selector-plano" name="plano" className="form-select form-select-sm campo-tms"
            value={plano} onChange={e => setPlano(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
            <option value="ALL">Huella máxima total</option>
            {malla.zLevels.map(z => <option key={z} value={z}>Plano Z = {z} mm</option>)}
          </select>
        </div>
      </div>
      <div className="chart-body superficie-cuerpo" role="img" aria-label={resumen}>
        {validas.length < 4 ? (
          <p className="chart-vacio">Construyendo la superficie… (hacen falta al menos 4 lecturas)</p>
        ) : (
          <Plot
            data={[{
              type: 'surface', x: ejes, y: ejes, z: matriz,
              colorscale: escala, cmin: rango.min, cmax: rango.max, cauto: false,
              connectgaps: false,
              colorbar: { title: { text: '|B| (µT)', font: fuente }, tickfont: fuente, outlinecolor: t.borde },
              hovertemplate: 'x %{x} mm<br>y %{y} mm<br>|B| %{z:.3f} µT<extra></extra>',
            }]}
            layout={{
              autosize: true,
              margin: { l: 0, r: 0, b: 0, t: 10 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              font: fuente,
              uirevision: `${sesionId}-${plano}`,   // conserva la cámara entre actualizaciones
              scene: {
                xaxis: eje('X (mm)'), yaxis: eje('Y (mm)'), zaxis: eje('|B| (µT)'),
                camera: { eye: { x: 1.5, y: -1.5, z: 1.1 } },
                aspectmode: 'manual', aspectratio: { x: 1, y: 1, z: 0.6 },
              },
            }}
            config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ['toImage'] }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </section>
  );
});

export default Superficie3D;
