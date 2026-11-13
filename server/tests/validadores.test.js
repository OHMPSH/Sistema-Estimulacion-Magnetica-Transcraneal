/**
 * tests/validadores.test.js — middleware/validar.js: casos 400 y 422.
 *
 * validar.js importa (indirectamente) config/database.js, que exige las
 * variables DB_*. El pool de mysql2 no se conecta hasta la primera
 * consulta, así que basta con valores de relleno: no hace falta la base.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_USER ??= 'sin_base';
process.env.DB_PASSWORD ??= 'sin_base';
process.env.DB_NAME ??= 'sin_base';
const v = await import('../middleware/validar.js');

/** Ejecuta un middleware con un req falso; devuelve {status, cuerpo, siguio, req} */
function correr(mw, req = {}) {
  const r = { status: 200, cuerpo: null, siguio: false };
  const res = { status(s) { r.status = s; return this; }, json(c) { r.cuerpo = c; return this; } };
  const peticion = { params: {}, query: {}, body: undefined, ...req };
  mw(peticion, res, () => { r.siguio = true; });
  return { ...r, req: peticion };
}
const espera = (r, status) => {
  assert.equal(r.siguio, false, 'no debió pasar al controlador');
  assert.equal(r.status, status);
  assert.equal(r.cuerpo.ok, false);
  assert.ok(Array.isArray(r.cuerpo.errores));
};

test('validarIdSesion: 400 si no es entero positivo; deja req.idSesion', () => {
  for (const id of ['abc', '0', '-1', '1.5', '']) espera(correr(v.validarIdSesion, { params: { id } }), 400);
  const ok = correr(v.validarIdSesion, { params: { id: '42' } });
  assert.equal(ok.siguio, true);
  assert.equal(ok.req.idSesion, 42);
});

test('validarNuevaSesion: 400 sin objeto, 422 con valores inválidos', () => {
  espera(correr(v.validarNuevaSesion, { body: [] }), 400);
  espera(correr(v.validarNuevaSesion, { body: { modo: 'XX', paso_mm: 10 } }), 422);
  // El paso es libre (≥ 1 mm, un decimal, como máximo 25000 puntos)
  for (const paso of ['5', 0.5, 2.55, 0, 301, 1]) espera(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: paso } }), 422);
  assert.equal(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 7 } }).req.nuevaSesion.pasoMM, 7);
  assert.equal(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 2.5 } }).req.nuevaSesion.pasoMM, 2.5);
  espera(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 10, medio: 'agua' } }), 422);
  const ok = correr(v.validarNuevaSesion, { body: { modo: 'AC', paso_mm: 20, medio: 'solucion_salina' } });
  assert.deepEqual(ok.req.nuevaSesion, { modo: 'AC', pasoMM: 20, medio: 'solucion_salina', zona: { x: 60, y: 60, z: 20 } });
  // Zona de muestreo: dentro de los límites de la base (60 × 60 × 20 por defecto)
  for (const zona of [{ x: 70, y: 10, z: 0 }, { x: 10, y: 10 }, { x: 10, y: 10, z: -1 }, { x: 10.25, y: 10, z: 0 }, [], 'x'])
    espera(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 5, zona_mm: zona } }), 422);
  const zona = correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 5, zona_mm: { x: 40, y: 20.5, z: 0 } } });
  assert.deepEqual(zona.req.nuevaSesion.zona, { x: 40, y: 20.5, z: 0 });
  // Con una zona pequeña, un paso de 1 mm ya cabe en el máximo de puntos
  assert.equal(correr(v.validarNuevaSesion, { body: { modo: 'DC', paso_mm: 1, zona_mm: { x: 10, y: 10, z: 10 } } }).siguio, true);
});

test('validarFiltrosSesiones: 422 en valores inválidos; 403 si un no admin pide eliminadas', () => {
  espera(correr(v.validarFiltrosSesiones, { query: { modo: 'x' } }), 422);
  for (const paso of ['abc', '2.55', '-5', '0']) espera(correr(v.validarFiltrosSesiones, { query: { paso_mm: paso } }), 422);
  assert.equal(correr(v.validarFiltrosSesiones, { query: { paso_mm: '7,5' } }).req.filtros.pasoMM, 7.5);
  espera(correr(v.validarFiltrosSesiones, { query: { origen: 'pico' } }), 422);
  espera(correr(v.validarFiltrosSesiones, { query: { incluir_eliminadas: 'si' }, usuario: { rol: 'admin' } }), 422);
  espera(correr(v.validarFiltrosSesiones, { query: { incluir_eliminadas: '1' }, usuario: { rol: 'operador' } }), 403);
  const ok = correr(v.validarFiltrosSesiones, { query: { modo: 'DC', paso_mm: '10', medio: '', incluir_eliminadas: '1' }, usuario: { rol: 'admin' } });
  assert.deepEqual(ok.req.filtros, { modo: 'DC', pasoMM: 10, incluirEliminadas: true });
});

test('validarNotas: 400 sin notas o tipo incorrecto, 422 si pasa de 5000', () => {
  espera(correr(v.validarNotas, { body: {} }), 400);
  espera(correr(v.validarNotas, { body: { notas: 5 } }), 400);
  espera(correr(v.validarNotas, { body: { notas: 'a'.repeat(5001) } }), 422);
  assert.equal(correr(v.validarNotas, { body: { notas: '  hola  ' } }).req.notas, 'hola');
  assert.equal(correr(v.validarNotas, { body: { notas: null } }).req.notas, '');
});

test('validarClaveConfiguracion: 404 clave desconocida, 400 sin {valor}', () => {
  espera(correr(v.validarClaveConfiguracion, { params: { clave: 'inventada' }, body: { valor: 1 } }), 404);
  espera(correr(v.validarClaveConfiguracion, { params: { clave: 'barrido' }, body: { otra: 1 } }), 400);
  assert.equal(correr(v.validarClaveConfiguracion, { params: { clave: 'modo_operacion' }, body: { valor: 'real' } }).siguio, true);
});

test('validarLatido: 400 si no es objeto, 422 con tipos incorrectos', () => {
  espera(correr(v.validarLatido, { body: [] }), 400);
  espera(correr(v.validarLatido, { body: { rssi: 5 } }), 422);
  espera(correr(v.validarLatido, { body: { firmware: 'x'.repeat(41) } }), 422);
  espera(correr(v.validarLatido, { body: { uptime_s: -1 } }), 422);
  espera(correr(v.validarLatido, { body: { ts_dispositivo_ms: 123 } }), 422);
  assert.equal(correr(v.validarLatido, { body: { ts_dispositivo_ms: 0 } }).req.latido.ts_dispositivo_ms, null);
  assert.equal(correr(v.validarLatido, { body: undefined }).siguio, true);
  espera(correr(v.validarLatido, { body: { estado: 'durmiendo' } }), 422);
  espera(correr(v.validarLatido, { body: { error: 5 } }), 422);
  espera(correr(v.validarLatido, { body: { error: 'x'.repeat(301) } }), 422);
  const ok = correr(v.validarLatido, { body: { estado: 'error', error: 'X: la zona no cabe' } });
  assert.deepEqual([ok.req.latido.estado, ok.req.latido.error], ['error', 'X: la zona no cabe']);
  assert.equal(correr(v.validarLatido, { body: { estado: 'midiendo', error: null } }).req.latido.error, null);
});

test('validarLoteDispositivo: 400 de forma, 422 de tamaño', () => {
  espera(correr(v.validarLoteDispositivo, { body: 'x' }), 400);
  espera(correr(v.validarLoteDispositivo, { body: { sesionId: 1 } }), 400);
  espera(correr(v.validarLoteDispositivo, { body: { sesionId: 1, lecturas: {} } }), 400);
  espera(correr(v.validarLoteDispositivo, { body: { sesionId: 1, lecturas: [] } }), 422);
  espera(correr(v.validarLoteDispositivo, { body: { sesionId: 0, lecturas: [{}] } }), 422);
  espera(correr(v.validarLoteDispositivo, { body: { sesionId: 1, lecturas: Array(201).fill({}) } }), 422);
  assert.equal(correr(v.validarLoteDispositivo, { body: { sesionId: 1, lecturas: [{}] } }).siguio, true);
});

test('validarCambiosDispositivo: solo booleano', () => {
  espera(correr(v.validarCambiosDispositivo, { body: {} }), 400);
  espera(correr(v.validarCambiosDispositivo, { body: { activo: 'false' } }), 400);
  assert.equal(correr(v.validarCambiosDispositivo, { body: { activo: false } }).req.cambiosDispositivo.activo, false);
});

test('validarLogin: 400 sin datos, 422 demasiado largos; normaliza el usuario', () => {
  espera(correr(v.validarLogin, { body: {} }), 400);
  espera(correr(v.validarLogin, { body: { usuario: ' ', password: 'x' } }), 400);
  espera(correr(v.validarLogin, { body: { usuario: 'a'.repeat(65), password: 'x' } }), 422);
  assert.equal(correr(v.validarLogin, { body: { usuario: '  Admin ', password: 'admin' } }).req.credenciales.usuario, 'admin');
});

test('validarCambioPassword: 400 sin datos, 422 corta o igual a la actual', () => {
  espera(correr(v.validarCambioPassword, { body: { actual: 'a' } }), 400);
  espera(correr(v.validarCambioPassword, { body: { actual: 'vieja123', nueva: 'corta' } }), 422);
  espera(correr(v.validarCambioPassword, { body: { actual: 'misma1234', nueva: 'misma1234' } }), 422);
  assert.equal(correr(v.validarCambioPassword, { body: { actual: 'vieja123', nueva: 'nueva1234' } }).siguio, true);
});

test('validarPreferencias: 400 sin tema, 422 tema desconocido', () => {
  espera(correr(v.validarPreferencias, { body: {} }), 400);
  espera(correr(v.validarPreferencias, { body: { tema: 'azul' } }), 422);
  assert.equal(correr(v.validarPreferencias, { body: { tema: 'sistema' } }).req.preferencias.tema, 'sistema');
});

test('validarNuevoUsuario: 400 faltantes o no textos, 422 formato', () => {
  espera(correr(v.validarNuevoUsuario, { body: { usuario: 'a' } }), 400);
  espera(correr(v.validarNuevoUsuario, { body: { usuario: 1, nombre: 'x', rol: 'admin', password: 'x' } }), 400);
  espera(correr(v.validarNuevoUsuario, { body: { usuario: 'ab', nombre: 'X', rol: 'admin', password: 'clave1234' } }), 422);
  espera(correr(v.validarNuevoUsuario, { body: { usuario: 'pepe', nombre: 'X', rol: 'jefe', password: 'clave1234' } }), 422);
  espera(correr(v.validarNuevoUsuario, { body: { usuario: 'pepe', nombre: 'X', rol: 'operador', password: 'corta' } }), 422);
  assert.equal(correr(v.validarNuevoUsuario, { body: { usuario: 'Pepe.Lopez', nombre: ' Pepe ', rol: 'operador', password: 'clave1234' } }).req.nuevoUsuario.usuario, 'pepe.lopez');
});

test('validarCambiosUsuario, validarIdUsuario y validarPasswordNueva', () => {
  espera(correr(v.validarCambiosUsuario, { body: {} }), 400);
  espera(correr(v.validarCambiosUsuario, { body: { activo: 'no' } }), 400);
  espera(correr(v.validarCambiosUsuario, { body: { nombre: 5 } }), 400);
  espera(correr(v.validarCambiosUsuario, { body: { rol: 'jefe' } }), 422);
  espera(correr(v.validarCambiosUsuario, { body: { nombre: '   ' } }), 422);
  assert.deepEqual(correr(v.validarCambiosUsuario, { body: { rol: 'observador', activo: true } }).req.cambiosUsuario, { rol: 'observador', activo: true });
  espera(correr(v.validarIdUsuario, { params: { id: 'x' } }), 400);
  espera(correr(v.validarPasswordNueva, { body: {} }), 400);
  espera(correr(v.validarPasswordNueva, { body: { password: 'corta' } }), 422);
});

test('Sensor: QMC5883P y HMC5883L; cuentas por gauss derivadas; al cambiar de modelo se normaliza', async () => {
  const { validarClave } = await import('../services/validacionConfiguracion.js');
  const { mezclarSensor } = await import('../services/configuracion.js');
  const offset = { x: 1.5, y: -2, z: 0 };
  const qmc = { modelo: 'QMC5883P', rango_g: 30, cuentas_por_g: 1000, lecturas_por_punto: 3, offset_ut: offset };
  const hmc = { modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 3, offset_ut: offset };

  // Válidos, con las cuentas por gauss derivadas del rango
  assert.deepEqual(validarClave('sensor', { ...qmc, rango_g: 2, cuentas_por_g: undefined }).valor.cuentas_por_g, 15000);
  assert.equal(validarClave('sensor', { ...qmc, cuentas_por_g: undefined }).errores.length, 0);
  assert.equal(validarClave('sensor', hmc).errores.length, 0);
  // Formato viejo sin modelo = HMC5883L
  assert.equal(validarClave('sensor', { rango_ga: 1.9, lecturas_por_punto: 1, offset_ut: offset }).valor.modelo, 'HMC5883L');
  // Inválidos
  assert.ok(validarClave('sensor', { ...qmc, rango_g: 4 }).errores.length > 0);
  assert.ok(validarClave('sensor', { ...qmc, cuentas_por_g: 999 }).errores.length > 0);
  assert.ok(validarClave('sensor', { ...qmc, rango_ga: 1.9 }).errores.some(e => /desconocido/.test(e)));
  assert.ok(validarClave('sensor', { ...hmc, modelo: 'QMC5883L' }).errores.length > 0);

  // {modelo: QMC5883P} sobre un HMC → QMC de 30 G, sin campos del HMC, con lecturas y offset
  const aQMC = validarClave('sensor', mezclarSensor(hmc, { modelo: 'QMC5883P' }));
  assert.deepEqual(aQMC.errores, []);
  assert.deepEqual(aQMC.valor, { modelo: 'QMC5883P', rango_g: 30, cuentas_por_g: 1000, lecturas_por_punto: 3, offset_ut: offset });
  // Y al revés: HMC5883L de 1,9 Ga
  const aHMC = validarClave('sensor', mezclarSensor(qmc, { modelo: 'HMC5883L' }));
  assert.deepEqual(aHMC.errores, []);
  assert.deepEqual(aHMC.valor, { modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 3, offset_ut: offset });
  // Cambiar el modelo y el rango a la vez; o solo el rango (las cuentas se recalculan)
  assert.equal(validarClave('sensor', mezclarSensor(hmc, { modelo: 'QMC5883P', rango_g: 8 })).valor.cuentas_por_g, 3750);
  assert.equal(validarClave('sensor', mezclarSensor(qmc, { rango_g: 12 })).valor.cuentas_por_g, 2500);
  assert.equal(validarClave('sensor', mezclarSensor(hmc, { rango_ga: 8.1 })).valor.lsb_por_ga, 230);
});
