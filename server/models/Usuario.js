/**
 * models/Usuario.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC) — Recurso: usuarios del dashboard
 *
 * Todo el SQL de la tabla `usuarios`. Las funciones que devuelven
 * usuarios "públicos" nunca incluyen hash_password; solo
 * buscarConHashPorUsuario y buscarConHashPorId lo traen, y se usan
 * únicamente para verificar contraseñas.
 *
 * Tiempo: todas las fechas en UTC.
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/database.js';

/** Columnas que pueden salir del servidor (sin hash_password) */
const COLUMNAS_PUBLICAS =
  'id, usuario, nombre, rol, activo, debe_cambiar_password, preferencias, creado_en, ultimo_acceso';

/**
 * MariaDB guarda JSON como texto y los BOOLEAN como 0/1: aquí se
 * convierten a los tipos que usa el resto del código.
 */
export function normalizarPreferencias(valor) {
  if (valor && typeof valor === 'object') return valor;
  if (typeof valor !== 'string') return {};
  try {
    const obj = JSON.parse(valor);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

function normalizar(fila) {
  if (!fila) return null;
  return {
    ...fila,
    activo:                Boolean(fila.activo),
    debe_cambiar_password: Boolean(fila.debe_cambiar_password),
    preferencias:          normalizarPreferencias(fila.preferencias),
  };
}

// ─────────────────────────────────────────────────────────────
// LECTURA
// ─────────────────────────────────────────────────────────────

/** Todos los usuarios, sin hashes, ordenados por nombre de usuario */
export async function listar() {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY usuario ASC`
  );
  return filas.map(normalizar);
}

/** Un usuario por id, sin hash; null si no existe */
export async function buscarPorId(id) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`,
    [id]
  );
  return normalizar(filas[0]);
}

/** Un usuario por nombre de usuario, sin hash; null si no existe */
export async function buscarPorUsuario(usuario) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE usuario = ?`,
    [usuario]
  );
  return normalizar(filas[0]);
}

/** Igual que buscarPorUsuario pero CON hash_password (solo para el login) */
export async function buscarConHashPorUsuario(usuario) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_PUBLICAS}, hash_password FROM usuarios WHERE usuario = ?`,
    [usuario]
  );
  return normalizar(filas[0]);
}

/** Igual que buscarPorId pero CON hash_password (solo para cambiar la contraseña) */
export async function buscarConHashPorId(id) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_PUBLICAS}, hash_password FROM usuarios WHERE id = ?`,
    [id]
  );
  return normalizar(filas[0]);
}

/** Cuántos administradores activos hay */
export async function contarAdminsActivos() {
  const [filas] = await pool.execute(
    "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin' AND activo = 1"
  );
  return Number(filas[0].total);
}

// ─────────────────────────────────────────────────────────────
// ESCRITURA
// ─────────────────────────────────────────────────────────────

/**
 * Crea un usuario.
 * @param {object} u  { usuario, nombre, rol, hashPassword, debeCambiarPassword }
 * @returns {Promise<number|null>} el id nuevo, o null si el nombre de usuario ya existe
 */
export async function crear({ usuario, nombre, rol, hashPassword, debeCambiarPassword = true }) {
  try {
    const [resultado] = await pool.execute(
      `INSERT INTO usuarios
         (usuario, nombre, rol, hash_password, activo, debe_cambiar_password, creado_en)
       VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP())`,
      [usuario, nombre, rol, hashPassword, debeCambiarPassword ? 1 : 0]
    );
    return resultado.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

/**
 * Cambia nombre, rol o activo de un usuario.
 *
 * La comprobación del "último administrador" y el UPDATE van en una
 * misma transacción, con las filas de los administradores bloqueadas
 * (FOR UPDATE): así dos peticiones simultáneas no pueden dejar al
 * sistema sin ningún administrador activo.
 *
 * @param {number} id
 * @param {object} cambios  { nombre?, rol?, activo? }
 * @returns {Promise<'ok'|'no_existe'|'ultimo_admin'>}
 */
export async function actualizar(id, cambios) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [admins] = await conn.execute(
      "SELECT id FROM usuarios WHERE rol = 'admin' AND activo = 1 FOR UPDATE"
    );
    const [filas] = await conn.execute(
      'SELECT id, rol, activo FROM usuarios WHERE id = ? FOR UPDATE',
      [id]
    );
    const actual = filas[0];
    if (!actual) {
      await conn.rollback();
      return 'no_existe';
    }

    const eraAdminActivo   = actual.rol === 'admin' && Boolean(actual.activo);
    const rolFinal         = cambios.rol ?? actual.rol;
    const activoFinal      = cambios.activo ?? Boolean(actual.activo);
    const sigueAdminActivo = rolFinal === 'admin' && activoFinal;

    if (eraAdminActivo && !sigueAdminActivo && admins.length <= 1) {
      await conn.rollback();
      return 'ultimo_admin';
    }

    // Solo estas tres columnas se pueden cambiar por aquí
    const asignaciones = [];
    const valores = [];
    if (cambios.nombre !== undefined) { asignaciones.push('nombre = ?'); valores.push(cambios.nombre); }
    if (cambios.rol    !== undefined) { asignaciones.push('rol = ?');    valores.push(cambios.rol); }
    if (cambios.activo !== undefined) { asignaciones.push('activo = ?'); valores.push(cambios.activo ? 1 : 0); }

    if (asignaciones.length > 0) {
      await conn.execute(
        `UPDATE usuarios SET ${asignaciones.join(', ')} WHERE id = ?`,
        [...valores, id]
      );
    }

    await conn.commit();
    return 'ok';
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Guarda un hash de contraseña nuevo.
 * @param {boolean} debeCambiar  true si el usuario tendrá que cambiarla al entrar
 * @returns {Promise<boolean>} false si el usuario no existe
 */
export async function actualizarPassword(id, hashPassword, debeCambiar) {
  const [resultado] = await pool.execute(
    'UPDATE usuarios SET hash_password = ?, debe_cambiar_password = ? WHERE id = ?',
    [hashPassword, debeCambiar ? 1 : 0, id]
  );
  return resultado.affectedRows === 1;
}

/**
 * Deja a un usuario existente como administrador activo con una
 * contraseña nueva. Lo usa scripts/crear-admin.js.
 * @param {boolean} debeCambiar  true si tendrá que cambiarla al entrar
 */
export async function restablecerComoAdmin(id, hashPassword, debeCambiar = true) {
  const [resultado] = await pool.execute(
    `UPDATE usuarios
        SET hash_password = ?, rol = 'admin', activo = 1, debe_cambiar_password = ?
      WHERE id = ?`,
    [hashPassword, debeCambiar ? 1 : 0, id]
  );
  return resultado.affectedRows === 1;
}

/** Reemplaza el JSON de preferencias del usuario */
export async function actualizarPreferencias(id, preferencias) {
  await pool.execute(
    'UPDATE usuarios SET preferencias = ? WHERE id = ?',
    [JSON.stringify(preferencias), id]
  );
}

/** Anota la hora del último login correcto */
export async function registrarAcceso(id) {
  await pool.execute('UPDATE usuarios SET ultimo_acceso = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

/** Borra un usuario (y, en cascada, sus sesiones de login). Solo para pruebas y scripts. */
export async function eliminar(id) {
  const [resultado] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
  return resultado.affectedRows === 1;
}
