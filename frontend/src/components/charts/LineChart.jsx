/**
 * components/charts/LineChart.jsx
 * Gráfica de líneas en tiempo real: Bx, By, Bz.
 * Usa react-chartjs-2 + Chart.js registrado manualmente
 * para mantener el bundle compacto (solo los módulos necesarios).
 */
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { COLOR_BX, COLOR_BY, COLOR_BZ } from '../../constants/system.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

// Aplicar defaults de modo oscuro una sola vez
ChartJS.defaults.color       = '#8a8fa8';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.07)';
ChartJS.defaults.font.family = "'Share Tech Mono', monospace";
ChartJS.defaults.font.size   = 11;

const alpha = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const OPTIONS = {
  responsive:           true,
  maintainAspectRatio:  false,
  animation:            { duration: 0 },
  interaction:          { mode: 'index', intersect: false },
  plugins: {
    legend:  { display: false },
    tooltip: {
      backgroundColor: '#1a1a20',
      borderColor:     'rgba(255,255,255,0.1)',
      borderWidth:     1,
      padding:         10,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)} μT`,
      },
    },
  },
  scales: {
    x: {
      ticks: { maxTicksLimit: 8, maxRotation: 0 },
      grid:  { color: 'rgba(255,255,255,0.07)' },
    },
    y: {
      title: { display: true, text: 'μT', color: '#505568' },
      grid:  { color: 'rgba(255,255,255,0.07)' },
      ticks: { callback: (v) => v.toFixed(1) },
    },
  },
};

export function LineChartComponent({ labels, bx, by, bz }) {
  // Memoizar para evitar reconstruir el objeto en cada render
  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label:           'Bx',
        data:            bx,
        borderColor:     COLOR_BX,
        backgroundColor: alpha(COLOR_BX, 0.07),
        borderWidth:     1.8,
        pointRadius:     0,
        tension:         0.35,
        fill:            true,
      },
      {
        label:           'By',
        data:            by,
        borderColor:     COLOR_BY,
        backgroundColor: alpha(COLOR_BY, 0.05),
        borderWidth:     1.8,
        pointRadius:     0,
        tension:         0.35,
        fill:            true,
      },
      {
        label:           'Bz',
        data:            bz,
        borderColor:     COLOR_BZ,
        backgroundColor: alpha(COLOR_BZ, 0.05),
        borderWidth:     1.8,
        pointRadius:     0,
        tension:         0.35,
        fill:            true,
      },
    ],
  }), [labels, bx, by, bz]);

  return (
    <div className="chart-card" style={{ minHeight: 340 }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Componentes Vectoriales Bx · By · Bz</div>
          <div className="chart-desc">Stream en tiempo real — últimas 80 muestras</div>
        </div>
        <div className="legend-inline">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLOR_BX }} /> Bx
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLOR_BY }} /> By
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: COLOR_BZ }} /> Bz
          </div>
        </div>
      </div>
      <div className="chart-body">
        <Line data={data} options={OPTIONS} />
      </div>
    </div>
  );
}
