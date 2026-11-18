/**
 * Raíz de la app (equivale a App.jsx de la web):
 *   sin origen elegido → ElegirOrigen · sin servidor → Conexion · sin usuario → Login
 *   debe_cambiar_password → CambiarPassword · con sesión → Shell (Navbar + menú lateral ☰ + página + pie)
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FUENTES, ThemeProvider, mezcla, useReducirMovimiento, useStyles, useTheme } from './src/theme';
import { TmsProvider, useMedicion, useTms } from './src/store';
import { useDispositivoVista } from './src/hooks';
import { ANIMACION_MODAL, Boton, Degradado, FondoPagina, Icono, Logo, OpcionRadio, Segmentado, useConfirmacion } from './src/ui';
import type { NombreIcono } from './src/glifos';
import { Conexion } from './src/screens/Conexion';
import { CambiarPassword, Cargando, ElegirOrigen, Login } from './src/screens/Acceso';
import { Dashboard } from './src/screens/Dashboard';
import { Historial } from './src/screens/Historial';
import { Configuracion } from './src/screens/Configuracion';
import { ROLES_TEXTO } from './src/util';

export type Vista = 'dashboard' | 'historial' | 'configuracion';
const NAVEGACION: { vista: Vista; etiqueta: string; icono: NombreIcono }[] = [
  { vista: 'dashboard', etiqueta: 'Dashboard en vivo', icono: 'broadcast' },
  { vista: 'historial', etiqueta: 'Mediciones pasadas', icono: 'archive' },
  { vista: 'configuracion', etiqueta: 'Configuración', icono: 'gear' },
];

function Indicador({ color, texto }: { color: string; texto: string }) {
  const t = useTheme();
  return (
    <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2 }} numberOfLines={1}>{texto}</Text>
    </View>
  );
}

function Navbar({ onMenu }: { onMenu: () => void }) {
  const t = useTheme(); const ins = useSafeAreaInsets();
  const { online, config, origen } = useTms();
  const disp = useDispositivoVista();
  const local = origen === 'simulacion';
  const modo = local ? 'simulacion' : config?.modo_operacion;
  const errorPico = disp.estado?.enLinea ? disp.estado.errorPico : null;
  return (
    <View style={{ paddingTop: ins.top + 4, paddingBottom: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: t.guinda, gap: 6 }}>
      <Degradado colores={t.navbar} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir el menú" onPress={onMenu} hitSlop={6}
          style={({ pressed }) => ({ minWidth: 40, minHeight: 40, borderRadius: 8, borderWidth: 1, borderColor: pressed ? t.guindaBright : t.borderBright, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.bgCardHover : 'transparent' })}>
          <Icono nombre="list" tam={20} />
        </Pressable>
        <Logo />
        <Text style={{ fontFamily: FUENTES.titulo, fontSize: 16, color: t.text, flexShrink: 1 }} numberOfLines={1}>Sistema de Adquisición de Datos</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 6 }}>
        {modo === 'simulacion' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: t.yellow, backgroundColor: mezcla(t.yellow, 0.12), borderRadius: 6, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Icono nombre="cpu" tam={13} color={t.yellow} />
            <Text style={{ fontFamily: FUENTES.titulo, fontSize: 14, letterSpacing: 0.8, color: t.yellow }}>{local ? 'SIMULACIÓN LOCAL' : 'SIMULACIÓN'}</Text>
          </View>
        )}
        {modo === 'real' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: mezcla(t.emerald, 0.6), borderRadius: 6, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Icono nombre="broadcast-pin" tam={13} color={t.emerald} />
            <Text style={{ fontFamily: FUENTES.titulo, fontSize: 14, letterSpacing: 0.8, color: t.emerald }}>real</Text>
          </View>
        )}
        {local ? <Indicador color={t.emerald} texto="sin servidor (datos del celular)" /> : <>
          <Indicador color={online ? t.emerald : t.peligro} texto={online ? 'en línea' : 'sin conexión'} />
          <Indicador color={!disp.estado?.enLinea ? t.peligro : errorPico ? t.aviso : t.emerald} texto={disp.texto} />
        </>}
      </View>
    </View>
  );
}

function Seccion({ children, ultimo }: { children: React.ReactNode; ultimo?: boolean }) {
  const t = useTheme();
  return <View style={{ paddingVertical: 12, borderBottomWidth: ultimo ? 0 : 1, borderBottomColor: t.border }}>{children}</View>;
}
function Subtitulo({ texto }: { texto: string }) {
  const t = useTheme();
  return <Text style={{ fontFamily: FUENTES.semi, fontSize: 13, color: t.text2, marginBottom: 8 }}>{texto}</Text>;
}

function MenuLateral({ abierto, onCerrar, vista, onNavegar, onServidor }: { abierto: boolean; onCerrar: () => void; vista: Vista; onNavegar: (v: Vista) => void; onServidor: () => void }) {
  const s = useStyles(); const t = useTheme(); const ins = useSafeAreaInsets(); const reducido = useReducirMovimiento();
  const { usuario, perfil, config, guardarClave, tema, cambiarTema, cerrarSesion, origen, cambiarOrigen } = useTms();
  const { enCurso } = useMedicion();
  const [errorModo, setErrorModo] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [cambiarPass, setCambiarPass] = useState(false);
  const { confirmar, elemento } = useConfirmacion();
  const local = origen === 'simulacion';
  const esAdmin = usuario?.rol === 'admin';
  const modo = config?.modo_operacion;
  const desliz = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (abierto) { desliz.setValue(0); Animated.timing(desliz, { toValue: 1, duration: reducido ? 0 : 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(); }
  }, [abierto, reducido, desliz]);

  const cambiarModo = async (m: string) => {
    if (m === modo) return;
    setCambiando(true); setErrorModo('');
    const r = await guardarClave('modo_operacion', m);
    if (!r.ok) setErrorModo(r.error || 'No se pudo cambiar el modo.');
    setCambiando(false);
  };

  return (
    <Modal visible={abierto} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View accessibilityViewIsModal style={{ width: '88%', maxWidth: 360, height: '100%', backgroundColor: t.bgCard, borderRightWidth: 1, borderRightColor: t.borderBright,
          opacity: desliz, transform: [{ translateX: desliz.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }}>
          <ScrollView contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 18, paddingBottom: ins.bottom + 24, flexGrow: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text accessibilityRole="header" style={{ fontFamily: FUENTES.titulo, fontSize: 20.8, color: t.text }}>Menú</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el menú" onPress={onCerrar}
                style={{ minWidth: 36, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: t.borderBright, alignItems: 'center', justifyContent: 'center' }}>
                <Icono nombre="x-lg" tam={15} />
              </Pressable>
            </View>

            <Seccion>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icono nombre="person-circle" tam={29} color={t.text2} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.txt, s.fuerte]}>{usuario?.nombre}</Text>
                  <Text style={[s.sec, { fontSize: 13 }]}>{local ? 'Simulación local · sin cuenta' : `${ROLES_TEXTO[usuario?.rol ?? ''] ?? usuario?.rol} · ${usuario?.usuario}`}</Text>
                </View>
              </View>
            </Seccion>

            {!local && (
              <Seccion>
                <Subtitulo texto="Modo de operación" />
                {esAdmin ? (
                  <>
                    {[['simulacion', 'Simulación', 'El simulador del servidor genera los datos'], ['real', 'Real (Pico W → servidor)', 'Las lecturas llegan de la Pico W']].map(([v, e, a]) => (
                      <OpcionRadio key={v} etiqueta={e} ayuda={a} activa={modo === v} deshabilitado={enCurso || cambiando} onPress={() => cambiarModo(v)} />
                    ))}
                    {enCurso && <Text style={[s.sec, { fontSize: 13, marginTop: 8 }]}>Hay una medición en curso: detenla para cambiar el modo. Cambiarlo a mitad de un barrido mezclaría datos simulados y reales.</Text>}
                  </>
                ) : <Text style={s.txt}>{modo === 'real' ? 'Real (Pico W → servidor)' : 'Simulación'}</Text>}
                {errorModo ? <Text style={s.error}>{errorModo}</Text> : null}
              </Seccion>
            )}

            <Seccion>
              <Subtitulo texto="Tema" />
              <Segmentado valor={tema} onCambio={cambiarTema}
                opciones={[{ valor: 'oscuro', etiqueta: 'Oscuro', icono: 'moon-stars' }, { valor: 'claro', etiqueta: 'Claro', icono: 'sun' }, { valor: 'sistema', etiqueta: 'Sistema', icono: 'circle-half' }]} />
            </Seccion>

            <Seccion>
              <Subtitulo texto="Navegación" />
              <View style={{ gap: 4 }}>
                {NAVEGACION.map(n => {
                  const activo = vista === n.vista;
                  return (
                    <Pressable key={n.vista} accessibilityRole="link" accessibilityState={{ selected: activo }} onPress={() => { onNavegar(n.vista); onCerrar(); }}
                      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
                        activo && { borderColor: t.guindaBright, backgroundColor: mezcla(t.guindaBright, 0.1) }, pressed && !activo && { backgroundColor: t.bgCardHover }]}>
                      <Icono nombre={n.icono} tam={16} />
                      <Text style={[s.txt, activo && s.fuerte]}>{n.etiqueta}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Seccion>

            <Seccion>
              <Subtitulo texto="Origen de los datos (app)" />
              <OpcionRadio etiqueta="Servidor real" ayuda={perfil?.url ? `Raspberry Pi en ${perfil.url}` : 'Mediciones del servidor (Raspberry Pi)'} activa={!local}
                onPress={async () => { if (local && await cambiarOrigen('servidor')) onCerrar(); }} />
              <OpcionRadio etiqueta="Simulación local" ayuda="Números aleatorios generados en este celular; no usa red." activa={local} deshabilitado={enCurso && local}
                onPress={async () => {
                  if (local) return;
                  if (enCurso && !(await confirmar({ titulo: 'Cambiar a la simulación local', mensaje: 'La medición del servidor sigue en curso; la verás de nuevo al volver al servidor real.', textoConfirmar: 'Cambiar' }))) return;
                  if (await cambiarOrigen('simulacion')) onCerrar();
                }} />
              {enCurso && local && <Text style={[s.sec, { fontSize: 13, marginTop: 6 }]}>Detén la simulación local para cambiar de origen.</Text>}
              {!local && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Boton texto="Cambiar la IP del servidor" icono="hdd-network" onPress={() => { onCerrar(); onServidor(); }} />
                  <Boton texto="Cambiar mi contraseña" icono="key" onPress={() => setCambiarPass(true)} />
                </View>
              )}
            </Seccion>

            {!local && (
              <Seccion ultimo>
                <Boton texto="Cerrar sesión" icono="box-arrow-right" onPress={() => { onCerrar(); cerrarSesion(); }} />
              </Seccion>
            )}
          </ScrollView>
        </Animated.View>
        <Pressable accessibilityLabel="Cerrar el menú" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onCerrar} />
      </View>
      {elemento}
      <Modal visible={cambiarPass} transparent animationType={ANIMACION_MODAL} onRequestClose={() => setCambiarPass(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 12 }}>
          <CambiarPassword onListo={() => setCambiarPass(false)} onCancelar={() => setCambiarPass(false)} />
        </View>
      </Modal>
    </Modal>
  );
}

/**
 * Aviso de error de la Pico W. Vive en su propio componente porque el estado de la Pico se recalcula cada segundo
 * («hace N s»): si lo leyera Shell, todo el dashboard se redibujaría una vez por segundo.
 */
const AvisoPico = memo(function AvisoPico() {
  const s = useStyles(); const t = useTheme();
  const disp = useDispositivoVista();
  const error = disp.estado?.enLinea ? disp.estado.errorPico : null;
  if (!error) return null;
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: mezcla(t.aviso, 0.12), borderWidth: 1, borderColor: mezcla(t.aviso, 0.55) }}>
      <Icono nombre="exclamation-triangle" tam={15} color={t.aviso} style={{ marginTop: 2 }} />
      <Text style={[s.txt, { flex: 1 }]}><Text style={s.fuerte}>La Pico W informa un error:</Text> {error}</Text>
    </View>
  );
});

function Shell({ onServidor }: { onServidor: () => void }) {
  const s = useStyles(); const t = useTheme(); const ins = useSafeAreaInsets();
  const { origen } = useTms();
  const [vista, setVista] = useState<Vista>('dashboard');
  const [seccion, setSeccion] = useState('barrido');
  const [menu, setMenu] = useState(false);
  const navegar = useCallback((v: Vista, sec?: string) => { setVista(v); if (sec) setSeccion(sec); }, []);

  // Atrás de Android: cierra el menú o vuelve al dashboard
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menu) { setMenu(false); return true; }
      if (vista !== 'dashboard') { setVista('dashboard'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menu, vista]);

  // El pie y el aviso son elementos estables: así el dashboard no se redibuja entero cada segundo
  const pie = useMemo(() => (
    <Text style={{ textAlign: 'center', paddingVertical: 20, paddingHorizontal: 16, fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2, borderTopWidth: 1, borderTopColor: t.border, marginTop: 10, marginBottom: ins.bottom }}>
      Sistema de adquisición de datos TMS · Instituto Politécnico Nacional, ESIME Zacatenco · Tesis de ingeniería
    </Text>
  ), [t, ins.bottom]);
  const avisoPico = useMemo(() => (origen !== 'simulacion' ? <AvisoPico /> : null), [origen]);

  return (
    <View style={{ flex: 1 }}>
      <FondoPagina />
      <Navbar onMenu={() => setMenu(true)} />
      <View style={{ flex: 1 }}>
        {vista === 'dashboard' && <Dashboard aviso={avisoPico} pie={pie} />}
        {vista === 'historial' && <Historial aviso={avisoPico} pie={pie} />}
        {vista === 'configuracion' && <Configuracion aviso={avisoPico} pie={pie} seccion={seccion} onSeccion={setSeccion} />}
      </View>
      <MenuLateral abierto={menu} onCerrar={() => setMenu(false)} vista={vista} onNavegar={navegar} onServidor={onServidor} />
    </View>
  );
}

function Raiz() {
  const { fase } = useTms();
  const t = useTheme(); const ins = useSafeAreaInsets();
  const [conexion, setConexion] = useState(false);
  let cuerpo: React.ReactNode;
  if (fase === 'elegirOrigen') cuerpo = <ElegirOrigen />;
  else if (conexion || fase === 'sinServidor') cuerpo = <View style={{ flex: 1, paddingTop: ins.top }}><Conexion onCerrar={fase === 'sinServidor' ? undefined : () => setConexion(false)} /></View>;
  else if (fase === 'cargando') cuerpo = <Cargando onServidor={() => setConexion(true)} />;
  else if (fase === 'login') cuerpo = <Login onServidor={() => setConexion(true)} />;
  else if (fase === 'cambiarPassword') cuerpo = <CambiarPassword obligatorio />;
  else cuerpo = <Shell onServidor={() => setConexion(true)} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.bgBase }}>
      <StatusBar style={t.claro ? 'dark' : 'light'} />
      {fase !== 'listo' || conexion ? <FondoPagina /> : null}
      {cuerpo}
    </View>
  );
}

function ConTema() {
  const { tema, config } = useTms();
  return <ThemeProvider tema={tema} reducirConfig={Boolean(config?.visualizacion?.reducir_animaciones)}><Raiz /></ThemeProvider>;
}

export default function App() {
  const [listas, errorFuentes] = useFonts({
    'Inter-400': require('./assets/fonts/Inter-400.ttf'),
    'Inter-500': require('./assets/fonts/Inter-500.ttf'),
    'Inter-600': require('./assets/fonts/Inter-600.ttf'),
    'Inter-700': require('./assets/fonts/Inter-700.ttf'),
    'Rajdhani-600': require('./assets/fonts/Rajdhani-600.ttf'),
    'Rajdhani-700': require('./assets/fonts/Rajdhani-700.ttf'),
    'ShareTechMono-400': require('./assets/fonts/ShareTechMono-400.ttf'),
    'bootstrap-icons': require('./assets/fonts/bootstrap-icons.ttf'),
  });
  if (!listas && !errorFuentes) return <View style={{ flex: 1, backgroundColor: '#0d0d0f' }} />;
  return <SafeAreaProvider><TmsProvider><ConTema /></TmsProvider></SafeAreaProvider>;
}
