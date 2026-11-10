/**
 * controllers/usuarios.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — Administración de usuarios
 * Todas estas rutas son solo para el rol admin (ver las rutas).
 *
 *   listarUsuarios       — GET   /api/usuarios
 *   crearUsuario         — POST  /api/usuarios                {usuario, nombre, rol, password}
 *   actualizarUsuario    — PATCH /api/usuarios/:id            {nombre?, rol?, activo?}
 *   restablecerPassword  — POST  /api/usuarios/:id/restablecer-password {password}
 *
 * Ninguna respuesta incluye hashes de contraseñas.
 * ─────────────────────────────────────────────────────────────
 */

import * as Usuario from '../models/Usuario.js';
import * as SesionLogin from '../models/SesionLogin.js';
import { hashPassword } from '../services/passwords.js';

/** GET /api/usuarios — lista de usuarios, sin hashes */
export const listarUsuarios = async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await Usuario.listar() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/usuarios
 * El usuario nuevo queda con debe_cambiar_password: la contraseña
 * que le pone el admin solo sirve para entrar la primera vez.
 */
export const crearUsuario = async (req, res, next) => {
  const { usuario, nombre, rol, password } = req.nuevoUsuario;
  try {
    const id = await Usuario.crear({
      usuario, nombre, rol,
      hashPassword: await hashPassword(password),
      debeCambiarPassword: true,
    });
    if (id === null) {
      return res.status(409).json({ ok: false, error: `Ya existe un usuario llamado "${usuario}"` });
    }
    console.log(`[usuarios] "${req.usuario.usuario}" creó a "${usuario}" (${rol})`);
    res.status(201).json({ ok: true, data: await Usuario.buscarPorId(id) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/usuarios/:id
 * No permite degradar ni desactivar al último admin activo (409).
 * Al desactivar a un usuario se cierran sus sesiones de login.
 */
export const actualizarUsuario = async (req, res, next) => {
  const id = req.idUsuario;
  const cambios = req.cambiosUsuario;
  try {
    const resultado = await Usuario.actualizar(id, cambios);

    if (resultado === 'no_existe') {
      return res.status(404).json({ ok: false, error: `El usuario ${id} no existe` });
    }
    if (resultado === 'ultimo_admin') {
      return res.status(409).json({
        ok:    false,
        error: 'No se puede degradar ni desactivar al último administrador activo. Nombra antes a otro administrador.',
      });
    }

    if (cambios.activo === false) await SesionLogin.borrarDeUsuario(id);

    console.log(`[usuarios] "${req.usuario.usuario}" modificó al usuario ${id}: ${Object.keys(cambios).join(', ')}`);
    res.json({ ok: true, data: await Usuario.buscarPorId(id) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/usuarios/:id/restablecer-password
 * Pone una contraseña temporal: el usuario tendrá que cambiarla al
 * entrar y se cierran sus sesiones abiertas. Si el admin restablece
 * la suya propia, conserva la sesión con la que lo hizo.
 */
export const restablecerPassword = async (req, res, next) => {
  const id = req.idUsuario;
  try {
    const actualizado = await Usuario.actualizarPassword(id, await hashPassword(req.passwordNueva), true);
    if (!actualizado) {
      return res.status(404).json({ ok: false, error: `El usuario ${id} no existe` });
    }

    const esPropia = id === req.usuario.id;
    await SesionLogin.borrarDeUsuario(id, esPropia ? req.sesionLoginId : null);

    console.log(`[usuarios] "${req.usuario.usuario}" restableció la contraseña del usuario ${id}`);
    res.json({ ok: true, data: await Usuario.buscarPorId(id) });
  } catch (err) {
    next(err);
  }
};
