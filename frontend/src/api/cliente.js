/**
 * api/cliente.js
 * ─────────────────────────────────────────────────────────────
 * Único punto por el que el frontend habla con la API.
 *
 * `apiFetch` se usa igual que `fetch`, con dos diferencias:
 *   - Siempre envía la cookie de sesión (credentials: 'same-origin').
 *   - Si el servidor responde 401 (no hay sesión o expiró), avisa a
 *     quien se haya registrado con `alPerderSesion`. AuthContext se
 *     registra ahí y devuelve al usuario a la pantalla de login.
 *
 * `enviarJSON` es un atajo para las peticiones con cuerpo JSON.
 * ─────────────────────────────────────────────────────────────
 */

let avisarSesionPerdida = null;

/**
 * Registra la función que se llama cuando la API responde 401.
 * Pasa null para quitarla.
 */
export function alPerderSesion(fn) {
  avisarSesionPerdida = fn;
}

/** Igual que fetch, pero con la cookie de sesión y el aviso ante un 401 */
export async function apiFetch(ruta, opciones = {}) {
  const res = await fetch(ruta, { credentials: 'same-origin', ...opciones });
  if (res.status === 401) avisarSesionPerdida?.();
  return res;
}

/** Petición con cuerpo JSON (POST por defecto) */
export function enviarJSON(ruta, cuerpo, metodo = 'POST') {
  return apiFetch(ruta, {
    method:  metodo,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(cuerpo),
  });
}

/**
 * Lee el cuerpo JSON de una respuesta sin lanzar: si el cuerpo no es
 * JSON (por ejemplo, un error del proxy), devuelve un objeto de error.
 */
export async function leerJSON(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false, error: `El servidor respondió ${res.status} sin un cuerpo válido` };
  }
}
