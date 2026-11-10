/**
 * pages/CambiarPasswordPage.jsx
 * Cambio obligatorio de contraseña. Se muestra mientras el usuario
 * tenga debe_cambiar_password (primer acceso o contraseña restablecida
 * por un administrador). Hasta cambiarla, el servidor rechaza con 403
 * cualquier otra ruta.
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const LONGITUD_MINIMA = 8;   // la misma regla que valida el servidor

export function CambiarPasswordPage() {
  const { usuario, cambiarPassword, cerrarSesion } = useAuth();
  const [actual,   setActual]   = useState('');
  const [nueva,    setNueva]    = useState('');
  const [repetida, setRepetida] = useState('');
  const [error,    setError]    = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;

    if (!actual || !nueva || !repetida) return setError('Completa los tres campos.');
    if (nueva.length < LONGITUD_MINIMA) {
      return setError(`La contraseña nueva debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
    }
    if (nueva !== repetida) return setError('Las dos contraseñas nuevas no coinciden.');
    if (nueva === actual)   return setError('La contraseña nueva debe ser distinta de la actual.');

    setError('');
    setEnviando(true);
    const resultado = await cambiarPassword(actual, nueva);
    // Si se cambió, esta página se desmonta y aparece el dashboard
    if (!resultado.ok) {
      setError(resultado.error || 'No se pudo cambiar la contraseña.');
      setEnviando(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card fade-in" onSubmit={enviar} noValidate>
        <div className="auth-brand">
          <div className="navbar-logo" aria-hidden="true">TMS</div>
          <div>
            <h1 className="auth-title">Cambia tu contraseña</h1>
            <div className="auth-subtitle">{usuario.nombre} · {usuario.rol}</div>
          </div>
        </div>

        <p className="auth-aviso">
          Estás usando una contraseña temporal. Elige una nueva para poder continuar.
        </p>

        {/* Campo oculto con el usuario: ayuda a los gestores de contraseñas a guardar la nueva */}
        <input type="text" name="usuario" autoComplete="username" value={usuario.usuario}
          readOnly hidden />

        <div className="auth-campo">
          <label htmlFor="cambio-actual" className="auth-label">Contraseña actual</label>
          <input
            id="cambio-actual" name="actual" type="password" className="campo-tms"
            autoComplete="current-password"
            value={actual} onChange={e => setActual(e.target.value)}
            autoFocus required
          />
        </div>

        <div className="auth-campo">
          <label htmlFor="cambio-nueva" className="auth-label">Contraseña nueva</label>
          <input
            id="cambio-nueva" name="nueva" type="password" className="campo-tms"
            autoComplete="new-password" minLength={LONGITUD_MINIMA}
            aria-describedby="cambio-ayuda"
            value={nueva} onChange={e => setNueva(e.target.value)}
            required
          />
          <div id="cambio-ayuda" className="auth-ayuda">Mínimo {LONGITUD_MINIMA} caracteres.</div>
        </div>

        <div className="auth-campo">
          <label htmlFor="cambio-repetida" className="auth-label">Repite la contraseña nueva</label>
          <input
            id="cambio-repetida" name="repetida" type="password" className="campo-tms"
            autoComplete="new-password" minLength={LONGITUD_MINIMA}
            value={repetida} onChange={e => setRepetida(e.target.value)}
            required
          />
        </div>

        <p className="auth-error" role="alert" aria-live="assertive">{error}</p>

        <button type="submit" className="btn-tms btn-start auth-boton" disabled={enviando}>
          <i className="bi bi-key-fill" aria-hidden="true" />
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>

        <button type="button" className="mode-btn auth-boton auth-boton-secundario" onClick={cerrarSesion}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" /> Cerrar sesión
        </button>
      </form>
    </main>
  );
}
