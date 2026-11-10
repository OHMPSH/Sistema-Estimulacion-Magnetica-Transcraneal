/**
 * config/roles.js
 * ─────────────────────────────────────────────────────────────
 * Roles de los usuarios del dashboard y temas de la interfaz.
 *
 *   admin      — todo, incluidos los usuarios y la configuración
 *   operador   — inicia y detiene barridos, exporta
 *   observador — solo mira y exporta
 *
 * Deben coincidir con el ENUM de usuarios.rol en la base de datos.
 * ─────────────────────────────────────────────────────────────
 */

export const ROLES = ['admin', 'operador', 'observador'];

/** Valores válidos de la preferencia `tema` de cada usuario */
export const TEMAS = ['oscuro', 'claro', 'sistema'];
