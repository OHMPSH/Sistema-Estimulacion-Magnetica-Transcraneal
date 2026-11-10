/**
 * App.jsx — Componente raíz
 * Decide qué pantalla mostrar según la sesión del usuario:
 *   sin usuario                → LoginPage
 *   debe_cambiar_password      → CambiarPasswordPage
 *   con sesión                 → Shell (Navbar + menú lateral + la página de la URL)
 * El Shell solo se monta con sesión, así el SSE y las peticiones a la
 * API nunca salen sin la cookie.
 */
import React, { useCallback, useRef, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { ConfigProvider, useConfig } from './context/ConfigContext.jsx';
import { useServerStatus } from './hooks/useServerStatus.js';
import { useDispositivo } from './hooks/useDispositivo.js';
import { useSesionActiva } from './hooks/useSesionActiva.js';
import { useNavegacion } from './hooks/useNavegacion.js';
import { Navbar } from './components/layout/Navbar.jsx';
import { MenuLateral } from './components/layout/MenuLateral.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { CambiarPasswordPage } from './pages/CambiarPasswordPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { HistorialPage } from './pages/HistorialPage.jsx';
import { ConfiguracionPage } from './pages/ConfiguracionPage.jsx';

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div className="app-cargando" role="status">Verificando sesión…</div>;
  }
  if (!usuario) return <LoginPage />;
  if (usuario.debe_cambiar_password) return <CambiarPasswordPage />;
  return (
    <ConfigProvider>
      <Shell />
    </ConfigProvider>
  );
}

function Shell() {
  const { usuario, cerrarSesion } = useAuth();
  const { modoOperacion, guardarClave, tema, cambiarTema } = useConfig();
  const { online } = useServerStatus();
  const dispositivo = useDispositivo();
  const medicion = useSesionActiva();
  const { vista, seccion, navegar } = useNavegacion();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenu = useRef(null);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const cambiarModo = useCallback(modo => guardarClave('modo_operacion', modo), [guardarClave]);

  return (
    <>
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>
      <Navbar ref={botonMenu} online={online} modoOperacion={modoOperacion} dispositivo={dispositivo}
        onAbrirMenu={() => setMenuAbierto(true)} menuAbierto={menuAbierto} />

      <MenuLateral abierto={menuAbierto} onCerrar={cerrarMenu} refRetorno={botonMenu}
        usuario={usuario} vista={vista} onNavegar={navegar}
        modoOperacion={modoOperacion} onCambiarModo={cambiarModo} sesionAbierta={medicion.enCurso}
        tema={tema} onCambiarTema={cambiarTema} onCerrarSesion={cerrarSesion} />

      <main id="contenido" className="main-container" tabIndex={-1}>
        {dispositivo.estado?.enLinea && dispositivo.estado.errorPico && (
          <div className="aviso-pico" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span><strong>La Pico W informa un error:</strong> {dispositivo.estado.errorPico}</span>
          </div>
        )}
        {vista === 'dashboard' && <DashboardPage usuario={usuario} medicion={medicion} />}
        {vista === 'historial' && <HistorialPage usuario={usuario} />}
        {vista === 'configuracion' && (
          <ConfiguracionPage usuario={usuario} seccion={seccion} onNavegar={navegar} sesionAbierta={medicion.enCurso} />
        )}
      </main>

      <footer className="tms-footer">
        Sistema de adquisición de datos TMS · Instituto Politécnico Nacional, ESIME Zacatenco · Tesis de ingeniería
      </footer>
    </>
  );
}
