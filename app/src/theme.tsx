/**
 * Tema de la app: los mismos tokens que frontend/src/styles/global.css.
 *   - Oscuro: los de :root (no cambian).
 *   - Claro: los de [data-theme="light"].
 *   - Datos sobrios (2026-11-13): Bx #0072B2, By #D55E00, Bz #009E73 (Okabe–Ito) en los dos temas,
 *     |B| en el color del texto y los planos Z en azul pizarra (z0 el más bajo, el más oscuro).
 * Tipografía: Rajdhani 700 en títulos, Inter en la interfaz y Share Tech Mono en las cifras.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useColorScheme } from 'react-native';

export type Tema = 'oscuro' | 'claro' | 'sistema';

export const FUENTES = {
  cuerpo: 'Inter-400', medio: 'Inter-500', semi: 'Inter-600', negrita: 'Inter-700',
  titulo: 'Rajdhani-700', tituloSemi: 'Rajdhani-600', mono: 'ShareTechMono-400', iconos: 'bootstrap-icons',
};

export const DARK = {
  claro: false,
  bgBase: '#0d0d0f', bgSurface: '#141418', bgCard: '#1a1a20', bgCardHover: '#1f1f27',
  border: 'rgba(255,255,255,0.07)', borderBright: 'rgba(255,255,255,0.14)',
  cyan: '#00e5ff', magenta: '#ff00c8', emerald: '#00ffa3', yellow: '#ffe600', orange: '#ff8c00',
  guinda: '#8b1a2f', guindaBright: '#c0233f', guindaGlow: 'rgba(192,35,63,0.35)',
  text: '#eef0f5', text2: '#8a8fa8', dim: '#505568',
  z: ['#56708F', '#6C87A8', '#86A1C0', '#A5BCD6', '#C6D5E6'],
  bx: '#0072B2', by: '#D55E00', bz: '#009E73', mag: '#eef0f5', acentoDato: '#6B7A90',
  peligro: '#ff7070', exito: '#00ffa3', aviso: '#ffe600',
  lienzo3d: '#0a0a0e', rejilla: 'rgba(255,255,255,0.07)',
  navbar: ['#0f0f14', '#16101a'] as [string, string], modal: '#16161c', foco: '#eef0f5', sobreGuinda: '#ffffff',
  btnStart: ['#8b1a2f', '#c0233f'] as [string, string], resplandor: 0.12,
};
export const LIGHT: typeof DARK = {
  claro: true,
  bgBase: '#F4F5F7', bgSurface: '#EDEFF2', bgCard: '#FFFFFF', bgCardHover: '#F7F8FA',
  border: 'rgba(27,29,35,0.12)', borderBright: 'rgba(27,29,35,0.24)',
  cyan: '#0062A8', magenta: '#A3007F', emerald: '#00704D', yellow: '#7A6500', orange: '#9A5B00',
  guinda: '#6E1525', guindaBright: '#8b1a2f', guindaGlow: 'rgba(139,26,47,0.22)',
  text: '#1B1D23', text2: '#5C6273', dim: '#8A8F9E',
  z: ['#1F3550', '#2E4A6E', '#3F618C', '#52749F', '#6A88B2'],
  bx: '#0072B2', by: '#D55E00', bz: '#009E73', mag: '#1B1D23', acentoDato: '#5C6273',
  peligro: '#B3261E', exito: '#00704D', aviso: '#7A6500',
  lienzo3d: '#F7F8FA', rejilla: 'rgba(27,29,35,0.10)',
  navbar: ['#FFFFFF', '#F7EEF0'], modal: '#FFFFFF', foco: '#1B1D23', sobreGuinda: '#ffffff',
  btnStart: ['#8b1a2f', '#8b1a2f'], resplandor: 0.06,
};
export type Paleta = typeof DARK;

/** Mezcla un color con transparencia (equivale a color-mix(in srgb, c p%, transparent)) */
export function mezcla(color: string, p: number) {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${p})`;
}
/** Color del plano i (5 colores que se repiten) */
export const colorPlano = (t: Paleta, i: number) => t.z[((i % 5) + 5) % 5];

interface Ctx { t: Paleta; tema: Tema; reducirMovimiento: boolean }
const Contexto = createContext<Ctx>({ t: DARK, tema: 'oscuro', reducirMovimiento: false });

export function ThemeProvider({ tema, reducirConfig, children }: { tema: Tema; reducirConfig?: boolean; children: React.ReactNode }) {
  const sistema = useColorScheme();
  const [reducidoSistema, setReducidoSistema] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReducidoSistema).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducidoSistema);
    return () => sub?.remove?.();
  }, []);
  const t = tema === 'claro' || (tema === 'sistema' && sistema === 'light') ? LIGHT : DARK;
  const valor = useMemo(() => ({ t, tema, reducirMovimiento: reducidoSistema || Boolean(reducirConfig) }), [t, tema, reducidoSistema, reducirConfig]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
export const useTheme = () => useContext(Contexto).t;
export const useReducirMovimiento = () => useContext(Contexto).reducirMovimiento;

const F = FUENTES;
export function useStyles() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    // ── Base ──
    pantalla: { flex: 1, backgroundColor: 'transparent' },
    contenido: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 32 },
    txt: { color: t.text, fontSize: 14, lineHeight: 21, fontFamily: F.cuerpo },
    sec: { color: t.text2, fontSize: 14, lineHeight: 21, fontFamily: F.cuerpo },
    ayuda: { color: t.text2, fontSize: 13, lineHeight: 19, fontFamily: F.cuerpo, marginTop: 4 },
    error: { color: t.peligro, fontSize: 13, lineHeight: 19, fontFamily: F.cuerpo, marginTop: 4 },
    exito: { color: t.exito, fontSize: 13, lineHeight: 19, fontFamily: F.cuerpo, marginTop: 4 },
    fuerte: { fontFamily: F.semi },
    cifra: { fontVariant: ['tabular-nums'] },
    mono: { fontFamily: F.mono, fontVariant: ['tabular-nums'], color: t.text },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filaW: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    // ── Títulos ──
    tituloPagina: { fontFamily: F.titulo, fontSize: 25.6, lineHeight: 30, color: t.text, marginBottom: 16 },
    sectionLabel: { fontFamily: F.tituloSemi, fontSize: 16.8, color: t.text2, marginTop: 22, marginBottom: 10 },
    panelTitulo: { fontFamily: F.titulo, fontSize: 19.2, lineHeight: 23, color: t.text },
    chartTitle: { fontFamily: F.titulo, fontSize: 18.4, lineHeight: 22, color: t.text },
    chartDesc: { fontFamily: F.cuerpo, fontSize: 13, lineHeight: 19, color: t.text2, marginTop: 2 },
    // ── Tarjetas ──
    panel: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 18, marginBottom: 16 },
    card: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16 },
    // ── Campos ──
    etiquetaCampo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    etiquetaCampoTxt: { fontFamily: F.medio, fontSize: 13, color: t.text2 },
    campo: {
      backgroundColor: t.bgSurface, color: t.text, borderWidth: 1, borderColor: t.borderBright, borderRadius: 6,
      fontSize: 14, fontFamily: F.cuerpo, paddingHorizontal: 12, paddingVertical: 9, minHeight: 40,
    },
    // ── Opciones (radios con aspecto de botón) ──
    opcion: {
      minHeight: 38, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: t.borderBright,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    opcionActiva: { borderColor: t.guindaBright, backgroundColor: mezcla(t.guindaBright, 0.14) },
    opcionTxt: { fontFamily: F.medio, fontSize: 13, color: t.text2 },
    opcionTxtActiva: { fontFamily: F.semi, color: t.text },
    // ── Etiquetas de sesión y contadores ──
    tag: { borderRadius: 4, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, paddingHorizontal: 8, paddingVertical: 2 },
    tagTxt: { fontFamily: F.medio, fontSize: 12, color: t.text2 },
    badge: { borderRadius: 6, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, paddingHorizontal: 8, paddingVertical: 2 },
    badgeTxt: { fontFamily: F.cuerpo, fontVariant: ['tabular-nums'], fontSize: 13, color: t.text2 },
    avisoLectura: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.borderBright, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 8 },
    separador: { height: 1, backgroundColor: t.border },
  }), [t]);
}
