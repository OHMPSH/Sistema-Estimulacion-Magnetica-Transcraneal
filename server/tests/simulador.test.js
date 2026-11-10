/**
 * tests/simulador.test.js
 * ─────────────────────────────────────────────────────────────
 * Pruebas de la física y del azar del simulador (sin base de datos).
 * Ejecutar desde server/:  npm test
 * ─────────────────────────────────────────────────────────────
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { integralesElipticas, campoEspira, campoEnPlaca } from '../services/fisicaEspira.js';
import { mulberry32, generadorGaussiano } from '../services/aleatorio.js';
import { mallaDeBarrido, puntoDeMalla } from '../services/geometria.js';
import { crearGeneradorMuestras } from '../services/simulacionPura.js';
import { limiteSensorUT } from '../services/validacionConfiguracion.js';

const PARAMETROS = { centroMM: 30, standoffMM: 5, radioMM: 25, campoCentroUT: 120 };
const BARRIDO = { grid_size_mm: 60, z_max_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 };
const SIMULACION = {
  ms_por_punto: { DC: 60, AC: 120 }, semilla: 12345, ruido_sigma_ut: 0.25,
  radio_bobina_mm: 25, campo_centro_ut: 120, prob_hueco: 0.1, prob_saturacion: 0.05,
};
const SENSOR = { modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 1, offset_ut: { x: 0, y: 0, z: 0 } };

const errorRelativo = (a, b) => Math.abs(a - b) / Math.abs(b);

test('K(m) y E(m) coinciden con valores de referencia', () => {
  // K(0) = E(0) = π/2;  K(0,5) = 1,8540746773013719;  E(0,5) = 1,3506438810476755
  const cero = integralesElipticas(0);
  assert.ok(errorRelativo(cero.K, Math.PI / 2) < 1e-15);
  assert.ok(errorRelativo(cero.E, Math.PI / 2) < 1e-15);
  const medio = integralesElipticas(0.5);
  assert.ok(errorRelativo(medio.K, 1.8540746773013719) < 1e-13);
  assert.ok(errorRelativo(medio.E, 1.3506438810476755) < 1e-13);
});

test('En el eje, Bz coincide con μ0·I·R²/(2(R²+z²)^{3/2}) normalizada (error < 1e-9)', () => {
  const R = PARAMETROS.radioMM;
  const zCentro = PARAMETROS.standoffMM;
  // Fórmula analítica en el eje, normalizada para valer campoCentroUT a la altura del centro
  const analitica = z => R * R / (2 * (R * R + z * z) ** 1.5);
  for (const zMM of [0, 5, 10, 15, 20, 37.5]) {
    const esperado = PARAMETROS.campoCentroUT * analitica(zMM + zCentro) / analitica(zCentro);
    const { bz } = campoEnPlaca(30, 30, zMM, PARAMETROS);
    assert.ok(errorRelativo(bz, esperado) < 1e-9, `z=${zMM}: ${bz} vs ${esperado}`);
  }
  // Y la fórmula general (con integrales elípticas) tiende al mismo valor muy cerca del eje
  const casiEje = campoEspira(1e-9, 10, R).bz;
  assert.ok(errorRelativo(casiEje, campoEspira(0, 10, R).bz) < 1e-9);
});

test('|B| en el centro con z = 0 vale campo_centro_ut', () => {
  const { bx, by, bz } = campoEnPlaca(30, 30, 0, PARAMETROS);
  assert.ok(errorRelativo(Math.hypot(bx, by, bz), 120) < 1e-12);
});

test('Bρ vale 0 en el eje', () => {
  for (const z of [0.5, 5, 25]) assert.equal(campoEspira(0, z, 25).bRho, 0);
  const { bx, by } = campoEnPlaca(30, 30, 10, PARAMETROS);
  assert.equal(bx, 0);
  assert.equal(by, 0);
});

test('El campo es simétrico ante x → −x (respecto del centro)', () => {
  for (const [dx, dy, z] of [[5, 0, 0], [12.5, 7, 5], [30, 30, 20], [3, -11, 10]]) {
    const a = campoEnPlaca(30 + dx, 30 + dy, z, PARAMETROS);
    const b = campoEnPlaca(30 - dx, 30 + dy, z, PARAMETROS);
    assert.ok(Math.abs(a.bx + b.bx) < 1e-12, 'Bx cambia de signo');
    assert.ok(Math.abs(a.by - b.by) < 1e-12, 'By se conserva');
    assert.ok(Math.abs(a.bz - b.bz) < 1e-12, 'Bz se conserva');
  }
});

test('La misma semilla produce la misma secuencia', () => {
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43);
  const sa = Array.from({ length: 1000 }, a);
  assert.deepEqual(sa, Array.from({ length: 1000 }, b));
  assert.notDeepEqual(sa, Array.from({ length: 1000 }, c));
  assert.ok(sa.every(v => v >= 0 && v < 1));

  // Y el simulador completo también: mismas muestras con la misma configuración
  const malla = mallaDeBarrido(BARRIDO, 5);
  const g1 = crearGeneradorMuestras({ simulacion: SIMULACION, barrido: BARRIDO, sensor: SENSOR, malla });
  const g2 = crearGeneradorMuestras({ simulacion: SIMULACION, barrido: BARRIDO, sensor: SENSOR, malla });
  for (let i = 0; i < malla.totalPuntos; i++) assert.deepEqual(g1(i), g2(i));
});

test('La σ empírica de 100 000 muestras está a menos del 2 % de la configurada', () => {
  const sigma = 0.25;
  const gauss = generadorGaussiano(mulberry32(7));
  const n = 100_000;
  let suma = 0, sumaCuad = 0;
  for (let i = 0; i < n; i++) {
    const v = gauss(sigma);
    suma += v;
    sumaCuad += v * v;
  }
  const media = suma / n;
  const sigmaEmpirica = Math.sqrt(sumaCuad / n - media * media);
  assert.ok(errorRelativo(sigmaEmpirica, sigma) < 0.02, `σ empírica ${sigmaEmpirica}`);
  assert.ok(Math.abs(media) < 0.01, `media ${media}`);
});

test('La malla depende del paso: 845, 147 y 32 puntos, en orden x → y → z', () => {
  assert.equal(mallaDeBarrido(BARRIDO, 5).totalPuntos, 845);
  assert.equal(mallaDeBarrido(BARRIDO, 10).totalPuntos, 147);
  assert.equal(mallaDeBarrido(BARRIDO, 20).totalPuntos, 32);
  assert.deepEqual(mallaDeBarrido(BARRIDO, 10).zLevels, [0, 10, 20]);
  assert.deepEqual(mallaDeBarrido(BARRIDO, 20).ejeX, [0, 20, 40, 60]);

  const m = mallaDeBarrido(BARRIDO, 20);
  assert.deepEqual(puntoDeMalla(m, 0), { xMM: 0, yMM: 0, zMM: 0, zIdx: 0 });
  assert.deepEqual(puntoDeMalla(m, 1), { xMM: 20, yMM: 0, zMM: 0, zIdx: 0 });
  assert.deepEqual(puntoDeMalla(m, 4), { xMM: 0, yMM: 20, zMM: 0, zIdx: 0 });
  assert.deepEqual(puntoDeMalla(m, 31), { xMM: 60, yMM: 60, zMM: 20, zIdx: 1 });
});

test('Las saturaciones inyectadas quedan fuera del rango del sensor', () => {
  const malla = mallaDeBarrido(BARRIDO, 5);
  const g = crearGeneradorMuestras({ simulacion: { ...SIMULACION, prob_saturacion: 1 }, barrido: BARRIDO, sensor: SENSOR, malla });
  const limite = limiteSensorUT(SENSOR);
  assert.ok(Math.abs(limite - 249.6341463414634) < 1e-9);
  for (let i = 0; i < 20; i++) assert.ok(Math.abs(g(i).bz) > limite);
});

test('Con los valores por defecto (1,9 Ga) ningún punto satura; con 1,3 Ga saturarían 4 junto al hilo en Z = 0', () => {
  // Cerca del hilo de la espira el campo (213 µT en Z = 0) es mayor que en el centro (120 µT).
  const malla = mallaDeBarrido(BARRIDO, 5);
  const contar = sensor => {
    const limite = limiteSensorUT(sensor);
    const g = crearGeneradorMuestras({ simulacion: { ...SIMULACION, prob_saturacion: 0, ruido_sigma_ut: 0 }, barrido: BARRIDO, sensor, malla });
    const fuera = [];
    for (let i = 0; i < malla.totalPuntos; i++) {
      const s = g(i);
      if (Math.max(Math.abs(s.bx), Math.abs(s.by), Math.abs(s.bz)) > limite) fuera.push(s.punto);
    }
    return fuera;
  };
  assert.equal(contar(SENSOR).length, 0);
  const con13 = contar({ ...SENSOR, rango_ga: 1.3, lsb_por_ga: 1090 });
  assert.equal(con13.length, 4);
  assert.ok(Math.abs(limiteSensorUT({ ...SENSOR, rango_ga: 1.3, lsb_por_ga: 1090 }) - 187.79816513761467) < 1e-9);
  assert.ok(con13.every(p => p.zMM === 0));
});

