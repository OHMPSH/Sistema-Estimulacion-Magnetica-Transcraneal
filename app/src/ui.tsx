/**
 * Componentes de interfaz con el mismo aspecto que las clases de global.css de la web:
 * btn-tms (start / stop / secundario), opcion-boton, segmento, campo-tms, select, casilla,
 * modal-tms, session-tag, records-badge, aviso-lectura y la lista dt/dd (session-stats).
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FUENTES, mezcla, useStyles, useTheme } from './theme';
import { GLIFOS, NombreIcono } from './glifos';

let idDegradado = 0;
/** En la vista web (solo para pruebas) los modales aparecen sin animación; en Android, con fundido */
export const ANIMACION_MODAL = Platform.OS === 'web' ? 'none' : 'fade';

/** Icono de Bootstrap Icons (la misma fuente que la web) */
export function Icono({ nombre, tam = 14, color, style }: { nombre: NombreIcono; tam?: number; color?: string; style?: any }) {
  const t = useTheme();
  return (
    <Text accessible={false} importantForAccessibility="no" allowFontScaling={false}
      style={[{ fontFamily: FUENTES.iconos, fontSize: tam, lineHeight: tam * 1.15, color: color ?? t.text, includeFontPadding: false }, style]}>
      {String.fromCodePoint(GLIFOS[nombre])}
    </Text>
  );
}

/**
 * Capa que llena a su padre y mide su tamaño. En Android, un <Svg> con width/height en % no vuelve a calcular su
 * tamaño cuando el padre crece (la barra de progreso se quedaba en 0 % y el degradado de un botón con dos líneas
 * no lo cubría), así que el SVG se dibuja con el tamaño medido, en números.
 */
function CapaMedida({ children }: { children: (ancho: number, alto: number) => React.ReactNode }) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}
      onLayout={e => { const { width: w, height: h } = e.nativeEvent.layout; setTam(v => (v.w === w && v.h === h ? v : { w, h })); }}>
      {tam.w > 0 && tam.h > 0 ? children(tam.w, tam.h) : null}
    </View>
  );
}

/** Fondo con degradado lineal (135°) que llena a su padre */
export function Degradado({ colores, radio = 0, horizontal }: { colores: [string, string]; radio?: number; horizontal?: boolean }) {
  const id = useRef(`dg${idDegradado++}`).current;
  return (
    <CapaMedida>
      {(w, h) => (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2={horizontal ? '0' : '1'}>
              <Stop offset="0" stopColor={colores[0]} /><Stop offset="1" stopColor={colores[1]} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} rx={Math.min(radio, h / 2, w / 2)} ry={Math.min(radio, h / 2, w / 2)} fill={`url(#${id})`} />
        </Svg>
      )}
    </CapaMedida>
  );
}

/** Fondo de la página: color base con el resplandor guinda arriba (radial-gradient de body) */
export function FondoPagina() {
  const t = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.bgBase }]}>
      <CapaMedida>
        {(w, h) => (
          <Svg width={w} height={h}>
            <Defs>
              <RadialGradient id="fondoTms" cx="50%" cy="-10%" rx="80%" ry="60%" fx="50%" fy="-10%">
                <Stop offset="0" stopColor="#8b1a2f" stopOpacity={t.resplandor} />
                <Stop offset="0.7" stopColor="#8b1a2f" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} fill="url(#fondoTms)" />
          </Svg>
        )}
      </CapaMedida>
    </View>
  );
}

type TipoBoton = 'start' | 'stop' | 'secundario';
export function Boton({ texto, icono, onPress, tipo = 'secundario', chico, deshabilitado, ocupado, style, accessibilityLabel }: {
  texto: string; icono?: NombreIcono; onPress: () => void; tipo?: TipoBoton; chico?: boolean; deshabilitado?: boolean; ocupado?: boolean;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const t = useTheme();
  const off = Boolean(deshabilitado || ocupado);
  const color = tipo === 'start' ? t.sobreGuinda : tipo === 'stop' ? t.peligro : t.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? texto} accessibilityState={{ disabled: off, busy: ocupado }}
      disabled={off} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: chico ? 32 : 40, paddingVertical: chico ? 5 : 9, paddingHorizontal: chico ? 10 : 18, borderRadius: 8, borderWidth: 1,
        borderColor: tipo === 'stop' ? t.peligro : tipo === 'secundario' ? t.borderBright : 'transparent',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden',
        backgroundColor: pressed && tipo !== 'start' ? (tipo === 'stop' ? mezcla(t.peligro.length === 7 ? t.peligro : '#ff7070', 0.12) : t.bgCardHover) : 'transparent',
        opacity: off ? 0.45 : pressed && tipo === 'start' ? 0.88 : 1,
      }, style]}>
      {tipo === 'start' && <Degradado colores={t.btnStart} radio={8} />}
      {ocupado ? <ActivityIndicator size="small" color={color} /> : icono ? <Icono nombre={icono} tam={chico ? 13 : 15} color={color} /> : null}
      <Text style={{ fontFamily: FUENTES.semi, fontSize: chico ? 13 : 14, color, flexShrink: 1, textAlign: 'center' }} numberOfLines={2}>{texto}</Text>
    </Pressable>
  );
}

/** Etiqueta de un grupo (legend.etiqueta-campo) con su icono */
export function EtiquetaCampo({ texto, icono }: { texto: string; icono?: NombreIcono }) {
  const s = useStyles(); const t = useTheme();
  return <View style={s.etiquetaCampo}>{icono && <Icono nombre={icono} tam={13} color={t.text2} />}<Text style={s.etiquetaCampoTxt}>{texto}</Text></View>;
}

/** Un botón de opción (label.opcion-boton) */
export function OpcionBoton({ etiqueta, activa, onPress, deshabilitado, style }: { etiqueta: string; activa: boolean; onPress: () => void; deshabilitado?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: activa, disabled: deshabilitado }} disabled={deshabilitado} onPress={onPress}
      style={({ pressed }) => [s.opcion, activa && s.opcionActiva, deshabilitado && { opacity: 0.6 }, pressed && !activa && { opacity: 0.75 }, style]}>
      <Text style={[s.opcionTxt, activa && s.opcionTxtActiva]}>{etiqueta}</Text>
    </Pressable>
  );
}

/** Grupo de opciones como radios con aspecto de botones (GrupoOpciones del ControlPanel) */
export function GrupoOpciones<T extends string | number>({ leyenda, icono, opciones, valor, onCambio, deshabilitado }: {
  leyenda?: string; icono?: NombreIcono; opciones: { valor: T; etiqueta: string }[]; valor: T | null | undefined; onCambio: (v: T) => void; deshabilitado?: boolean;
}) {
  const s = useStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={leyenda}>
      {leyenda ? <EtiquetaCampo texto={leyenda} icono={icono} /> : null}
      <View style={s.filaW}>
        {opciones.map(o => <OpcionBoton key={String(o.valor)} etiqueta={o.etiqueta} activa={valor === o.valor} onPress={() => onCambio(o.valor)} deshabilitado={deshabilitado} />)}
      </View>
    </View>
  );
}

/** Grupo segmentado (tema del menú): ocupa el ancho */
export function Segmentado<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; etiqueta: string; icono?: NombreIcono }[]; valor: T; onCambio: (v: T) => void }) {
  const s = useStyles(); const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
      {opciones.map(o => {
        const activo = valor === o.valor;
        return (
          <Pressable key={o.valor} accessibilityRole="radio" accessibilityState={{ selected: activo }} onPress={() => onCambio(o.valor)}
            style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: t.borderBright, borderRadius: 8 },
              activo && { borderColor: t.guindaBright, backgroundColor: mezcla(t.guindaBright, 0.12) }]}>
            {o.icono && <Icono nombre={o.icono} tam={13} color={t.text} />}
            <Text style={[s.txt, { fontSize: 13 }, activo && s.fuerte]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Radio con texto y ayuda (opcion-radio del menú lateral) */
export function OpcionRadio({ etiqueta, ayuda, activa, onPress, deshabilitado }: { etiqueta: string; ayuda?: string; activa: boolean; onPress: () => void; deshabilitado?: boolean }) {
  const s = useStyles(); const t = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: activa, disabled: deshabilitado }} disabled={deshabilitado} onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
        pressed && { backgroundColor: t.bgCardHover }, deshabilitado && { opacity: 0.7 }]}>
      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: activa ? 5 : 1.5, borderColor: activa ? t.guindaBright : t.text2, marginTop: 3, backgroundColor: activa ? '#fff' : 'transparent' }} />
      <View style={{ flex: 1 }}>
        <Text style={[s.txt, { fontFamily: FUENTES.medio }]}>{etiqueta}</Text>
        {ayuda ? <Text style={[s.sec, { fontSize: 13, lineHeight: 18 }]}>{ayuda}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Casilla (opcion-casilla) */
export function Casilla({ etiqueta, valor, onCambio, deshabilitado }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void; deshabilitado?: boolean }) {
  const s = useStyles(); const t = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: valor, disabled: deshabilitado }} disabled={deshabilitado} onPress={() => onCambio(!valor)}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38 }, deshabilitado && { opacity: 0.7 }]}>
      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: valor ? t.guindaBright : t.text2, backgroundColor: valor ? t.guindaBright : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {valor && <Icono nombre="check-lg" tam={12} color="#fff" />}
      </View>
      <Text style={[s.txt, { flexShrink: 1 }]}>{etiqueta}</Text>
    </Pressable>
  );
}

/**
 * Campo de texto (campo-tms) con etiqueta, ayuda y error.
 * `prefijo` va dentro a la izquierda (X, Y, Z de la zona) y `sufijo` dentro a la derecha (mm).
 */
export function Campo({ etiqueta, unidad, ayuda, error, prefijo, sufijo, contenedor, style, ...props }: TextInputProps & {
  etiqueta?: string; unidad?: string; ayuda?: string; error?: string; prefijo?: string; sufijo?: string; contenedor?: StyleProp<ViewStyle>;
}) {
  const s = useStyles(); const t = useTheme();
  const [foco, setFoco] = useState(false);
  const off = props.editable === false;
  return (
    <View style={contenedor}>
      {etiqueta ? <Text style={[s.etiquetaCampoTxt, { marginBottom: 6 }]}>{etiqueta}{unidad ? ` (${unidad})` : ''}</Text> : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput placeholderTextColor={t.text2} autoCapitalize="none" autoCorrect={false} accessibilityLabel={props.accessibilityLabel ?? etiqueta ?? prefijo}
          {...props}
          onFocus={e => { setFoco(true); props.onFocus?.(e); }} onBlur={e => { setFoco(false); props.onBlur?.(e); }}
          style={[s.campo, prefijo ? { paddingLeft: 28 } : null, sufijo ? { paddingRight: 38, textAlign: 'right', fontVariant: ['tabular-nums'] } : null,
            error ? { borderColor: t.peligro } : foco ? { borderColor: t.guindaBright } : null, off && { opacity: 0.8 }, style]} />
        {prefijo ? <Text pointerEvents="none" style={{ position: 'absolute', left: 10, fontFamily: FUENTES.semi, fontSize: 13, color: t.text2 }}>{prefijo}</Text> : null}
        {sufijo ? <Text pointerEvents="none" style={{ position: 'absolute', right: 12, fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2 }}>{sufijo}</Text> : null}
      </View>
      {error && error.trim() ? <Text style={s.error}>{error}</Text> : ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

/** Selector (form-select): el campo muestra la opción elegida y abre una lista */
export function Selector<T extends string | number>({ etiqueta, opciones, valor, onCambio, deshabilitado, ayuda, error, contenedor, accessibilityLabel }: {
  etiqueta?: string; opciones: { valor: T; etiqueta: string }[]; valor: T | null | undefined; onCambio: (v: T) => void; deshabilitado?: boolean;
  ayuda?: string; error?: string; contenedor?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const s = useStyles(); const t = useTheme(); const ins = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find(o => String(o.valor) === String(valor));
  return (
    <View style={contenedor}>
      {etiqueta ? <Text style={[s.etiquetaCampoTxt, { marginBottom: 6 }]}>{etiqueta}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`${accessibilityLabel ?? etiqueta ?? ''}: ${actual?.etiqueta ?? ''}`} disabled={deshabilitado}
        onPress={() => setAbierto(true)}
        style={[s.campo, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, error ? { borderColor: t.peligro } : null, deshabilitado && { opacity: 0.8 }]}>
        <Text style={[s.txt, { flexShrink: 1 }]} numberOfLines={1}>{actual?.etiqueta ?? '—'}</Text>
        <Icono nombre="chevron-down" tam={12} color={t.text2} />
      </Pressable>
      {error ? <Text style={s.error}>{error}</Text> : ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
      <Modal visible={abierto} transparent animationType={ANIMACION_MODAL} onRequestClose={() => setAbierto(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setAbierto(false)}>
          <Pressable style={{ backgroundColor: t.modal, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, borderColor: t.borderBright, paddingBottom: ins.bottom + 8, maxHeight: '75%' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[s.panelTitulo, { fontSize: 18 }]}>{etiqueta ?? accessibilityLabel ?? 'Elige una opción'}</Text>
              <Pressable accessibilityLabel="Cerrar" onPress={() => setAbierto(false)} hitSlop={10}><Icono nombre="x-lg" tam={16} color={t.text} /></Pressable>
            </View>
            <ScrollView>
              {opciones.map(o => {
                const sel = String(o.valor) === String(valor);
                return (
                  <Pressable key={String(o.valor)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                    onPress={() => { setAbierto(false); if (!sel) onCambio(o.valor); }}
                    style={({ pressed }) => [{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: t.border },
                      sel && { backgroundColor: mezcla(t.guindaBright, 0.1) }, pressed && { backgroundColor: t.bgCardHover }]}>
                    <Text style={[s.txt, { flex: 1 }, sel && s.fuerte]}>{o.etiqueta}</Text>
                    {sel && <Icono nombre="check2" tam={18} color={t.guindaBright} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Modal con el estilo modal-tms: encabezado, cuerpo y pie */
export function ModalTms({ visible, titulo, icono, peligro, onCerrar, children, pie }: {
  visible: boolean; titulo: string; icono?: NombreIcono; peligro?: boolean; onCerrar: () => void; children: React.ReactNode; pie?: React.ReactNode;
}) {
  const s = useStyles(); const t = useTheme();
  const color = peligro ? t.peligro : t.text;
  return (
    <Modal visible={visible} transparent animationType={ANIMACION_MODAL} onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 12 }} onPress={onCerrar}>
        <Pressable accessibilityViewIsModal style={{ backgroundColor: t.modal, borderWidth: 1, borderColor: t.borderBright, borderRadius: 12, maxHeight: '90%', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: t.border }}>
            {icono && <Icono nombre={icono} tam={18} color={peligro ? t.peligro : t.guindaBright} />}
            <Text accessibilityRole="header" style={[s.panelTitulo, { fontSize: 20.8, color, flex: 1 }]}>{titulo}</Text>
            <Pressable accessibilityLabel="Cancelar" onPress={onCerrar} hitSlop={10}><Icono nombre="x-lg" tam={15} color={t.text2} /></Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 18 }}>{children}</ScrollView>
          {pie ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: t.border }}>{pie}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Confirmación con el modal de la web (ModalConfirmacion): confirmar({titulo, mensaje, textoConfirmar, peligro}) → Promise<boolean> */
export function useConfirmacion() {
  const [op, setOp] = useState<{ titulo: string; mensaje: React.ReactNode; textoConfirmar?: string; peligro?: boolean; icono?: NombreIcono } | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmar = useCallback((o: NonNullable<typeof op>) => new Promise<boolean>(res => { resolver.current = res; setOp(o); }), []);
  const cerrar = (v: boolean) => { resolver.current?.(v); resolver.current = null; setOp(null); };
  const s = useStyles();
  const elemento = (
    <ModalTms visible={!!op} titulo={op?.titulo ?? ''} icono={op?.icono ?? (op?.peligro ? 'exclamation-triangle-fill' : undefined)} peligro={op?.peligro} onCerrar={() => cerrar(false)}
      pie={<><Boton texto="Cancelar" onPress={() => cerrar(false)} /><Boton texto={op?.textoConfirmar ?? 'Aceptar'} tipo={op?.peligro ? 'stop' : 'start'} onPress={() => cerrar(true)} /></>}>
      {typeof op?.mensaje === 'string' ? <Text style={s.txt}>{op.mensaje}</Text> : op?.mensaje}
    </ModalTms>
  );
  return { confirmar, elemento };
}

/** Etiqueta (session-tag) */
export function Tag({ texto, color, solido }: { texto: string; color?: string; solido?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.tag, color ? { borderColor: solido ? color : mezcla(color, 0.45) } : null]}>
      <Text style={[s.tagTxt, color ? { color } : null]}>{texto}</Text>
    </View>
  );
}
/** Contador (records-badge) */
export function Badge({ texto }: { texto: string }) {
  const s = useStyles();
  return <View style={s.badge}><Text style={s.badgeTxt}>{texto}</Text></View>;
}
/** Aviso (aviso-lectura) */
export function Aviso({ texto, icono = 'eye', children }: { texto?: string; icono?: NombreIcono; children?: React.ReactNode }) {
  const s = useStyles(); const t = useTheme();
  return <View style={s.avisoLectura}><Icono nombre={icono} tam={14} color={t.text} /><View style={{ flex: 1 }}>{children ?? <Text style={s.txt}>{texto}</Text>}</View></View>;
}

/** Lista de datos (dl.session-stats): dos columnas en el teléfono */
export function Datos({ filas }: { filas: { k: string; v: React.ReactNode; color?: string; mono?: boolean }[] }) {
  const s = useStyles(); const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 16 }}>
      {filas.map(f => (
        <View key={f.k} style={{ flexBasis: '45%', flexGrow: 1, minWidth: 130 }}>
          <Text style={{ fontFamily: FUENTES.medio, fontSize: 12, color: t.text2 }}>{f.k}</Text>
          {typeof f.v === 'string' || typeof f.v === 'number'
            ? <Text style={[s.txt, f.mono && s.cifra, f.color ? { color: f.color } : null]}>{f.v}</Text> : f.v}
        </View>
      ))}
    </View>
  );
}

/** Mensaje de éxito o error (texto-exito / texto-error) que solo ocupa lugar si hay texto */
export function Mensaje({ texto, error }: { texto?: string; error?: boolean }) {
  const s = useStyles();
  if (!texto) return null;
  return <Text accessibilityLiveRegion="polite" style={error ? s.error : s.exito}>{texto}</Text>;
}

/** Logo TMS (navbar-logo) */
export function Logo({ tam = 32 }: { tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} accessible={false}>
      <Degradado colores={['#8b1a2f', '#c0233f']} radio={6} />
      <Text style={{ fontFamily: FUENTES.titulo, fontSize: tam * 0.47, color: '#fff' }}>TMS</Text>
    </View>
  );
}

