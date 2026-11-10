/**
 * tests/trazabilidad.test.js
 * ─────────────────────────────────────────────────────────────
 * Fase 5, sin base de datos: puntos esperados y huecos, encabezado y
 * filas del CSV, y el búfer circular del SSE.
 * ─────────────────────────────────────────────────────────────
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mallaDeBarrido, mallaDeZona, puntoDeMalla } from '../services/geometria.js';
import {
  calcularHuecos, encabezadoCSV, escaparMeta, lineaCSV, nombreArchivoCSV, COLUMNAS_CSV, MAX_HUECOS_LISTADOS,
} from '../services/trazabilidad.js';
import { BuferEventos } from '../services/bufferEventos.js';

const BARRIDO = { grid_size_mm: 60, z_max_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 };
const posiciones = (malla, quitar = new Set()) => {
  const r = [];
  for (let i = 0; i < malla.totalPuntos; i++) {
    if (quitar.has(i)) continue;
    const p = puntoDeMalla(malla, i);
    r.push({ x_mm: p.xMM, y_mm: p.yMM, z_mm: p.zMM });
  }
  return r;
};

test('Puntos esperados: 845, 147 y 32 según el paso', () => {
  assert.equal(mallaDeBarrido(BARRIDO, 5).totalPuntos, 13 * 13 * 5);
  assert.equal(mallaDeBarrido(BARRIDO, 10).totalPuntos, 7 * 7 * 3);
  assert.equal(mallaDeBarrido(BARRIDO, 20).totalPuntos, 4 * 4 * 2);
});

test('Paso libre: 7 mm y 2,5 mm (el último punto queda antes del borde si no divide la placa)', () => {
  const m7 = mallaDeBarrido(BARRIDO, 7);
  assert.equal(m7.gridNx, 9);
  assert.deepEqual(m7.zLevels, [0, 7, 14]);
  assert.equal(m7.ejeX.at(-1), 56);
  assert.equal(m7.totalPuntos, 9 * 9 * 3);
  const m25 = mallaDeBarrido(BARRIDO, 2.5);
  assert.equal(m25.gridNx, 25);
  assert.equal(m25.zLevels.length, 9);
  assert.equal(m25.ejeX[3], 7.5);
  const m03 = mallaDeBarrido(BARRIDO, 1.1);
  assert.equal(m03.ejeX[3], 3.3);          // sin 3.3000000000000003
});

test('Zona rectangular: 40 × 20 × 10 con paso 10 → 5 × 3 × 2 = 30 puntos en orden x → y → z', () => {
  const m = mallaDeZona({ x: 40, y: 20, z: 10 }, 10);
  assert.equal(m.gridNx, 5);
  assert.equal(m.gridNy, 3);
  assert.deepEqual(m.zLevels, [0, 10]);
  assert.equal(m.totalPuntos, 30);
  assert.deepEqual(puntoDeMalla(m, 4), { xMM: 40, yMM: 0, zMM: 0, zIdx: 0 });
  assert.deepEqual(puntoDeMalla(m, 5), { xMM: 0, yMM: 10, zMM: 0, zIdx: 0 });
  assert.deepEqual(puntoDeMalla(m, 29), { xMM: 40, yMM: 20, zMM: 10, zIdx: 1 });
  const todas = Array.from({ length: 30 }, (_, i) => puntoDeMalla(m, i)).map(p => ({ x_mm: p.xMM, y_mm: p.yMM, z_mm: p.zMM }));
  assert.equal(calcularHuecos(m, todas).total, 0);
  assert.deepEqual(calcularHuecos(m, todas.slice(1)).posiciones, [{ xMM: 0, yMM: 0, zMM: 0 }]);
});

test('Una malla completa no tiene huecos', () => {
  for (const paso of [5, 10, 20, 7, 2.5]) {
    const m = mallaDeBarrido(BARRIDO, paso);
    assert.deepEqual(calcularHuecos(m, posiciones(m)), { total: 0, posiciones: [] });
  }
});

test('Los huecos son las posiciones sin lectura válida, en el orden del barrido', () => {
  const m = mallaDeBarrido(BARRIDO, 10);
  const r = calcularHuecos(m, posiciones(m, new Set([0, 8, 146])));
  assert.equal(r.total, 3);
  assert.deepEqual(r.posiciones, [
    { xMM: 0, yMM: 0, zMM: 0 },
    { xMM: 10, yMM: 10, zMM: 0 },
    { xMM: 60, yMM: 60, zMM: 20 },
  ]);
});

test('Una lectura a menos de 1 mm del punto cuenta; a más, no', () => {
  const m = mallaDeBarrido(BARRIDO, 20);
  const todas = posiciones(m, new Set([5]));   // falta (20, 20, 0)
  assert.equal(calcularHuecos(m, [...todas, { x_mm: 20.8, y_mm: 19.4, z_mm: 0 }]).total, 0);
  assert.equal(calcularHuecos(m, [...todas, { x_mm: 21.5, y_mm: 20, z_mm: 0 }]).total, 1);
  // Lecturas fuera de la malla o en otro plano no tapan huecos
  assert.equal(calcularHuecos(m, [...todas, { x_mm: 20, y_mm: 20, z_mm: 10 }]).total, 1);
});

test('Sin lecturas, todo es hueco, pero la lista se corta en 1000', () => {
  const m = mallaDeBarrido({ ...BARRIDO, grid_size_mm: 200, z_max_mm: 40 }, 5);   // 41² × 9 = 15129
  const r = calcularHuecos(m, []);
  assert.equal(r.total, m.totalPuntos);
  assert.equal(r.posiciones.length, MAX_HUECOS_LISTADOS);
});

test('El encabezado del CSV escapa los saltos de línea y serializa objetos', () => {
  const texto = encabezadoCSV([
    ['sesion_id', 12],
    ['notas', 'línea 1\nlínea 2\r\nlínea 3 con \\ barra'],
    ['config_sensor', { rango_ga: 1.9, offset_ut: { x: 0 } }],
    ['version_firmware', null],
  ]);
  const lineas = texto.slice(0, -1).split('\n');
  assert.equal(lineas.length, 4);
  assert.ok(lineas.every(l => l.startsWith('# ')));
  assert.equal(lineas[1], '# notas: línea 1\\nlínea 2\\nlínea 3 con \\\\ barra');
  assert.equal(lineas[2], '# config_sensor: {"rango_ga":1.9,"offset_ut":{"x":0}}');
  assert.equal(lineas[3], '# version_firmware: ');
  assert.equal(escaparMeta(undefined), '');
});

test('Las filas del CSV no redondean y dejan vacíos los NULL', () => {
  const fila = lineaCSV({
    timestamp: new Date('2026-11-10T07:14:37.123Z'), ts_dispositivo: null, seq: 7,
    x_mm: 5, y_mm: 0, z_mm: 0, bx: 0.1 + 0.2, by: -12.345678901234567, bz: null, magnitud: null,
    raw_x: 12, raw_y: -4, raw_z: -4096, saturado: 1,
  });
  assert.equal(fila, '2026-11-10T07:14:37.123Z,,7,5,0,0,0.30000000000000004,-12.345678901234567,,,12,-4,-4096,1\n');
  assert.equal(fila.split(',').length, COLUMNAS_CSV.length);
});

test('Nombre del archivo CSV con la fecha UTC', () => {
  assert.equal(nombreArchivoCSV(46, '2026-11-10T07:14:49.000Z'), 'tms_sesion_46_20261110T071449Z.csv');
});

test('Búfer del SSE: reenvía desde un id y detecta cuando ya no puede', () => {
  const b = new BuferEventos(5);
  for (let id = 101; id <= 108; id++) b.agregar({ id, texto: `e${id}` });
  // Quedan 104..108
  assert.equal(b.primerId, 104);
  assert.equal(b.ultimoId, 108);
  assert.deepEqual(b.desde(105).map(e => e.id), [106, 107, 108]);
  assert.deepEqual(b.desde(103).map(e => e.id), [104, 105, 106, 107, 108]);  // el anterior al primero: no falta nada
  assert.deepEqual(b.desde(108), []);
  assert.equal(b.desde(102), null);    // 103 se perdió
  assert.equal(b.desde(500), null);    // id de otro proceso
  assert.equal(b.desde(NaN), null);
});

test('Búfer vacío: solo acepta el id actual', () => {
  const b = new BuferEventos(3);
  assert.deepEqual(b.desde(10, 10), []);
  assert.equal(b.desde(9, 10), null);
});
