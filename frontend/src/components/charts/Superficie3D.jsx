import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';

const Superficie3D = React.memo(({ mediciones, totalPuntos = 845 }) => {
  const zLevels = useMemo(() => {
    if (!mediciones) return [];
    return [...new Set(mediciones.map(m => m.z_mm || m.zMM))].sort((a, b) => a - b);
  }, [mediciones?.length]);

  // Iniciamos por defecto en el modo sumativo total
  const [planoActivo, setPlanoActivo] = useState('ALL');

  // ─────────────────────────────────────────────────────────
  // LÓGICA DE AUTO-SEGUIMIENTO CORREGIDA
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mediciones || mediciones.length === 0) return;

    const cantidad = mediciones.length;
    const ultimoPunto = mediciones[cantidad - 1];
    const ultimoZ = ultimoPunto.z_mm !== undefined ? ultimoPunto.z_mm : ultimoPunto.zMM;

    setPlanoActivo((prevPlano) => {
      // 1. Si termina el barrido completo (todos los puntos de la malla), forzar a ver el Total
      if (cantidad >= totalPuntos) {
        return 'ALL';
      } 
      
      // 2. Durante el escaneo:
      if (ultimoZ !== undefined) {
        // ¡LA MAGIA AQUÍ! Si elegiste "ALL", la gráfica se queda en "ALL" sumando en tiempo real
        if (prevPlano === 'ALL') {
          return 'ALL';
        }
        // Si tienes seleccionada una capa, obligamos a la gráfica a seguir al sensor
        if (prevPlano !== ultimoZ) {
          return ultimoZ;
        }
      }
      return prevPlano;
    });
  }, [mediciones.length, totalPuntos]); 

  // ─────────────────────────────────────────────────────────

  if (!mediciones || mediciones.length < 4) {
    return <div style={{ color: '#fff', padding: '20px' }}>Construyendo malla topográfica...</div>;
  }

  const xValues = [...new Set(mediciones.map(m => m.x_mm || m.xMM))].sort((a, b) => a - b);
  const yValues = [...new Set(mediciones.map(m => m.y_mm || m.yMM))].sort((a, b) => a - b);

  const zMatrix = Array(yValues.length).fill(null).map(() => Array(xValues.length).fill(null));

  if (planoActivo === 'ALL') {
    // MODO SUMATIVO: Se queda calculando la huella máxima de todas las mediciones entrantes
    mediciones.forEach(m => {
      const xIdx = xValues.indexOf(m.x_mm || m.xMM);
      const yIdx = yValues.indexOf(m.y_mm || m.yMM);
      if (xIdx !== -1 && yIdx !== -1) {
        const currentVal = zMatrix[yIdx][xIdx] || 0;
        if (m.magnitud > currentVal) {
          zMatrix[yIdx][xIdx] = m.magnitud;
        }
      }
    });
  } else {
    // MODO SECUENCIAL: Solo procesa la capa Z en la que va el hardware
    const puntosPlano = mediciones.filter(m => (m.z_mm || m.zMM) === Number(planoActivo));
    puntosPlano.forEach(m => {
      const xIdx = xValues.indexOf(m.x_mm || m.xMM);
      const yIdx = yValues.indexOf(m.y_mm || m.yMM);
      if (xIdx !== -1 && yIdx !== -1) {
        zMatrix[yIdx][xIdx] = m.magnitud;
      }
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100, background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px', border: '1px solid #c0233f' }}>
        <label style={{ color: '#fff', marginRight: '10px', fontSize: '13px', fontWeight: 'bold' }}>VISTA:</label>
        <select 
          value={planoActivo} 
          onChange={(e) => setPlanoActivo(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          style={{ background: '#222', color: '#00ffaa', border: 'none', outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL">Huella Máxima Total</option>
          {zLevels.map(z => (
            <option key={z} value={z}>Capa individual: Z={z} mm</option>
          ))}
        </select>
      </div>

      <Plot
        data={[{
          z: zMatrix,
          x: xValues,
          y: yValues,
          type: 'surface',
          colorscale: 'Jet',
          colorbar: { title: '|B| (μT)', tickfont: { color: '#fff' }, titlefont: { color: '#fff' } }
        }]}
        layout={{
          autosize: true,
          margin: { l: 0, r: 0, b: 0, t: 30 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#ffffff' },
          scene: {
            xaxis: { title: 'Eje X (mm)', color: '#00e5ff' },
            yaxis: { title: 'Eje Y (mm)', color: '#ff00ff' },
            zaxis: { title: 'Magnitud |B|', color: '#00ffaa' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
          }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

export default Superficie3D;