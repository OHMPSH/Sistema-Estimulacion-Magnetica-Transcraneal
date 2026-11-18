/**
 * Configuración por secciones (equivale a ConfiguracionPage.jsx de la web): General (punto de inicio de la medición),
 * Barrido, Sensor (modelo, rango y calibración), Simulación, Dispositivo (estado, token y latido), Visualización y Usuarios.
 * Para quien no es admin todo es de solo lectura. En la simulación local solo aplican Barrido, Simulación y Visualización.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from '../portapapeles';
import { FUENTES, mezcla, useStyles, useTheme } from '../theme';
import { useMedicion, useTms } from '../store';
import { Aviso, Boton, Campo, Casilla, Datos, Icono, Mensaje, Selector, useConfirmacion } from '../ui';
import type { NombreIcono } from '../glifos';
import { useDispositivoVista } from '../hooks';
import * as U from '../util';

interface CampoCfg { ruta: string[]; etiqueta: string; tipo: 'entero' | 'numero' | 'select' | 'bool'; unidad?: string; ayuda?: string; opciones?: { valor: any; etiqueta: string }[] }
const leerRuta = (o: any, r: string[]) => r.reduce((a, k) => (a == null ? undefined : a[k]), o);
const aTexto = (v: any) => (v === undefined || v === null ? '' : String(v));
function escribirRuta(obj: any, ruta: string[], valor: any) {
  const copia = JSON.parse(JSON.stringify(obj ?? {})); let o = copia;
  ruta.slice(0, -1).forEach(k => { o[k] = { ...(o[k] ?? {}) }; o = o[k]; });
  o[ruta[ruta.length - 1]] = valor; return copia;
}
const AVISO_SESION = 'No se puede cambiar con una medición en curso (el servidor responde 409).';

function Titulo({ texto }: { texto: string }) {
  const s = useStyles();
  return <Text accessibilityRole="header" style={s.panelTitulo}>{texto}</Text>;
}
function Subtitulo({ texto }: { texto: string }) {
  const t = useTheme();
  return <Text style={{ fontFamily: FUENTES.semi, fontSize: 13, color: t.text2, marginBottom: 8 }}>{texto}</Text>;
}
/** Separador entre secciones (.seccion-config + .seccion-config) */
function Bloque({ children, primero }: { children: React.ReactNode; primero?: boolean }) {
  const t = useTheme();
  return <View style={primero ? null : { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: t.border }}>{children}</View>;
}

/** Formulario de una clave (SeccionFormulario.jsx) */
function SeccionFormulario({ clave, titulo, descripcion, campos, soloLectura, extra, relleno, primero = true }: {
  clave: string; titulo: string; descripcion?: string; campos: CampoCfg[]; soloLectura: boolean; extra?: React.ReactNode;
  relleno?: { etiqueta: string; valores: Record<string, any> }; primero?: boolean;
}) {
  const s = useStyles(); const { config, guardarClave } = useTms();
  const actual = config?.[clave]; const firma = JSON.stringify(actual);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<{ guardando: boolean; mensaje: string; error: string; errores: Record<string, string> }>({ guardando: false, mensaje: '', error: '', errores: {} });
  useEffect(() => { const b: Record<string, string> = {}; for (const c of campos) b[c.ruta.join('.')] = aTexto(leerRuta(actual, c.ruta)); setBorrador(b); }, [firma]); // eslint-disable-line react-hooks/exhaustive-deps
  const cambiado = campos.some(c => borrador[c.ruta.join('.')] !== aTexto(leerRuta(actual, c.ruta)));

  const guardar = async () => {
    let valor: any = {};
    for (const c of campos) {
      const texto = borrador[c.ruta.join('.')] ?? '';
      const v = c.tipo === 'bool' ? texto === 'true' : c.tipo === 'select' ? (c.opciones!.find(o => String(o.valor) === texto)?.valor ?? texto) : texto.trim() === '' ? null : Number(texto.replace(',', '.'));
      valor = escribirRuta(valor, c.ruta, v);
    }
    setEstado({ guardando: true, mensaje: '', error: '', errores: {} });
    const r = await guardarClave(clave, valor);
    if (r.ok) { setEstado({ guardando: false, mensaje: 'Cambios guardados.', error: '', errores: {} }); return; }
    const porCampo: Record<string, string> = {}; const generales: string[] = [];
    for (const m of r.errores?.length ? r.errores : [r.error ?? 'No se pudo guardar.']) {
      const c = campos.find(x => m?.startsWith(x.ruta.join('.'))); if (c) porCampo[c.ruta.join('.')] = m; else generales.push(m);
    }
    setEstado({ guardando: false, mensaje: '', errores: porCampo, error: generales.length ? (r.status === 409 ? 'No se puede guardar ahora: ' : '') + generales.join(' ') : Object.keys(porCampo).length ? 'Revisa los campos marcados.' : '' });
  };
  if (!actual) return <Text style={s.sec}>Cargando la configuración…</Text>;
  return (
    <Bloque primero={primero}>
      <Titulo texto={titulo} />
      {descripcion ? <Text style={[s.sec, { marginTop: 8 }]}>{descripcion}</Text> : null}
      {soloLectura && <Aviso icono="eye" texto="Solo lectura: únicamente un admin puede cambiar la configuración." />}
      <View style={{ gap: 14, marginVertical: 12 }}>
        {campos.map(c => {
          const k = c.ruta.join('.');
          const error = estado.errores[k];
          if (c.tipo === 'bool') return (
            <View key={k}>
              <Casilla etiqueta={c.etiqueta} valor={borrador[k] === 'true'} deshabilitado={soloLectura} onCambio={v => setBorrador(b => ({ ...b, [k]: String(v) }))} />
              {c.ayuda ? <Text style={[s.ayuda, { marginTop: 0 }]}>{c.ayuda}</Text> : null}
              {error ? <Text style={s.error}>{error}</Text> : null}
            </View>
          );
          if (c.tipo === 'select') return (
            <Selector key={k} etiqueta={`${c.etiqueta}${c.unidad ? ` (${c.unidad})` : ''}`} deshabilitado={soloLectura} ayuda={c.ayuda} error={error}
              opciones={c.opciones!.map(o => ({ valor: String(o.valor), etiqueta: o.etiqueta }))} valor={borrador[k] ?? ''} onCambio={v => setBorrador(b => ({ ...b, [k]: v }))} />
          );
          return (
            <Campo key={k} etiqueta={c.etiqueta} unidad={c.unidad} ayuda={c.ayuda} error={error} editable={!soloLectura} value={borrador[k] ?? ''}
              style={{ fontVariant: ['tabular-nums'] }} onChangeText={v => setBorrador(b => ({ ...b, [k]: v }))}
              keyboardType={c.tipo === 'entero' ? 'number-pad' : 'numbers-and-punctuation'} />
          );
        })}
      </View>
      {relleno && !soloLectura && (
        <Boton style={{ alignSelf: 'flex-start', marginBottom: 8 }} texto={relleno.etiqueta}
          onPress={() => setBorrador(b => ({ ...b, ...Object.fromEntries(Object.entries(relleno.valores).map(([k, v]) => [k, aTexto(v)])) }))} />
      )}
      {extra}
      {!soloLectura && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <Boton tipo="start" icono="check2" texto={estado.guardando ? 'Guardando…' : 'Guardar cambios'} onPress={guardar} deshabilitado={estado.guardando} />
          {cambiado && !estado.guardando && <Text style={[s.ayuda, { marginTop: 0 }]}>Hay cambios sin guardar.</Text>}
        </View>
      )}
      <Mensaje texto={estado.mensaje} /><Mensaje texto={estado.error} error />
    </Bloque>
  );
}

/** Modelo del magnetómetro (SelectorModeloSensor.jsx) */
const DESCRIPCION_MODELO: Record<string, string> = { QMC5883P: 'QMC5883P (módulo real)', HMC5883L: 'HMC5883L (firmware del Hall)' };
const AYUDA_MODELO: Record<string, string> = {
  QMC5883P: 'Cuentas de 16 bits con signo; la saturación llega como un bit aparte (−4096 es una cuenta válida).',
  HMC5883L: '«Cuentas HMC» de −4096 a 2047; −4096 en un eje es saturación. Lo usa el firmware del sensor Hall 49E.',
};
function SelectorModeloSensor({ soloLectura, sesionAbierta }: { soloLectura: boolean; sesionAbierta: boolean }) {
  const s = useStyles(); const { config, opciones, guardarClave } = useTms();
  const actual = config?.sensor?.modelo ?? 'HMC5883L';
  const [elegido, setElegido] = useState(actual);
  const [estado, setEstado] = useState({ guardando: false, mensaje: '', error: '' });
  useEffect(() => { setElegido(actual); }, [actual]);
  const cambiar = async () => {
    if (elegido === actual) { setEstado({ guardando: false, mensaje: `El modelo ya es ${actual}.`, error: '' }); return; }
    setEstado({ guardando: true, mensaje: '', error: '' });
    const r = await guardarClave('sensor', { modelo: elegido });
    setEstado(r.ok ? { guardando: false, mensaje: `Modelo cambiado a ${elegido}.`, error: '' }
      : { guardando: false, mensaje: '', error: (r.status === 409 ? 'No se puede cambiar ahora: ' : '') + (r.errores?.join(' ') || r.error || 'No se pudo cambiar el modelo.') });
  };
  return (
    <Bloque primero>
      <Titulo texto="Modelo del sensor" />
      <Text style={[s.sec, { marginTop: 8 }]}>Define cómo el servidor interpreta las cuentas que manda la Pico W. Al cambiarlo se usan los valores de ese modelo (QMC5883P en 30 G; HMC5883L en 1,9 Ga) y se conservan las lecturas por punto y el offset.</Text>
      <Aviso icono="exclamation-triangle" texto="Para usar el firmware del sensor Hall 49E (firmware_hall_1d), pon antes el modelo HMC5883L: ese firmware manda «cuentas HMC» y, con el QMC5883P, se guardarían mal sin ningún error." />
      <View style={{ marginVertical: 12 }}>
        <Selector etiqueta="Modelo" valor={elegido} onCambio={setElegido} deshabilitado={soloLectura || sesionAbierta}
          opciones={(opciones?.modelos_sensor ?? ['QMC5883P', 'HMC5883L']).map((m: string) => ({ valor: m, etiqueta: DESCRIPCION_MODELO[m] ?? m }))}
          ayuda={`Vigente: ${actual}. ${AYUDA_MODELO[elegido] ?? ''}${sesionAbierta ? ' No se puede cambiar con una medición en curso.' : ''}`} />
      </View>
      {!soloLectura && <Boton style={{ alignSelf: 'flex-start' }} tipo="start" icono="arrow-repeat" texto={estado.guardando ? 'Cambiando…' : 'Cambiar modelo'} onPress={cambiar} deshabilitado={estado.guardando || sesionAbierta} />}
      <Mensaje texto={estado.mensaje} /><Mensaje texto={estado.error} error />
    </Bloque>
  );
}

/** Estado de la Pico W, token y latido (SeccionDispositivo.jsx + TokenDispositivo.jsx) */
function SeccionDispositivo({ esAdmin, zona }: { esAdmin: boolean; zona?: string }) {
  const s = useStyles(); const t = useTheme();
  const { api, recargarDispositivo } = useTms();
  const { estado, segundos, texto } = useDispositivoVista();
  const { confirmar, elemento } = useConfirmacion();
  const [token, setToken] = useState(''); const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState({ texto: '', error: false }); const [mensajeToken, setMensajeToken] = useState({ texto: '', error: false });
  useEffect(() => { recargarDispositivo(); }, [recargarDispositivo]);

  const generar = async () => {
    if (estado?.tieneToken && !(await confirmar({ titulo: 'Regenerar el token de la Pico W', mensaje: 'El token anterior deja de funcionar al instante: la Pico W no podrá enviar lecturas hasta que le pongas el nuevo.', textoConfirmar: 'Sí, generar otro', peligro: true }))) return;
    setTrabajando(true); setMensajeToken({ texto: '', error: false });
    const r = await api!.post('/dispositivo/token'); setTrabajando(false);
    if (r.ok) { setToken(r.json.token); recargarDispositivo(); } else setMensajeToken({ texto: r.json.error || 'No se pudo generar el token.', error: true });
  };
  const copiar = async () => {
    const ok = await Clipboard.copiar(token);
    setMensajeToken(ok ? { texto: 'Token copiado al portapapeles.', error: false } : { texto: 'No se pudo copiar automáticamente: mantén presionado el token para seleccionarlo.', error: false });
  };
  const revocar = async () => {
    if (!(await confirmar({ titulo: 'Revocar el token', mensaje: 'La Pico W recibirá 401 y dejará de enviar lecturas hasta que generes otro token.', textoConfirmar: 'Sí, revocar', peligro: true }))) return;
    const r = await api!.del('/dispositivo/token');
    setAviso(r.ok ? { texto: 'Token revocado.', error: false } : { texto: r.json.error || 'No se pudo revocar.', error: true }); setToken(''); recargarDispositivo();
  };
  const cambiarActivo = async () => {
    const r = await api!.patch('/dispositivo', { activo: !estado?.activo });
    setAviso(r.ok ? { texto: `Pico W ${estado?.activo ? 'desactivada' : 'activada'}.`, error: false } : { texto: r.json.error || 'No se pudo cambiar.', error: true }); recargarDispositivo();
  };

  return (
    <>
      <SeccionFormulario clave="dispositivo" titulo="Dispositivo (Pico W)" soloLectura={!esAdmin}
        descripcion="La Pico W manda un latido cada cierto tiempo; si deja de llegar más tiempo que el umbral, se muestra «sin señal»."
        campos={[
          { ruta: ['intervalo_latido_s'], etiqueta: 'Intervalo de latido', tipo: 'entero', unidad: 's', ayuda: 'Cada cuánto pregunta la Pico al servidor (1 a 300 s).' },
          { ruta: ['umbral_desconexion_s'], etiqueta: 'Umbral de desconexión', tipo: 'entero', unidad: 's', ayuda: 'Debe ser mayor que el intervalo de latido.' },
        ]}
        extra={(
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <Subtitulo texto="Estado" />
            <Datos filas={[
              { k: 'Dispositivo', v: estado?.nombre ?? '—' },
              { k: 'Conexión', v: texto },
              { k: 'Error informado', v: estado?.enLinea && estado.errorPico ? estado.errorPico : '—' },
              { k: 'Último latido', v: estado?.ultimoLatido ? `${U.fechaHora(estado.ultimoLatido, zona)} (hace ${U.duracionCorta(segundos ?? 0)})` : '—', mono: true },
              { k: 'IP', v: estado?.ip ?? '—', mono: true },
              { k: 'Firmware', v: estado?.firmware ?? '—', mono: true },
              { k: 'Señal Wi-Fi', v: estado?.rssi != null ? `${estado.rssi} dBm` : '—', mono: true },
              { k: 'Desfase de reloj', v: estado?.desfase_ms != null ? `${estado.desfase_ms} ms` : '—', mono: true },
              { k: 'Token', v: estado?.tieneToken ? 'Configurado' : 'Sin token' },
              { k: 'Activa', v: estado?.activo ? 'Sí' : 'No' },
            ]} />
          </View>
        )} />
      {esAdmin && (
        <Bloque>
          <Subtitulo texto="Token de la Pico W" />
          <Text style={[s.txt, { marginBottom: 8 }]}>{estado?.tieneToken ? 'La Pico W ya tiene un token.' : 'La Pico W todavía no tiene token: genera uno para que pueda enviar lecturas.'}</Text>
          <Boton style={{ alignSelf: 'flex-start' }} tipo="start" icono="key" texto={trabajando ? 'Generando…' : estado?.tieneToken ? 'Regenerar token' : 'Generar token'} onPress={generar} deshabilitado={trabajando} />
          {token ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Icono nombre="exclamation-triangle" tam={14} color={t.aviso} style={{ marginTop: 3 }} />
                <Text style={[s.txt, { flex: 1 }]}>Cópialo ahora: <Text style={s.fuerte}>no se volverá a mostrar</Text>. Guárdalo en la constante TOKEN del firmware (ver docs/firmware-pico-w.md).</Text>
              </View>
              <Text selectable style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.text, backgroundColor: t.bgSurface, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: t.border, borderRadius: 6 }}>{token}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Boton chico icono="clipboard" texto="Copiar" onPress={copiar} />
                <Boton chico icono="eye-slash" texto="Ocultar" onPress={() => { setToken(''); setMensajeToken({ texto: '', error: false }); }} />
              </View>
            </View>
          ) : null}
          <Mensaje texto={mensajeToken.texto} error={mensajeToken.error} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {estado?.tieneToken && <Boton tipo="stop" icono="x-octagon" texto="Revocar token" onPress={revocar} />}
            {estado?.existe && <Boton texto={estado.activo ? 'Desactivar la Pico W' : 'Activar la Pico W'} onPress={cambiarActivo} />}
          </View>
          <Mensaje texto={aviso.texto} error={aviso.error} />
        </Bloque>
      )}
      {elemento}
    </>
  );
}

/** Usuarios (SeccionUsuarios.jsx): crear, rol, activar/desactivar y restablecer la contraseña */
const ROLES = ['admin', 'operador', 'observador'];
function explicar(json: any, status: number) {
  if (status === 409 && /admin/i.test(json.error ?? '')) return `${json.error} Debe quedar al menos un administrador activo: crea o activa otro antes.`;
  return json.error || 'No se pudo completar la acción.';
}
function FilaUsuario({ u, esYo, zona, onCambio, onAviso }: { u: any; esYo: boolean; zona?: string; onCambio: () => void; onAviso: (a: { texto: string; error: boolean }) => void }) {
  const s = useStyles(); const t = useTheme(); const { api } = useTms();
  const [restableciendo, setRestableciendo] = useState(false);
  const [password, setPassword] = useState(''); const [trabajando, setTrabajando] = useState(false);
  const patch = async (cambio: any, exito: string) => {
    setTrabajando(true); const r = await api!.patch(`/usuarios/${u.id}`, cambio); setTrabajando(false);
    onAviso(r.ok ? { texto: exito, error: false } : { texto: explicar(r.json, r.status), error: true }); if (r.ok) onCambio();
  };
  const restablecer = async () => {
    setTrabajando(true); const r = await api!.post(`/usuarios/${u.id}/restablecer-password`, { password }); setTrabajando(false);
    onAviso(r.ok ? { texto: `Contraseña de ${u.usuario} restablecida: deberá cambiarla al entrar.`, error: false } : { texto: explicar(r.json, r.status), error: true });
    if (r.ok) { setPassword(''); setRestableciendo(false); onCambio(); }
  };
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border, gap: 8, opacity: u.activo ? 1 : 0.7 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.txt, s.fuerte]}>{u.nombre}{esYo ? ' (tú)' : ''}</Text>
          <Text style={[s.sec, s.cifra, { fontSize: 13 }]}>{u.usuario}</Text>
        </View>
        <Text style={[s.sec, { fontSize: 13, textAlign: 'right', flexShrink: 1 }]}>{u.activo ? 'Activo' : 'Desactivado'}{u.debe_cambiar_password ? ' · debe cambiar la contraseña' : ''}</Text>
      </View>
      <Text style={[s.sec, { fontSize: 12 }]}>Último acceso: <Text style={s.cifra}>{U.fechaHora(u.ultimo_acceso, zona)}</Text></Text>
      <Selector accessibilityLabel={`Rol de ${u.usuario}`} valor={u.rol} deshabilitado={trabajando} opciones={ROLES.map(r => ({ valor: r, etiqueta: U.ROLES_TEXTO[r] }))}
        onCambio={r => patch({ rol: r }, `Rol de ${u.usuario} cambiado a ${U.ROLES_TEXTO[r]}.`)} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Boton chico texto={u.activo ? 'Desactivar' : 'Activar'} deshabilitado={trabajando}
          onPress={() => patch({ activo: !u.activo }, `${u.usuario} ${u.activo ? 'desactivado: sus sesiones se cerraron' : 'activado'}.`)} />
        <Boton chico texto="Restablecer contraseña" onPress={() => setRestableciendo(v => !v)} />
      </View>
      {restableciendo && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <Campo contenedor={{ flex: 1 }} secureTextEntry placeholder="Contraseña temporal (mín. 8)…" accessibilityLabel={`Contraseña temporal para ${u.usuario}`} value={password} onChangeText={setPassword} />
          <Boton tipo="start" texto="Guardar" onPress={restablecer} deshabilitado={trabajando || password.length < 8} />
        </View>
      )}
    </View>
  );
}
function SeccionUsuarios({ zona }: { zona?: string }) {
  const s = useStyles(); const { api, usuario } = useTms();
  const [lista, setLista] = useState<any[]>([]);
  const [aviso, setAviso] = useState({ texto: '', error: false });
  const [nuevo, setNuevo] = useState({ usuario: '', nombre: '', rol: 'operador', password: '' });
  const [creando, setCreando] = useState(false);
  const cargar = async () => { const r = await api!.get('/usuarios'); if (r.ok) setLista(r.json.data ?? []); else setAviso({ texto: r.json.error, error: true }); };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const crear = async () => {
    setCreando(true); const r = await api!.post('/usuarios', nuevo); setCreando(false);
    if (r.ok) { setAviso({ texto: `Usuario ${r.json.data?.usuario ?? nuevo.usuario} creado. Deberá cambiar la contraseña al entrar.`, error: false }); setNuevo({ usuario: '', nombre: '', rol: 'operador', password: '' }); cargar(); }
    else setAviso({ texto: r.status === 409 ? `Ya existe un usuario llamado "${nuevo.usuario.trim().toLowerCase()}".` : explicar(r.json, r.status), error: true });
  };
  return (
    <Bloque primero>
      <Titulo texto="Usuarios" />
      <Text style={[s.sec, { marginTop: 8 }]}>Admin: todo. Operador: inicia y detiene barridos, edita las notas de sus sesiones y exporta. Observador: solo mira y exporta.</Text>
      <Mensaje texto={aviso.texto} error={aviso.error} />
      <View style={{ marginTop: 8 }}>
        {lista.map(u => <FilaUsuario key={u.id} u={u} esYo={u.id === usuario?.id} zona={zona} onCambio={cargar} onAviso={setAviso} />)}
      </View>
      <Bloque>
        <Subtitulo texto="Crear usuario" />
        <View style={{ gap: 14 }}>
          <Campo etiqueta="Usuario" placeholder="por ejemplo, jperez…" value={nuevo.usuario} onChangeText={v => setNuevo(n => ({ ...n, usuario: v }))} />
          <Campo etiqueta="Nombre para mostrar" autoCapitalize="words" value={nuevo.nombre} onChangeText={v => setNuevo(n => ({ ...n, nombre: v }))} />
          <Selector etiqueta="Rol" valor={nuevo.rol} onCambio={rol => setNuevo(n => ({ ...n, rol }))} opciones={ROLES.map(r => ({ valor: r, etiqueta: U.ROLES_TEXTO[r] }))} />
          <Campo etiqueta="Contraseña temporal" secureTextEntry value={nuevo.password} onChangeText={v => setNuevo(n => ({ ...n, password: v }))} />
        </View>
        <Text style={s.ayuda}>De 3 a 32 caracteres: minúsculas, dígitos, punto, guion o guion bajo. La contraseña temporal debe tener al menos 8 caracteres.</Text>
        <Boton style={{ alignSelf: 'flex-start', marginTop: 12 }} tipo="start" icono="person-plus" texto={creando ? 'Creando…' : 'Crear usuario'} onPress={crear} deshabilitado={creando} />
      </Bloque>
    </Bloque>
  );
}

const SECCIONES: [string, string, NombreIcono][] = [
  ['general', 'General', 'crosshair'], ['barrido', 'Barrido', 'grid-3x3'], ['sensor', 'Sensor', 'magnet'], ['simulacion', 'Simulación', 'cpu'],
  ['dispositivo', 'Dispositivo', 'broadcast-pin'], ['visualizacion', 'Visualización', 'graph-up'], ['usuarios', 'Usuarios', 'people'],
];
const DESCANSO_MM = { x: 0, y: 562, z: 88 }, ORIGEN_MM = { x: 0, y: 0, z: 0 };

export function Configuracion({ aviso, pie, seccion, onSeccion }: { aviso: React.ReactNode; pie: React.ReactNode; seccion: string; onSeccion: (s: string) => void }) {
  const s = useStyles(); const t = useTheme();
  const { usuario, config, opciones, origen } = useTms();
  const { enCurso } = useMedicion();
  const local = origen === 'simulacion';
  const esAdmin = usuario?.rol === 'admin';
  const zona = config?.datos?.zona_horaria;
  const sensor = config?.sensor;
  const esQMC = sensor?.modelo === 'QMC5883P';
  const sesionAbierta = enCurso;
  const visibles = SECCIONES.filter(([k]) => !local || ['barrido', 'simulacion', 'visualizacion'].includes(k));
  const actual = visibles.some(([k]) => k === seccion) ? seccion : 'barrido';
  const nota = (texto: string) => (sesionAbierta ? `${texto} ${AVISO_SESION}` : texto);

  const camposSensor = useMemo<CampoCfg[]>(() => {
    const rango: CampoCfg = esQMC
      ? { ruta: ['rango_g'], etiqueta: 'Rango', tipo: 'select', opciones: (opciones?.rangos_qmc5883p ?? []).map((r: any) => ({ valor: r.rango_g, etiqueta: `±${r.rango_g} G (fondo ${U.numero(r.fondo_ut, 1)} µT)` })),
          ayuda: 'Las cuentas por gauss salen del rango: 15000 (2 G), 3750 (8 G), 2500 (12 G) y 1000 (30 G).' }
      : { ruta: ['rango_ga'], etiqueta: 'Rango (ganancia)', tipo: 'select', opciones: (opciones?.ganancias_hmc5883l ?? []).map((g: any) => ({ valor: g.rango_ga, etiqueta: `±${U.numero(g.rango_ga, 2)} Ga (fondo ${U.numero((2047 / g.lsb_por_ga) * 100, 1)} µT)` })) };
    return [rango,
      { ruta: ['lecturas_por_punto'], etiqueta: 'Lecturas por punto', tipo: 'entero', ayuda: 'De 1 a 100.' },
      { ruta: ['offset_ut', 'x'], etiqueta: 'Offset X', tipo: 'numero', unidad: 'µT', ayuda: 'Se resta a cada lectura convertida. La Pico imprime el fondo (Tierra y entorno, con la bobina apagada) al arrancar: cópialo aquí.' },
      { ruta: ['offset_ut', 'y'], etiqueta: 'Offset Y', tipo: 'numero', unidad: 'µT' },
      { ruta: ['offset_ut', 'z'], etiqueta: 'Offset Z', tipo: 'numero', unidad: 'µT' }];
  }, [esQMC, opciones]);

  let contenido: React.ReactNode;
  switch (actual) {
    case 'general':
      contenido = (
        <SeccionFormulario clave="general" titulo="Punto de inicio de la medición" soloLectura={!esAdmin}
          descripcion={nota(`Dónde empieza la zona de cada medición en la mesa real, en coordenadas de la mesa: X de 0 a 410 mm, Y de 0 a 562 mm y Z de 0 a 88 mm. La mesa descansa en (${DESCANSO_MM.x}, ${DESCANSO_MM.y}, ${DESCANSO_MM.z}): al iniciar una medición va a este punto, desde ahí la zona crece hacia X+, Y+ y Z+ (el plano z = 0 es el más bajo), y al terminar vuelve a descansar. Si la zona no cabe en la mesa, la Pico W rechaza la sesión y el aviso aparece en el dashboard. Se copia en cada sesión al iniciarla.`)}
          campos={[
            { ruta: ['inicio_medicion', 'x_mm'], etiqueta: 'Inicio en X', tipo: 'numero', unidad: 'mm', ayuda: 'Eje corto de la mesa (0–410 mm). La zona avanza hacia X+.' },
            { ruta: ['inicio_medicion', 'y_mm'], etiqueta: 'Inicio en Y', tipo: 'numero', unidad: 'mm', ayuda: 'Eje largo de la mesa (0–562 mm). La zona avanza hacia Y+.' },
            { ruta: ['inicio_medicion', 'z_mm'], etiqueta: 'Inicio en Z (altura)', tipo: 'numero', unidad: 'mm', ayuda: 'De 0 a 88 mm. Es la altura del plano z = 0; los demás planos quedan arriba.' },
          ]}
          relleno={{ etiqueta: `Usar el origen (${ORIGEN_MM.x}, ${ORIGEN_MM.y}, ${ORIGEN_MM.z})`, valores: { 'inicio_medicion.x_mm': ORIGEN_MM.x, 'inicio_medicion.y_mm': ORIGEN_MM.y, 'inicio_medicion.z_mm': ORIGEN_MM.z } }} />
      );
      break;
    case 'sensor':
      contenido = (
        <>
          <SelectorModeloSensor soloLectura={!esAdmin} sesionAbierta={sesionAbierta} />
          <SeccionFormulario key={sensor?.modelo ?? 'sin-modelo'} primero={false} clave="sensor" titulo={`Rango y calibración (${sensor?.modelo ?? '—'})`} soloLectura={!esAdmin}
            descripcion={nota(esQMC
              ? 'El rango fija el fondo de escala: por encima, el QMC5883P avisa con su bit de saturación y la lectura se guarda como saturada (sin Bx, By ni Bz). µT = cuentas / cuentas por gauss × 100 − offset.'
              : 'La ganancia fija el fondo de escala: por encima, el registro se desborda (−4096) y la lectura se guarda como saturada. µT = cuentas / LSB por gauss × 100 − offset.')}
            campos={camposSensor}
            extra={<Text style={[s.sec, { marginBottom: 8 }]}>{esQMC ? 'Cuentas por gauss' : 'LSB por gauss'} vigentes (se calculan del rango): <Text style={[s.cifra, s.fuerte]}>{(esQMC ? sensor?.cuentas_por_g : sensor?.lsb_por_ga) ?? '—'}</Text>. El botón «Medir cero» queda pendiente: el servidor todavía no lo soporta.</Text>} />
        </>
      );
      break;
    case 'simulacion':
      contenido = (
        <SeccionFormulario clave="simulacion" titulo="Simulación" soloLectura={!esAdmin}
          descripcion={local ? 'Parámetros de los números aleatorios que genera este celular (simulación local). Se aplican en la siguiente medición.' : 'Parámetros del simulador del servidor. Se copian en cada sesión al iniciarla (incluida la semilla), así la sesión se puede reproducir.'}
          campos={[
            { ruta: ['ms_por_punto', 'DC'], etiqueta: 'Tiempo por punto en DC (rápida)', tipo: 'entero', unidad: 'ms' },
            { ruta: ['ms_por_punto', 'AC'], etiqueta: 'Tiempo por punto en AC (normal)', tipo: 'entero', unidad: 'ms' },
            ...(local ? [] : [{ ruta: ['semilla'], etiqueta: 'Semilla', tipo: 'entero' as const, ayuda: 'La misma semilla con la misma configuración reproduce el mismo barrido.' }]),
            { ruta: ['ruido_sigma_ut'], etiqueta: 'Ruido (σ)', tipo: 'numero', unidad: 'µT' },
            { ruta: ['radio_bobina_mm'], etiqueta: 'Radio de la bobina', tipo: 'numero', unidad: 'mm' },
            { ruta: ['campo_centro_ut'], etiqueta: '|B| en el centro (Z = 0)', tipo: 'numero', unidad: 'µT' },
            { ruta: ['prob_hueco'], etiqueta: 'Probabilidad de hueco', tipo: 'numero', ayuda: 'De 0 a 1.' },
            { ruta: ['prob_saturacion'], etiqueta: 'Probabilidad de saturación', tipo: 'numero', ayuda: 'De 0 a 1.' },
          ]} />
      );
      break;
    case 'dispositivo': contenido = <SeccionDispositivo esAdmin={esAdmin} zona={zona} />; break;
    case 'visualizacion':
      contenido = (
        <SeccionFormulario clave="visualizacion" titulo="Visualización" soloLectura={!esAdmin}
          descripcion={local ? 'Afecta al dashboard de la simulación local.' : 'Afecta a todos los que miran el dashboard.'}
          campos={[
            { ruta: ['ventana_grafica'], etiqueta: 'Lecturas en la gráfica de líneas', tipo: 'entero' },
            { ruta: ['filas_tabla'], etiqueta: 'Filas de la tabla', tipo: 'entero' },
            { ruta: ['decimales'], etiqueta: 'Decimales', tipo: 'entero', ayuda: 'Solo para mostrar: los datos se guardan sin redondear.' },
            { ruta: ['rotacion_auto'], etiqueta: 'Rotación automática del mapa 3D', tipo: 'bool', ayuda: 'Nunca rota si el sistema pide reducir el movimiento.' },
            { ruta: ['reducir_animaciones'], etiqueta: 'Reducir animaciones', tipo: 'bool' },
          ]} />
      );
      break;
    case 'usuarios':
      contenido = esAdmin ? <SeccionUsuarios zona={zona} /> : (
        <Bloque primero><Titulo texto="Usuarios" /><Aviso icono="shield-lock" texto="Esta sección es solo para administradores. Pide a un admin que cree o cambie usuarios." /></Bloque>
      );
      break;
    default:
      contenido = (
        <SeccionFormulario clave="barrido" titulo="Barrido" soloLectura={!esAdmin}
          descripcion={nota('Los límites de la base son lo más que puede recorrer la mesa en cada eje. En cada medición el operador elige la zona de muestreo (X × Y × Z) y el sistema no deja que pase de estos límites; si cambias de base, ajústalos aquí. La zona va centrada bajo la bobina.')}
          campos={[
            { ruta: ['limite_x_mm'], etiqueta: 'Límite de la base en X', tipo: 'numero', unidad: 'mm', ayuda: 'Recorrido máximo de la mesa en X. Entre 1 y 1000 mm, con un decimal.' },
            { ruta: ['limite_y_mm'], etiqueta: 'Límite de la base en Y', tipo: 'numero', unidad: 'mm', ayuda: 'Recorrido máximo de la mesa en Y. Entre 1 y 1000 mm, con un decimal.' },
            { ruta: ['limite_z_mm'], etiqueta: 'Límite de la base en Z (altura)', tipo: 'numero', unidad: 'mm', ayuda: 'Altura máxima sobre el standoff. Entre 0 y 500 mm; 0 = un solo plano.' },
            { ruta: ['standoff_mm'], etiqueta: 'Separación bobina–sensor (standoff)', tipo: 'numero', unidad: 'mm' },
            { ruta: ['paso_predeterminado_mm'], etiqueta: 'Paso predeterminado', tipo: 'numero', unidad: 'mm', ayuda: 'El que aparece al abrir el dashboard; el operador puede escribir otro en cada medición. Los más usados: 5, 10 y 20 mm. Desde 1 mm, con un decimal.' },
          ]} />
      );
  }

  return (
    <ScrollView style={s.pantalla} contentContainerStyle={[s.contenido, { maxWidth: 900, width: '100%', alignSelf: 'center' }]} keyboardShouldPersistTaps="handled">
      {aviso}
      <Text accessibilityRole="header" style={s.tituloPagina}>Configuración</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 }} accessibilityLabel="Secciones de la configuración">
        {visibles.map(([k, e, ic]) => {
          const activo = actual === k;
          return (
            <Pressable key={k} accessibilityRole="link" accessibilityState={{ selected: activo }} onPress={() => onSeccion(k)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
                activo && { borderColor: t.guindaBright, backgroundColor: mezcla(t.guindaBright, 0.1) }, pressed && !activo && { backgroundColor: t.bgCardHover }]}>
              <Icono nombre={ic} tam={14} />
              <Text style={[s.txt, activo && s.fuerte]}>{e}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.panel}>{contenido}</View>
      {pie}
    </ScrollView>
  );
}
