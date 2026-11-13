/**
 * services/simulacionPura.js
 * ─────────────────────────────────────────────────────────────
 * Generador de las muestras del simulador, sin base de datos ni
 * temporizadores (se puede probar con node:test).
 *
 * crearGeneradorMuestras({ simulacion, barrido, sensor, malla })
 * devuelve siguiente(indice) → {
 *   punto:    { xMM, yMM, zMM, zIdx },
 *   hueco:    true si el punto se omite (prob_hueco),
 *   saturado: true si se inyecta una saturación (prob_saturacion),
 *   bx, by, bz  en µT
 * }
 *
 * Determinismo: cada punto consume siempre 5 números del generador
 * (hueco, saturación y el ruido de los 3 ejes), aunque sea un hueco.
 * Así, con la misma semilla, el ruido de un punto no depende de las
 * probabilidades configuradas, y la secuencia se repite exacta.
 *
 * Saturación inyectada: la componente bz se reemplaza por
 * 1,5 × el fondo de escala del sensor (limiteSensorUT: 3276,7 µT con el
 * QMC5883P en 30 G; 249,6 µT con el HMC5883L en 1,9 Ga), con el signo del
 * campo. La ingesta la guarda como el sensor real: saturado = 1 (con el
 * HMC5883L, bz NULL y crudo −4096; con el QMC5883P, bx, by, bz NULL).
 * ─────────────────────────────────────────────────────────────
 */

import { mulberry32, generadorGaussiano } from './aleatorio.js';
import { campoEnPlaca } from './fisicaEspira.js';
import { puntoDeMalla } from './geometria.js';
import { limiteSensorUT } from './validacionConfiguracion.js';

export const FACTOR_SATURACION = 1.5;

export function crearGeneradorMuestras({ simulacion, barrido, sensor, malla }) {
  const uniforme  = mulberry32(simulacion.semilla);
  const gaussiano = generadorGaussiano(uniforme);
  const parametros = {
    // La zona va centrada bajo la bobina
    centroXMM:     malla.zona.x / 2,
    centroYMM:     malla.zona.y / 2,
    standoffMM:    barrido.standoff_mm,
    radioMM:       simulacion.radio_bobina_mm,
    campoCentroUT: simulacion.campo_centro_ut,
  };
  const limiteUT = limiteSensorUT(sensor);
  const sigma = simulacion.ruido_sigma_ut;

  return function siguiente(indice) {
    const punto = puntoDeMalla(malla, indice);
    const uHueco = uniforme();
    const uSaturacion = uniforme();
    const ruido = [gaussiano(sigma), gaussiano(sigma), gaussiano(sigma)];

    const campo = campoEnPlaca(punto.xMM, punto.yMM, punto.zMM, parametros);
    let bz = campo.bz + ruido[2];
    const saturado = uSaturacion < simulacion.prob_saturacion;
    if (saturado) bz = Math.sign(bz || 1) * limiteUT * FACTOR_SATURACION;

    return {
      punto,
      hueco: uHueco < simulacion.prob_hueco,
      saturado,
      bx: campo.bx + ruido[0],
      by: campo.by + ruido[1],
      bz,
    };
  };
}
