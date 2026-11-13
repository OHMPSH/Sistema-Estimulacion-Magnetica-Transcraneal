/**
 * components/charts/LineChart.jsx
 * Componentes Bx, By y Bz a lo largo del barrido (Chart.js).
 *
 * - El eje X es la POSICIÓN en el barrido (índice del punto en la malla,
 *   en el orden en serpentina de la Pico y del simulador), no la hora:
 *   cada punto es otra posición.
 * - Un punto de la malla sin lectura (hueco) o un eje saturado se dibuja
 *   como null, y con spanGaps: false la línea se corta ahí.
 * - Sin suavizado (tension 0) y con puntos pequeños visibles.
 * - La ventana (cuántas lecturas) sale de visualizacion.ventana_grafica.
 * - Los colores salen del tema actual (useTokensTema).
 * - Alternativa accesible: resumen en aria-label y una tabla oculta con
 *   las últimas lecturas.
 */
import React, { memo, useMemo } from 'react';
import {
  Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTokensTema } from '../../hooks/useTokensTema.js';
import { indiceEnMalla } from '../../utils/geometria.js';
import { numero } from '../../utils/formato.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

const COMPONENTES = [['bx', 'Bx'], ['by', 'By'], ['bz', 'Bz']];

export const LineChartComponent = memo(function LineChartComponent({ mediciones, malla, ventana, decimales }) {
  const t = useTokensTema();

  // Últimas `ventana` lecturas, con null en las posiciones de la malla que faltan
  const puntos = useMemo(() => {
    const ultimas = mediciones.slice(-ventana).map(m => ({ ...m, i: indiceEnMalla(malla, m.xMM, m.yMM, m.zMM) }))
      .filter(m => m.i !== null);
    if (ultimas.length === 0) return [];
    const porIndice = new Map();
    for (const m of ultimas) porIndice.set(m.i, m);   // si hay varias en un punto, la última
    const desde = Math.min(...porIndice.keys());
    const hasta = Math.max(...porIndice.keys());
    const lista = [];
    for (let i = desde; i <= hasta; i++) lista.push(porIndice.get(i) ?? { i, hueco: true });
    return lista;
  }, [mediciones, malla, ventana]);

  const data = useMemo(() => ({
    datasets: COMPONENTES.map(([clave, etiqueta]) => ({
      label: etiqueta,
      data: puntos.map(p => ({ x: p.i, y: p.hueco ? null : p[clave] ?? null })),
      borderColor: t[clave],
      backgroundColor: t[clave],
      borderWidth: 1.6,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0,
      spanGaps: false,
    })),
  }), [puntos, t]);

  const opciones = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.tarjeta, titleColor: t.texto, bodyColor: t.texto,
        borderColor: t.bordeFuerte, borderWidth: 1, padding: 10,
        callbacks: {
          title: (items) => {
            const p = puntos[items[0]?.dataIndex];
            if (!p) return '';
            return p.hueco ? `Punto ${p.i}: sin lectura (hueco)` : `Punto ${p.i} · (${p.xMM}, ${p.yMM}, ${p.zMM}) mm${p.seq ? ` · seq ${p.seq}` : ''}`;
          },
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y === null ? 'sin dato' : `${numero(ctx.parsed.y, decimales)} µT`}`,
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Posición en el barrido (número de punto de la malla)', color: t.textoSecundario },
        ticks: { color: t.textoSecundario, precision: 0, maxTicksLimit: 10 },
        grid: { color: t.rejilla },
      },
      y: {
        title: { display: true, text: 'Campo (µT)', color: t.textoSecundario },
        ticks: { color: t.textoSecundario, callback: v => numero(v, 1) },
        grid: { color: t.rejilla },
      },
    },
  }), [t, puntos, decimales]);

  const conDatos = puntos.filter(p => !p.hueco);
  const resumen = conDatos.length === 0
    ? 'Gráfica de Bx, By y Bz: todavía no hay lecturas.'
    : `Gráfica de Bx, By y Bz de las últimas ${conDatos.length} lecturas, puntos ${puntos[0].i} a ${puntos[puntos.length - 1].i} del barrido; `
      + COMPONENTES.map(([c, e]) => {
        const v = conDatos.map(p => p[c]).filter(x => x !== null && x !== undefined);
        return v.length ? `${e} de ${numero(Math.min(...v), 1)} a ${numero(Math.max(...v), 1)} µT` : `${e} sin datos`;
      }).join(', ') + '.';

  return (
    <section className="chart-card chart-lineas" aria-labelledby="titulo-lineas">
      <div className="chart-header">
        <div>
          <h2 id="titulo-lineas" className="chart-title">Componentes Bx · By · Bz a lo largo del barrido</h2>
          <p className="chart-desc">Cada punto es otra posición de la malla; los cortes son huecos o ejes saturados. Últimas {ventana} lecturas.</p>
        </div>
        <ul className="legend-inline" aria-label="Leyenda">
          {COMPONENTES.map(([c, e]) => (
            <li key={c} className="legend-item"><span className={`legend-dot fondo-${c}`} aria-hidden="true" /> {e}</li>
          ))}
        </ul>
      </div>
      <div className="chart-body" role="img" aria-label={resumen}>
        <Line data={data} options={opciones} />
      </div>
      <table className="visually-hidden">
        <caption>Últimas lecturas de la gráfica de componentes</caption>
        <thead><tr><th scope="col">Punto</th><th scope="col">Bx (µT)</th><th scope="col">By (µT)</th><th scope="col">Bz (µT)</th></tr></thead>
        <tbody>
          {conDatos.slice(-10).map(p => (
            <tr key={`${p.i}-${p.seq}`}><td>{p.i}</td><td>{numero(p.bx, decimales)}</td><td>{numero(p.by, decimales)}</td><td>{numero(p.bz, decimales)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
});
