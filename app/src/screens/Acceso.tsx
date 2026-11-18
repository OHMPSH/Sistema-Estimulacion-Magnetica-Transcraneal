/**
 * Acceso: inicio de sesión (LoginPage), cambio de contraseña (CambiarPasswordPage), la espera de conexión
 * y la primera pantalla de la app (elegir entre simulación local y servidor real).
 */
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FUENTES, useStyles, useTheme } from '../theme';
import { useTms } from '../store';
import { Boton, Campo, Icono, Logo } from '../ui';
import { ROLES_TEXTO } from '../util';

const LONGITUD_MINIMA = 8;   // la misma regla que valida el servidor

/** Tarjeta centrada (auth-page + auth-card) */
function Tarjeta({ children }: { children: React.ReactNode }) {
  const t = useTheme(); const ins = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: ins.top + 24, paddingBottom: ins.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.borderBright, borderRadius: 12, paddingVertical: 28, paddingHorizontal: 24, gap: 14, elevation: 4 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Marca({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <Logo />
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={{ fontFamily: FUENTES.titulo, fontSize: 20.8, lineHeight: 24, color: t.text }}>{titulo}</Text>
        <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2 }}>{subtitulo}</Text>
      </View>
    </View>
  );
}
function AvisoAuth({ texto }: { texto: string }) {
  const t = useTheme();
  return <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden' }}>{texto}</Text>;
}

export function Login({ onServidor }: { onServidor: () => void }) {
  const s = useStyles(); const t = useTheme();
  const { perfil, iniciarSesion, online, reverificar, cambiarOrigen, sesionExpirada } = useTms();
  const [usuario, setUsuario] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (enviando) return;
    if (!usuario.trim() || !password) { setError('Escribe tu usuario y tu contraseña.'); return; }
    setError(''); setEnviando(true);
    const r = await iniciarSesion(usuario, password);
    setEnviando(false); if (!r.ok) setError(r.error ?? 'No se pudo iniciar sesión.');
  };
  return (
    <Tarjeta>
      <Marca titulo="Sistema de Adquisición de Datos" subtitulo="Instituto Politécnico Nacional, ESIME Zacatenco" />
      {sesionExpirada && !error ? <AvisoAuth texto="Tu sesión terminó. Vuelve a iniciar sesión para continuar." /> : null}
      <Campo etiqueta="Usuario" value={usuario} onChangeText={setUsuario} textContentType="username" autoComplete="username" returnKeyType="next" style={{ fontSize: 15 }} />
      <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="password" onSubmitEditing={enviar} returnKeyType="go" style={{ fontSize: 15 }} />
      <Text accessibilityLiveRegion="assertive" style={[s.error, { minHeight: 20, marginTop: 0 }]}>{error}</Text>
      <Boton tipo="start" icono="box-arrow-in-right" texto={enviando ? 'Entrando…' : 'Iniciar sesión'} onPress={enviar} deshabilitado={enviando} />

      <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: online ? t.emerald : t.peligro }} />
          <Text style={[s.sec, { fontSize: 13, flex: 1 }]} numberOfLines={2}>Servidor {online ? 'en línea' : 'sin conexión'} · <Text style={s.cifra}>{perfil?.url ?? '—'}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton chico style={{ flex: 1 }} icono="hdd-network" texto="Cambiar servidor" onPress={onServidor} />
          {!online && <Boton chico style={{ flex: 1 }} icono="arrow-clockwise" texto="Reintentar" onPress={reverificar} />}
        </View>
        <Boton chico icono="cpu" texto="Usar la simulación local (sin servidor)" onPress={() => cambiarOrigen('simulacion')} />
      </View>
    </Tarjeta>
  );
}

export function Cargando({ onServidor }: { onServidor: () => void }) {
  const s = useStyles(); const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <ActivityIndicator color={t.guindaBright} size="large" />
      <Text accessibilityRole="text" style={s.sec}>Verificando sesión…</Text>
      <Boton chico icono="hdd-network" texto="Cambiar servidor o IP" onPress={onServidor} />
    </View>
  );
}

/** Cambio de contraseña: obligatorio (pantalla completa) o voluntario (desde el menú, dentro de un modal) */
export function CambiarPassword({ obligatorio, onListo, onCancelar }: { obligatorio?: boolean; onListo?: () => void; onCancelar?: () => void }) {
  const s = useStyles(); const t = useTheme();
  const { api, usuario, usuarioActualizado, cerrarSesion } = useTms();
  const [actual, setActual] = useState(''); const [nueva, setNueva] = useState(''); const [repetida, setRepetida] = useState('');
  const [error, setError] = useState(''); const [exito, setExito] = useState(''); const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (enviando) return;
    if (!actual || !nueva || !repetida) return setError('Completa los tres campos.');
    if (nueva.length < LONGITUD_MINIMA) return setError(`La contraseña nueva debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
    if (nueva !== repetida) return setError('Las dos contraseñas nuevas no coinciden.');
    if (nueva === actual) return setError('La contraseña nueva debe ser distinta de la actual.');
    setError(''); setEnviando(true);
    const r = await api!.post('/auth/cambiar-password', { actual, nueva });
    setEnviando(false);
    if (!r.ok) { setError(r.json.error || 'No se pudo cambiar la contraseña.'); return; }
    setActual(''); setNueva(''); setRepetida(''); setExito('Contraseña cambiada. Tus otras sesiones se cerraron.');
    if (usuario) usuarioActualizado({ ...usuario, debe_cambiar_password: false });
    if (onListo) setTimeout(onListo, 900);
  };
  const cuerpo = (
    <>
      <Marca titulo={obligatorio ? 'Cambia tu contraseña' : 'Cambiar mi contraseña'} subtitulo={`${usuario?.nombre ?? ''}, ${ROLES_TEXTO[usuario?.rol ?? ''] ?? usuario?.rol ?? ''}`} />
      {obligatorio && <AvisoAuth texto="Estás usando una contraseña temporal. Elige una nueva para poder continuar." />}
      <Campo etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry autoComplete="password" />
      <Campo etiqueta="Contraseña nueva" value={nueva} onChangeText={setNueva} secureTextEntry autoComplete="password-new" ayuda={`Mínimo ${LONGITUD_MINIMA} caracteres.`} />
      <Campo etiqueta="Repite la contraseña nueva" value={repetida} onChangeText={setRepetida} secureTextEntry autoComplete="password-new" onSubmitEditing={enviar} />
      <Text accessibilityLiveRegion="assertive" style={[s.error, { minHeight: 20, marginTop: 0 }]}>{error}</Text>
      {exito ? <Text style={[s.exito, { marginTop: -10 }]}>{exito}</Text> : null}
      <Boton tipo="start" icono="key-fill" texto={enviando ? 'Guardando…' : 'Cambiar contraseña'} onPress={enviar} deshabilitado={enviando} />
      {obligatorio
        ? <Boton icono="box-arrow-right" texto="Cerrar sesión" onPress={cerrarSesion} />
        : <Boton texto="Cancelar" onPress={() => onCancelar?.()} />}
    </>
  );
  if (obligatorio) return <Tarjeta>{cuerpo}</Tarjeta>;
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.borderBright, borderRadius: 12, paddingVertical: 24, paddingHorizontal: 20, gap: 14 }}>{cuerpo}</View>
    </ScrollView>
  );
}

/** Primera pantalla: elegir entre simulación local y servidor real */
export function ElegirOrigen() {
  const s = useStyles(); const t = useTheme(); const { cambiarOrigen } = useTms();
  return (
    <Tarjeta>
      <Marca titulo="Sistema de Adquisición de Datos" subtitulo="¿Cómo quieres usar la app?" />
      <View style={{ gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, backgroundColor: t.bgSurface }}>
        <View style={s.fila}><Icono nombre="hdd-network" tam={16} color={t.guindaBright} /><Text style={[s.panelTitulo, { fontSize: 17 }]}>Servidor real</Text></View>
        <Text style={[s.sec, { fontSize: 13 }]}>Se conecta a la Raspberry Pi donde se hacen las mediciones reales con la Pico W y se guardan en la base de datos. Necesitas su IP y tu usuario.</Text>
        <Boton tipo="start" icono="box-arrow-in-right" texto="Conectar al servidor" onPress={() => cambiarOrigen('servidor')} />
      </View>
      <View style={{ gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, backgroundColor: t.bgSurface }}>
        <View style={s.fila}><Icono nombre="cpu" tam={16} color={t.yellow} /><Text style={[s.panelTitulo, { fontSize: 17 }]}>Simulación local</Text></View>
        <Text style={[s.sec, { fontSize: 13 }]}>El celular genera números aleatorios con la forma del campo de una bobina. No necesita servidor ni Wi-Fi: sirve para practicar o hacer demostraciones. Las sesiones se guardan solo en este celular.</Text>
        <Boton icono="play-fill" texto="Usar la simulación" onPress={() => cambiarOrigen('simulacion')} />
      </View>
      <Text style={[s.sec, { fontSize: 13, textAlign: 'center' }]}>Puedes cambiar de origen cuando quieras desde el menú ☰.</Text>
    </Tarjeta>
  );
}
