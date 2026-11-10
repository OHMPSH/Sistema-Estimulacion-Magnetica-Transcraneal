/**
 * pages/DashboardPage.jsx
 * Dashboard en vivo: configuración de la medición, indicadores y las
 * cinco vistas de datos (gráfica de líneas, mapa 3D de flechas,
 * superficie de Plotly, tabla y tarjetas KPI).
 *
 * Los datos los da useSesionActiva (en App, para que no se pierdan al
 * cambiar de página). Aquí solo se derivan las vistas.
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../context/ConfigContext.jsx';
import { ControlPanel } from '../components/panels/ControlPanel.jsx';
import { KpiCards } from '../components/ui/KpiCards.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { LineChartComponent } from '../components/charts/LineChart.jsx';
import { Canvas3D } from '../components/charts/Canvas3D.jsx';
import { StartModal } from '../components/modals/StartModal.jsx';
import { StopModal } from '../components/modals/StopModal.jsx';
import { mallaDeZona, leerPaso, leerZona, limitesDeBarrido } from '../utils/geometria.js';
import { LimiteErrores } from '../components/ui/LimiteErrores.jsx';

// Plotly pesa: se carga aparte, cuando hace falta
const Superficie3D = lazy(() => import('../components/charts/Superficie3D.jsx'));

/** Segundos de la sesión: hasta ahora si sigue abierta, o hasta su cierre */
function useSegundos(sesion, enCurso) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!enCurso) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enCurso]);
  if (!sesion?.iniciada_en) return null;
  const fin = enCurso ? ahora : new Date(sesion.terminada_en ?? ahora).getTime();
  return Math.max(0, Math.round((fin - new Date(sesion.iniciada_en).getTime()) / 1000));
}

export function DashboardPage({ usuario, medicion }) {
  const { config, modoOperacion } = useConfig();
  const { sesion, enCurso, mediciones, ultima, iniciando, deteniendo, errorAccion, iniciar, detener } = medicion;
  const puedeControlar = usuario.rol === 'operador' || usuario.rol === 'admin';
  const vis = config?.visualizacion ?? { ventana_grafica: 80, filas_tabla: 60, decimales: 3, escala_superficie: 'Jet', rotacion_auto: true };
  const zona = config?.datos?.zona_horaria;
  const { reducirMovimiento } = useConfig();

  // Parámetros elegidos en la barra (CLAUDE.md 7.0). El paso se escribe
  // en mm (libre); arranca en el predeterminado de la configuración.
  // La zona de muestreo (X × Y × Z) arranca en toda la base y no puede pasar de sus límites.
  const [parametros, setParametros] = useState({ modo: null, pasoTexto: null, medio: 'campo_magnetico', zonaTexto: null });
  const limites = useMemo(() => limitesDeBarrido(config?.barrido), [config?.barrido]);
  const zonaTexto = parametros.zonaTexto ?? { x: String(limites.x), y: String(limites.y), z: String(limites.z) };
  const zonaLeida = useMemo(() => leerZona(zonaTexto, limites), [zonaTexto, limites]);
  const zonaElegida = zonaLeida.valor ?? limites;
  const pasoPredeterminado = config?.barrido?.paso_predeterminado_mm ?? 5;
  const pasoTexto = parametros.pasoTexto ?? String(pasoPredeterminado);
  const pasoLeido = useMemo(() => leerPaso(pasoTexto, zonaElegida), [pasoTexto, zonaElegida]);
  const elegidos = {
    ...parametros, pasoTexto, pasoMM: pasoLeido.valor ?? pasoPredeterminado, errorPaso: pasoLeido.error,
    zonaTexto, zona: zonaElegida, erroresZona: zonaLeida.errores, limites,
  };
  const cambiarParametros = useCallback(c => setParametros(p => ({ ...p, ...c })), []);
  const mallaElegida = useMemo(() => mallaDeZona(zonaElegida, elegidos.pasoMM), [zonaElegida, elegidos.pasoMM]);

  // Malla de la sesión que se muestra (o la elegida si no hay ninguna)
  const malla = useMemo(() => {
    if (!sesion) return mallaElegida;
    const m = mallaDeZona(sesion.zona_mm ?? limites, sesion.paso_mm);
    return { ...m, zLevels: sesion.z_levels_mm ?? m.zLevels, totalPuntos: sesion.puntos_esperados ?? m.totalPuntos };
  }, [sesion, limites, mallaElegida]);

  const segundos = useSegundos(sesion, enCurso);
  const recibidas = mediciones.length;
  const total = malla.totalPuntos;
  const progreso = Math.min(100, Math.round((recibidas / total) * 100)) || 0;
  const zActual = ultima?.zMM ?? null;

  const estado = enCurso ? 'adquiriendo'
    : !sesion ? 'inactiva'
      : (sesion.motivo === 'completa' || recibidas >= total ? 'terminada' : 'detenida');

  const etiquetaEstado = useMemo(() => {
    if (estado === 'inactiva') return 'Sin medición en curso';
    if (estado === 'terminada') return `Barrido terminado (sesión ${sesion.id})`;
    if (estado === 'detenida') return `Detenido (sesión ${sesion.id})`;
    const porPlano = malla.gridNx * malla.gridNy;
    const enPlano = zActual === null ? 0 : mediciones.filter(m => m.zMM === zActual).length;
    return zActual === null ? `Sesión ${sesion.id}: esperando la primera lectura`
      : `Midiendo el plano Z = ${zActual} mm (${Math.min(100, Math.round((enPlano / porPlano) * 100))} % del plano)`;
  }, [estado, sesion, malla, zActual, mediciones]);

  const refInicio = useRef(null);
  const refDetener = useRef(null);

  return (
    <>
      <h1 className="titulo-pagina">Dashboard en vivo</h1>

      <ControlPanel
        enCurso={enCurso} iniciando={iniciando} deteniendo={deteniendo}
        parametros={elegidos} onCambiarParametros={cambiarParametros} sesion={sesion} mallaElegida={mallaElegida}
        recibidas={recibidas} totalPuntos={total} zActualMM={zActual}
        progreso={progreso} etiquetaEstado={etiquetaEstado}
        onIniciar={() => refInicio.current?.abrir()} onDetener={() => refDetener.current?.abrir()}
        errorAccion={errorAccion} puedeControlar={puedeControlar}
      />

      <h2 className="section-label">Indicadores</h2>
      <KpiCards estado={estado} segundos={segundos} ultima={ultima} zLevels={malla.zLevels}
        decimales={vis.decimales} zona={malla.zona} />

      <h2 className="section-label">Visualización del campo</h2>
      <div className="rejilla-graficas">
        <div className="celda-ancha">
          <LineChartComponent mediciones={mediciones} malla={malla} ventana={vis.ventana_grafica} decimales={vis.decimales} />
        </div>
        <LimiteErrores nombre="Mapa 3D de flechas">
          <Canvas3D mediciones={mediciones} zLevels={malla.zLevels} zona={malla.zona}
            sesionId={sesion?.id ?? null} rotacionAuto={vis.rotacion_auto} reducirMovimiento={reducirMovimiento} />
        </LimiteErrores>
        <LimiteErrores nombre="Superficie de |B|">
          <Suspense fallback={<section className="chart-card"><p className="chart-vacio">Cargando la superficie…</p></section>}>
            <Superficie3D mediciones={mediciones} malla={malla} enCurso={enCurso}
              escala={vis.escala_superficie} decimales={vis.decimales} sesionId={sesion?.id ?? null} />
          </Suspense>
        </LimiteErrores>
      </div>

      <h2 className="section-label">Registro de mediciones</h2>
      <DataTable mediciones={mediciones} filas={vis.filas_tabla} decimales={vis.decimales} zona={zona} />

      {puedeControlar && (
        <>
          <StartModal ref={refInicio} parametros={{ modo: elegidos.modo, pasoMM: elegidos.pasoMM, medio: elegidos.medio, zona: elegidos.zona }} geometria={mallaElegida}
            modoOperacion={modoOperacion} onConfirm={iniciar} />
          <StopModal ref={refDetener} recibidas={recibidas} totalPuntos={total}
            zActualMM={zActual} segundos={segundos} onConfirm={detener} />
        </>
      )}
    </>
  );
}
