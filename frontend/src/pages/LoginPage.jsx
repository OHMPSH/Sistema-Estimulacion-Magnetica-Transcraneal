/**
 * pages/LoginPage.jsx
 * Pantalla de inicio de sesión. Se muestra cuando no hay usuario.
 * (Versión mínima de la Fase 2; el diseño final llega en las Fases 6 y 7.)
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { iniciarSesion, sesionExpirada } = useAuth();
  const [usuario,  setUsuario]  = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!usuario.trim() || !password) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }
    setError('');
    setEnviando(true);
    const resultado = await iniciarSesion(usuario, password);
    // Si entró, esta página se desmonta; solo queda algo por hacer si falló
    if (!resultado.ok) {
      setError(resultado.error || 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card fade-in" onSubmit={enviar} noValidate>
        <div className="auth-brand">
          <div className="navbar-logo" aria-hidden="true">TMS</div>
          <div>
            <h1 className="auth-title">Sistema de Adquisición de Datos</h1>
            <div className="auth-subtitle">Instituto Politécnico Nacional · ESIME</div>
          </div>
        </div>

        {sesionExpirada && !error && (
          <p className="auth-aviso">Tu sesión terminó. Vuelve a iniciar sesión para continuar.</p>
        )}

        <div className="auth-campo">
          <label htmlFor="login-usuario" className="auth-label">Usuario</label>
          <input
            id="login-usuario" name="usuario" type="text" className="campo-tms"
            autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={usuario} onChange={e => setUsuario(e.target.value)}
            autoFocus required
          />
        </div>

        <div className="auth-campo">
          <label htmlFor="login-password" className="auth-label">Contraseña</label>
          <input
            id="login-password" name="password" type="password" className="campo-tms"
            autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {/* aria-live: el lector de pantalla anuncia el error en cuanto aparece */}
        <p className="auth-error" role="alert" aria-live="assertive">{error}</p>

        <button type="submit" className="btn-tms btn-start auth-boton" disabled={enviando}>
          <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
