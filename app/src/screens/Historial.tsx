/**
 * Mediciones pasadas (equivale a HistorialPage.jsx de la web):
 *   - filtros por velocidad, paso, medio y origen (en el servidor) y por día;
 *   - id real, origen, puntos recibidos / esperados, saturadas y huecos;
 *   - notas (admin, o el operador que inició la sesión); exportar el CSV del servidor;
 *   - ver la sábana 3D de una sesión; eliminar (admin, borrado lógico), «Ver eliminadas» y restaurar.
 * La lista se recarga sola con los eventos `sesion` del SSE.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { FUENTES, mezcla, useStyles, useTheme } from '../theme';
import { useMedicion, useTms, Medicion } from '../store';
import { Badge, Boton, Casilla, Datos, Icono, Mensaje, Selector, Tag, useConfirmacion } from '../ui';
import { Sabana3D } from '../charts/Sabana3D';
import { compartirArchivo } from '../archivos';
import * as U from '../util';

const NOTAS_MAXIMO = 5000;

function EditorNotas({ sesion, puedeEditar, onGuardada }: { sesion: any; puedeEditar: boolean; onGuardada: (s: any) => void }) {
  const s = useStyles(); const t = useTheme(); const { fuente } = useTms();
  const [texto, setTexto] = useState(sesion.notas ?? '');
  const [estado, setEstado] = useState({ guardando: false, mensaje: '', error: '' });
  useEffect(() => setTexto(sesion.notas ?? ''), [sesion.notas]);
  if (!puedeEditar) {
    return (
      <View style={{ marginTop: 8, gap: 4 }}>
        <Text style={s.etiquetaCampoTxt}>Notas</Text>
        <Text style={sesion.notas ? s.txt : s.sec}>{sesion.notas || 'Sin notas.'}</Text>
      </View>
    );
  }
  const guardar = async () => {
    setEstado({ guardando: true, mensaje: '', error: '' });
    const r = await fuente.notas(sesion.id, texto);
    if (r.ok) { setEstado({ guardando: false, mensaje: 'Notas guardadas.', error: '' }); onGuardada(r.sesion); }
    else setEstado({ guardando: false, mensaje: '', error: r.error || 'No se pudieron guardar las notas.' });
  };
  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      <Text style={s.etiquetaCampoTxt}>Notas</Text>
      <TextInput accessibilityLabel={`Notas de la sesión ${sesion.id}`} multiline maxLength={NOTAS_MAXIMO} value={texto} onChangeText={setTexto}
        placeholderTextColor={t.text2} style={[s.campo, { minHeight: 76, textAlignVertical: 'top' }]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        <Text style={[s.ayuda, s.cifra, { color: t.text2, marginTop: 0 }]}>{texto.length} / {NOTAS_MAXIMO} caracteres</Text>
        <Boton texto={estado.guardando ? 'Guardando…' : 'Guardar notas'} onPress={guardar} deshabilitado={estado.guardando || texto === (sesion.notas ?? '')} />
      </View>
      <Mensaje texto={estado.mensaje} /><Mensaje texto={estado.error} error />
    </View>
  );
}

/** Sábana 3D de una sesión pasada: pide sus lecturas una vez al abrirla */
function SabanaSesion({ sesion, ancho }: { sesion: any; ancho: number }) {
  const s = useStyles(); const { fuente, config } = useTms();
  const [estado, setEstado] = useState<{ cargando: boolean; lecturas: Medicion[]; error: string }>({ cargando: true, lecturas: [], error: '' });
  useEffect(() => {
    let vigente = true;
    fuente.mediciones(sesion.id).then(r => { if (vigente) setEstado({ cargando: false, lecturas: r.data, error: r.ok ? '' : r.error ?? 'No se pudieron cargar las lecturas.' }); });
    return () => { vigente = false; };
  }, [sesion.id, fuente]);
  const malla = useMemo(() => U.mallaDeSesion({ ...sesion, z_levels_mm: undefined, puntos_esperados: undefined }, config?.barrido), [sesion, config?.barrido]);
  if (estado.cargando) return <Text style={[s.sec, { marginTop: 16 }]}>Cargando las lecturas de la sesión {sesion.id}…</Text>;
  if (estado.error) return <Text style={[s.error, { marginTop: 16 }]}>{estado.error}</Text>;
  return <View style={{ marginTop: 16, marginHorizontal: -6 }}><Sabana3D mediciones={estado.lecturas} malla={malla} sesionId={sesion.id} titulo={`Sábana 3D de la sesión ${sesion.id}`} ancho={ancho} /></View>;
}

function SesionCard({ sesion, zona, ancho, onEliminar, onRestaurar, onActualizada, onAviso }: {
  sesion: any; zona?: string; ancho: number; onEliminar: (s: any) => void; onRestaurar: (s: any) => void; onActualizada: (s: any) => void; onAviso: (t: string, error?: boolean) => void;
}) {
  const s = useStyles(); const t = useTheme();
  const { usuario, fuente, origen } = useTms();
  const [abierta, setAbierta] = useState(false);
  const [verSabana, setVerSabana] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [verHuecos, setVerHuecos] = useState(false);
  const esAdmin = usuario?.rol === 'admin';
  const puedeEditar = esAdmin || (usuario?.rol === 'operador' && sesion.usuario_id === usuario?.id);
  const esperados = sesion.puntos_esperados, recibidos = sesion.puntos_recibidos ?? sesion.total_puntos ?? 0;
  const pct = esperados ? Math.round((recibidos / esperados) * 100) : null;
  const huecos = sesion.huecos;
  const segundos = sesion.terminada_en ? (new Date(sesion.terminada_en).getTime() - new Date(sesion.iniciada_en).getTime()) / 1000 : null;
  const eliminada = Boolean(sesion.eliminada_en);
  const local = origen === 'simulacion';

  const exportar = async () => {
    setExportando(true);
    const r = await fuente.csv(sesion.id);
    if (!r.ok) { setExportando(false); onAviso(r.texto || 'No se pudo exportar.', true); return; }
    const c = await compartirArchivo(`sesion_${sesion.id}${local ? '_local' : ''}.csv`, r.texto, 'text/csv');
    setExportando(false);
    if (!c.ok) onAviso(c.error ?? 'No se pudo exportar.', true);
  };

  return (
    <View style={{ backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderStyle: eliminada ? 'dashed' : 'solid', borderRadius: 10, marginBottom: 10, overflow: 'hidden', opacity: eliminada ? 0.85 : 1 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: abierta }} onPress={() => setAbierta(v => !v)}
        style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? t.bgCardHover : 'transparent' })}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontFamily: FUENTES.titulo, fontSize: 16.8, color: t.text }}>Sesión {sesion.id} · {U.fechaHora(sesion.iniciada_en, zona)}</Text>
            {sesion.activa && <Tag texto="En curso" color={t.emerald} solido />}
            {eliminada && <Tag texto="Eliminada" color={t.peligro} solido />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <Tag texto={sesion.modo} color={sesion.modo === 'DC' ? t.cyan : t.magenta} />
            <Tag texto={U.etiquetaPaso(sesion.paso_mm)} />
            <Tag texto={U.etiquetaMedioCorta(sesion.medio)} color={sesion.medio === 'solucion_salina' ? t.orange : undefined} />
            <Tag texto={sesion.origen === 'hw' ? 'Real (Pico W)' : local ? 'Simulación local' : 'Simulada'} color={sesion.origen === 'hw' ? t.emerald : undefined} />
            <Tag texto={`${U.entero(recibidos)}${esperados ? ` / ${U.entero(esperados)}` : ''} puntos${pct !== null ? ` · ${pct} %` : ''}`} />
            {huecos && <Tag texto={`${huecos.total} huecos`} color={huecos.total > 0 ? t.peligro : undefined} />}
          </View>
        </View>
        <Icono nombre="chevron-down" tam={14} color={t.text2} style={{ transform: [{ rotate: abierta ? '180deg' : '0deg' }] }} />
      </Pressable>

      {abierta && (
        <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: t.border }}>
          <Datos filas={[
            { k: 'Velocidad', v: U.etiquetaModo(sesion.modo) },
            { k: 'Zona', v: sesion.zona_x_mm != null ? U.etiquetaZona({ x: sesion.zona_x_mm, y: sesion.zona_y_mm, z: sesion.zona_z_mm }) : '—', mono: true },
            { k: 'Paso', v: `${U.etiquetaPaso(sesion.paso_mm)} (X, Y y Z)` },
            { k: 'Medio', v: U.etiquetaMedio(sesion.medio) },
            { k: 'Origen', v: sesion.origen === 'hw' ? 'Pico W (real)' : local ? 'Simulación local (celular)' : 'Simulador del servidor' },
            { k: 'Puntos', v: `${U.entero(recibidos)} recibidos de ${esperados ? U.entero(esperados) : '—'}`, mono: true },
            { k: 'Saturadas', v: U.entero(Number(sesion.saturadas ?? 0)), mono: true },
            { k: '|B| máximo', v: `${U.numero(sesion.max_magnitud, 3)} µT`, mono: true, color: t.mag },
            { k: '|B| mínimo', v: `${U.numero(sesion.min_magnitud, 3)} µT`, mono: true },
            { k: 'Duración', v: U.duracion(segundos), mono: true },
            { k: 'Inició', v: sesion.iniciada_por ?? '—' },
            { k: 'Software', v: sesion.version_software ?? '—', mono: true },
            ...(sesion.origen === 'hw' ? [{ k: 'Firmware', v: sesion.version_firmware ?? '—', mono: true }] : []),
          ]} />

          {huecos && huecos.total > 0 && (
            <View style={{ marginTop: 12 }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: verHuecos }} onPress={() => setVerHuecos(v => !v)} style={s.fila}>
                <Icono nombre={verHuecos ? 'chevron-down' : 'chevron-right'} tam={12} color={t.text} />
                <Text style={[s.txt, { flex: 1 }]}>Ver las posiciones sin lectura válida ({huecos.total}{huecos.posiciones.length < huecos.total ? `, se listan ${huecos.posiciones.length}` : ''})</Text>
              </Pressable>
              {verHuecos && (
                <ScrollView style={{ maxHeight: 160, marginTop: 8 }} nestedScrollEnabled>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
                    {huecos.posiciones.map((q: any) => <Text key={`${q.xMM}-${q.yMM}-${q.zMM}`} style={[s.sec, s.cifra, { fontSize: 13 }]}>({q.xMM}, {q.yMM}, {q.zMM}) mm</Text>)}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
          {!huecos && sesion.terminada_en && <Text style={[s.sec, { marginTop: 12 }]}>Los huecos no se calcularon para esta sesión (es anterior a la Fase 5).</Text>}

          <EditorNotas sesion={sesion} puedeEditar={puedeEditar && !eliminada} onGuardada={onActualizada} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {!eliminada && <Boton icono="download" texto="Exportar CSV" onPress={exportar} ocupado={exportando} />}
            {!eliminada && recibidos > 0 && <Boton icono={verSabana ? 'eye-slash' : 'badge-3d'} texto={verSabana ? 'Ocultar sábana 3D' : 'Ver sábana 3D'} onPress={() => setVerSabana(v => !v)} />}
            {esAdmin && !eliminada && !sesion.activa && <Boton tipo="stop" icono="trash3" texto="Eliminar" onPress={() => onEliminar(sesion)} />}
            {esAdmin && eliminada && <Boton tipo="start" icono="arrow-counterclockwise" texto="Restaurar" onPress={() => onRestaurar(sesion)} />}
          </View>
          {verSabana && !eliminada && <SabanaSesion sesion={sesion} ancho={ancho} />}
        </View>
      )}
    </View>
  );
}

const pasoValido = (t: string) => t === '' || (/^\d{1,3}([.,]\d)?$/.test(t) && Number(t.replace(',', '.')) > 0);

export function Historial({ aviso: avisoPico, pie }: { aviso: React.ReactNode; pie: React.ReactNode }) {
  const s = useStyles(); const t = useTheme();
  const { width } = useWindowDimensions();
  const { fuente, usuario, config, origen, eventosSesion, online } = useTms();
  const { enCurso, sesion: sesionAct } = useMedicion();
  const { confirmar, elemento } = useConfirmacion();
  const esAdmin = usuario?.rol === 'admin';
  const zona = config?.datos?.zona_horaria;
  const local = origen === 'simulacion';
  const [filtros, setFiltros] = useState({ modo: '', paso: '', medio: '', origen: '', dia: '', eliminadas: false });
  const [textoPaso, setTextoPaso] = useState('');
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [pasosConocidos, setPasosConocidos] = useState<number[]>(U.PASOS_SUGERIDOS);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [aviso, setAviso] = useState({ texto: '', error: false });
  const peticion = useRef(0);   // descarta respuestas viejas si los filtros cambian rápido
  const errorPaso = pasoValido(textoPaso.trim()) ? '' : 'Escribe el paso en mm, con un decimal como máximo (por ejemplo 5 o 2.5).';

  // El paso se aplica medio segundo después de dejar de escribir, y solo si es válido
  useEffect(() => {
    const tx = textoPaso.trim();
    if (!pasoValido(tx)) return undefined;
    const id = setTimeout(() => setFiltros(f => { const nuevo = tx === '' ? '' : String(Number(tx.replace(',', '.'))); return f.paso === nuevo ? f : { ...f, paso: nuevo }; }), 500);
    return () => clearTimeout(id);
  }, [textoPaso]);

  const cargar = useCallback(async () => {
    const n = ++peticion.current;
    const r = await fuente.listar({ modo: filtros.modo, medio: filtros.medio, origen: filtros.origen, paso: filtros.paso, eliminadas: filtros.eliminadas });
    if (n !== peticion.current) return;
    if (r.ok) {
      setSesiones(r.data); setActivaId(r.activaId);
      setPasosConocidos(prev => { const todos = new Set([...prev, ...r.data.map((x: any) => Number(x.paso_mm))]); return todos.size === prev.length ? prev : [...todos].sort((a, b) => a - b); });
    } else setAviso({ texto: r.error || 'No se pudo cargar el historial.', error: true });
    setCargando(false);
  }, [fuente, filtros.modo, filtros.medio, filtros.origen, filtros.paso, filtros.eliminadas]);
  useEffect(() => { cargar(); }, [cargar, eventosSesion, enCurso, sesionAct?.id, online]);

  const visibles = useMemo(() => sesiones.filter(x => !filtros.dia || U.diaLocal(x.iniciada_en, zona) === filtros.dia).map(x => ({ ...x, activa: x.id === activaId })), [sesiones, filtros.dia, zona, activaId]);
  const dias = useMemo(() => [...new Set(sesiones.map(x => U.diaLocal(x.iniciada_en, zona)))].sort().reverse(), [sesiones, zona]);
  const cambiar = (k: string, v: any) => setFiltros(f => ({ ...f, [k]: v }));
  const limpiar = () => { setTextoPaso(''); setFiltros(f => ({ modo: '', paso: '', medio: '', origen: '', dia: '', eliminadas: f.eliminadas })); };

  const eliminar = async (x: any) => {
    const ok = await confirmar({
      titulo: `Eliminar la sesión ${x.id}`, textoConfirmar: 'Sí, eliminar', peligro: true,
      mensaje: (
        <View style={{ gap: 10 }}>
          <Text style={s.txt}>La sesión dejará de aparecer en el historial y no se podrá exportar.</Text>
          <Text style={s.sec}>Es un <Text style={[s.fuerte, { color: t.text2 }]}>borrado lógico</Text>: las mediciones se conservan {local ? 'en el celular' : 'en la base de datos'} y un admin puede restaurarla desde «Ver eliminadas».</Text>
        </View>
      ),
    });
    if (!ok) return;
    const r = await fuente.eliminar(x.id);
    setAviso(r.ok ? { texto: `Sesión ${x.id} eliminada.`, error: false } : { texto: r.error || 'No se pudo eliminar.', error: true });
    cargar();
  };
  const restaurar = async (x: any) => {
    const r = await fuente.restaurar(x.id);
    setAviso(r.ok ? { texto: `Sesión ${x.id} restaurada.`, error: false } : { texto: r.error || 'No se pudo restaurar.', error: true });
    cargar();
  };
  const ancho = Math.min(width, 900) - 24 - 34;

  return (
    <ScrollView style={s.pantalla} contentContainerStyle={[s.contenido, { maxWidth: 900, width: '100%', alignSelf: 'center' }]} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={recargando} tintColor={t.guindaBright} colors={[t.guindaBright]} onRefresh={async () => { setRecargando(true); await cargar(); setRecargando(false); }} />}>
      {avisoPico}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Text accessibilityRole="header" style={[s.tituloPagina, { marginBottom: 0 }]}>Mediciones pasadas</Text>
        <Boton icono="arrow-clockwise" texto="Recargar" onPress={cargar} />
      </View>

      <View style={[s.panel, { gap: 12 }]} accessibilityLabel="Filtros del historial">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Selector contenedor={{ flex: 1 }} etiqueta="Velocidad" valor={filtros.modo} onCambio={v => cambiar('modo', v)} opciones={[{ valor: '', etiqueta: 'Todas' }, ...U.MODOS]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.etiquetaCampoTxt, { marginBottom: 6 }]}>Paso (mm)</Text>
            <TextInput accessibilityLabel="Paso (mm)" value={textoPaso} onChangeText={setTextoPaso} placeholder="Todos" placeholderTextColor={t.text2} keyboardType="decimal-pad"
              style={[s.campo, { fontVariant: ['tabular-nums'] }, errorPaso ? { borderColor: t.peligro } : null]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -4 }}>
          {pasosConocidos.map(mm => {
            const activo = filtros.paso === String(mm);
            return (
              <Pressable key={mm} accessibilityRole="button" accessibilityLabel={`Filtrar paso ${mm} mm`} onPress={() => setTextoPaso(activo ? '' : String(mm))}
                style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: activo ? t.guindaBright : t.border, backgroundColor: activo ? mezcla(t.guindaBright, 0.14) : t.bgSurface }}>
                <Text style={{ fontFamily: FUENTES.cuerpo, fontVariant: ['tabular-nums'], fontSize: 12, color: activo ? t.text : t.text2 }}>{U.etiquetaPaso(mm)}</Text>
              </Pressable>
            );
          })}
        </View>
        {errorPaso ? <Text style={[s.error, { marginTop: -6, fontSize: 12 }]}>{errorPaso}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Selector contenedor={{ flex: 1 }} etiqueta="Medio" valor={filtros.medio} onCambio={v => cambiar('medio', v)} opciones={[{ valor: '', etiqueta: 'Todos' }, ...U.MEDIOS.map(m => ({ valor: m.valor, etiqueta: m.etiqueta }))]} />
          {!local && <Selector contenedor={{ flex: 1 }} etiqueta="Origen" valor={filtros.origen} onCambio={v => cambiar('origen', v)}
            opciones={[{ valor: '', etiqueta: 'Simuladas y reales' }, { valor: 'sim', etiqueta: 'Solo simuladas' }, { valor: 'hw', etiqueta: 'Solo reales (Pico W)' }]} />}
        </View>
        <Selector etiqueta="Día" valor={filtros.dia} onCambio={v => cambiar('dia', v)}
          opciones={[{ valor: '', etiqueta: 'Todos los días' }, ...[...new Set([...(filtros.dia ? [filtros.dia] : []), ...dias])].map(d => ({ valor: d, etiqueta: U.etiquetaDia(d) }))]} />
        {esAdmin && <Casilla etiqueta="Ver eliminadas" valor={filtros.eliminadas} onCambio={v => cambiar('eliminadas', v)} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Boton icono="x-circle" texto="Limpiar" onPress={limpiar} />
          <Badge texto={`${visibles.length} ${visibles.length === 1 ? 'sesión' : 'sesiones'}`} />
        </View>
      </View>

      <Mensaje texto={aviso.texto} error={aviso.error} />
      {aviso.texto ? <View style={{ height: 10 }} /> : null}

      {cargando ? <Text style={s.sec}>Cargando…</Text> : visibles.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16, gap: 8 }}>
          <Icono nombre="inbox" tam={32} color={t.text2} />
          <Text style={s.sec}>No hay sesiones con estos filtros.</Text>
        </View>
      ) : visibles.map(x => (
        <SesionCard key={x.id} sesion={x} zona={zona} ancho={ancho - 32} onEliminar={eliminar} onRestaurar={restaurar}
          onAviso={(texto, error = false) => setAviso({ texto, error })}
          onActualizada={n => setSesiones(l => l.map(y => (y.id === n.id ? { ...y, ...n } : y)))} />
      ))}
      {pie}
      {elemento}
    </ScrollView>
  );
}
