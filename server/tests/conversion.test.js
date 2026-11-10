/**
 * tests/conversion.test.js
 * ─────────────────────────────────────────────────────────────
 * Conversión de cuentas del HMC5883L a µT (Fase 4), sin base de datos.
 * Ejecutar desde server/:  npm test
 * ─────────────────────────────────────────────────────────────
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  convertirCrudo, validarLecturaDispositivo, crudoValido, utACrudo, DESBORDE,
} from '../services/conversionSensor.js';
import { GANANCIAS_HMC5883L } from '../services/validacionConfiguracion.js';

const sensorCon = (rango, offset = { x: 0, y: 0, z: 0 }) =>
  ({ modelo: 'HMC5883L', rango_ga: rango, lsb_por_ga: GANANCIAS_HMC5883L[rango], lecturas_por_punto: 1, offset_ut: offset });

const CTX = { zona: { x: 60, y: 60, z: 20 }, zLevels: [0, 5, 10, 15, 20], sensor: sensorCon(1.9) };
const lectura = (extra = {}) => ({ seq: 1, xMM: 30, yMM: 30, zMM: 0, raw: { x: 100, y: -200, z: 984 }, ts_ms: Date.UTC(2026, 10, 10), ...extra });

test('µT = cuentas / LSB por gauss × 100, para varias ganancias', () => {
  for (const [rango, lsb] of Object.entries(GANANCIAS_HMC5883L)) {
    const r = convertirCrudo({ x: 1000, y: -1000, z: 0 }, sensorCon(Number(rango)));
    assert.ok(Math.abs(r.bx - (1000 / lsb) * 100) < 1e-12, `rango ${rango}`);
    assert.ok(Math.abs(r.by + (1000 / lsb) * 100) < 1e-12);
    assert.equal(r.bz, 0);
    assert.equal(r.saturado, false);
  }
  // Casos a mano: 820 cuentas con 1,9 Ga = 1 Ga = 100 µT; 1090 con 1,3 Ga = 100 µT
  assert.equal(convertirCrudo({ x: 820, y: 0, z: 0 }, sensorCon(1.9)).bx, 100);
  assert.equal(convertirCrudo({ x: 1090, y: 0, z: 0 }, sensorCon(1.3)).bx, 100);
  assert.equal(convertirCrudo({ x: 230, y: 0, z: 0 }, sensorCon(8.1)).bx, 100);
});

test('|B| se calcula sin redondear', () => {
  const r = convertirCrudo({ x: 300, y: 400, z: 0 }, sensorCon(1.9));
  assert.ok(Math.abs(r.magnitud - Math.hypot(300 / 8.2, 400 / 8.2)) < 1e-12);
});

test('−4096 marca la lectura como saturada y deja ese eje en NULL', () => {
  const r = convertirCrudo({ x: 100, y: DESBORDE, z: 50 }, sensorCon(1.9));
  assert.equal(r.saturado, true);
  assert.equal(r.by, null);
  assert.equal(r.magnitud, null);
  assert.ok(Math.abs(r.bx - 100 / 8.2) < 1e-12);   // los demás ejes sí se convierten
  const v = validarLecturaDispositivo(lectura({ raw: { x: DESBORDE, y: 0, z: 0 } }), CTX);
  assert.deepEqual(v.errores, []);
  assert.equal(v.lectura.saturado, true);
  assert.equal(v.lectura.raw.x, DESBORDE);
});

test('El offset se resta después de convertir', () => {
  const r = convertirCrudo({ x: 820, y: 820, z: 820 }, sensorCon(1.9, { x: 10, y: -5, z: 0.5 }));
  assert.equal(r.bx, 90);
  assert.equal(r.by, 105);
  assert.equal(r.bz, 99.5);
});

test('Se rechazan crudos fuera de −4096..2047 o que no son enteros', () => {
  for (const malo of [2048, -4097, 1.5, '10', null, NaN]) {
    assert.equal(crudoValido(malo), false, String(malo));
    const v = validarLecturaDispositivo(lectura({ raw: { x: malo, y: 0, z: 0 } }), CTX);
    assert.ok(v.errores.some(e => e.includes('raw.x')), String(malo));
  }
  for (const bueno of [-4096, -2048, 0, 2047]) assert.equal(crudoValido(bueno), true);
});

test('Se rechazan seq, posición y ts_ms inválidos', () => {
  assert.ok(validarLecturaDispositivo(lectura({ seq: 0 }), CTX).errores.some(e => e.includes('seq')));
  assert.ok(validarLecturaDispositivo(lectura({ seq: 2.5 }), CTX).errores.some(e => e.includes('seq')));
  assert.ok(validarLecturaDispositivo(lectura({ xMM: 61 }), CTX).errores.some(e => e.includes('xMM')));
  assert.ok(validarLecturaDispositivo(lectura({ zMM: 7 }), CTX).errores.some(e => e.includes('zMM')));
  assert.ok(validarLecturaDispositivo(lectura({ ts_ms: 12345 }), CTX).errores.some(e => e.includes('ts_ms')));
  assert.equal(validarLecturaDispositivo(lectura({ ts_ms: 0 }), CTX).lectura.tsDispositivo, null);
  assert.ok(validarLecturaDispositivo('no', CTX).errores.length > 0);
  // Planos de un paso de 2 cm: 0 y 20
  assert.ok(validarLecturaDispositivo(lectura({ zMM: 10 }), { ...CTX, zLevels: [0, 20] }).errores.length > 0);
});

test('utACrudo es la inversa de la conversión y desborda fuera de rango', () => {
  const s = sensorCon(1.9);
  assert.equal(utACrudo(100, s), 820);
  assert.equal(utACrudo(300, s), DESBORDE);   // 2460 cuentas > 2047
  assert.equal(utACrudo(-250, s), DESBORDE);  // −2050 < −2048
  const ida = convertirCrudo({ x: utACrudo(37.3, s), y: 0, z: 0 }, s).bx;
  assert.ok(Math.abs(ida - 37.3) <= 100 / 820 / 2 + 1e-12);   // error ≤ media cuenta
});
