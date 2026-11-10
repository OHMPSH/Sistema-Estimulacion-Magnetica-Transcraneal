/**
 * services/aleatorio.js
 * ─────────────────────────────────────────────────────────────
 * Números aleatorios reproducibles para el simulador (funciones puras).
 *
 * Con la misma semilla se obtiene exactamente la misma secuencia, así
 * que una sesión simulada se puede repetir y comparar.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Generador mulberry32 (Tommy Ettinger): estado de 32 bits, periodo
 * 2^32, suficiente para unas miles de muestras por sesión.
 * @param {number} semilla  entero (se toma módulo 2^32)
 * @returns {() => number}  función que devuelve un número en [0, 1)
 */
export function mulberry32(semilla) {
  let estado = semilla >>> 0;
  return function siguiente() {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ruido gaussiano N(0, σ²) por el método de Box–Muller:
 *
 *   z0 = √(−2 ln u1) · cos(2π u2)
 *   z1 = √(−2 ln u1) · sin(2π u2)
 *
 * con u1, u2 uniformes en (0, 1]. Cada par de uniformes da dos
 * normales; la segunda se guarda para la siguiente llamada.
 *
 * @param {() => number} uniforme  generador en [0, 1)
 * @returns {(sigma: number) => number}
 */
export function generadorGaussiano(uniforme) {
  let guardado = null;
  return function gaussiano(sigma = 1) {
    if (guardado !== null) {
      const z = guardado;
      guardado = null;
      return z * sigma;
    }
    const u1 = 1 - uniforme();       // (0, 1]: evita ln(0)
    const u2 = uniforme();
    const r = Math.sqrt(-2 * Math.log(u1));
    guardado = r * Math.sin(2 * Math.PI * u2);
    return r * Math.cos(2 * Math.PI * u2) * sigma;
  };
}
