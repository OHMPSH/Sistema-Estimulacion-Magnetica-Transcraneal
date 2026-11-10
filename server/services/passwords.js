/**
 * services/passwords.js
 * ─────────────────────────────────────────────────────────────
 * Hash y verificación de contraseñas con scrypt (node:crypto).
 *
 * Formato guardado en usuarios.hash_password:
 *
 *   scrypt$N$r$p$salHex$hashHex
 *
 * Los parámetros van dentro del texto para poder subirlos más
 * adelante sin invalidar las contraseñas ya guardadas: al verificar
 * se usan los parámetros con los que se creó cada hash.
 *
 * La contraseña en claro nunca se guarda ni se escribe en el log.
 * ─────────────────────────────────────────────────────────────
 */

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export const LONGITUD_MINIMA = 8;
/** Tope para que nadie haga trabajar a scrypt con textos enormes */
export const LONGITUD_MAXIMA = 200;

// Parámetros de costo de scrypt: 16 MB de memoria por cálculo.
const N = 16384;
const R = 8;
const P = 1;
const BYTES_SAL  = 16;
const BYTES_HASH = 32;

// Límites al LEER un hash guardado, para no aceptar parámetros absurdos
const N_MAXIMO = 2 ** 20;

/**
 * Comprueba que una contraseña nueva cumple las reglas.
 * @returns {string|null} el mensaje de error, o null si es válida
 */
export function errorDePassword(password) {
  if (typeof password !== 'string') return 'La contraseña debe ser un texto';
  if (password.length < LONGITUD_MINIMA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`;
  }
  if (password.length > LONGITUD_MAXIMA) {
    return `La contraseña no puede tener más de ${LONGITUD_MAXIMA} caracteres`;
  }
  return null;
}

/**
 * Calcula el hash de una contraseña con una sal aleatoria nueva.
 * @param {string} password
 * @returns {Promise<string>} scrypt$N$r$p$salHex$hashHex
 * @throws {Error} si la contraseña no cumple las reglas
 */
export async function hashPassword(password) {
  const error = errorDePassword(password);
  if (error) throw new Error(error);

  const sal  = randomBytes(BYTES_SAL);
  const hash = await scryptAsync(password, sal, BYTES_HASH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Compara una contraseña con un hash guardado, en tiempo constante.
 * Nunca lanza: un hash con formato desconocido simplemente no coincide.
 * @param {string} password
 * @param {string} guardado  scrypt$N$r$p$salHex$hashHex
 * @returns {Promise<boolean>}
 */
export async function verificarPassword(password, guardado) {
  if (typeof password !== 'string' || typeof guardado !== 'string') return false;
  if (password.length > LONGITUD_MAXIMA) return false;

  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [n, r, p] = partes.slice(1, 4).map(Number);
  const hex = /^(?:[0-9a-f]{2})+$/;
  if (!Number.isInteger(n) || n < 2 || n > N_MAXIMO || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < 1 || r > 32) return false;
  if (!Number.isInteger(p) || p < 1 || p > 16) return false;
  if (!hex.test(partes[4]) || !hex.test(partes[5])) return false;

  const sal      = Buffer.from(partes[4], 'hex');
  const esperado = Buffer.from(partes[5], 'hex');

  try {
    const calculado = await scryptAsync(password, sal, esperado.length, {
      N: n, r, p, maxmem: 256 * n * r,
    });
    return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

/**
 * Hash de relleno. Cuando el usuario del login no existe se verifica
 * contra este hash, para que la respuesta tarde lo mismo que con un
 * usuario real y el tiempo no delate qué nombres existen.
 */
let hashDeRelleno = null;
export async function verificarContraRelleno(password) {
  hashDeRelleno ??= await hashPassword(randomBytes(24).toString('hex'));
  await verificarPassword(password, hashDeRelleno);
  return false;
}
