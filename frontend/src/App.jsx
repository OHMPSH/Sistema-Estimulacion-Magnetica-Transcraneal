/**
 * App.jsx — Componente raíz
 * Orquesta el estado global y ensambla todas las vistas.
 */
import React, { useState, useCallback } from 'react';
import { useServerStatus }    from './hooks/useServerStatus.js';
import { useAcquisition }     from './hooks/useAcquisition.js';
import { Navbar }             from './components/ui/Navbar.jsx';
import { KpiCards }           from './components/ui/KpiCards.jsx';
import { DataTable }          from './components/ui/DataTable.jsx';
import { ControlPanel }       from './components/panels/ControlPanel.jsx';
import { HistorialPage }      from './components/panels/HistorialPage.jsx';
import { LineChartComponent } from './components/charts/LineChart.jsx';
import { Canvas3D }           from './components/charts/Canvas3D.jsx';
import Superficie3D           from './components/charts/Superficie3D.jsx'; 
import { StopModal }          from './components/modals/StopModal.jsx';
import { StartModal }         from './components/modals/StartModal.jsx';

export default function App() {
  // Página activa: 'dashboard' o 'historial'
  const [activePage,   setActivePage]   = useState('dashboard');
  const [selectedMode, setSelectedMode] = useState(null);

  const { online } = useServerStatus();

  const {
    isActive, totalScanned, currentZIdx, currentPos,
    elapsedSec, progressPct, scanLabel,
    chartLabels, chartBx, chartBy, chartBz,
    tableRows, points3D, sessions,
    startAcquisition, stopAcquisition, deleteSession, recargarHistorial,
  } = useAcquisition();

  // Último valor de magnitud para el KPI
  const lastRow        = tableRows[0] ?? null;
  const magnitudeValue = lastRow ? lastRow.magnitud.toFixed(4) : null;
  const lastTimestamp  = lastRow ? lastRow.tsStr : null;

  const handleSelectMode   = useCallback(m => setSelectedMode(m), []);
  const handleStartClick   = useCallback(() => window.__startModalShow?.(), []);
  const handleStartConfirm = useCallback(m => { setSelectedMode(m); startAcquisition(m); }, [startAcquisition]);
  const handleStopRequest  = useCallback(() => window.__stopModalShow?.(), []);
  const handleStopConfirm  = useCallback(() => stopAcquisition(), [stopAcquisition]);

  return (
    <>
      <Navbar online={online} activePage={activePage} onPageChange={setActivePage} />

      <div className="main-container">

        {/* ─── DASHBOARD EN VIVO ─────────────────────────── */}
        {activePage === 'dashboard' && (
          <>
            <ControlPanel
              isActive={isActive} selectedMode={selectedMode}
              totalScanned={totalScanned} currentZIdx={currentZIdx}
              progressPct={progressPct} scanLabel={scanLabel}
              onSelectMode={handleSelectMode}
              onStart={handleStartClick}
              onRequestStop={handleStopRequest}
            />

            <p className="section-label"><span>//</span> INDICADORES EN TIEMPO REAL</p>
            <KpiCards
              isActive={isActive} currentZIdx={currentZIdx}
              currentPos={currentPos} magnitudeValue={magnitudeValue}
              lastTimestamp={lastTimestamp} elapsedSec={elapsedSec}
              totalScanned={totalScanned}
            />

<p className="section-label"><span>//</span> VISUALIZACIÓN DE CAMPO</p>
            
            {/* Gráfica de vectores a lo largo de toda la pantalla arriba */}
            <div className="row mb-4">
              <div className="col-12 fade-in">
                <LineChartComponent labels={chartLabels} bx={chartBx} by={chartBy} bz={chartBz} />
              </div>
            </div>

            {/* Los dos visores 3D dividiendo el espacio abajo */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-xl-6 fade-in">
                 {/* Visor antiguo de flechas vectoriales */}
                <Canvas3D points3D={points3D} />
              </div>
              
              <div className="col-12 col-xl-6 fade-in">
                {/* Nuevo visor topográfico por planos Z */}
                <Superficie3D mediciones={points3D} />
              </div>
            </div>

            <p className="section-label"><span>//</span> REGISTRO DE MEDICIONES</p>
            <DataTable rows={tableRows} />
          </>
        )}

        {/* ─── MEDICIONES PASADAS ────────────────────────── */}
        {activePage === 'historial' && (
          <HistorialPage
            sessions={sessions}
            onDelete={deleteSession}
            onRecargar={recargarHistorial}
          />
        )}

      </div>

      <footer className="tms-footer">
        <span>TMS DATA ACQUISITION SYSTEM</span> · Instituto Politécnico Nacional ·
        Tesis de Ingeniería · {new Date().getFullYear()}
      </footer>

      <StartModal onConfirm={handleStartConfirm} />
      <StopModal totalScanned={totalScanned} currentZIdx={currentZIdx}
        elapsedSec={elapsedSec} onConfirm={handleStopConfirm} />
    </>
  );
}
