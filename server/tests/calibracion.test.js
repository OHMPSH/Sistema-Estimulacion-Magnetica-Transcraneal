/**
 * tests/calibracion.test.js — previsualizador de la bobina (2026-11-24):
 * services/calibracion.js (estado en memoria) y sus validadores.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_USER ??= 'sin_base';
process.env.DB_PASSWORD ??= 'sin_base';
process.env.DB_NAME ??= 'sin_base';
const cal = await import('../services/calibracion.js');
const v = await import('../middleware/validar.js');

const QMC30 = { modelo: 'QMC5883P', rango_g: 30, cuentas_por_g: 1000, lecturas_por_punto: 1, offset_ut: { x: 0, y: 0, z: 0 } };
const punto = (x, y, z) => ({ x_mm: x, y_mm: y, z_mm: z });

function correr(mw, body) {
  const r = { status: 200, cuerpo: null, siguio: false };
  const res = { status(s) { r.status = s; return this; }, json(c) { r.cuerpo = c; return this; } };
  const req = { params: {}, query: {}, body };
  mw(req, res, () => { r.siguio = true; });
  return { ...r, req };
}

beforeEach(() => cal.reiniciar());

test('erroresDeObjetivo: números, 0..2000 y el recorrido de la mesa', () => {
  assert.deepEqual(cal.erroresDeObjetivo(punto(0, 0, 0)), []);
  assert.equal(cal.erroresDeObjetivo(punto(-1, 0, 0)).length, 1);
  assert.equal(cal.erroresDeObjetivo({ x_mm: 'a', y_mm: 0 }).length, 2);
  const lims = punto(410, 562, 88);
  assert.deepEqual(cal.erroresDeObjetivo(punto(410, 562, 88), lims), []);
  assert.match(cal.erroresDeObjetivo(punto(0, 0, 88.5), lims)[0], /z_mm.*recorrido/);
});

test('iniciar, mover y terminar; sin calibración la Pico recibe null', () => {
  assert.equal(cal.paraPico(QMC30), null);
  const e = cal.iniciar('admin');
  assert.equal(e.activa, true);
  assert.deepEqual(e.objetivo, punto(0, 0, 0), 'empieza en el descanso');
  assert.throws(() => cal.iniciar('otro'), err => err.status === 409);
  cal.anotarLimites(punto(410, 562, 88));
  assert.throws(() => cal.mover(punto(500, 0, 0)), err => err.status === 422);
  cal.mover(punto(205.04, 281, 44));
  assert.deepEqual(cal.paraPico(QMC30), { activa: true, objetivo: punto(205, 281, 44), sensor: QMC30 });
  assert.equal(cal.terminar('prueba'), true);
  assert.equal(cal.terminar('otra vez'), false);
  assert.equal(cal.paraPico(QMC30), null);
  assert.throws(() => cal.mover(punto(1, 1, 1)), err => err.status === 409);
});

test('registrarDePico: convierte con el sensor vigente y no guarda nada sin calibración', () => {
  cal.registrarDePico({ estado: 'en_posicion', raw: { x: 1000, y: 0, z: 0 } }, QMC30);
  assert.equal(cal.estadoPublico().ultima_lectura, null, 'sin calibración activa no hay lectura');
  cal.iniciar('op');
  cal.registrarDePico({ estado: 'en_posicion', posicion_mm: punto(10, 20, 0), raw: { x: 1500, y: -500, z: 0 }, saturado: false }, QMC30);
  const l = cal.estadoPublico().ultima_lectura;
  assert.equal(l.bx, 150);
  assert.equal(l.by, -50);
  assert.equal(l.saturado, false);
  assert.deepEqual(l.posicion_mm, punto(10, 20, 0));
  cal.registrarDePico({ estado: 'en_posicion', raw: { x: 1, y: 1, z: 1 }, saturado: true }, QMC30);
  assert.equal(cal.estadoPublico().ultima_lectura.saturado, true, 'bit OVFL');
  assert.equal(cal.estadoPublico().ultima_lectura.magnitud, null);
  const errores = cal.registrarDePico({ estado: 'en_posicion', raw: { x: 40000, y: 0, z: 0 } }, QMC30);
  assert.equal(errores.length, 1);
  cal.registrarDePico({ estado: 'error', error: 'X fuera del recorrido' }, QMC30);
  assert.equal(cal.estadoPublico().pico.estado, 'error');
  assert.equal(cal.estadoPublico().pico.error, 'X fuera del recorrido');
});

test('validadores de la calibración: 400 y 422', () => {
  assert.equal(correr(v.validarObjetivoCalibracion, []).status, 400);
  assert.equal(correr(v.validarObjetivoCalibracion, { x_mm: 1, y_mm: 2 }).status, 400);
  assert.equal(correr(v.validarObjetivoCalibracion, punto(1, -2, 3)).status, 422);
  const ok = correr(v.validarObjetivoCalibracion, { ...punto(1, 2, 3), extra: 1 });
  assert.equal(ok.siguio, true);
  assert.deepEqual(ok.req.objetivo, punto(1, 2, 3));
  const vacio = correr(v.validarInicioCalibracion, undefined);
  assert.equal(vacio.siguio, true);
  assert.equal(vacio.req.objetivo, null);
  assert.equal(correr(v.validarLecturaCalibracion, {}).status, 400);
  assert.equal(correr(v.validarLecturaCalibracion, { estado: 'bailando' }).status, 422);
  assert.equal(correr(v.validarLecturaCalibracion, { estado: 'en_posicion', raw: { x: 1.5, y: 0, z: 0 } }).status, 422);
  assert.equal(correr(v.validarLecturaCalibracion, { estado: 'en_posicion', saturado: 'no' }).status, 422);
  const l = correr(v.validarLecturaCalibracion, { estado: 'en_posicion', posicion_mm: punto(1, 2, 3), raw: { x: 1, y: 2, z: 3 }, saturado: true });
  assert.equal(l.siguio, true);
  assert.equal(l.req.lecturaCalibracion.saturado, true);
});

test('validarLatido: limites_mm opcional y estado «calibrando»', () => {
  const ok = correr(v.validarLatido, { estado: 'calibrando', limites_mm: punto(410, 562, 88) });
  assert.equal(ok.siguio, true);
  assert.deepEqual(ok.req.latido.limites_mm, punto(410, 562, 88));
  assert.equal(correr(v.validarLatido, { limites_mm: punto(0, 562, 88) }).status, 422);
  assert.equal(correr(v.validarLatido, { limites_mm: 'mucho' }).status, 422);
  assert.equal(correr(v.validarLatido, {}).req.latido.limites_mm, null);
});
