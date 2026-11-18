/**
 * Mapa 3D de puntos medidos (equivale a Canvas3D.jsx de la web, con Three.js): un punto en cada posición de la
 * malla donde ya hay una lectura (saturadas incluidas), con el color del plano Z. Sin amplitud ni dirección.
 *
 * Misma escena y orientación diestra: laboratorio (x, y, z) → escena (x − c, z, −(y − c)), cámara en perspectiva
 * (fov 45°) que orbita alrededor de (0, 10, 0); rejilla, contorno de cada plano y ejes X, Y, Z con los colores de
 * Bx, By y Bz. Arrastrar gira, pellizcar acerca, y los botones hacen lo mismo que los de la web.
 * Rotación automática según la configuración (nunca con movimiento reducido).
 */
import React, { memo, useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';
import { colorPlano, FUENTES, useStyles, useTheme } from '../theme';
import { etiquetaZona, indicePlano, numero, Zona } from '../util';
import type { Medicion } from '../store';
import { camara, useOrbita, V3 } from './comun';
import { Icono } from '../ui';
import { useAppActiva } from '../hooks';
import type { NombreIcono } from '../glifos';

const r1 = (n: number) => Math.round(n * 10) / 10;
const claveDe = (m: Medicion) => `${m.xMM}|${m.yMM}|${m.zMM}`;

export const Mapa3D = memo(function Mapa3D({ mediciones, zLevels, zona, ancho, rotacionAuto, reducirMovimiento, activo = true }: {
  mediciones: Medicion[]; zLevels: number[]; zona: Zona; ancho: number; rotacionAuto: boolean; reducirMovimiento: boolean;
  /** false si la gráfica está fuera de la pantalla: la rotación automática se pausa */
  activo?: boolean;
}) {
  const t = useTheme(); const s = useStyles();
  const escala = Math.max(zona.x, zona.y, 10) / 60;
  const alto = 320, W = Math.max(160, ancho);
  const o = useOrbita({ a: 0.7, b: 0.95, zoom: 1 }, { bMin: 0.15, bMax: 1.5, zoomMin: 105 / 400, zoomMax: 105 / 40, ka: -0.01, kb: -0.008 });

  // Rotación automática: unos 15 cuadros por segundo (la misma velocidad de giro, 0,18 rad/s, con menos trabajo).
  // Se pausa si el mapa no se ve (fuera de la pantalla) o si la app está en segundo plano.
  const appActiva = useAppActiva();
  const girar = rotacionAuto && !reducirMovimiento && activo && appActiva;
  useEffect(() => {
    if (!girar || o.moviendo) return undefined;
    const id = setInterval(() => o.setO(v => ({ ...v, a: v.a + 0.012 })), 66);
    return () => clearInterval(id);
  }, [girar, o.moviendo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Posiciones únicas ya medidas (varias lecturas en un punto cuentan una vez)
  const medidos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; z: number; iz: number }>();
    for (const l of mediciones) {
      const k = claveDe(l);
      if (!m.has(k)) m.set(k, { x: l.xMM, y: l.yMM, z: l.zMM, iz: Math.max(0, l.zIdx >= 0 ? l.zIdx : indicePlano(zLevels, l.zMM)) });
    }
    return [...m.values()];
  }, [mediciones, zLevels]);

  const dibujo = useMemo(() => {
    const radio = 105 * escala / o.zoom;
    const ojo: V3 = [radio * Math.sin(o.b) * Math.sin(o.a), radio * Math.cos(o.b) + 10, radio * Math.sin(o.b) * Math.cos(o.a)];
    const cam = camara(ojo, [0, 10, 0], [0, 1, 0], (45 * Math.PI) / 180, W, alto);
    const P = (p: V3) => cam.proyectar(p);
    const seg = (a: V3, b: V3) => { const [x1, y1, d1] = P(a), [x2, y2, d2] = P(b); return d1 > 0.1 && d2 > 0.1 ? `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}` : ''; };
    const hx = zona.x / 2, hy = zona.y / 2, cx = zona.x / 2, cy = zona.y / 2;
    // Rejilla (GridHelper): lado = max(zona, 10), divisiones de ~5 mm
    const lado = Math.max(zona.x, zona.y, 10), div = Math.max(1, Math.round(lado / 5)), h = lado / 2;
    let rejilla = '', centro = '';
    for (let i = 0; i <= div; i++) {
      const v = -h + (i * lado) / div;
      const l = seg([v, 0, -h], [v, 0, h]) + seg([-h, 0, v], [h, 0, v]);
      if (Math.abs(v) < 1e-6) centro += l; else rejilla += l;
    }
    const planos = zLevels.map((z, i) => ({ i, d: [[-hx, z, -hy], [hx, z, -hy], [hx, z, hy], [-hx, z, hy], [-hx, z, -hy]].map((p, k) => { const [x, y] = P(p as V3); return `${k ? 'L' : 'M'}${r1(x)} ${r1(y)}`; }).join('') }));
    const ejes = { x: seg([-hx - 2, 0, 0], [hx + 4, 0, 0]), y: seg([0, 0, hy + 2], [0, 0, -hy - 4]), z: seg([0, 0, 0], [0, Math.max(zona.z, 10) + 14, 0]) };
    // Puntos: radio de la esfera en mm → píxeles según su profundidad; agrupados por plano (uno o dos trazos por plano)
    const paso = zLevels.length > 1 ? zLevels[1] - zLevels[0] : 5;
    const rMM = Math.max(0.4, Math.min(1.2 * escala, paso * 0.3));
    const grupos = new Map<number, { d: string; prof: number; n: number }>();
    for (const m of medidos) {
      const [x, y, prof] = P([m.x - cx, m.z, -(m.y - cy)]);
      if (prof <= 0.1) continue;
      const g = grupos.get(m.iz) ?? { d: '', prof: 0, n: 0 };
      g.d += `M${r1(x)} ${r1(y)}h0.01`; g.prof += prof; g.n++;
      grupos.set(m.iz, g);
    }
    const capas = [...grupos.entries()].map(([iz, g]) => ({ iz, d: g.d, prof: g.prof / g.n, ancho: Math.max(2.2, (2 * rMM * cam.focal) / (g.prof / g.n)) }))
      .sort((a, b) => b.prof - a.prof);
    return { rejilla, centro, planos, ejes, capas };
  }, [o.a, o.b, o.zoom, W, zona.x, zona.y, zona.z, zLevels, medidos, escala]);

  const botones: [NombreIcono, string, () => void][] = [
    ['arrow-counterclockwise', 'Rotar a la izquierda', () => o.mover(0.3, 0)],
    ['arrow-clockwise', 'Rotar a la derecha', () => o.mover(-0.3, 0)],
    ['arrow-up', 'Ver más desde arriba', () => o.mover(0, -0.15)],
    ['arrow-down', 'Ver más de lado', () => o.mover(0, 0.15)],
    ['zoom-in', 'Acercar', () => o.mover(0, 0, 105 / 80)],
    ['zoom-out', 'Alejar', () => o.mover(0, 0, 105 / 130)],
    ['bullseye', 'Restablecer la vista', o.restablecer],
  ];
  const n = medidos.length;
  const resumen = `Mapa 3D de puntos medidos: ${n} posiciones con lectura en ${zLevels.length} planos (${zLevels.join(', ')} mm). Cada punto marca una posición ya sondeada; el color indica el plano.`;

  return (
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.chartTitle}>Mapa 3D de puntos medidos</Text>
      <Text style={s.chartDesc}>Zona de {etiquetaZona(zona)} · {zLevels.length} planos Z ({zLevels[0]}–{zLevels[zLevels.length - 1]} mm)</Text>
      <View style={[s.filaW, { gap: 4, marginTop: 12, marginBottom: 12 }]} accessibilityRole="toolbar" accessibilityLabel="Controles de la vista 3D">
        {botones.map(([ic, et, fn]) => (
          <Pressable key={ic} accessibilityRole="button" accessibilityLabel={et} onPress={fn}
            style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: pressed ? t.guindaBright : t.borderBright, backgroundColor: pressed ? t.bgCardHover : 'transparent', alignItems: 'center', justifyContent: 'center' })}>
            <Icono nombre={ic} tam={16} />
          </Pressable>
        ))}
      </View>
      <View {...o.pan} accessible accessibilityRole="image" accessibilityLabel={resumen}
        style={{ height: alto, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: t.border, backgroundColor: t.lienzo3d }}>
        <Svg width={W - 2} height={alto - 2}>
          <Path d={dibujo.rejilla} stroke={t.borderBright} strokeOpacity={0.35} strokeWidth={1} fill="none" />
          <Path d={dibujo.centro} stroke={t.text2} strokeOpacity={0.35} strokeWidth={1} fill="none" />
          {dibujo.planos.map(p => <Path key={p.i} d={p.d} stroke={colorPlano(t, p.i)} strokeOpacity={0.3} strokeWidth={1} fill="none" />)}
          <G strokeWidth={1.4}>
            <Path d={dibujo.ejes.x} stroke={t.bx} /><Path d={dibujo.ejes.y} stroke={t.by} /><Path d={dibujo.ejes.z} stroke={t.bz} />
          </G>
          {dibujo.capas.map(c => <Path key={c.iz} d={c.d} stroke={colorPlano(t, c.iz)} strokeWidth={c.ancho} strokeLinecap="round" fill="none" />)}
        </Svg>
        {/* Ejes (ejes-3d) */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', backgroundColor: t.claro ? 'rgba(255,255,255,0.88)' : 'rgba(26,26,32,0.88)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.bx }}>X</Text><Text style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.text }}> · </Text>
          <Text style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.by }}>Y</Text><Text style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.text }}> · </Text>
          <Text style={{ fontFamily: FUENTES.mono, fontSize: 13, color: t.bz }}>Z ↑</Text>
        </View>
      </View>
      {/* Leyenda de los planos (z-legend): debajo del lienzo, para que no tape los puntos medidos */}
      <View style={[s.filaW, { columnGap: 14, rowGap: 4, marginTop: 10 }]}>
        {zLevels.map((z, i) => (
          <View key={z} style={[s.fila, { gap: 6 }]}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colorPlano(t, i) }} /><Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 12, color: t.text2 }}>Z = {z} mm</Text></View>
        ))}
      </View>
      <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 12, color: t.text, marginTop: 4 }}>{n > 0 ? `${numero(n, 0)} ${n === 1 ? 'punto medido' : 'puntos medidos'}` : 'Sin lecturas'}</Text>
      <Text style={s.ayuda}>Arrastra para girar y pellizca para acercar.</Text>
    </View>
  );
});
