/**
 * components/config/SeccionUsuarios.jsx
 * Administración de usuarios (solo admin): crear, cambiar el rol,
 * activar o desactivar y restablecer la contraseña. Los errores del
 * servidor se muestran explicados (por ejemplo, el 409 del último admin).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, enviarJSON, leerJSON } from '../../api/cliente.js';
import { ROLES_TEXTO, fechaHora } from '../../utils/formato.js';

const ROLES = ['admin', 'operador', 'observador'];

function explicar(json, status) {
  if (status === 409 && /admin/i.test(json.error ?? '')) {
    return `${json.error} Debe quedar al menos un administrador activo: crea o activa otro antes.`;
  }
  return json.error || 'No se pudo completar la acción.';
}

function FilaUsuario({ u, esYo, zona, onCambio, onAviso }) {
  const [restableciendo, setRestableciendo] = useState(false);
  const [password, setPassword] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const patch = async (cambio, exito) => {
    setTrabajando(true);
    const res = await enviarJSON(`/api/usuarios/${u.id}`, cambio, 'PATCH').catch(() => null);
    const json = res ? await leerJSON(res) : { ok: false, error: 'No se pudo conectar con el servidor.' };
    setTrabajando(false);
    onAviso(json.ok ? { texto: exito, error: false } : { texto: explicar(json, res?.status), error: true });
    if (json.ok) onCambio();
  };

  const restablecer = async (e) => {
    e.preventDefault();
    setTrabajando(true);
    const res = await enviarJSON(`/api/usuarios/${u.id}/restablecer-password`, { password }).catch(() => null);
    const json = res ? await leerJSON(res) : { ok: false, error: 'No se pudo conectar con el servidor.' };
    setTrabajando(false);
    onAviso(json.ok
      ? { texto: `Contraseña de ${u.usuario} restablecida: deberá cambiarla al entrar.`, error: false }
      : { texto: explicar(json, res?.status), error: true });
    if (json.ok) { setPassword(''); setRestableciendo(false); onCambio(); }
  };

  return (
    <tr className={u.activo ? '' : 'fila-inactiva'}>
      <th scope="row">
        <span className="d-block">{u.nombre}{esYo ? ' (tú)' : ''}</span>
        <span className="texto-ayuda cifra">{u.usuario}</span>
      </th>
      <td>
        <label className="visually-hidden" htmlFor={`rol-${u.id}`}>Rol de {u.usuario}</label>
        <select id={`rol-${u.id}`} name={`rol-${u.id}`} className="form-select form-select-sm campo-tms" value={u.rol} disabled={trabajando}
          onChange={e => patch({ rol: e.target.value }, `Rol de ${u.usuario} cambiado a ${ROLES_TEXTO[e.target.value]}.`)}>
          {ROLES.map(r => <option key={r} value={r}>{ROLES_TEXTO[r]}</option>)}
        </select>
      </td>
      <td>{u.activo ? 'Activo' : 'Desactivado'}{u.debe_cambiar_password ? ' · debe cambiar la contraseña' : ''}</td>
      <td className="cifra">{fechaHora(u.ultimo_acceso, zona)}</td>
      <td>
        <div className="acciones">
          <button type="button" className="btn-tms btn-secundario btn-chico" disabled={trabajando}
            onClick={() => patch({ activo: !u.activo }, `${u.usuario} ${u.activo ? 'desactivado: sus sesiones se cerraron' : 'activado'}.`)}>
            {u.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button type="button" className="btn-tms btn-secundario btn-chico" aria-expanded={restableciendo}
            onClick={() => setRestableciendo(v => !v)}>
            Restablecer contraseña
          </button>
        </div>
        {restableciendo && (
          <form className="form-en-linea mt-2" onSubmit={restablecer}>
            <label htmlFor={`pw-${u.id}`} className="visually-hidden">Contraseña temporal para {u.usuario}</label>
            <input id={`pw-${u.id}`} name={`password-${u.id}`} type="password" className="form-control form-control-sm campo-tms" minLength={8}
              placeholder="Contraseña temporal (mín. 8)…" autoComplete="new-password" value={password}
              onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="btn-tms btn-start btn-chico" disabled={trabajando || password.length < 8}>Guardar</button>
          </form>
        )}
      </td>
    </tr>
  );
}

export function SeccionUsuarios({ usuario, zona }) {
  const [lista, setLista] = useState([]);
  const [aviso, setAviso] = useState({ texto: '', error: false });
  const [nuevo, setNuevo] = useState({ usuario: '', nombre: '', rol: 'operador', password: '' });
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    const json = await leerJSON(await apiFetch('/api/usuarios')).catch(() => ({ ok: false, error: 'Sin conexión' }));
    if (json.ok) setLista(json.data); else setAviso({ texto: json.error, error: true });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    const res = await enviarJSON('/api/usuarios', nuevo).catch(() => null);
    const json = res ? await leerJSON(res) : { ok: false, error: 'No se pudo conectar con el servidor.' };
    setCreando(false);
    if (json.ok) {
      setAviso({ texto: `Usuario ${json.data.usuario} creado. Deberá cambiar la contraseña al entrar.`, error: false });
      setNuevo({ usuario: '', nombre: '', rol: 'operador', password: '' });
      cargar();
    } else {
      setAviso({ texto: res?.status === 409 ? `Ya existe un usuario llamado "${nuevo.usuario.trim().toLowerCase()}".` : explicar(json, res?.status), error: true });
    }
  };

  const campo = (k, etiqueta, props = {}) => (
    <div className="campo-config">
      <label htmlFor={`nuevo-${k}`} className="etiqueta-campo">{etiqueta}</label>
      <input id={`nuevo-${k}`} name={k} className="form-control campo-tms" value={nuevo[k]}
        onChange={e => setNuevo(n => ({ ...n, [k]: e.target.value }))} {...props} />
    </div>
  );

  return (
    <div className="seccion-config">
      <h2 className="panel-titulo">Usuarios</h2>
      <p className="texto-secundario">Admin: todo. Operador: inicia y detiene barridos, edita las notas de sus sesiones y exporta. Observador: solo mira y exporta.</p>

      <p className={aviso.error ? 'texto-error' : 'texto-exito'} role={aviso.error ? 'alert' : 'status'} aria-live="polite">{aviso.texto}</p>

      <div className="tabla-scroll" tabIndex={0} role="region" aria-label="Lista de usuarios">
        <table className="tms-table tabla-usuarios">
          <caption className="visually-hidden">Usuarios del sistema</caption>
          <thead>
            <tr><th scope="col">Usuario</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Último acceso</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            {lista.map(u => (
              <FilaUsuario key={u.id} u={u} esYo={u.id === usuario.id} zona={zona} onCambio={cargar} onAviso={setAviso} />
            ))}
          </tbody>
        </table>
      </div>

      <form className="crear-usuario" onSubmit={crear}>
        <h3 className="menu-subtitulo">Crear usuario</h3>
        <div className="campos-config">
          {campo('usuario', 'Usuario', { autoComplete: 'off', spellCheck: false, placeholder: 'por ejemplo, jperez…' })}
          {campo('nombre', 'Nombre para mostrar', { autoComplete: 'off' })}
          <div className="campo-config">
            <label htmlFor="nuevo-rol" className="etiqueta-campo">Rol</label>
            <select id="nuevo-rol" name="rol" className="form-select campo-tms" value={nuevo.rol} onChange={e => setNuevo(n => ({ ...n, rol: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLES_TEXTO[r]}</option>)}
            </select>
          </div>
          {campo('password', 'Contraseña temporal', { type: 'password', autoComplete: 'new-password', minLength: 8 })}
        </div>
        <p className="texto-ayuda">De 3 a 32 caracteres: minúsculas, dígitos, punto, guion o guion bajo. La contraseña temporal debe tener al menos 8 caracteres.</p>
        <button type="submit" className="btn-tms btn-start" disabled={creando}>
          <i className="bi bi-person-plus" aria-hidden="true" /> {creando ? 'Creando…' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}
