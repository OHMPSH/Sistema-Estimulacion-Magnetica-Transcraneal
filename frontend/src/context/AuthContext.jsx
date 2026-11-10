/**
 * context/AuthContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Estado de la sesión del usuario para toda la aplicación.
 *
 * Login obligatorio al entrar: cada pestaña nueva (o el navegador
 * recién abierto) pide usuario y contraseña, aunque quede una cookie
 * válida. La marca vive en sessionStorage, que es por pestaña y
 * sobrevive a la recarga: recargar a mitad de un barrido no saca al
 * usuario. Solo con esa marca se pregunta al servidor quién es
 * (GET /api/auth/yo; la cookie es HttpOnly y no se puede leer aquí).
 *
 * Expone con useAuth():
 *   usuario          — { id, usuario, nombre, rol, debe_cambiar_password, preferencias } o null
 *   cargando         — true mientras se consulta la sesión al abrir la página
 *   sesionExpirada   — true si la sesión se perdió estando dentro (para avisar en el login)
 *   iniciarSesion(usuario, password)  → { ok, error? }
 *   cerrarSesion()
 *   cambiarPassword(actual, nueva)    → { ok, error? }
 *   guardarPreferencias({ tema })     → { ok, error? } (PATCH /api/auth/preferencias)
 * ─────────────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiFetch, enviarJSON, leerJSON, alPerderSesion } from '../api/cliente.js';

const AuthContext = createContext(null);

/** Marca de "en esta pestaña ya se inició sesión" */
const MARCA_PESTANA = 'tms_login_pestana';
const leerMarca = () => { try { return sessionStorage.getItem(MARCA_PESTANA) === '1'; } catch { return false; } };
const ponerMarca = () => { try { sessionStorage.setItem(MARCA_PESTANA, '1'); } catch { /* sin almacenamiento: se pedirá el login al recargar */ } };
const quitarMarca = () => { try { sessionStorage.removeItem(MARCA_PESTANA); } catch { /* nada que borrar */ } };

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa que esté encendido e inténtalo de nuevo.';

export function AuthProvider({ children }) {
  const [usuario,        setUsuario]        = useState(null);
  const [cargando,       setCargando]       = useState(true);
  const [sesionExpirada, setSesionExpirada] = useState(false);

  // Copia del usuario para consultarla desde el aviso de 401 sin volver a registrarlo
  const usuarioRef = useRef(null);
  usuarioRef.current = usuario;

  useEffect(() => {
    // Cualquier 401 de la API devuelve al login
    alPerderSesion(() => {
      if (usuarioRef.current) setSesionExpirada(true);
      quitarMarca();
      setUsuario(null);
    });

    // Pestaña nueva: se muestra el login sin usar la cookie que pudiera quedar
    if (!leerMarca()) {
      setCargando(false);
      return () => alPerderSesion(null);
    }

    let cancelado = false;
    (async () => {
      try {
        const json = await leerJSON(await apiFetch('/api/auth/yo'));
        if (!cancelado && json.ok) setUsuario(json.usuario);
      } catch {
        // Servidor apagado: se muestra el login, que informará del error al intentar entrar
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
      alPerderSesion(null);
    };
  }, []);

  const iniciarSesion = useCallback(async (nombreUsuario, password) => {
    try {
      const json = await leerJSON(await enviarJSON('/api/auth/login', { usuario: nombreUsuario, password }));
      if (!json.ok) return { ok: false, error: json.error };
      ponerMarca();
      setSesionExpirada(false);
      setUsuario(json.usuario);
      return { ok: true };
    } catch {
      return { ok: false, error: SIN_CONEXION };
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Sin conexión: igual se sale de la interfaz; la sesión expira sola en el servidor
    }
    quitarMarca();
    setSesionExpirada(false);
    setUsuario(null);
  }, []);

  const cambiarPassword = useCallback(async (actual, nueva) => {
    try {
      const json = await leerJSON(await enviarJSON('/api/auth/cambiar-password', { actual, nueva }));
      if (!json.ok) return { ok: false, error: json.error };
      setUsuario(json.usuario);
      return { ok: true };
    } catch {
      return { ok: false, error: SIN_CONEXION };
    }
  }, []);

  const guardarPreferencias = useCallback(async (cambio) => {
    try {
      const json = await leerJSON(await enviarJSON('/api/auth/preferencias', cambio, 'PATCH'));
      if (!json.ok) return { ok: false, error: json.error };
      setUsuario(u => (u ? { ...u, preferencias: json.preferencias ?? { ...(u.preferencias ?? {}), ...cambio } } : u));
      return { ok: true };
    } catch {
      return { ok: false, error: SIN_CONEXION };
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, sesionExpirada, iniciarSesion, cerrarSesion, cambiarPassword, guardarPreferencias }),
    [usuario, cargando, sesionExpirada, iniciarSesion, cerrarSesion, cambiarPassword, guardarPreferencias]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

/** Acceso al contexto de autenticación desde cualquier componente */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
