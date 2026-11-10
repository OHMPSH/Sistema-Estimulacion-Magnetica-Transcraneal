/**
 * App.jsx — Componente raíz
 * Decide qué pantalla mostrar según la sesión del usuario:
 *   sin usuario                → LoginPage
 *   debe_cambiar_password      → CambiarPasswordPage
 *   con sesión                 → Dashboard (el de siempre)
 * El Dashboard solo se monta con sesión, así el SSE y las peticiones
 * a la API nunca salen sin la cookie.
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
import { useAuth }            from './context/AuthContext.jsx';
import { LoginPage }          from './pages/LoginPage.jsx';
import { CambiarPasswordPage } from './pages/CambiarPasswordPage.jsx';
import { mallaDePaso }        from './utils/geometria.js';

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div className="app-cargando" role="status">Verificando sesión…</div>;
  }
  if (!usuario) return <LoginPage />;
  if (usuario.debe_cambiar_password) return <CambiarPasswordPage />;
  return <Dashboard />;
}

function Dashboard() {
  const { usuario, cerrarSesion } = useAuth();
  // Permisos por rol (el servidor los aplica de todos modos; aquí solo se ocultan botones)
  const puedeControlar = usuario.rol === 'operador' || usuario.rol === 'admin';
  const puedeEliminar  = usuario.rol === 'admin';

  // Página activa: 'dashboard' o 'historial'
  const [activePage, setActivePage] = useState('dashboard');

  const { online } = useServerStatus();

  const {
    configuracion, modoOperacion, sesionActiva, geometria,
    isActive, iniciando, deteniendo, errorAccion,
    totalScanned, currentZIdx, currentPos,
    elapsedSec, progressPct, scanLabel,
    chartLabels, chartBx, chartBy, chartBz,
    tableRows, points3D, sessions,
    startAcquisition, stopAcquisition, deleteSession, recargarHistorial,
    cambiarModoOperacion,
  } = useAcquisition();

  // Parámetros elegidos en la barra de configuración de la medición (CLAUDE.md 7.0).
  // El paso arranca en el predeterminado de la configuración.
  const [parametros, setParametros] = useState({ modo: null, pasoMM: null, medio: 'campo_magnetico' });
  const pasoPredeterminado = configuracion?.data?.barrido?.paso_predeterminado_mm ?? 5;
  const parametrosEfectivos = { ...parametros, pasoMM: parametros.pasoMM ?? pasoPredeterminado };
  const geometriaElegida = mallaDePaso(configuracion?.data?.barrido, parametrosEfectivos.pasoMM);
  const cambiarParametros = useCallback(cambio => setParametros(p => ({ ...p, ...cambio })), []);

  // Último valor de magnitud para el KPI
  const lastRow        = tableRows[0] ?? null;
  const magnitudeValue = lastRow ? lastRow.magnitud.toFixed(4) : null;
  const lastTimestamp  = lastRow ? lastRow.tsStr : null;

  const handleStartClick   = useCallback(() => window.__startModalShow?.(), []);
  const handleStartConfirm = useCallback(p => startAcquisition(p), [startAcquisition]);
  const handleStopRequest  = useCallback(() => window.__stopModalShow?.(), []);
  const handleStopConfirm  = useCallback(() => stopAcquisition(), [stopAcquisition]);

  return (
    <>
      <Navbar online={online} activePage={activePage} onPageChange={setActivePage}
        usuario={usuario} onLogout={cerrarSesion}
        modoOperacion={modoOperacion} onCambiarModo={cambiarModoOperacion}
        puedeCambiarModo={usuario.rol === 'admin'} sesionAbierta={isActive} />

      <div className="main-container">

        {/* ─── DASHBOARD EN VIVO ─────────────────────────── */}
        {activePage === 'dashboard' && (
          <>
            <ControlPanel
              isActive={isActive} iniciando={iniciando} deteniendo={deteniendo}
              parametros={parametrosEfectivos} onCambiarParametros={cambiarParametros}
              sesionActiva={sesionActiva}
              totalScanned={totalScanned} totalPuntos={isActive ? geometria.totalPuntos : (totalScanned > 0 ? geometria.totalPuntos : geometriaElegida.totalPuntos)}
              currentZIdx={currentZIdx} zLevels={geometria.zLevels}
              progressPct={progressPct} scanLabel={scanLabel}
              onStart={handleStartClick}
              onRequestStop={handleStopRequest}
              errorAccion={errorAccion}
              puedeControlar={puedeControlar}
            />

            <p className="section-label"><span>//</span> INDICADORES EN TIEMPO REAL</p>
            <KpiCards
              isActive={isActive} currentZIdx={currentZIdx} zLevels={geometria.zLevels}
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
                <Canvas3D points3D={points3D} zLevels={geometria.zLevels} gridSizeMM={geometria.gridSizeMM} />
              </div>
              
              <div className="col-12 col-xl-6 fade-in">
                {/* Nuevo visor topográfico por planos Z */}
                <Superficie3D mediciones={points3D} totalPuntos={geometria.totalPuntos} />
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
            barrido={configuracion?.data?.barrido}
            onDelete={deleteSession}
            onRecargar={recargarHistorial}
            puedeEliminar={puedeEliminar}
          />
        )}

      </div>

      <footer className="tms-footer">
        <span>TMS DATA ACQUISITION SYSTEM</span> · Instituto Politécnico Nacional ·
        Tesis de Ingeniería · {new Date().getFullYear()}
      </footer>

      {puedeControlar && (
        <>
          <StartModal parametros={parametrosEfectivos} geometria={geometriaElegida}
            modoOperacion={modoOperacion} onConfirm={handleStartConfirm} />
          <StopModal totalScanned={totalScanned} totalPuntos={geometria.totalPuntos}
            currentZIdx={currentZIdx} zLevels={geometria.zLevels}
            elapsedSec={elapsedSec} onConfirm={handleStopConfirm} />
        </>
      )}
    </>
  );
}
