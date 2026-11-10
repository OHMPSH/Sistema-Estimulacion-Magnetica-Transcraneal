/**
 * tests/passwords.test.js — contraseñas (scrypt) y límite de intentos de login
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  hashPassword, verificarPassword, errorDePassword, LONGITUD_MINIMA, LONGITUD_MAXIMA,
} from '../services/passwords.js';
import {
  claveDeIntento, registrarFallo, segundosDeBloqueo, olvidarFallos, limpiarIntentosViejos, MAX_FALLOS, VENTANA_MS,
} from '../services/limiteIntentos.js';

test('El hash tiene el formato scrypt$N$r$p$sal$hash y una sal distinta cada vez', async () => {
  const a = await hashPassword('clave-segura-1');
  const b = await hashPassword('clave-segura-1');
  assert.match(a, /^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.notEqual(a, b);
});

test('verificarPassword acepta la correcta y rechaza la incorrecta', async () => {
  const h = await hashPassword('clave-segura-1');
  assert.equal(await verificarPassword('clave-segura-1', h), true);
  assert.equal(await verificarPassword('clave-segura-2', h), false);
  assert.equal(await verificarPassword('', h), false);
});

test('verificarPassword rechaza hashes mal formados sin lanzar', async () => {
  for (const malo of ['', 'texto', 'bcrypt$1$2$3$aa$bb', 'scrypt$3$8$1$aa$bb', 'scrypt$16384$8$1$zz$bb', 'scrypt$16384$99$1$aa$bb', null]) {
    assert.equal(await verificarPassword('clave-segura-1', malo), false, String(malo));
  }
  assert.equal(await verificarPassword('x'.repeat(LONGITUD_MAXIMA + 1), await hashPassword('clave-segura-1')), false);
});

test('errorDePassword aplica la longitud mínima y máxima', () => {
  assert.match(errorDePassword('corta'), /al menos 8/);
  assert.equal(errorDePassword('a'.repeat(LONGITUD_MINIMA)), null);
  assert.match(errorDePassword('a'.repeat(LONGITUD_MAXIMA + 1)), /más de/);
  assert.match(errorDePassword(123), /texto/);
});

test('hashPassword valida por defecto, salvo con validar:false (admin/admin)', async () => {
  await assert.rejects(hashPassword('admin'), /al menos/);
  assert.match(await hashPassword('admin', { validar: false }), /^scrypt\$/);
  await assert.rejects(hashPassword('', { validar: false }));
});

test('Límite de intentos: bloquea al quinto fallo y libera al salir de la ventana', () => {
  const clave = claveDeIntento('Admin', '10.0.0.1');
  assert.equal(clave, 'admin|10.0.0.1');
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FALLOS - 1; i++) registrarFallo(clave, t0 + i);
  assert.equal(segundosDeBloqueo(clave, t0 + 10), 0);
  registrarFallo(clave, t0 + 10);
  const espera = segundosDeBloqueo(clave, t0 + 10);
  assert.ok(espera > 0 && espera <= VENTANA_MS / 1000);
  assert.equal(segundosDeBloqueo(clave, t0 + VENTANA_MS + 1), 0);
  // Otra IP no está bloqueada
  assert.equal(segundosDeBloqueo(claveDeIntento('admin', '10.0.0.2'), t0 + 10), 0);
  olvidarFallos(clave);
  assert.equal(segundosDeBloqueo(clave, t0 + 11), 0);
});

test('limpiarIntentosViejos borra los fallos fuera de la ventana', () => {
  const clave = claveDeIntento('obs', '1.1.1.1');
  for (let i = 0; i < MAX_FALLOS; i++) registrarFallo(clave, 5000 + i);
  limpiarIntentosViejos(5000 + VENTANA_MS + 10);
  for (let i = 0; i < MAX_FALLOS - 1; i++) registrarFallo(clave, 5000 + VENTANA_MS + 20 + i);
  assert.equal(segundosDeBloqueo(clave, 5000 + VENTANA_MS + 30), 0);
});
