/** Dirección del servidor real. Se puede guardar aunque el servidor esté apagado o sin conexión. */
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FUENTES, useStyles, useTheme } from '../theme';
import { useTms } from '../store';
import { normalizarUrl } from '../storage';
import { probarServidor } from '../api';
import { Boton, Campo, Logo, Mensaje, useConfirmacion } from '../ui';

export function Conexion({ onCerrar }: { onCerrar?: () => void }) {
  const s = useStyles(); const t = useTheme(); const ins = useSafeAreaInsets();
  const { perfil, guardarPerfil, borrarPerfil, cambiarOrigen } = useTms();
  const { confirmar, elemento } = useConfirmacion();
  const [url, setUrl] = useState(perfil?.url ?? '');
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null);
  const [probando, setProbando] = useState(false);
  const final = normalizarUrl(url);

  const probar = async () => {
    setProbando(true); setPrueba(null);
    const r = await probarServidor(final); setProbando(false);
    setPrueba(r.ok ? { ok: true, texto: `Servidor encontrado · versión ${r.datos.version_software ?? r.datos.version ?? '?'} · modo ${r.datos.modo_operacion === 'real' ? 'real' : 'simulación'}` } : { ok: false, texto: `${r.error}` });
  };
  const guardar = async () => { await guardarPerfil({ id: 'servidor', nombre: 'Servidor', url: final }); onCerrar?.(); };
  const quitar = async () => {
    if (perfil && await confirmar({ titulo: 'Quitar el servidor', mensaje: 'Se olvidará la dirección y la sesión guardada en este celular.', textoConfirmar: 'Quitar', peligro: true })) borrarPerfil(perfil.id);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24, paddingBottom: ins.bottom + 24 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.borderBright, borderRadius: 12, paddingVertical: 28, paddingHorizontal: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Logo />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontFamily: FUENTES.titulo, fontSize: 20.8, color: t.text }}>Servidor real</Text>
            <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 13, color: t.text2 }}>Raspberry Pi del laboratorio</Text>
          </View>
        </View>
        <Text style={[s.sec, { fontSize: 13 }]}>Escribe la IP de la Raspberry Pi (o de la computadora con el servidor). Se puede guardar aunque el servidor esté apagado.</Text>
        <Campo etiqueta="Dirección (IP o URL)" value={url} onChangeText={v => { setUrl(v); setPrueba(null); }} keyboardType="url" placeholder="192.168.1.90"
          ayuda={final ? `Se usará: ${final}` : 'Basta con la IP: se completa con http:// y el puerto 4000.'} />
        {prueba && <Mensaje texto={prueba.texto} error={!prueba.ok} />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton style={{ flex: 1 }} icono="wifi" texto="Probar" onPress={probar} ocupado={probando} deshabilitado={!final} />
          <Boton style={{ flex: 1.4 }} tipo="start" icono="check2" texto="Guardar y conectar" onPress={guardar} deshabilitado={!final} />
        </View>
        {perfil && <Boton tipo="stop" icono="trash3" texto="Quitar esta dirección" onPress={quitar} />}
        <View style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14, gap: 8 }}>
          <Boton chico icono="cpu" texto="Usar la simulación local (sin servidor)" onPress={async () => { if (await cambiarOrigen('simulacion')) onCerrar?.(); }} />
          {onCerrar && <Boton chico texto="Cerrar" onPress={onCerrar} />}
        </View>
      </View>
      {elemento}
    </ScrollView>
  );
}
