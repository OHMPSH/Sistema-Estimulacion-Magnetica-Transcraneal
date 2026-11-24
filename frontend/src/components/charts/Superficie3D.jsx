/**
 * components/charts/Superficie3D.jsx
 * Sábana 3D: superficie del campo sobre el plano (x, y), con Plotly
 * (variante aprobada plotly.js-gl3d-dist-min, trazo `surface` en WebGL, y
 * el factory de react-plotly.js).
 *
 * Estilo de figura científica (MATLAB / IEEE), pedido del usuario el
 * 2026-11-13:
 *   - tema claro: fondo blanco, planos #F8F9FA con rejilla #CCCCCC,
 *     Arial 11–12 px #111111; tema oscuro: la misma figura sobre negro
 *     (planos #0E1014, rejilla #3A3F47, texto #E6E8EC). Se exporta con
 *     los colores del tema que se ve;
 *   - escala continua y perceptualmente uniforme: Viridis para |B| (≥ 0) y
 *     RdBu, simétrica alrededor de 0, para Bx, By o Bz (con signo);
 *   - sin líneas de contorno sobre la superficie;
 *   - barra de color con la magnitud y su unidad (thickness 16, len 0.75);
 *   - exportación a PNG (escala 3) desde la cámara de la barra de Plotly y
 *     a SVG con un botón aparte. La escena 3D es WebGL: en el SVG va como
 *     imagen dentro del vector; los textos, ejes y la barra de color sí
 *     son vectoriales.
 *
 * Datos: las mismas lecturas que ya recibía ({xMM, yMM, zMM, bx, by, bz,
 * magnitud, saturado}). Matriz z[fila_y][col_x], con null en las celdas
 * sin lectura válida y connectgaps: false: la sábana se construye conforme
 * llegan los puntos, sin interpolar.
 *   - Rango de color FIJO para toda la sesión (todas sus lecturas válidas),
 *     para comparar planos.
 *   - "Huella máxima total": en cada (x, y), el valor de mayor |valor| entre
 *     todas las alturas medidas (para |B|, el máximo).
 *   - Se redibuja como máximo unas 3 veces por segundo.
 *   - uirevision constante: la cámara que deja el usuario no se reinicia
 *     al llegar lecturas. data/layout/config van memorizados (react-plotly
 *     redibuja cada vez que cambia su referencia) y no se actualizan
 *     mientras el usuario arrastra o rueda sobre la figura, para que pueda
 *     girarla a mitad del barrido.
 * Se carga aparte (React.lazy) porque Plotly pesa.
 */
import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-gl3d-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { numero } from '../../utils/formato.js';
import { NOMBRE_EJE } from '../../utils/geometria.js';
import { useConfig } from '../../context/ConfigContext.jsx';

const Plot = createPlotlyComponent(Plotly);
const INTERVALO_MS = 350;

// Estilo de figura por tema. El claro es la figura para la tesis (fondo
// blanco, como en la exportación); el oscuro, la misma figura sobre negro.
const FIGURAS = {
  claro: {
    fuente: 'Arial, Helvetica, sans-serif',
    texto: '#111111',
    fondo: '#FFFFFF',
    plano: '#F8F9FA',
    rejilla: '#CCCCCC',
    linea: '#888888',
    globo: '#FFFFFF',
  },
  oscuro: {
    fuente: 'Arial, Helvetica, sans-serif',
    texto: '#E6E8EC',
    fondo: '#000000',
    plano: '#0E1014',
    rejilla: '#3A3F47',
    linea: '#7A808A',
    globo: '#15181D',
  },
};

// RdBu de ColorBrewer (11 clases): azul = negativo, blanco = 0, rojo = positivo.
// El 'RdBu' de Plotly tiene el centro gris; este es el divergente de referencia.
const RDBU = ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f']
  .map((c, i, a) => [i / (a.length - 1), c]);

/** Magnitudes que se pueden graficar */
const MAGNITUDES = [
  { valor: 'magnitud', etiqueta: '|B| (módulo)', titulo: '|B| [µT]', hover: '|B|', escala: 'Viridis', conSigno: false },
  { valor: 'bz', etiqueta: 'Bz (componente)', titulo: 'B<sub>z</sub> [µT]', hover: 'Bz', escala: RDBU, conSigno: true },
  { valor: 'bx', etiqueta: 'Bx (componente)', titulo: 'B<sub>x</sub> [µT]', hover: 'Bx', escala: RDBU, conSigno: true },
  { valor: 'by', etiqueta: 'By (componente)', titulo: 'B<sub>y</sub> [µT]', hover: 'By', escala: RDBU, conSigno: true },
];

// Icono de la barra de Plotly para "Descargar SVG" (disquete)
const ICONO_SVG = {
  width: 1000, height: 1000,
  path: 'M150 100h600l150 150v650H100V100h50zm100 0v250h450V100H250zm300 40h100v170H550V140zM200 500v350h600V500H200z',
};

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

const Superficie3D = memo(function Superficie3D({ mediciones, malla, enCurso = false, sesionId, titulo = 'Sábana 3D del campo', nivelTitulo = 'h2' }) {
  const ids = useId();
  const Titulo = nivelTitulo;
  const { temaEfectivo } = useConfig();
  const FIGURA = FIGURAS[temaEfectivo === 'claro' ? 'claro' : 'oscuro'];

  // Mientras el usuario gira, mueve o acerca la figura, no le llegan datos
  // nuevos: cada redibujo de Plotly a mitad de un arrastre lo cortaba. Al
  // soltar, se pone al día. La cámara se conserva con uirevision.
  const [interactuando, setInteractuando] = useState(false);
  const congelado = useRef(mediciones);
  if (!interactuando) congelado.current = mediciones;
  const datos = useLimitado(congelado.current, INTERVALO_MS);
  const finRueda = useRef(null);
  useEffect(() => {
    if (!interactuando) return undefined;
    const soltar = () => setInteractuando(false);
    window.addEventListener('pointerup', soltar, true);
    window.addEventListener('pointercancel', soltar, true);
    return () => {
      window.removeEventListener('pointerup', soltar, true);
      window.removeEventListener('pointercancel', soltar, true);
    };
  }, [interactuando]);
  useEffect(() => () => clearTimeout(finRueda.current), []);
  const alRodar = () => {
    setInteractuando(true);
    clearTimeout(finRueda.current);
    finRueda.current = setTimeout(() => setInteractuando(false), 400);
  };
  const [plano, setPlano] = useState('ALL');
  const [clave, setClave] = useState('magnitud');
  const magnitud = MAGNITUDES.find(m => m.valor === clave) ?? MAGNITUDES[0];
  const ultimoZ = datos.length ? datos[datos.length - 1].zMM : null;

  // Al cambiar de sesión vuelve a la huella total
  useEffect(() => { setPlano('ALL'); }, [sesionId]);

  // Si se eligió un plano, durante el barrido sigue al plano del sensor
  useEffect(() => {
    if (enCurso && plano !== 'ALL' && ultimoZ !== null && plano !== ultimoZ) setPlano(ultimoZ);
  }, [enCurso, ultimoZ, plano]);

  const validas = useMemo(
    () => datos.filter(m => !m.saturado && m[clave] !== null && m[clave] !== undefined && Number.isFinite(Number(m[clave]))),
    [datos, clave],
  );

  // Rango de color fijo para toda la sesión; simétrico alrededor de 0 si la magnitud tiene signo
  const rango = useMemo(() => {
    if (validas.length === 0) return null;
    let min = Infinity; let max = -Infinity;
    for (const m of validas) { const v = Number(m[clave]); if (v < min) min = v; if (v > max) max = v; }
    if (magnitud.conSigno) { const a = Math.max(Math.abs(min), Math.abs(max)) || 1; return { min, max, cmin: -a, cmax: a }; }
    return { min, max, cmin: min, cmax: max > min ? max : min + 1 };
  }, [validas, clave, magnitud.conSigno]);

  // El dashboard puede pasar un objeto `malla` nuevo en cada cuadro con los
  // mismos valores: se depende de los números, no del objeto, para no
  // redibujar la figura sin necesidad.
  const { gridNx, gridNy, pasoMM } = malla;
  const zonaX = malla.zona.x;
  const zonaY = malla.zona.y;
  const ejeX = useMemo(() => Array.from({ length: gridNx }, (_, i) => Math.round(i * pasoMM * 10) / 10), [gridNx, pasoMM]);
  const ejeY = useMemo(() => Array.from({ length: gridNy }, (_, i) => Math.round(i * pasoMM * 10) / 10), [gridNy, pasoMM]);

  const matriz = useMemo(() => {
    // z[fila_y][col_x]; null = celda todavía sin lectura válida
    const z = Array.from({ length: gridNy }, () => Array(gridNx).fill(null));
    for (const m of validas) {
      if (plano !== 'ALL' && m.zMM !== plano) continue;
      const ix = Math.round(m.xMM / pasoMM);
      const iy = Math.round(m.yMM / pasoMM);
      if (ix < 0 || iy < 0 || ix >= gridNx || iy >= gridNy) continue;
      const v = Number(m[clave]);
      const actual = z[iy][ix];
      z[iy][ix] = plano !== 'ALL' || actual === null || Math.abs(v) > Math.abs(actual) ? v : actual;
    }
    return z;
  }, [validas, plano, gridNx, gridNy, pasoMM, clave]);

  const archivo = `sabana3d_sesion${sesionId ?? 'actual'}_${clave}${plano === 'ALL' ? '_huella' : `_z${plano}mm`}`;
  const plotConfig = useMemo(() => ({
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { format: 'png', filename: archivo, scale: 3 },
    modeBarButtonsToRemove: ['resetCameraLastSave3d'],
    modeBarButtonsToAdd: [{
      name: 'descargarSVG',
      title: 'Descargar SVG (vectorial)',
      icon: ICONO_SVG,
      click: gd => Plotly.downloadImage(gd, { format: 'svg', filename: archivo }),
    }],
  }), [archivo]);

  // Objetos estables: react-plotly solo llama a Plotly.react si cambian
  const fuente = useMemo(() => ({ family: FIGURA.fuente, color: FIGURA.texto, size: 12 }), [FIGURA]);
  const plotData = useMemo(() => (rango ? [{
    type: 'surface', x: ejeX, y: ejeY, z: matriz,
    colorscale: magnitud.escala,
    cmin: rango.cmin, cmax: rango.cmax, cauto: false,
    connectgaps: false,
    contours: {
      x: { show: false, highlight: false },
      y: { show: false, highlight: false },
      z: { show: false, highlight: false },
    },
    lighting: { ambient: 0.85, diffuse: 0.35, specular: 0.05, roughness: 0.9, fresnel: 0.1 },
    colorbar: {
      title: { text: magnitud.titulo, side: 'right', font: fuente },
      tickfont: { ...fuente, size: 11 },
      thickness: 16, len: 0.75,
      outlinewidth: 1, outlinecolor: FIGURA.linea,
      ticks: 'outside', tickcolor: FIGURA.linea, ticklen: 3,
    },
    hovertemplate: `${NOMBRE_EJE.x} %{x} mm<br>${NOMBRE_EJE.y} %{y} mm<br>${magnitud.hover} %{z:.3f} µT<extra></extra>`,
  }] : []), [ejeX, ejeY, matriz, magnitud, rango, fuente, FIGURA]);

  const plotLayout = useMemo(() => {
    const eje = (texto) => ({
      title: { text: texto, font: fuente },
      tickfont: { ...fuente, size: 11 },
      color: FIGURA.texto,
      showbackground: true, backgroundcolor: FIGURA.plano,
      gridcolor: FIGURA.rejilla, gridwidth: 1,
      zeroline: false,
      showline: true, linecolor: FIGURA.linea, linewidth: 1,
      ticks: 'outside', tickcolor: FIGURA.linea, ticklen: 4,
      showspikes: false,
    });
    return {
      autosize: true,
      margin: { l: 0, r: 0, b: 0, t: 8 },
      paper_bgcolor: FIGURA.fondo,
      plot_bgcolor: FIGURA.fondo,
      font: fuente,
      hoverlabel: { bgcolor: FIGURA.globo, bordercolor: FIGURA.linea, font: { ...fuente, size: 11 } },
      uirevision: 'true',   // la cámara del usuario no se reinicia con cada actualización
      dragmode: 'turntable',
      scene: {
        xaxis: eje(`Posición ${NOMBRE_EJE.x} [mm]`),
        yaxis: eje(`Posición ${NOMBRE_EJE.y} [mm]`),
        zaxis: eje(magnitud.titulo),
        bgcolor: FIGURA.fondo,
        dragmode: 'turntable',
        camera: { eye: { x: 1.5, y: -1.5, z: 1.1 } },
        aspectmode: 'manual',
        // Proporción real de la zona (1 : 1 en la base cuadrada) y 0,7 en el eje vertical
        aspectratio: {
          x: zonaX >= zonaY ? 1 : Math.max(0.2, zonaX / zonaY),
          y: zonaY >= zonaX ? 1 : Math.max(0.2, zonaY / zonaX),
          z: 0.7,
        },
      },
    };
  }, [fuente, FIGURA, magnitud.titulo, zonaX, zonaY]);

  const descripcionVista = plano === 'ALL'
    ? `Huella máxima total: en cada (x, y), el ${magnitud.conSigno ? `${magnitud.hover} de mayor valor absoluto` : 'mayor |B|'} entre todas las alturas medidas.`
    : `Plano Z = ${plano} mm.`;
  const resumen = rango
    ? `Sábana 3D de ${magnitud.hover} ${plano === 'ALL' ? '(huella máxima entre todas las alturas)' : `en el plano Z = ${plano} mm`}; ${validas.length} lecturas; de ${numero(rango.min, 1)} a ${numero(rango.max, 1)} µT.`
    : `Sábana 3D de ${magnitud.hover}: todavía no hay lecturas.`;

  return (
    <section className="chart-card" aria-labelledby={`${ids}-titulo`}>
      <div className="chart-header">
        <div>
          <Titulo id={`${ids}-titulo`} className="chart-title">{titulo}</Titulo>
          <p className="chart-desc">{descripcionVista} Escala de color fija para toda la sesión; las celdas sin medir quedan vacías.</p>
        </div>
        <div className="superficie-controles">
          <div className="campo-compacto">
            <label htmlFor={`${ids}-magnitud`} className="etiqueta-campo">Magnitud</label>
            <select id={`${ids}-magnitud`} name="magnitud" className="form-select form-select-sm campo-tms"
              value={clave} onChange={e => setClave(e.target.value)}>
              {MAGNITUDES.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
            </select>
          </div>
          <div className="campo-compacto">
            <label htmlFor={`${ids}-plano`} className="etiqueta-campo">Vista</label>
            <select id={`${ids}-plano`} name="plano" className="form-select form-select-sm campo-tms"
              value={plano} onChange={e => setPlano(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
              <option value="ALL">Huella máxima total</option>
              {malla.zLevels.map(z => <option key={z} value={z}>Plano Z = {z} mm</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="chart-body superficie-cuerpo" role="img" aria-label={resumen}>
        {validas.length < 4 ? (
          <p className="chart-vacio">Construyendo la superficie… (hacen falta al menos 4 lecturas)</p>
        ) : (
          <div className="superficie-figura" style={{ background: FIGURA.fondo }}
            onPointerDownCapture={() => setInteractuando(true)} onWheelCapture={alRodar}>
            <Plot
              data={plotData}
              layout={plotLayout}
              config={plotConfig}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>
    </section>
  );
});

export default Superficie3D;
