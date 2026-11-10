/**
 * services/fisicaEspira.js
 * ─────────────────────────────────────────────────────────────
 * Campo magnético de una espira circular (funciones puras).
 *
 * Espira de radio a en el plano z = 0, centrada en el eje z, con
 * corriente I. En coordenadas cilíndricas (ρ, z), con
 *
 *   m = k² = 4aρ / ((a + ρ)² + z²)
 *
 * y las integrales elípticas completas K(m) y E(m), las componentes
 * son (Jackson; Smythe, "Static and Dynamic Electricity"):
 *
 *   Bz = C / √((a+ρ)² + z²) · [ K(m) + (a² − ρ² − z²) / ((a−ρ)² + z²) · E(m) ]
 *   Bρ = C · z / (ρ √((a+ρ)² + z²)) · [ −K(m) + (a² + ρ² + z²) / ((a−ρ)² + z²) · E(m) ]
 *
 * con C = μ0·I / (2π). Aquí se trabaja con C = 1 (unidades
 * arbitrarias) y luego se normaliza: el simulador escala el campo
 * para que |B| en el centro de la placa, a la altura z = 0 del
 * barrido, valga `campo_centro_ut`.
 *
 * En el eje (ρ = 0) se usa el límite exacto: Bρ = 0 y
 *   Bz = C · π a² / (a² + z²)^{3/2}   (= μ0 I a² / (2 (a²+z²)^{3/2}))
 *
 * El único punto singular es el propio hilo (ρ = a, z = 0); el
 * simulador nunca llega ahí porque z_real = zMM + standoff_mm > 0.
 *
 * Unidades: todas las longitudes en mm (las mismas para a, ρ y z).
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Integrales elípticas completas de primera y segunda especie,
 * K(m) y E(m), con el parámetro m = k² en [0, 1), por la media
 * aritmético-geométrica (AGM):
 *
 *   a0 = 1, b0 = √(1−m), c0 = √m
 *   a(n+1) = (an + bn)/2,  b(n+1) = √(an·bn),  c(n+1) = (an − bn)/2
 *   K = π / (2·aN)
 *   E = K · (1 − Σ_{n≥0} 2^(n−1) · cn²)
 *
 * Converge de forma cuadrática: unas 5 o 6 iteraciones bastan para
 * la precisión de un double.
 */
export function integralesElipticas(m) {
  if (!(m >= 0 && m < 1)) throw new RangeError(`m debe estar en [0, 1): ${m}`);
  let a = 1;
  let b = Math.sqrt(1 - m);
  let c = Math.sqrt(m);
  let potencia = 0.5;            // 2^(n−1), empieza en n = 0
  let suma = potencia * c * c;
  for (let i = 0; i < 50 && Math.abs(c) > Number.EPSILON * a; i++) {
    const an = (a + b) / 2;
    c = (a - b) / 2;
    b = Math.sqrt(a * b);
    a = an;
    potencia *= 2;
    suma += potencia * c * c;
  }
  const K = Math.PI / (2 * a);
  return { K, E: K * (1 - suma) };
}

/**
 * Campo de la espira en coordenadas cilíndricas, con C = μ0·I/(2π) = 1.
 * @param {number} rho  distancia al eje (mm, ≥ 0)
 * @param {number} z    altura sobre el plano de la espira (mm)
 * @param {number} a    radio de la espira (mm, > 0)
 * @returns {{ bRho: number, bz: number }}
 */
export function campoEspira(rho, z, a) {
  if (rho === 0) {
    return { bRho: 0, bz: (Math.PI * a * a) / Math.pow(a * a + z * z, 1.5) };
  }
  const sumaCuad  = (a + rho) ** 2 + z * z;
  const restaCuad = (a - rho) ** 2 + z * z;
  const m = (4 * a * rho) / sumaCuad;
  const { K, E } = integralesElipticas(m);
  const raiz = Math.sqrt(sumaCuad);

  const bz   = (1 / raiz) * (K + ((a * a - rho * rho - z * z) / restaCuad) * E);
  const bRho = (z / (rho * raiz)) * (-K + ((a * a + rho * rho + z * z) / restaCuad) * E);
  return { bRho, bz };
}

/**
 * Campo en un punto de la placa, en µT, ya normalizado.
 *
 * @param {number} xMM, yMM  posición en la placa (0..grid_size_mm)
 * @param {number} zMM       altura del barrido (0..z_max_mm)
 * @param {object} p
 *   centroMM       centro de la placa (= grid_size_mm / 2), donde está el eje de la bobina
 *   standoffMM     separación bobina–sensor: z_real = zMM + standoffMM
 *   radioMM        radio de la espira
 *   campoCentroUT  |B| deseado en el centro con zMM = 0
 * @returns {{ bx: number, by: number, bz: number }}
 */
export function campoEnPlaca(xMM, yMM, zMM, { centroMM, standoffMM, radioMM, campoCentroUT }) {
  const escala = campoCentroUT / campoEspira(0, standoffMM, radioMM).bz;

  const dx  = xMM - centroMM;
  const dy  = yMM - centroMM;
  const rho = Math.hypot(dx, dy);
  const { bRho, bz } = campoEspira(rho, zMM + standoffMM, radioMM);

  // Bρ apunta hacia afuera del eje: se reparte en x e y según el ángulo
  const bx = rho === 0 ? 0 : bRho * (dx / rho);
  const by = rho === 0 ? 0 : bRho * (dy / rho);
  return { bx: bx * escala, by: by * escala, bz: bz * escala };
}
