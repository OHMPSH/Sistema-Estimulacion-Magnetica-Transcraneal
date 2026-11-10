#!/usr/bin/env node
/**
 * scripts/emular-pico.js
 * ─────────────────────────────────────────────────────────────
 * Emula la Raspberry Pi Pico W para probar el modo real sin hardware.
 * Habla el mismo protocolo que el firmware (docs/firmware-pico-w.md):
 *
 *   1. Manda el latido (POST /dispositivo/latido) cada intervalo_latido_s.
 *   2. Cuando el latido trae una sesión activa, recorre su malla (según
 *      el paso) con lecturas crudas verosímiles del HMC5883L (la misma
 *      física de espira que el simulador del servidor) y las envía por
 *      lotes (POST /dispositivo/mediciones).
 *   3. Si un lote falla, lo reenvía con los MISMOS seq hasta que el
 *      servidor lo confirme: el servidor descarta los duplicados.
 *
 * Uso (desde server/):
 *   npm run emular-pico -- --token <TOKEN> [opciones]
 *
 * Opciones:
 *   --url URL              base de la API (por defecto http://127.0.0.1:4000/api;
 *                          detrás de Nginx: https://<host>/api)
 *   --token TOKEN          token del dispositivo (o la variable PICO_TOKEN)
 *   --lote N               lecturas por lote (por defecto 20, máximo 200)
 *   --ms-por-lectura N     ritmo de lectura del sensor (por defecto 20 ms)
 *   --perdida P            probabilidad de "perder" un lote: la mitad de las
 *                          veces no se envía y la otra mitad se envía pero
 *                          se ignora la respuesta (fuerza reintentos y duplicados)
 *   --duplicar P           probabilidad de reenviar un lote ya confirmado
 *   --saturar P            probabilidad de que un eje lea −4096 (desborde)
 *   --sin-latido-a-los N   a los N segundos deja de mandar latidos y lecturas
 *                          (simula que la Pico se quedó sin red); sigue viva
 *                          hasta Ctrl+C
 *   --semilla N            semilla del ruido (por defecto 1)
 *   --insecure             acepta el certificado autofirmado de Nginx
 * ─────────────────────────────────────────────────────────────
 */

import { campoEnPlaca } from '../services/fisicaEspira.js';
import { mallaDeZona, puntoDeMalla } from '../services/geometria.js';
import { mulberry32, generadorGaussiano } from '../services/aleatorio.js';
import { utACrudo, DESBORDE, MAX_LECTURAS_LOTE } from '../services/conversionSensor.js';

// ── Opciones ──────────────────────────────────────────────────
function leerOpciones(argv) {
  const op = {
    url: 'http://127.0.0.1:4000/api', token: process.env.PICO_TOKEN ?? '',
    lote: 20, msPorLectura: 20, perdida: 0, duplicar: 0, saturar: 0,
    sinLatidoALos: null, semilla: 1, insecure: false,
  };
  const numeros = { '--lote': 'lote', '--ms-por-lectura': 'msPorLectura', '--perdida': 'perdida',
    '--duplicar': 'duplicar', '--saturar': 'saturar', '--sin-latido-a-los': 'sinLatidoALos', '--semilla': 'semilla' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') op.url = argv[++i];
    else if (a === '--token') op.token = argv[++i];
    else if (a === '--insecure') op.insecure = true;
    else if (numeros[a]) op[numeros[a]] = Number(argv[++i]);
    else if (a === '--help' || a === '-h') { console.log('Ver el encabezado de scripts/emular-pico.js'); process.exit(0); }
    else { console.error(`Opción desconocida: ${a}`); process.exit(1); }
  }
  op.url = op.url.replace(/\/+$/, '');
  if (!op.token) { console.error('Falta el token: --token <TOKEN> o PICO_TOKEN=<TOKEN>'); process.exit(1); }
  if (!(op.lote >= 1 && op.lote <= MAX_LECTURAS_LOTE)) { console.error(`--lote debe estar entre 1 y ${MAX_LECTURAS_LOTE}`); process.exit(1); }
  return op;
}

const op = leerOpciones(process.argv.slice(2));
if (op.insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const azar = mulberry32(op.semilla);
const gauss = generadorGaussiano(azar);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const hora = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[pico ${hora()}]`, ...a);

const inicio = Date.now();
let intervaloLatidoMs = 5000;
let sesion = null;          // sesión activa según el último latido
let sinRed = false;

// ── HTTP ──────────────────────────────────────────────────────
async function post(ruta, cuerpo) {
  const res = await fetch(`${op.url}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(8000),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, json };
}

// ── Latido ────────────────────────────────────────────────────
async function latido() {
  const { status, json } = await post('/dispositivo/latido', {
    firmware: 'emulador-1.0', rssi: -40 - Math.round(azar() * 30),
    uptime_s: Math.round((Date.now() - inicio) / 1000), ts_dispositivo_ms: Date.now(),
  });
  if (status === 401) { log('✗ 401: token inválido o dispositivo desactivado. Genera otro token como admin.'); process.exit(2); }
  if (!json?.ok) { log(`latido respondió ${status}: ${json?.error ?? '?'}`); return; }
  intervaloLatidoMs = (json.intervalo_latido_s ?? 5) * 1000;
  const nueva = json.sesion_activa;
  if (nueva && nueva.id !== sesion?.id) {
    log(`Sesión ${nueva.id}: ${nueva.modo}, paso ${nueva.paso_mm} mm, ${nueva.puntos_esperados} puntos, último seq ${nueva.ultimo_seq}.`);
    sesion = { ...nueva, siguienteSeq: nueva.ultimo_seq + 1, terminada: false };
  } else if (!nueva && sesion) {
    log(`La sesión ${sesion.id} ya no está activa (modo ${json.modo_operacion}).`);
    sesion = null;
  }
}

async function bucleLatido() {
  for (;;) {
    if (op.sinLatidoALos !== null && !sinRed && Date.now() - inicio >= op.sinLatidoALos * 1000) {
      sinRed = true;
      log(`Sin red a propósito (--sin-latido-a-los ${op.sinLatidoALos}): ya no se envía nada. Ctrl+C para salir.`);
    }
    if (!sinRed) {
      try { await latido(); } catch (err) { log(`latido falló: ${err.message}`); }
    }
    await dormir(intervaloLatidoMs);
  }
}

// ── Lecturas ──────────────────────────────────────────────────
/** Lectura cruda del punto número `indice` de la malla de la sesión */
function leerSensor(s, indice) {
  const malla = mallaDeZona(s.zona_mm, s.paso_mm);
  const punto = puntoDeMalla(malla, indice);
  const campo = campoEnPlaca(punto.xMM, punto.yMM, punto.zMM, {
    centroXMM: s.zona_mm.x / 2, centroYMM: s.zona_mm.y / 2, standoffMM: s.barrido.standoff_mm,
    radioMM: 25, campoCentroUT: 120,
  });
  const raw = {
    x: utACrudo(campo.bx + gauss(0.25), s.sensor, 'x'),
    y: utACrudo(campo.by + gauss(0.25), s.sensor, 'y'),
    z: utACrudo(campo.bz + gauss(0.25), s.sensor, 'z'),
  };
  if (azar() < op.saturar) raw[['x', 'y', 'z'][Math.floor(azar() * 3)]] = DESBORDE;
  return { xMM: punto.xMM, yMM: punto.yMM, zMM: punto.zMM, raw, ts_ms: Date.now() };
}

/** Envía un lote hasta que el servidor lo confirme (mismos seq en cada reintento) */
async function enviarConReintento(s, lecturas) {
  let espera = 250;
  for (let intento = 1; ; intento++) {
    if (sinRed) { await dormir(1000); continue; }
    const perder = azar() < op.perdida;
    if (perder && azar() < 0.5) {
      log(`  (lote ${lecturas[0].seq}–${lecturas.at(-1).seq} "perdido" antes de llegar; reintento ${intento})`);
      await dormir(espera);
      espera = Math.min(espera * 2, 4000);
      continue;
    }
    try {
      const { status, json } = await post('/dispositivo/mediciones', { sesionId: s.id, lecturas });
      if (perder) {
        log(`  (respuesta del lote ${lecturas[0].seq}–${lecturas.at(-1).seq} "perdida"; se reenvía)`);
        await dormir(espera);
        continue;
      }
      if (status === 200 && json?.ok) {
        const rech = json.rechazadas.length ? `, rechazadas ${json.rechazadas.length}: ${JSON.stringify(json.rechazadas.slice(0, 3))}` : '';
        log(`lote ${lecturas[0].seq}–${lecturas.at(-1).seq}: aceptadas ${json.aceptadas}, duplicadas ${json.duplicadas}${rech}`);
        return true;
      }
      if (status === 409 || status === 404) {
        log(`lote rechazado (${status}): ${json?.error}. Se deja de enviar esta sesión.`);
        s.terminada = true;
        return false;
      }
      log(`lote respondió ${status}: ${json?.error ?? '?'}; reintento`);
    } catch (err) {
      log(`lote falló (${err.message}); reintento`);
    }
    await dormir(espera);
    espera = Math.min(espera * 2, 4000);
  }
}

async function bucleMedicion() {
  for (;;) {
    const s = sesion;
    if (!s || s.terminada || sinRed) { await dormir(200); continue; }

    const total = s.puntos_esperados;
    const indice = s.siguienteSeq - 1;   // una lectura por punto: seq − 1 = índice en la malla
    if (indice >= total) {
      log(`Malla completa (${total} puntos). Esperando a que el operador cierre la sesión ${s.id}.`);
      s.terminada = true;
      continue;
    }
    const lecturas = [];
    for (let i = 0; i < op.lote && indice + i < total; i++) {
      await dormir(op.msPorLectura);
      lecturas.push({ seq: s.siguienteSeq + i, ...leerSensor(s, indice + i) });
    }
    const ok = await enviarConReintento(s, lecturas);
    if (!ok) continue;
    s.siguienteSeq += lecturas.length;
    if (azar() < op.duplicar) {
      log(`  (reenvío intencional del lote ${lecturas[0].seq}–${lecturas.at(-1).seq})`);
      await enviarConReintento(s, lecturas);
    }
  }
}

log(`Emulador de la Pico W → ${op.url} (lote ${op.lote}, pérdida ${op.perdida}, duplicar ${op.duplicar}, saturar ${op.saturar})`);
process.on('SIGINT', () => { log('Detenido.'); process.exit(0); });
bucleLatido();
bucleMedicion();
