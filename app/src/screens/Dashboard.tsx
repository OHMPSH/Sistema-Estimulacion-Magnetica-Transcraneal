/**
 * Dashboard en vivo (equivale a DashboardPage.jsx de la web): configuración de la medición, indicadores y las
 * vistas de datos (gráfica de líneas, mapa 3D de puntos medidos, sábana 3D y tabla de lecturas).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { colorPlano, FUENTES, mezcla, useReducirMovimiento, useStyles, useTheme } from '../theme';
import { useMedicion, useTms, Medicion } from '../store';
import { Badge, Boton, Campo, Degradado, EtiquetaCampo, GrupoOpciones, Icono, ModalTms, OpcionBoton } from '../ui';
import { LineChart } from '../charts/LineChart';
import { Mapa3D } from '../charts/Mapa3D';
import { Sabana3D } from '../charts/Sabana3D';
import { Estimado, useCongelado, useLento, useTiempoEstimado } from '../hooks';
import * as U from '../util';

type Vistas = 'linea' | 'mapa' | 'sabana' | 'tabla';
const VIS = { ventana_grafica: 80, filas_tabla: 60, decimales: 3, rotacion_auto: true };
const PASO_RAPIDO_MM = 5;
const NB = ' ';

function useSegundos(sesion: any, enCurso: boolean) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { if (!enCurso) return; const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, [enCurso]);
  if (!sesion?.iniciada_en) return null;
  const fin = enCurso ? ahora : new Date(sesion.terminada_en ?? ahora).getTime();
  return Math.max(0, Math.round((fin - new Date(sesion.iniciada_en).getTime()) / 1000));
}

// ── Panel de control ──
function TiempoEstimado({ estimado, enCurso, zonaHoraria }: { estimado: Estimado | null; enCurso: boolean; zonaHoraria?: string }) {
  const s = useStyles(); const t = useTheme();
  if (!estimado) return null;
  const ritmo = `${U.numero(estimado.sPorLectura, 2).replace(/0+$/, '').replace(/\.$/, '')}${NB}s por punto`;
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      <Icono nombre="hourglass-split" tam={13} color={t.text2} style={{ marginTop: 3 }} />
      <Text style={[s.txt, { fontSize: 13, flex: 1, lineHeight: 19 }]}>
        {!enCurso
          ? <>Duración estimada del barrido elegido: <Text style={s.cifra}>≈ {U.tiempoAproximado(estimado.restanteS)}</Text></>
          : estimado.restanteS < 1 ? 'Terminando…'
            : <>Tiempo restante: <Text style={s.cifra}>≈ {U.tiempoAproximado(estimado.restanteS)}</Text>, termina hacia las <Text style={s.cifra}>{U.horaCorta(estimado.fin ?? new Date(), zonaHoraria)}</Text></>}
        <Text style={{ color: t.text2 }}> ({ritmo}, {estimado.fuente})</Text>
      </Text>
    </View>
  );
}

function ControlPanel(p: {
  enCurso: boolean; iniciando: boolean; deteniendo: boolean; sesion: any; puede: boolean; errorAccion: string;
  modo: string | null; medio: string; onModo: (m: string) => void; onMedio: (m: string) => void;
  zonaTexto: Record<string, string>; erroresZona: Record<string, string>; limites: U.Zona; onZona: (z: Record<string, string>) => void;
  pasoTexto: string; pasoMM: number; errorPaso: string; mallaElegida: U.Malla; onPaso: (t: string) => void;
  recibidas: number; total: number; zActual: number | null; progreso: number; etiquetaEstado: string; estimado: Estimado | null; zonaHoraria?: string;
  onIniciar: () => void; onDetener: () => void;
}) {
  const s = useStyles(); const t = useTheme();
  const ses = p.enCurso && p.sesion ? p.sesion : null;
  const bloqueado = p.enCurso || p.iniciando || !p.puede;
  const zona = ses ? { x: String(ses.zona_mm?.x ?? ''), y: String(ses.zona_mm?.y ?? ''), z: String(ses.zona_mm?.z ?? '') } : p.zonaTexto;
  const errZ = ses ? {} : p.erroresZona;
  const malla = ses ? { gridNx: ses.grid_nx ?? 0, gridNy: ses.grid_ny ?? 0, zLevels: ses.z_levels_mm ?? [], totalPuntos: ses.puntos_esperados ?? 0 } : p.mallaElegida;
  const errPaso = ses ? '' : p.errorPaso;
  const pasoVal = ses ? Number(ses.paso_mm) : p.pasoMM;
  const hayErrorZona = Object.keys(errZ).length > 0;
  return (
    <View style={s.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icono nombre="sliders2" tam={17} color={t.guindaBright} />
        <Text accessibilityRole="header" style={s.panelTitulo}>Configuración de la medición</Text>
      </View>
      {ses && <Text style={[s.sec, { fontSize: 13, marginTop: 4 }]}>Sesión {ses.id}: {U.etiquetaModo(ses.modo)} · {U.etiquetaZona(ses.zona_mm)} · paso {U.etiquetaPaso(ses.paso_mm)} · {U.etiquetaMedio(ses.medio)}{ses.iniciada_por ? ` · ${ses.iniciada_por}` : ''}</Text>}

      <View style={{ gap: 16, marginTop: 14 }}>
        <GrupoOpciones leyenda="Velocidad" icono="speedometer2" opciones={U.MODOS} valor={ses ? ses.modo : p.modo} onCambio={p.onModo} deshabilitado={bloqueado} />

        <View>
          <EtiquetaCampo texto="Zona de muestreo" icono="bounding-box" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['x', 'y', 'z'] as const).map(e => (
              <Campo key={e} contenedor={{ width: 108 }} prefijo={e.toUpperCase()} sufijo="mm" keyboardType="decimal-pad" editable={!bloqueado}
                accessibilityLabel={`Zona en ${e.toUpperCase()} (mm)`} value={zona[e]} onChangeText={v => p.onZona({ ...p.zonaTexto, [e]: v })} error={errZ[e] ? ' ' : undefined} />
            ))}
            <OpcionBoton etiqueta="Toda la base" activa={false} deshabilitado={bloqueado}
              onPress={() => p.onZona({ x: String(p.limites.x), y: String(p.limites.y), z: String(p.limites.z) })} />
          </View>
          {hayErrorZona
            ? (['x', 'y', 'z'] as const).filter(e => errZ[e]).map(e => <Text key={e} style={[s.error, { fontSize: 12 }]}>{e.toUpperCase()}: {errZ[e]}</Text>)
            : <Text style={[s.ayuda, { fontSize: 12 }]}>Límites de la base: {U.etiquetaZona(p.limites)}</Text>}
        </View>

        <View>
          <EtiquetaCampo texto="Paso (X, Y y Z)" icono="grid-3x3" />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Campo contenedor={{ width: 104 }} sufijo="mm" keyboardType="decimal-pad" editable={!bloqueado} accessibilityLabel="Paso en milímetros"
              value={ses ? String(ses.paso_mm) : p.pasoTexto} onChangeText={p.onPaso} error={errPaso ? ' ' : undefined} />
            <OpcionBoton etiqueta={U.etiquetaPaso(PASO_RAPIDO_MM)} activa={pasoVal === PASO_RAPIDO_MM && !errPaso} deshabilitado={bloqueado} onPress={() => p.onPaso(String(PASO_RAPIDO_MM))} />
          </View>
          {errPaso
            ? <Text style={[s.error, { fontSize: 12 }]}>{errPaso}</Text>
            : <Text style={[s.ayuda, s.cifra, { fontSize: 12 }]}>{malla.gridNx}{NB}×{NB}{malla.gridNy} · {malla.zLevels.length} {malla.zLevels.length === 1 ? 'plano' : 'planos'} Z = {U.entero(malla.totalPuntos)}{NB}puntos</Text>}
        </View>

        <GrupoOpciones leyenda="Medio" icono="droplet-half" opciones={U.MEDIOS.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))} valor={ses ? ses.medio : p.medio} onCambio={p.onMedio} deshabilitado={bloqueado} />
      </View>

      <View style={{ marginTop: 16, gap: 16 }}>
        {p.puede ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Boton style={{ flex: 1 }} tipo="start" icono="play-fill" texto={p.iniciando ? 'Iniciando…' : 'Iniciar medición'} onPress={p.onIniciar}
              deshabilitado={p.enCurso || p.iniciando || !p.modo || Boolean(p.errorPaso) || Object.keys(p.erroresZona).length > 0} />
            <Boton style={{ flex: 1 }} tipo="stop" icono="stop-fill" texto={p.deteniendo ? 'Deteniendo…' : 'Detener'} onPress={p.onDetener} deshabilitado={!p.enCurso || p.deteniendo} />
          </View>
        ) : <Text style={s.sec}>Tu rol solo permite observar: las mediciones las inicia un operador o un admin.</Text>}
        {p.puede && !p.enCurso && !p.modo && <Text style={[s.ayuda, { marginTop: -10 }]}>Elige la velocidad (DC o AC) para iniciar.</Text>}

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <Text accessibilityLiveRegion="polite" style={[s.sec, { fontSize: 13, flex: 1 }]}>{p.etiquetaEstado}</Text>
            <Text style={[s.sec, s.cifra, { fontSize: 13 }]}>{p.progreso}%</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: p.total, now: p.recibidas, text: `${p.recibidas} de ${p.total} puntos` }}
            style={{ height: 8, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${p.progreso}%`, height: '100%', borderRadius: 4, overflow: 'hidden', backgroundColor: p.progreso > 0 ? t.guinda : 'transparent' }}>
              {p.progreso > 0 && <Degradado colores={['#8b1a2f', t.guindaBright]} horizontal radio={4} />}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[s.sec, s.cifra, { fontSize: 13 }]}>{p.enCurso && p.zActual !== null ? `Plano Z = ${p.zActual}${NB}mm` : ''}</Text>
            <Text style={[s.sec, s.cifra, { fontSize: 13 }]}>{U.entero(p.recibidas)} / {U.entero(p.total)}{NB}puntos</Text>
          </View>
          <TiempoEstimado estimado={p.estimado} enCurso={p.enCurso} zonaHoraria={p.zonaHoraria} />
        </View>
      </View>
      {p.errorAccion ? <Text accessibilityRole="alert" style={[s.error, { marginTop: 8 }]}>{p.errorAccion}</Text> : null}
    </View>
  );
}

// ── Indicadores ──
function Kpi({ titulo, icono, acento, children }: { titulo: string; icono: any; acento?: string; children: React.ReactNode }) {
  const s = useStyles(); const t = useTheme();
  return (
    <View style={{ backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: acento ?? t.acentoDato }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icono nombre={icono} tam={13} color={t.text2} /><Text style={[s.etiquetaCampoTxt, { fontSize: 13 }]}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}
const KpiCards = memo(function KpiCards({ estado, segundos, ultima, zLevels, decimales, zona }: { estado: string; segundos: number | null; ultima: Medicion | null; zLevels: number[]; decimales: number; zona: U.Zona }) {
  const s = useStyles(); const t = useTheme();
  const zIdx = ultima ? (ultima.zIdx >= 0 ? ultima.zIdx : U.indicePlano(zLevels, ultima.zMM)) : null;
  const texto = ({ adquiriendo: 'Adquiriendo', terminada: 'Terminada', detenida: 'Detenida', inactiva: 'Inactiva' } as Record<string, string>)[estado];
  const colorPunto = estado === 'adquiriendo' ? t.emerald : estado === 'terminada' ? t.bx : t.text2;
  const valor = { fontFamily: FUENTES.mono, fontSize: 22.4, lineHeight: 26, color: t.text };
  const unidad = [s.sec, { fontSize: 13, marginTop: 6 }];
  return (
    <View style={{ gap: 12 }}>
      <Kpi titulo="Estado" icono="activity">
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
          borderColor: estado === 'adquiriendo' ? mezcla(t.emerald, 0.5) : t.borderBright }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colorPunto }} />
          <Text style={{ fontFamily: FUENTES.semi, fontSize: 14, color: estado === 'adquiriendo' ? t.emerald : t.text }}>{texto}</Text>
        </View>
        <Text style={unidad}>{estado === 'inactiva' ? 'Sin sesión' : `Duración ${U.duracion(segundos)}`}</Text>
      </Kpi>
      <Kpi titulo="Plano Z de la última lectura" icono="layers" acento={t.guindaBright}>
        <Text style={valor}>{ultima ? `${ultima.zMM}${NB}mm` : '—'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
          {zLevels.map((z, i) => {
            const activo = i === zIdx;
            return (
              <View key={`${z}-${i}`} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: activo ? colorPlano(t, i) : t.border, backgroundColor: activo ? mezcla(colorPlano(t, i), 0.16) : 'transparent' }}>
                <Text style={{ fontFamily: FUENTES.mono, fontSize: 12, color: activo ? t.text : t.text2 }}>{z}{NB}mm</Text>
              </View>
            );
          })}
        </View>
      </Kpi>
      <Kpi titulo="|B| de la última lectura" icono="lightning-charge">
        <Text style={[valor, { color: t.mag }]}>{ultima ? (ultima.saturado ? 'Saturada' : U.numero(ultima.magnitud, decimales)) : '—'}</Text>
        <Text style={unidad}>µT (microtesla)</Text>
      </Kpi>
      <Kpi titulo="Posición de la última lectura" icono="geo-alt">
        <Text style={[valor, { fontSize: 20 }]}>{ultima ? `(${U.numero(ultima.xMM, 1)}, ${U.numero(ultima.yMM, 1)})${NB}mm` : '—'}</Text>
        <Text style={unidad}>En la zona de {U.etiquetaZona(zona)}{ultima?.seq ? ` · lectura ${ultima.seq}` : ''}</Text>
      </Kpi>
    </View>
  );
});

// ── Tabla de las últimas lecturas ──
const T = (props: React.ComponentProps<typeof Text>) => <Text numberOfLines={1} {...props} />;
const COLS: [string, number][] = [['Seq', 60], ['Hora', 122], ['X (mm)', 76], ['Y (mm)', 76], ['Z (mm)', 76], ['Bx (µT)', 96], ['By (µT)', 96], ['Bz (µT)', 96], ['|B| (µT)', 96], ['Estado', 92]];
// Una fila de la tabla: memorizada, así al llegar lecturas nuevas solo se dibujan las filas nuevas (no las 60)
const FilaLectura = memo(function FilaLectura({ r, primera, ultima, decimales, zona }: { r: Medicion; primera: boolean; ultima: boolean; decimales: number; zona?: string }) {
  const t = useTheme();
  const celda = { fontFamily: FUENTES.mono, fontSize: 13, color: t.text2, paddingVertical: 7, paddingHorizontal: 12 } as const;
  const v = (x: number | null) => (x === null || x === undefined ? <Text style={{ color: t.peligro, fontFamily: FUENTES.mono }}>SAT</Text> : U.numero(x, decimales));
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: ultima ? 0 : 1, borderBottomColor: t.border, backgroundColor: primera ? mezcla(t.bx, 0.06) : 'transparent' }}>
      <T style={[celda, { width: COLS[0][1] }]}>{r.seq ?? '—'}</T>
      <T style={[celda, { width: COLS[1][1] }]}>{U.horaPrecisa(r.timestamp, zona)}</T>
      <T style={[celda, { width: COLS[2][1] }]}>{U.numero(r.xMM, 1)}</T>
      <T style={[celda, { width: COLS[3][1] }]}>{U.numero(r.yMM, 1)}</T>
      <T style={[celda, { width: COLS[4][1] }]}>{U.numero(r.zMM, 1)}</T>
      <T style={[celda, { width: COLS[5][1], color: t.bx }]}>{v(r.bx)}</T>
      <T style={[celda, { width: COLS[6][1], color: t.by }]}>{v(r.by)}</T>
      <T style={[celda, { width: COLS[7][1], color: t.bz }]}>{v(r.bz)}</T>
      <T style={[celda, { width: COLS[8][1], color: r.saturado ? t.peligro : t.mag, fontWeight: '700' }]}>{r.saturado ? '—' : U.numero(r.magnitud, decimales)}</T>
      <T style={[celda, { width: COLS[9][1], fontFamily: r.saturado ? FUENTES.negrita : FUENTES.mono, color: r.saturado ? t.peligro : t.text2 }]}>{r.saturado ? 'Saturada' : 'OK'}</T>
    </View>
  );
});
const DataTable = memo(function DataTable({ mediciones, filas, decimales, zona }: { mediciones: Medicion[]; filas: number; decimales: number; zona?: string }) {
  const s = useStyles(); const t = useTheme();
  const visibles = useMemo(() => mediciones.slice(-filas).reverse(), [mediciones, filas]);
  const celda = { fontFamily: FUENTES.mono, fontSize: 13, color: t.text2, paddingVertical: 7, paddingHorizontal: 12 } as const;
  const anchoTotal = COLS.reduce((a, c) => a + c[1], 0);
  return (
    <View style={{ backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 10, overflow: 'hidden' }}>
      <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={s.fila}><Icono nombre="table" tam={16} color={t.guindaBright} /><Text accessibilityRole="header" style={s.chartTitle}>Últimas lecturas</Text></View>
        <Badge texto={`${visibles.length} de ${mediciones.length}`} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <View style={{ width: anchoTotal }}>
          <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface, borderBottomWidth: 1, borderBottomColor: t.border }}>
            {COLS.map(([n, w]) => <Text key={n} numberOfLines={1} style={{ width: w, fontFamily: FUENTES.semi, fontSize: 12, color: t.text2, paddingVertical: 9, paddingHorizontal: 12 }}>{n}</Text>)}
          </View>
          <ScrollView style={{ maxHeight: 340 }} nestedScrollEnabled>
            {visibles.length === 0 ? <Text style={[celda, { width: anchoTotal, padding: 28, fontFamily: FUENTES.mono }]}>Esperando lecturas…</Text> : visibles.map((r, i) => (
              <FilaLectura key={r.seq ?? `${r.timestamp}-${i}`} r={r} primera={i === 0} ultima={i === visibles.length - 1} decimales={decimales} zona={zona} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
});

// ── Página ──
export function Dashboard({ aviso, pie }: { aviso: React.ReactNode; pie: React.ReactNode }) {
  const s = useStyles(); const t = useTheme(); const reducido = useReducirMovimiento();
  const { width } = useWindowDimensions();
  const ancho = Math.min(width, 900) - 24 - 34;
  const { usuario, config, dispositivo, origen } = useTms();
  const { sesion, enCurso, mediciones, version, ultima, iniciando, deteniendo, errorAccion, iniciar, detener } = useMedicion();
  const puede = usuario?.rol === 'operador' || usuario?.rol === 'admin';
  const vis = { ...VIS, ...(config?.visualizacion ?? {}) };
  const zonaHoraria = config?.datos?.zona_horaria;
  const local = origen === 'simulacion';
  const modoOperacion = local ? 'simulacion' : config?.modo_operacion;

  const [p, setP] = useState<{ modo: string | null; pasoTexto: string | null; medio: string; zonaTexto: Record<string, string> | null }>({ modo: null, pasoTexto: null, medio: 'campo_magnetico', zonaTexto: null });
  const limites = useMemo(() => U.limitesDeBarrido(config?.barrido), [config?.barrido]);
  const zonaTexto = p.zonaTexto ?? { x: String(limites.x), y: String(limites.y), z: String(limites.z) };
  const zonaLeida = useMemo(() => U.leerZona(zonaTexto, limites), [zonaTexto, limites]);
  const zonaElegida = zonaLeida.valor ?? limites;
  const pasoPred = config?.barrido?.paso_predeterminado_mm ?? 5;
  const pasoTexto = p.pasoTexto ?? String(pasoPred);
  const pasoLeido = useMemo(() => U.leerPaso(pasoTexto, zonaElegida), [pasoTexto, zonaElegida]);
  const pasoMM = pasoLeido.valor ?? pasoPred;
  const mallaElegida = useMemo(() => U.mallaDeZona(zonaElegida, pasoMM), [zonaElegida, pasoMM]);

  const malla = useMemo<U.Malla>(() => (sesion ? U.mallaDeSesion(sesion, config?.barrido) : mallaElegida), [sesion, config?.barrido, mallaElegida]);

  // Las gráficas pesadas se redibujan como máximo cada 0,6 s mientras se mide (indicadores y progreso siguen en vivo)
  const versionLenta = useLento(version, 600, enCurso);
  const medLenta = useMemo(() => mediciones, [versionLenta]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Qué vistas se ven en la pantalla ──
  // Las gráficas y la tabla que quedan fuera (arriba o abajo del desplazamiento) no se redibujan con cada lectura nueva
  // y el mapa 3D pausa su rotación; al volver a verse se ponen al día. En pantalla se ven igual que siempre.
  const scrollY = useRef(0), altoVista = useRef(0), baseGraficas = useRef(0);
  const posiciones = useRef<Record<Vistas, { y: number; h: number; base: boolean } | undefined>>({ linea: undefined, mapa: undefined, sabana: undefined, tabla: undefined });
  const [enPantalla, setEnPantalla] = useState<Record<Vistas, boolean>>({ linea: true, mapa: true, sabana: true, tabla: true });
  const revisarVisibles = useCallback(() => {
    if (!altoVista.current) return;
    const margen = 150, ini = scrollY.current - margen, fin = scrollY.current + altoVista.current + margen;
    const nuevo = {} as Record<Vistas, boolean>;
    for (const k of Object.keys(posiciones.current) as Vistas[]) {
      const pos = posiciones.current[k];
      const y = pos ? pos.y + (pos.base ? baseGraficas.current : 0) : 0;
      nuevo[k] = !pos || (y < fin && y + pos.h > ini);
    }
    setEnPantalla(v => ((Object.keys(nuevo) as Vistas[]).some(k => v[k] !== nuevo[k]) ? nuevo : v));
  }, []);
  const medirVista = (k: Vistas, base: boolean) => (e: LayoutChangeEvent) => {
    posiciones.current[k] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height, base };
    revisarVisibles();
  };
  const medLinea = useCongelado(medLenta, enPantalla.linea);
  const medMapa = useCongelado(medLenta, enPantalla.mapa);
  const medSabana = useCongelado(mediciones, enPantalla.sabana);
  const medTabla = useCongelado(medLenta, enPantalla.tabla);

  const segundos = useSegundos(sesion, enCurso);
  const recibidas = mediciones.length, total = malla.totalPuntos;
  const progreso = Math.min(100, Math.round((recibidas / total) * 100)) || 0;
  const zActual = ultima?.zMM ?? null;
  const hayErrorZona = Object.keys(zonaLeida.errores).length > 0;

  const estimado = useTiempoEstimado({
    origen: enCurso && sesion ? sesion.origen : (modoOperacion === 'real' ? 'hw' : 'sim'),
    modo: enCurso && sesion ? sesion.modo : p.modo, sesion, enCurso, mediciones, total,
    totalElegido: pasoLeido.error || hayErrorZona ? 0 : mallaElegida.totalPuntos,
  });

  const estado = enCurso ? 'adquiriendo' : !sesion ? 'inactiva' : (sesion.motivo === 'completa' || recibidas >= total ? 'terminada' : 'detenida');
  const etiquetaEstado = useMemo(() => {
    if (estado === 'inactiva') return 'Sin medición en curso';
    if (estado === 'terminada') return `Barrido terminado (sesión ${sesion.id})`;
    if (estado === 'detenida') return `Detenido (sesión ${sesion.id})`;
    if (zActual === null) return `Sesión ${sesion.id}: esperando la primera lectura`;
    const enPlano = mediciones.filter(m => m.zMM === zActual).length;
    return `Midiendo el plano Z = ${zActual} mm (${Math.min(100, Math.round((enPlano / (malla.gridNx * malla.gridNy)) * 100))} % del plano)`;
  }, [estado, sesion, malla, zActual, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modal, setModal] = useState<'inicio' | 'detener' | null>(null);
  const real = modoOperacion === 'real';
  const filasInicio: [string, string][] = [
    ['Velocidad', U.etiquetaModo(p.modo ?? '')],
    ['Zona (X × Y × Z)', U.etiquetaZona(zonaElegida)],
    ['Paso (X, Y y Z)', U.etiquetaPaso(pasoMM)],
    ['Medio', U.etiquetaMedio(p.medio)],
    ['Malla', `${mallaElegida.gridNx} × ${mallaElegida.gridNy} puntos · ${mallaElegida.zLevels.length} planos Z (${mallaElegida.zLevels.join(', ')} mm)`],
    ['Total', `${mallaElegida.totalPuntos} puntos`],
    ...(estimado && !enCurso ? [['Tiempo estimado', `≈ ${U.tiempoAproximado(estimado.restanteS)}`] as [string, string]] : []),
    ['Origen de los datos', local ? 'Simulación local (celular)' : real ? 'Pico W (modo real)' : 'Simulador del servidor'],
  ];

  return (
    <ScrollView style={s.pantalla} contentContainerStyle={[s.contenido, { maxWidth: 900, width: '100%', alignSelf: 'center' }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled
      scrollEventThrottle={100} onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; revisarVisibles(); }}
      onLayout={e => { altoVista.current = e.nativeEvent.layout.height; revisarVisibles(); }}>
      {aviso}
      <Text accessibilityRole="header" style={s.tituloPagina}>Dashboard en vivo</Text>

      <ControlPanel enCurso={enCurso} iniciando={iniciando} deteniendo={deteniendo} sesion={sesion} puede={puede} errorAccion={errorAccion}
        modo={enCurso && sesion ? sesion.modo : p.modo} medio={p.medio} onModo={modo => setP(x => ({ ...x, modo }))} onMedio={medio => setP(x => ({ ...x, medio }))}
        zonaTexto={zonaTexto} erroresZona={zonaLeida.errores} limites={limites} onZona={z => setP(x => ({ ...x, zonaTexto: z }))}
        pasoTexto={pasoTexto} pasoMM={pasoMM} errorPaso={pasoLeido.error} mallaElegida={mallaElegida} onPaso={v => setP(x => ({ ...x, pasoTexto: v }))}
        recibidas={recibidas} total={total} zActual={zActual} progreso={progreso} etiquetaEstado={etiquetaEstado} estimado={estimado} zonaHoraria={zonaHoraria}
        onIniciar={() => setModal('inicio')} onDetener={() => setModal('detener')} />

      <Text accessibilityRole="header" style={[s.sectionLabel, { marginTop: 6 }]}>Indicadores</Text>
      <KpiCards estado={estado} segundos={segundos} ultima={ultima} zLevels={malla.zLevels} decimales={vis.decimales} zona={malla.zona} />

      <Text accessibilityRole="header" style={s.sectionLabel}>Visualización del campo</Text>
      <View style={{ gap: 12 }} onLayout={e => { baseGraficas.current = e.nativeEvent.layout.y; revisarVisibles(); }}>
        <View onLayout={medirVista('linea', true)}>
          <LineChart mediciones={medLinea} malla={malla} ventana={vis.ventana_grafica} decimales={vis.decimales} ancho={ancho} />
        </View>
        <View onLayout={medirVista('mapa', true)}>
          <Mapa3D mediciones={medMapa} zLevels={malla.zLevels} zona={malla.zona} ancho={ancho} rotacionAuto={Boolean(vis.rotacion_auto)} reducirMovimiento={reducido} activo={enPantalla.mapa} />
        </View>
        <View onLayout={medirVista('sabana', true)}>
          <Sabana3D mediciones={medSabana} malla={malla} enCurso={enCurso} sesionId={sesion?.id ?? null} ancho={ancho} />
        </View>
      </View>

      <Text accessibilityRole="header" style={s.sectionLabel}>Registro de mediciones</Text>
      <View onLayout={medirVista('tabla', false)}>
        <DataTable mediciones={medTabla} filas={vis.filas_tabla} decimales={vis.decimales} zona={zonaHoraria} />
      </View>
      {pie}

      <ModalTms visible={modal === 'inicio'} titulo="Iniciar medición" icono="play-circle-fill" onCerrar={() => setModal(null)}
        pie={<><Boton texto="Cancelar" onPress={() => setModal(null)} /><Boton tipo="start" icono="play-fill" texto="Sí, iniciar" onPress={() => { setModal(null); iniciar({ modo: p.modo as string, pasoMM, medio: p.medio, zona: zonaElegida }); }} /></>}>
        <Text style={[s.sec, { marginBottom: 14 }]}>Se iniciará un barrido con estos parámetros. Quedan guardados con la sesión.</Text>
        <View style={{ gap: 6 }}>
          {filasInicio.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={{ width: 120, fontFamily: FUENTES.medio, fontSize: 14, color: t.text2 }}>{k}</Text>
              <Text style={{ flex: 1, fontFamily: FUENTES.mono, fontSize: 14, color: t.text }}>{v}</Text>
            </View>
          ))}
        </View>
        {real && !dispositivo?.enLinea && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Icono nombre="exclamation-triangle" tam={14} color={t.aviso} style={{ marginTop: 3 }} />
            <Text style={[s.txt, { flex: 1, fontSize: 13 }]}>La Pico W no está en línea: la medición esperará a que se conecte.</Text>
          </View>
        )}
      </ModalTms>

      <ModalTms visible={modal === 'detener'} titulo="Confirmar detención" icono="exclamation-triangle-fill" peligro onCerrar={() => setModal(null)}
        pie={<><Boton texto="Cancelar" onPress={() => setModal(null)} /><Boton tipo="stop" icono="stop-fill" texto="Sí, detener" onPress={() => { setModal(null); detener(); }} /></>}>
        <Text style={s.txt}>¿Deseas <Text style={s.fuerte}>detener la medición</Text>?</Text>
        <Text style={[s.sec, { marginTop: 8 }]}>Lo medido hasta ahora se <Text style={[s.fuerte, { color: t.text2 }]}>guarda</Text> en el historial, con los puntos que falten marcados como huecos. La sesión no se puede reanudar.</Text>
        <Text style={{ marginTop: 16, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontFamily: FUENTES.mono, fontSize: 13, color: t.text, overflow: 'hidden' }}>
          {recibidas} / {total} puntos · plano Z = {zActual ?? '—'} mm · {U.duracion(segundos)}
        </Text>
      </ModalTms>
    </ScrollView>
  );
}
