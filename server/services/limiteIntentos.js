/**
 * services/limiteIntentos.js
 * ─────────────────────────────────────────────────────────────
 * Límite de intentos fallidos de contraseña, en memoria.
 *
 * Regla: 5 fallos de la misma combinación (usuario + IP) dentro de
 * 15 minutos bloquean esa combinación hasta que el fallo más antiguo
 * de los 5 cumpla 15 minutos. Un acierto borra la cuenta.
 *
 * Se guarda en memoria a propósito: al reiniciar el servidor la
 * cuenta empieza de cero, y eso es aceptable para un sistema de
 * laboratorio con un solo proceso.
 *
 * Las funciones reciben `ahora` (ms) solo para poder probarlas sin
 * esperar; en el uso normal se omite.
 * ─────────────────────────────────────────────────────────────
 */

export const MAX_FALLOS = 5;
export const VENTANA_MS = 15 * 60 * 1000;

/** Tope de claves guardadas, para que un atacante no llene la memoria */
const MAX_CLAVES = 10_000;

/** clave → lista de instantes (ms) de los fallos recientes, en orden */
const fallos = new Map();

/** Clave de la combinación usuario + IP */
export const claveDeIntento = (usuario, ip) => `${String(usuario).toLowerCase()}|${ip ?? ''}`;

const recientes = (clave, ahora) =>
  (fallos.get(clave) ?? []).filter(t => ahora - t < VENTANA_MS);

/**
 * Segundos que faltan para que la combinación pueda volver a intentar.
 * @returns {number} 0 si no está bloqueada
 */
export function segundosDeBloqueo(clave, ahora = Date.now()) {
  const lista = recientes(clave, ahora);
  if (lista.length < MAX_FALLOS) return 0;
  // Se desbloquea cuando el quinto fallo más reciente sale de la ventana
  const liberaEn = lista[lista.length - MAX_FALLOS] + VENTANA_MS;
  return Math.max(1, Math.ceil((liberaEn - ahora) / 1000));
}

/** Anota un intento fallido */
export function registrarFallo(clave, ahora = Date.now()) {
  if (!fallos.has(clave) && fallos.size >= MAX_CLAVES) {
    limpiarIntentosViejos(ahora);
    // Si aun así no cabe, se descarta la clave más antigua
    if (fallos.size >= MAX_CLAVES) fallos.delete(fallos.keys().next().value);
  }
  fallos.set(clave, [...recientes(clave, ahora), ahora]);
}

/** Borra la cuenta de una combinación (después de un acierto) */
export function olvidarFallos(clave) {
  fallos.delete(clave);
}

/** Quita las combinaciones cuyos fallos ya salieron de la ventana */
export function limpiarIntentosViejos(ahora = Date.now()) {
  for (const clave of fallos.keys()) {
    const lista = recientes(clave, ahora);
    if (lista.length === 0) fallos.delete(clave);
    else fallos.set(clave, lista);
  }
}
