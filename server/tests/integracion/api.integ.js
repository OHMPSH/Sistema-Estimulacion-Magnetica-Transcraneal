/**
 * tests/integracion/api.integ.js — de extremo a extremo contra tms_db_test.
 * Ejecutar desde server/:  npm run test:integracion
 * (Necesita la base de pruebas: sudo mysql < tests/setup_test_db.sql)
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { levantar, cliente, esperar, leerCSV } from './helper.js';
import { crearGeneradorMuestras } from '../../services/simulacionPura.js';
import { mallaDeBarrido, mallaDeZona, puntoDeMalla } from '../../services/geometria.js';

const carpetaServidor = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let entorno;
let admin;

before(async () => {
  entorno = await levantar();
  if (entorno.error) return;
  admin = cliente(entorno.base);
  assert.equal((await admin.login('admin', 'admin')).status, 200);
});
after(async () => { if (!entorno?.error) await entorno.cerrar(); });

const omitir = t => { if (entorno.error) { t.skip(entorno.error); return true; } return false; };

/** Crea una sesión simulada rápida y espera a que se cierre sola */
async function sesionSimulada(c, cuerpo) {
  const r = await c.post('/sesiones', cuerpo);
  assert.equal(r.status, 201, JSON.stringify(r.datos));
  await esperar(async () => (await c.get('/sesiones/activa')).datos.sesion === null);
  return r.datos.sesion.id;
}

test('Sesión simulada con semilla fija: el CSV coincide con el simulador (tolerancia 1e-9)', async (t) => {
  if (omitir(t)) return;
  const sim = { ms_por_punto: { DC: 20, AC: 20 }, semilla: 4242, prob_hueco: 0, prob_saturacion: 0 };
  assert.equal((await admin.put('/configuracion/simulacion', { valor: sim })).status, 200);
  const id = await sesionSimulada(admin, { modo: 'DC', paso_mm: 20 });

  const csv = await admin.get(`/sesiones/${id}/csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.res.headers.get('content-disposition'), new RegExp(`tms_sesion_${id}_\\d{8}T\\d{6}Z\\.csv`));
  const { meta, columnas, filas } = leerCSV(csv.datos);
  assert.deepEqual(columnas, ['timestamp_utc', 'ts_dispositivo_utc', 'seq', 'x_mm', 'y_mm', 'z_mm', 'bx_uT', 'by_uT', 'bz_uT', 'magnitud_uT', 'raw_x', 'raw_y', 'raw_z', 'saturado']);
  assert.equal(meta.puntos_esperados, '32');
  assert.equal(meta.puntos_recibidos, '32');
  assert.equal(meta.huecos, '0');
  const configSim = JSON.parse(meta.config_simulacion);
  assert.equal(configSim.semilla, 4242);

  const malla = mallaDeBarrido(JSON.parse(meta.config_barrido), 20);
  const siguiente = crearGeneradorMuestras({ simulacion: configSim, barrido: JSON.parse(meta.config_barrido), sensor: JSON.parse(meta.config_sensor), malla });
  assert.equal(filas.length, malla.totalPuntos);
  for (let i = 0; i < malla.totalPuntos; i++) {
    const m = siguiente(i);
    const f = filas[i];
    assert.equal(Number(f.seq), i + 1);
    assert.deepEqual([Number(f.x_mm), Number(f.y_mm), Number(f.z_mm)], [m.punto.xMM, m.punto.yMM, m.punto.zMM]);
    for (const [c, v] of [['bx_uT', m.bx], ['by_uT', m.by], ['bz_uT', m.bz]]) {
      assert.ok(Math.abs(Number(f[c]) - v) < 1e-9, `${c} del punto ${i}: ${f[c]} vs ${v}`);
    }
  }
});

for (const modelo of ['QMC5883P', 'HMC5883L']) {
  test(`Pico W emulada (${modelo}) con pérdidas, duplicados y saturadas: seq sin huecos ni duplicados, en serpentina`, async (t) => {
    if (omitir(t)) return;
    assert.equal((await admin.put('/configuracion/sensor', { valor: { modelo } })).status, 200);
    assert.equal((await admin.put('/configuracion/modo_operacion', { valor: 'real' })).status, 200);
    const token = (await admin.post('/dispositivo/token')).datos.token;
    const sinToken = await cliente(entorno.base).post('/dispositivo/latido', {});
    assert.equal(sinToken.status, 401);
    const s = await admin.post('/sesiones', { modo: 'AC', paso_mm: 20 });
    assert.equal(s.status, 201);
    assert.equal(s.datos.sesion.origen, 'hw');
    // Con una sesión abierta no se puede cambiar el sensor
    assert.equal((await admin.put('/configuracion/sensor', { valor: { rango_g: 8 } })).status, 409);

    const emulador = spawn(process.execPath, [join(carpetaServidor, 'scripts', 'emular-pico.js'),
      '--url', entorno.base, '--token', token, '--lote', '4', '--ms-por-lectura', '1',
      '--perdida', '0.3', '--duplicar', '0.3', '--saturar', '0.15', '--semilla', '11'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let salida = '';
    emulador.stdout.on('data', d => { salida += d; });
    try {
      // Con todas las lecturas, el servidor cierra la sesión solo
      await esperar(async () => (await admin.get('/sesiones/activa')).datos.sesion === null, 40000, 200);
    } finally {
      emulador.kill();
    }
    const med = (await admin.get(`/sesiones/${s.datos.sesion.id}/mediciones`)).datos.data;
    const seqs = med.map(m => m.seq);
    assert.equal(seqs.length, 32, `filas: ${seqs.length}`);
    assert.deepEqual(seqs, Array.from({ length: 32 }, (_, i) => i + 1));
    assert.ok(/duplicadas [1-9]/.test(salida), 'el emulador debió provocar duplicados');
    // Posiciones en serpentina: el seq s es el punto s − 1
    const malla = mallaDeZona({ x: 60, y: 60, z: 20 }, 20);
    for (const m of med) {
      const p = puntoDeMalla(malla, m.seq - 1);
      assert.deepEqual([Number(m.x_mm), Number(m.y_mm), Number(m.z_mm)], [p.xMM, p.yMM, p.zMM], `seq ${m.seq}`);
    }
    const saturadas = med.filter(m => m.saturado);
    assert.ok(saturadas.length > 0, 'debió haber lecturas saturadas');
    for (const m of med) {
      if (modelo === 'QMC5883P') {
        if (m.saturado) assert.equal(m.bx, null);
        else assert.ok(Math.abs(Number(m.bx) - m.raw_x / 1000 * 100) < 1e-9, `µT del seq ${m.seq}`);
      } else if (m.saturado) {
        assert.ok([m.raw_x, m.raw_y, m.raw_z].includes(-4096));
      }
    }

    assert.equal((await admin.put(`/sesiones/${s.datos.sesion.id}`)).status, 409);   // ya cerrada al completarse
    assert.equal((await admin.put('/configuracion/modo_operacion', { valor: 'simulacion' })).status, 200);
    assert.equal((await admin.del('/dispositivo/token')).status, 200);
    const csv = leerCSV((await admin.get(`/sesiones/${s.datos.sesion.id}/csv`)).datos);
    assert.equal(csv.meta.sensor_modelo, modelo);
  });
}

test('Simulador con QMC5883P: las saturadas quedan con saturado = 1, sin Bx/By/Bz y con crudos de 16 bits', async (t) => {
  if (omitir(t)) return;
  assert.equal((await admin.put('/configuracion/sensor', { valor: { modelo: 'QMC5883P' } })).status, 200);
  await admin.put('/configuracion/simulacion', { valor: { ms_por_punto: { DC: 20, AC: 20 }, prob_hueco: 0, prob_saturacion: 0.3 } });
  const id = await sesionSimulada(admin, { modo: 'DC', paso_mm: 20 });
  const med = (await admin.get(`/sesiones/${id}/mediciones`)).datos.data;
  assert.equal(med.length, 32);
  const sat = med.filter(m => m.saturado);
  assert.ok(sat.length > 0);
  for (const m of sat) {
    assert.equal(m.bx, null);
    assert.equal(m.magnitud, null);
    assert.ok([m.raw_x, m.raw_y, m.raw_z].some(v => Math.abs(v) >= 32767));
  }
  for (const m of med.filter(x => !x.saturado)) assert.equal(m.raw_x, null);
  const s = (await admin.get('/sesiones')).datos.data.find(x => x.id === id);
  assert.equal(Number(s.saturadas), sat.length);
  await admin.put('/configuracion/simulacion', { valor: { prob_saturacion: 0 } });
});

test('Roles: 401 sin sesión, 403 con un rol insuficiente', async (t) => {
  if (omitir(t)) return;
  const anonimo = cliente(entorno.base);
  assert.equal((await anonimo.get('/status')).status, 200);
  assert.equal((await anonimo.get('/sesiones')).status, 401);
  assert.equal((await anonimo.get('/stream')).status, 401);
  const obs = cliente(entorno.base);
  assert.equal((await obs.login('observador', 'observador123')).status, 200);
  assert.equal((await obs.get('/sesiones')).status, 200);
  assert.equal((await obs.post('/sesiones', { modo: 'DC', paso_mm: 20 })).status, 403);
  assert.equal((await obs.put('/configuracion/modo_operacion', { valor: 'real' })).status, 403);
  assert.equal((await obs.get('/usuarios')).status, 403);
  const op = cliente(entorno.base);
  assert.equal((await op.login('operador', 'operador123')).status, 200);
  assert.equal((await op.del('/sesiones/1')).status, 403);
  assert.equal((await op.post('/dispositivo/token')).status, 403);
});

test('Paso libre en mm: 12,5 mm guarda la malla correcta y se puede filtrar', async (t) => {
  if (omitir(t)) return;
  await admin.put('/configuracion/simulacion', { valor: { ms_por_punto: { DC: 20, AC: 20 }, prob_hueco: 0, prob_saturacion: 0 } });
  for (const paso of [0.5, 2.55, '5', 1]) assert.equal((await admin.post('/sesiones', { modo: 'DC', paso_mm: paso })).status, 422);
  const id = await sesionSimulada(admin, { modo: 'DC', paso_mm: 12.5 });
  // 0, 12,5 … 50 en X e Y (5 × 5) y planos 0 y 12,5 → 50 puntos
  const lista = await admin.get('/sesiones?paso_mm=12,5');
  assert.equal(lista.status, 200);
  const s = lista.datos.data.find(x => x.id === id);
  assert.equal(s.paso_mm, 12.5);
  assert.equal(s.puntos_esperados, 50);
  assert.equal(s.puntos_recibidos, 50);
  assert.equal(s.huecos.total, 0);
  assert.ok(!(await admin.get('/sesiones?paso_mm=12')).datos.data.some(x => x.id === id));
  const { filas } = leerCSV((await admin.get(`/sesiones/${id}/csv`)).datos);
  assert.deepEqual([...new Set(filas.map(f => Number(f.z_mm)))], [0, 12.5]);
  assert.equal(Math.max(...filas.map(f => Number(f.x_mm))), 50);
});

test('Zona de muestreo 40 × 20 × 10 mm con paso 10: 30 puntos dentro de la zona; los límites de la base se respetan', async (t) => {
  if (omitir(t)) return;
  await admin.put('/configuracion/simulacion', { valor: { ms_por_punto: { DC: 20, AC: 20 }, prob_hueco: 0, prob_saturacion: 0 } });
  const id = await sesionSimulada(admin, { modo: 'DC', paso_mm: 10, zona_mm: { x: 40, y: 20, z: 10 } });
  const s = (await admin.get('/sesiones')).datos.data.find(x => x.id === id);
  assert.deepEqual([s.zona_x_mm, s.zona_y_mm, s.zona_z_mm], [40, 20, 10]);
  assert.equal(s.puntos_esperados, 30);
  assert.equal(s.puntos_recibidos, 30);
  assert.equal(s.huecos.total, 0);
  const { meta, filas } = leerCSV((await admin.get(`/sesiones/${id}/csv`)).datos);
  assert.match(meta.zona_mm, /^40 x 20 x 10/);
  assert.equal(Math.max(...filas.map(f => Number(f.x_mm))), 40);
  assert.equal(Math.max(...filas.map(f => Number(f.y_mm))), 20);
  // Una zona más grande que la base: 422
  assert.equal((await admin.post('/sesiones', { modo: 'DC', paso_mm: 10, zona_mm: { x: 70, y: 20, z: 10 } })).status, 422);
  // Si se cambia de base (límites menores), la zona anterior ya no cabe
  assert.equal((await admin.put('/configuracion/barrido', { valor: { limite_x_mm: 30 } })).status, 200);
  assert.equal((await admin.post('/sesiones', { modo: 'DC', paso_mm: 10, zona_mm: { x: 40, y: 20, z: 10 } })).status, 422);
  assert.equal((await admin.put('/configuracion/barrido', { valor: { limite_x_mm: 60 } })).status, 200);
});

test('Borrado lógico y restauración', async (t) => {
  if (omitir(t)) return;
  const id = await sesionSimulada(admin, { modo: 'DC', paso_mm: 20 });
  assert.equal((await admin.del(`/sesiones/${id}`)).status, 200);
  assert.equal((await admin.del(`/sesiones/${id}`)).status, 409);
  assert.ok(!(await admin.get('/sesiones')).datos.data.some(s => s.id === id));
  assert.equal((await admin.get(`/sesiones/${id}/csv`)).status, 404);
  const conEliminadas = await admin.get('/sesiones?incluir_eliminadas=1');
  assert.ok(conEliminadas.datos.data.find(s => s.id === id).eliminada_en);
  const op = cliente(entorno.base);
  await op.login('operador', 'operador123');
  assert.equal((await op.get('/sesiones?incluir_eliminadas=1')).status, 403);
  assert.equal((await op.post(`/sesiones/${id}/restaurar`)).status, 403);
  assert.equal((await admin.post(`/sesiones/${id}/restaurar`)).status, 200);
  assert.ok((await admin.get('/sesiones')).datos.data.some(s => s.id === id));
  // Las mediciones nunca se borraron
  const [[{ n }]] = await entorno.pool.query('SELECT COUNT(*) AS n FROM mediciones WHERE sesion_id = ?', [id]);
  assert.equal(Number(n), 32);
});

test('409 por sesión doble y por cambiar el modo con una sesión abierta', async (t) => {
  if (omitir(t)) return;
  await admin.put('/configuracion/simulacion', { valor: { ms_por_punto: { DC: 200, AC: 200 } } });
  const primera = await admin.post('/sesiones', { modo: 'DC', paso_mm: 20 });
  assert.equal(primera.status, 201);
  const op = cliente(entorno.base);
  await op.login('operador', 'operador123');
  assert.equal((await op.post('/sesiones', { modo: 'AC', paso_mm: 10 })).status, 409);
  assert.equal((await admin.put('/configuracion/modo_operacion', { valor: 'real' })).status, 409);
  assert.equal((await admin.put('/configuracion/barrido', { valor: { standoff_mm: 6 } })).status, 409);
  assert.equal((await admin.del(`/sesiones/${primera.datos.sesion.id}`)).status, 409);
  assert.equal((await op.put(`/sesiones/${primera.datos.sesion.id}`)).status, 200);
  assert.equal((await op.put(`/sesiones/${primera.datos.sesion.id}`)).status, 409);
});
