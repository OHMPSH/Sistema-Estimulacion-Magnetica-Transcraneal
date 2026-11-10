/**
 * hooks/useTokensTema.js
 * ─────────────────────────────────────────────────────────────
 * Lee los colores del tema actual (variables CSS de global.css) para
 * las librerías que no entienden CSS: Chart.js, Three.js y Plotly.
 * Se recalculan al cambiar de tema.
 * ─────────────────────────────────────────────────────────────
 */
import { useMemo } from 'react';
import { useConfig } from '../context/ConfigContext.jsx';

const NOMBRES = {
  fondo: '--bg-base', superficie: '--bg-surface', tarjeta: '--bg-card',
  borde: '--border', bordeFuerte: '--border-bright',
  texto: '--text-primary', textoSecundario: '--text-secondary',
  bx: '--color-bx', by: '--color-by', bz: '--color-bz', magnitud: '--color-mag',
  guinda: '--guinda-bright', lienzo3d: '--lienzo-3d', rejilla: '--rejilla',
  z0: '--z0', z1: '--z1', z2: '--z2', z3: '--z3', z4: '--z4',
  fuenteMono: '--font-mono', fuenteCuerpo: '--font-body',
};

export function leerTokens() {
  const estilo = getComputedStyle(document.documentElement);
  const t = {};
  for (const [k, v] of Object.entries(NOMBRES)) t[k] = estilo.getPropertyValue(v).trim();
  t.planos = [t.z0, t.z1, t.z2, t.z3, t.z4];
  return t;
}

export function useTokensTema() {
  const { temaEfectivo } = useConfig();
  // temaEfectivo es la dependencia: al cambiar, data-theme ya se aplicó (efecto del contexto)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => leerTokens(), [temaEfectivo]);
}
