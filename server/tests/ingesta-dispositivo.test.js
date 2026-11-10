/**
 * tests/ingesta-dispositivo.test.js
 * ─────────────────────────────────────────────────────────────
 * Idempotencia de los lotes de la Pico W (Fase 4), sin base de datos:
 * se prueba clasificarLote, la parte pura de la ingesta por lotes.
 * ─────────────────────────────────────────────────────────────
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clasificarLote } from '../services/conversionSensor.js';

const CTX = {
  placaMM: 60, zLevels: [0, 5, 10, 15, 20],
  sensor: { modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 1, offset_ut: { x: 0, y: 0, z: 0 } },
};
const lect = seq => ({ seq, xMM: (seq % 13) * 5, yMM: 0, zMM: 0, raw: { x: seq, y: 0, z: 0 }, ts_ms: 0 });

test('Un lote nuevo se acepta completo', () => {
  const r = clasificarLote([1, 2, 3].map(lect), new Set(), CTX);
  assert.deepEqual(r.nuevas.map(l => l.seq), [1, 2, 3]);
  assert.deepEqual(r.duplicadas, []);
  assert.deepEqual(r.rechazadas, []);
});

test('Reenviar el mismo lote no inserta nada: todo es duplicado', () => {
  const lote = [1, 2, 3].map(lect);
  const primero = clasificarLote(lote, new Set(), CTX);
  const guardados = new Set(primero.nuevas.map(l => l.seq));
  const segundo = clasificarLote(lote, guardados, CTX);
  assert.equal(segundo.nuevas.length, 0);
  assert.deepEqual(segundo.duplicadas, [1, 2, 3]);
});

test('Un lote que se solapa con lo guardado solo agrega lo nuevo', () => {
  const r = clasificarLote([3, 4, 5].map(lect), new Set([1, 2, 3]), CTX);
  assert.deepEqual(r.nuevas.map(l => l.seq), [4, 5]);
  assert.deepEqual(r.duplicadas, [3]);
});

test('Un seq repetido dentro del mismo lote cuenta una sola vez', () => {
  const r = clasificarLote([lect(7), lect(7), lect(8)], new Set(), CTX);
  assert.deepEqual(r.nuevas.map(l => l.seq), [7, 8]);
  assert.deepEqual(r.duplicadas, [7]);
});

test('Una lectura inválida se rechaza sin tumbar el resto del lote', () => {
  const mala = { ...lect(2), raw: { x: 5000, y: 0, z: 0 } };
  const r = clasificarLote([lect(1), mala, lect(3), 'basura'], new Set(), CTX);
  assert.deepEqual(r.nuevas.map(l => l.seq), [1, 3]);
  assert.equal(r.rechazadas.length, 2);
  assert.equal(r.rechazadas[0].seq, 2);
  assert.match(r.rechazadas[0].error, /raw\.x/);
  assert.equal(r.rechazadas[1].seq, null);
});

test('Con pérdidas y reintentos, al final están todos los seq una sola vez', () => {
  // Simula 50 lotes de 10 con reintentos al azar (determinista)
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const guardados = new Set();
  let duplicadas = 0;
  for (let l = 0; l < 50; l++) {
    const lote = Array.from({ length: 10 }, (_, i) => lect(l * 10 + i + 1));
    let intentos = 0;
    do {
      intentos += 1;
      const r = clasificarLote(lote, guardados, CTX);
      // la respuesta se "pierde" con probabilidad 0,3: el lote se reenvía igual
      for (const n of r.nuevas) guardados.add(n.seq);
      duplicadas += r.duplicadas.length;
    } while (azar() < 0.3 && intentos < 5);
  }
  assert.equal(guardados.size, 500);
  for (let s = 1; s <= 500; s++) assert.ok(guardados.has(s));
  assert.ok(duplicadas > 0);
});
