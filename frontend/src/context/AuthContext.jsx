/**
 * context/AuthContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Estado de la sesión del usuario para toda la aplicación.
 *
 * Al montar pregunta al servidor quién es el usuario (GET /api/auth/yo);
 * la cookie de sesión es HttpOnly, así que el navegador no puede
 * leerla y la única forma de saberlo es preguntar.
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
      setUsuario(null);
    });

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
