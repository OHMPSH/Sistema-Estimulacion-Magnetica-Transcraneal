/**
 * context/ConfigContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Configuración del sistema, preferencias del usuario y tema.
 *
 * useConfig() expone:
 *   config          — { modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos } o null
 *   opciones        — { pasos_mm, medios, ganancias_hmc5883l }
 *   modoOperacion   — 'simulacion' | 'real' | null
 *   guardarClave(clave, valor) → { ok, error?, errores?, status }  (PUT /api/configuracion/:clave)
 *   recargar()
 *   tema            — preferencia: 'oscuro' | 'claro' | 'sistema'
 *   temaEfectivo    — 'oscuro' | 'claro' (lo que se ve; "sistema" sigue al sistema operativo en vivo)
 *   cambiarTema(t)
 *   reducirMovimiento — true si el sistema lo pide o la configuración lo activa
 *
 * El tema se aplica con data-theme ('dark' | 'light') y data-bs-theme
 * en <html>, más color-scheme. Se guarda en el usuario (PATCH
 * /api/auth/preferencias) y en localStorage, que index.html lee antes de
 * pintar para evitar el parpadeo.
 * ─────────────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, enviarJSON, leerJSON } from '../api/cliente.js';
import { useAuth } from './AuthContext.jsx';
import { useEventoStream } from '../hooks/useStream.js';

const ConfigContext = createContext(null);
export const CLAVE_TEMA = 'tms_tema';
const TEMAS = ['oscuro', 'claro', 'sistema'];

const leerTemaLocal = () => {
  try { const t = localStorage.getItem(CLAVE_TEMA); return TEMAS.includes(t) ? t : null; } catch { return null; }
};
const guardarTemaLocal = t => { try { localStorage.setItem(CLAVE_TEMA, t); } catch { /* sin almacenamiento */ } };

const consulta = q => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

/** Sigue una media query en vivo */
function useMediaQuery(q) {
  const [coincide, setCoincide] = useState(() => consulta(q)?.matches ?? false);
  useEffect(() => {
    const mq = consulta(q);
    if (!mq) return undefined;
    const fn = e => setCoincide(e.matches);
    mq.addEventListener('change', fn);
    setCoincide(mq.matches);
    return () => mq.removeEventListener('change', fn);
  }, [q]);
  return coincide;
}

/** Aplica el tema al documento */
export function aplicarTema(efectivo) {
  const raiz = document.documentElement;
  const claro = efectivo === 'claro';
  raiz.dataset.theme = claro ? 'light' : 'dark';
  raiz.setAttribute('data-bs-theme', claro ? 'light' : 'dark');
  raiz.style.colorScheme = claro ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', claro ? '#F4F5F7' : '#0d0d0f');
}

export function ConfigProvider({ children }) {
  const { usuario, guardarPreferencias } = useAuth();
  const [estado, setEstado] = useState({ config: null, opciones: null });
  const [tema, setTema] = useState(() => usuario?.preferencias?.tema ?? leerTemaLocal() ?? 'oscuro');

  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const sistemaReducido = useMediaQuery('(prefers-reduced-motion: reduce)');
  const temaEfectivo = tema === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : tema;

  // El tema guardado en el usuario manda sobre el del navegador
  useEffect(() => {
    const t = usuario?.preferencias?.tema;
    if (TEMAS.includes(t)) { setTema(t); guardarTemaLocal(t); }
  }, [usuario?.preferencias?.tema]);

  // Se aplica durante el render (es idempotente) para que los hijos que leen
  // los colores del tema (useTokensTema) ya vean el nuevo en este mismo render
  if (document.documentElement.dataset.theme !== (temaEfectivo === 'claro' ? 'light' : 'dark')) {
    aplicarTema(temaEfectivo);
  }

  const cambiarTema = useCallback(async (t) => {
    if (!TEMAS.includes(t)) return;
    setTema(t);
    guardarTemaLocal(t);
    await guardarPreferencias({ tema: t });
  }, [guardarPreferencias]);

  const recargar = useCallback(async () => {
    try {
      const json = await leerJSON(await apiFetch('/api/configuracion'));
      if (json.ok) setEstado({ config: json.data, opciones: json.opciones });
    } catch { /* servidor apagado: lo indica la Navbar */ }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  useEventoStream('configuracion', (d) => {
    if (d) setEstado(e => (e.config ? { ...e, config: { ...e.config, [d.clave]: d.valor } } : e));
  });

  const guardarClave = useCallback(async (clave, valor) => {
    try {
      const res = await enviarJSON(`/api/configuracion/${clave}`, { valor }, 'PUT');
      const json = await leerJSON(res);
      if (json.ok) {
        setEstado(e => ({ ...e, config: { ...e.config, [clave]: json.valor } }));
        return { ok: true, valor: json.valor, status: res.status };
      }
      return { ok: false, error: json.error, errores: json.errores ?? [], status: res.status };
    } catch {
      return { ok: false, error: 'No se pudo conectar con el servidor.', errores: [], status: 0 };
    }
  }, []);

  const reducirMovimiento = sistemaReducido || Boolean(estado.config?.visualizacion?.reducir_animaciones);

  useEffect(() => {
    document.documentElement.classList.toggle('reducir-movimiento', reducirMovimiento);
  }, [reducirMovimiento]);

  const valor = useMemo(() => ({
    config: estado.config,
    opciones: estado.opciones,
    modoOperacion: estado.config?.modo_operacion ?? null,
    guardarClave, recargar,
    tema, temaEfectivo, cambiarTema,
    reducirMovimiento,
  }), [estado, guardarClave, recargar, tema, temaEfectivo, cambiarTema, reducirMovimiento]);

  return <ConfigContext.Provider value={valor}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>');
  return ctx;
}
