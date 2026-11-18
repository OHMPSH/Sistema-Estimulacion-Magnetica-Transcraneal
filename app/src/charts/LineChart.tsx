/**
 * Componentes Bx, By y Bz a lo largo del barrido (equivale a LineChart.jsx de la web, con Chart.js).
 * - Eje X = posición en el barrido (índice del punto en la malla, en serpentina), no la hora.
 * - Un hueco o un eje saturado corta la línea (spanGaps: false); sin suavizado y con puntos pequeños.
 * - Al tocar la gráfica aparece el globo con el punto, su posición y los tres valores.
 */
import React, { memo, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SText } from 'react-native-svg';
import { FUENTES, useStyles, useTheme } from '../theme';
import { indiceEnMalla, Malla, numero } from '../util';
import type { Medicion } from '../store';
import { marcas } from './comun';

const COMPONENTES = [['bx', 'Bx'], ['by', 'By'], ['bz', 'Bz']] as const;
const r1 = (n: number) => Math.round(n * 10) / 10;
type Punto = (Medicion & { i: number; hueco?: false }) | { i: number; hueco: true };

export const LineChart = memo(function LineChart({ mediciones, malla, ventana, decimales, ancho }: {
  mediciones: Medicion[]; malla: Malla; ventana: number; decimales: number; ancho: number;
}) {
  const t = useTheme(); const s = useStyles();
  const [sel, setSel] = useState<number | null>(null);
  const alto = 280, izq = 52, der = 10, arr = 10, abajo = 42;
  const W = Math.max(160, ancho);

  const puntos = useMemo<Punto[]>(() => {
    const porIndice = new Map<number, Medicion>();
    for (const m of mediciones.slice(-ventana)) { const i = indiceEnMalla(malla, m.xMM, m.yMM, m.zMM); if (i !== null) porIndice.set(i, m); }
    if (!porIndice.size) return [];
    const ks = [...porIndice.keys()], desde = Math.min(...ks), hasta = Math.max(...ks), lista: Punto[] = [];
    for (let i = desde; i <= hasta; i++) { const m = porIndice.get(i); lista.push(m ? { ...m, i } : { i, hueco: true }); }
    return lista;
  }, [mediciones, malla, ventana]);

  const d = useMemo(() => {
    if (!puntos.length) return null;
    let lo = Infinity, hi = -Infinity;
    for (const p of puntos) if (!p.hueco) for (const [k] of COMPONENTES) { const v = p[k]; if (v !== null && v !== undefined) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    if (!Number.isFinite(lo)) return null;
    const base = marcas(lo, hi, 7);
    const yMin = Math.floor(lo / base.paso - 1e-9) * base.paso, yMax = Math.ceil(hi / base.paso + 1e-9) * base.paso;   // como Chart.js: el eje termina en marcas
    const my = marcas(yMin, yMax, 8);
    const desde = puntos[0].i, hasta = puntos[puntos.length - 1].i;
    const mx = marcas(desde, Math.max(hasta, desde + 1), 6);
    const pw = W - izq - der, ph = alto - arr - abajo;
    const X = (i: number) => izq + ((i - desde) / Math.max(1, hasta - desde)) * pw;
    const Y = (v: number) => arr + (1 - (v - yMin) / (yMax - yMin || 1)) * ph;
    const trazos: Record<string, string> = {}, ptos: Record<string, string> = {};
    for (const [k] of COMPONENTES) {
      let p = '', q = '', abierto = false;
      for (const pt of puntos) {
        const v = pt.hueco ? null : pt[k];
        if (v === null || v === undefined) { abierto = false; continue; }
        const x = r1(X(pt.i)), y = r1(Y(v));
        p += `${abierto ? 'L' : 'M'}${x} ${y}`; q += `M${x} ${y}h0.01`; abierto = true;
      }
      trazos[k] = p; ptos[k] = q;
    }
    return { trazos, ptos, my: my.marcas.filter(v => v >= yMin - 1e-9 && v <= yMax + 1e-9), mx: mx.marcas.filter(v => Number.isInteger(v) && v >= desde && v <= hasta), X, Y, desde, hasta, pw, ph };
  }, [puntos, W]);

  const elegido = sel !== null ? puntos.find(p => p.i === sel) ?? null : null;
  const tocar = (x: number) => {
    if (!d) return;
    const i = Math.round(d.desde + ((x - izq) / d.pw) * (d.hasta - d.desde));
    setSel(Math.max(d.desde, Math.min(d.hasta, i)));
  };

  const conDatos = puntos.filter(p => !p.hueco) as (Medicion & { i: number })[];
  const resumen = conDatos.length === 0 ? 'Gráfica de Bx, By y Bz: todavía no hay lecturas.'
    : `Gráfica de Bx, By y Bz de las últimas ${conDatos.length} lecturas, puntos ${puntos[0].i} a ${puntos[puntos.length - 1].i} del barrido.`;

  return (
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.chartTitle}>Componentes Bx · By · Bz a lo largo del barrido</Text>
      <Text style={s.chartDesc}>Cada punto es otra posición de la malla; los cortes son huecos o ejes saturados. Últimas {ventana} lecturas.</Text>
      <View style={[s.filaW, { gap: 12, marginTop: 10, marginBottom: 12 }]}>
        {COMPONENTES.map(([k, e]) => (
          <View key={k} style={[s.fila, { gap: 6 }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t[k] }} /><Text style={[s.sec, { fontSize: 13 }]}>{e}</Text></View>
        ))}
      </View>
      <View accessible accessibilityRole="image" accessibilityLabel={resumen}
        onStartShouldSetResponder={() => true} onResponderGrant={e => tocar(e.nativeEvent.locationX)} onResponderMove={e => tocar(e.nativeEvent.locationX)}>
        <Svg width={W} height={alto}>
          {d ? (
            <G>
              {d.my.map(v => <Line key={`y${v}`} x1={izq} x2={W - der} y1={d.Y(v)} y2={d.Y(v)} stroke={t.rejilla} strokeWidth={1} />)}
              {d.mx.map(v => <Line key={`x${v}`} x1={d.X(v)} x2={d.X(v)} y1={arr} y2={alto - abajo} stroke={t.rejilla} strokeWidth={1} />)}
              {d.my.map(v => <SText key={`ty${v}`} x={izq - 6} y={d.Y(v) + 4} fill={t.text2} fontSize={11} fontFamily={FUENTES.cuerpo} textAnchor="end">{numero(v, 1)}</SText>)}
              {d.mx.map(v => <SText key={`tx${v}`} x={d.X(v)} y={alto - abajo + 15} fill={t.text2} fontSize={11} fontFamily={FUENTES.cuerpo} textAnchor="middle">{String(v)}</SText>)}
              {COMPONENTES.map(([k]) => <Path key={k} d={d.trazos[k]} stroke={t[k]} strokeWidth={1.6} fill="none" strokeLinejoin="round" />)}
              {COMPONENTES.map(([k]) => <Path key={`p${k}`} d={d.ptos[k]} stroke={t[k]} strokeWidth={4} strokeLinecap="round" fill="none" />)}
              {elegido && <Line x1={d.X(elegido.i)} x2={d.X(elegido.i)} y1={arr} y2={alto - abajo} stroke={t.text2} strokeWidth={1} strokeDasharray="3 3" />}
              {elegido && !elegido.hueco && COMPONENTES.map(([k]) => elegido[k] !== null && elegido[k] !== undefined
                ? <Circle key={`c${k}`} cx={d.X(elegido.i)} cy={d.Y(elegido[k] as number)} r={4} fill={t[k]} stroke={t.bgCard} strokeWidth={1} /> : null)}
            </G>
          ) : <Rect x={0} y={0} width={W} height={alto} fill="transparent" />}
          <SText x={Math.max(W / 2, izq + (W - izq - der) / 2 - 20)} y={alto - 6} fill={t.text2} fontSize={W < 340 ? 10.5 : 11.5} fontFamily={FUENTES.cuerpo} textAnchor="middle">Posición en el barrido (número de punto de la malla)</SText>
          <SText x={13} y={arr + (alto - arr - abajo) / 2} fill={t.text2} fontSize={11.5} fontFamily={FUENTES.cuerpo} textAnchor="middle" rotation={-90} originX={13} originY={arr + (alto - arr - abajo) / 2}>Campo (µT)</SText>
        </Svg>
        {!d && <Text style={[s.sec, { position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center' }]}>Esperando lecturas…</Text>}
        {elegido && d && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 8, [d.X(elegido.i) > W / 2 ? 'left' : 'right']: 8, backgroundColor: t.bgCard, borderColor: t.borderBright, borderWidth: 1, borderRadius: 6, padding: 10, maxWidth: W * 0.62 }}>
            <Text style={{ fontFamily: FUENTES.negrita, fontSize: 12, color: t.text }}>
              {elegido.hueco ? `Punto ${elegido.i}: sin lectura (hueco)` : `Punto ${elegido.i} · (${elegido.xMM}, ${elegido.yMM}, ${elegido.zMM}) mm${elegido.seq ? ` · seq ${elegido.seq}` : ''}`}
            </Text>
            {!elegido.hueco && COMPONENTES.map(([k, e]) => (
              <View key={k} style={[s.fila, { gap: 6, marginTop: 2 }]}>
                <View style={{ width: 9, height: 9, backgroundColor: t[k] }} />
                <Text style={{ fontFamily: FUENTES.cuerpo, fontSize: 12, color: t.text }}>{e}: {elegido[k] === null || elegido[k] === undefined ? 'sin dato' : `${numero(elegido[k], decimales)} µT`}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {elegido ? <Text style={[s.ayuda, { textAlign: 'right' }]} onPress={() => setSel(null)}>Toca aquí para quitar el globo</Text> : null}
    </View>
  );
});
