/**
 * scripts/crear-admin.js
 * ─────────────────────────────────────────────────────────────
 * Crea el usuario `admin` o, si ya existe, le restablece la
 * contraseña (y lo deja activo y con rol admin). Sirve para el
 * primer arranque y para recuperar el acceso si se pierde la
 * contraseña del administrador.
 *
 * Uso (desde server/):
 *
 *   npm run crear-admin
 *
 * Pide la contraseña dos veces por la terminal, sin mostrarla.
 * Si no hay terminal interactiva (por ejemplo en un script), toma la
 * contraseña de la variable de entorno ADMIN_PASSWORD:
 *
 *   ADMIN_PASSWORD='una-clave-temporal' npm run crear-admin
 *
 * En los dos casos el usuario queda marcado con
 * debe_cambiar_password: al entrar por primera vez, el dashboard le
 * obliga a elegir una contraseña nueva. Además se cierran las
 * sesiones de login que tuviera abiertas.
 *
 * Acceso predeterminado (decisión del usuario, 2026-11-09):
 *
 *   npm run crear-admin -- --predeterminado
 *
 * deja el usuario admin con la contraseña "admin", SIN cambio
 * obligatorio. No cumple la longitud mínima de 8 caracteres a
 * propósito, y funciona también en producción. Cualquiera que esté
 * en la misma red y la conozca entra como administrador.
 *
 * Requiere que existan las tablas (setup_db.sql o la migración 002).
 * ─────────────────────────────────────────────────────────────
 */

import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carga server/.env sin importar desde qué carpeta se ejecute el script
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const USUARIO = 'admin';
const NOMBRE  = 'Administrador';
const PASSWORD_PREDETERMINADA = 'admin';
const PREDETERMINADO = process.argv.includes('--predeterminado');

/**
 * Pregunta algo por la terminal sin mostrar lo que se escribe.
 * readline escribe el eco en su `output`; aquí ese output es un
 * stream que se silencia justo después de imprimir la pregunta.
 */
function preguntarSinEco(pregunta) {
  return new Promise((resolve, reject) => {
    let silenciado = false;
    const salida = new Writable({
      write(trozo, _codificacion, listo) {
        if (!silenciado) process.stdout.write(trozo);
        listo();
      },
    });
    const rl = createInterface({ input: process.stdin, output: salida, terminal: true });

    rl.question(pregunta, respuesta => {
      rl.close();
      process.stdout.write('\n');
      resolve(respuesta);
    });
    silenciado = true;

    rl.on('SIGINT', () => {
      rl.close();
      process.stdout.write('\n');
      reject(new Error('Cancelado.'));
    });
  });
}

/** Obtiene la contraseña: de ADMIN_PASSWORD o preguntándola dos veces */
async function obtenerPassword(errorDePassword) {
  const deEntorno = process.env.ADMIN_PASSWORD;
  if (deEntorno !== undefined && deEntorno !== '') {
    const error = errorDePassword(deEntorno);
    if (error) throw new Error(`ADMIN_PASSWORD no es válida: ${error}`);
    console.log('[crear-admin] Usando la contraseña de la variable ADMIN_PASSWORD.');
    return deEntorno;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'No hay una terminal interactiva para pedir la contraseña. ' +
      "Ejecuta el script desde una terminal o define ADMIN_PASSWORD='...'."
    );
  }

  const primera = await preguntarSinEco(`Contraseña nueva para "${USUARIO}" (no se muestra): `);
  const error = errorDePassword(primera);
  if (error) throw new Error(error);

  const segunda = await preguntarSinEco('Repite la contraseña: ');
  if (primera !== segunda) throw new Error('Las dos contraseñas no coinciden.');
  return primera;
}

async function main() {
  // Se importan aquí, después de cargar el .env, porque la conexión
  // a la base lee sus credenciales al importarse.
  const { hashPassword, errorDePassword } = await import('../services/passwords.js');
  const password = PREDETERMINADO ? PASSWORD_PREDETERMINADA : await obtenerPassword(errorDePassword);
  const debeCambiar = !PREDETERMINADO;
  if (PREDETERMINADO) {
    console.log('[crear-admin] Acceso predeterminado: usuario "admin", contraseña "admin", sin cambio obligatorio.');
  }

  const { default: pool } = await import('../config/database.js');
  const Usuario     = await import('../models/Usuario.js');
  const SesionLogin = await import('../models/SesionLogin.js');

  try {
    const hash      = await hashPassword(password, { validar: !PREDETERMINADO });
    const existente = await Usuario.buscarPorUsuario(USUARIO);

    if (existente) {
      await Usuario.restablecerComoAdmin(existente.id, hash, debeCambiar);
      const cerradas = await SesionLogin.borrarDeUsuario(existente.id);
      console.log(`[crear-admin] ✓ Contraseña de "${USUARIO}" restablecida (rol admin, activo).`);
      if (cerradas > 0) console.log(`[crear-admin]   Se cerraron ${cerradas} sesiones de login abiertas.`);
    } else {
      await Usuario.crear({
        usuario: USUARIO, nombre: NOMBRE, rol: 'admin',
        hashPassword: hash, debeCambiarPassword: debeCambiar,
      });
      console.log(`[crear-admin] ✓ Usuario "${USUARIO}" creado con rol admin.`);
    }
    if (debeCambiar) console.log('[crear-admin]   Al entrar al dashboard se le pedirá cambiar la contraseña.');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  if (err.code === 'ER_NO_SUCH_TABLE') {
    console.error('[crear-admin] ✗ No existe la tabla de usuarios. Ejecuta primero la migración:');
    console.error('[crear-admin]   sudo mysql tms_db < server/migrations/002_usuarios.sql');
  } else {
    console.error(`[crear-admin] ✗ ${err.message}`);
  }
  process.exit(1);
});
