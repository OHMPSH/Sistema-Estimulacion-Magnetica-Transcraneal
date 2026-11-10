/**
 * services/dispositivo.js
 * ─────────────────────────────────────────────────────────────
 * Estado de la Pico W (Fase 4), en memoria.
 *
 *   cargar()                 — lee el dispositivo principal al arrancar
 *   registrarLatido(disp, datos, ip) — guarda el latido (en memoria siempre;
 *                              en la BD como máximo una vez cada 30 s si
 *                              nada importante cambió)
 *   estadoPublico()          — {enLinea, ultimoLatido, firmware, rssi, ip, ...}
 *   generarToken() / revocarToken() / cambiarActivo(activo)
 *
 * Un temporizador de 1 s compara el último latido con
 * dispositivo.umbral_desconexion_s. Cuando la Pico pasa de en línea a
 * sin señal, o al revés, se difunde el evento SSE `dispositivo` con el
 * estado. En modo simulación el estado se sigue calculando; es la
 * interfaz la que no lo muestra.
 *
 * El sistema tiene una sola mesa de medición: el estado sigue al
 * dispositivo principal (el de menor id, 'pico-w-1').
 * ─────────────────────────────────────────────────────────────
 */

import { randomBytes } from 'node:crypto';
import * as Dispositivo from '../models/Dispositivo.js';
import { hashDeToken } from './sesionUsuario.js';
import { obtener } from './configuracion.js';
import { difundir } from './tiempoReal.js';

/** Cada cuánto se escribe el latido en la BD si nada cambió */
const ESCRIBIR_CADA_MS = 30_000;
/** Cambio del desfase de reloj (ms) a partir del cual se vuelve a registrar en el log */
const AVISAR_DESFASE_MS = 1000;

let disp = null;              // fila del dispositivo principal (sin token)
let ultimaEscrituraMs = 0;
let enLineaDifundido = null;  // último valor de enLinea que se difundió
let desfaseMs = null;         // reloj del servidor − reloj de la Pico (ms)
let desfaseRegistrado = null;
let temporizador = null;

/** ¿Llegó un latido dentro del umbral? */
function calcularEnLinea(ahora = Date.now()) {
  if (!disp || !disp.activo || !disp.ultimo_latido) return false;
  const umbralMs = obtener('dispositivo').umbral_desconexion_s * 1000;
  return ahora - new Date(disp.ultimo_latido).getTime() <= umbralMs;
}

/** Estado que ven el navegador (GET /dispositivo/estado y SSE) */
export function estadoPublico() {
  if (!disp) {
    return { existe: false, enLinea: false, ultimoLatido: null, tieneToken: false, activo: false };
  }
  return {
    existe:       true,
    id:           disp.id,
    nombre:       disp.nombre,
    activo:       disp.activo,
    tieneToken:   disp.tiene_token,
    enLinea:      calcularEnLinea(),
    ultimoLatido: disp.ultimo_latido ? new Date(disp.ultimo_latido).toISOString() : null,
    firmware:     disp.firmware ?? null,
    rssi:         disp.rssi ?? null,
    ip:           disp.ip ?? null,
    uptime_s:     disp.uptime_s ?? null,
    desfase_ms:   desfaseMs,
    umbral_desconexion_s: obtener('dispositivo').umbral_desconexion_s,
  };
}

function difundirEstado() {
  const estado = estadoPublico();
  enLineaDifundido = estado.enLinea;
  difundir('dispositivo', estado);
}

/** Revisa cada segundo si cambió el estado en línea */
function revisar() {
  const enLinea = calcularEnLinea();
  if (enLinea !== enLineaDifundido) {
    console.log(`[dispositivo] ${disp?.nombre ?? 'Pico W'} ${enLinea ? 'en línea' : 'sin señal'}.`);
    difundirEstado();
  }
}

/** Carga el dispositivo principal y arranca el temporizador de 1 s */
export async function cargar() {
  disp = await Dispositivo.obtenerPrincipal();
  enLineaDifundido = calcularEnLinea();
  if (!disp) console.warn('[dispositivo] No hay ningún dispositivo en la tabla dispositivos (¿falta la migración 004?).');
  else console.log(`[dispositivo] ✓ ${disp.nombre} cargado (${disp.tiene_token ? 'con token' : 'sin token'}${disp.activo ? '' : ', desactivado'}).`);
  temporizador ??= setInterval(revisar, 1000).unref();
}

/** Para las pruebas o el apagado */
export function detener() {
  clearInterval(temporizador);
  temporizador = null;
}

/**
 * Registra un latido de la Pico.
 * @param {object} d      el dispositivo autenticado (req.dispositivo)
 * @param {object} datos  { firmware, rssi, uptime_s, ts_dispositivo_ms } ya validados
 * @param {string} ip
 */
export async function registrarLatido(d, datos, ip) {
  const ahora = new Date();
  // Si el latido viene de otro dispositivo (hay varios en la tabla), solo se guarda en la BD
  const esPrincipal = disp && d.id === disp.id;
  const anterior = esPrincipal ? disp : d;

  const cambioImportante = !anterior.ultimo_latido
    || anterior.firmware !== (datos.firmware ?? null)
    || anterior.ip !== (ip ?? null)
    || !calcularEnLinea();
  const actualizado = {
    ...anterior,
    ultimo_latido: ahora,
    firmware: datos.firmware ?? null,
    rssi:     datos.rssi ?? null,
    uptime_s: datos.uptime_s ?? null,
    ip:       ip ?? null,
  };

  // Desfase entre relojes (sin descontar la latencia de la red, que en el hotspot es de decenas de ms)
  if (datos.ts_dispositivo_ms) {
    const desfase = ahora.getTime() - datos.ts_dispositivo_ms;
    if (esPrincipal) desfaseMs = desfase;
    if (desfaseRegistrado === null || Math.abs(desfase - desfaseRegistrado) > AVISAR_DESFASE_MS) {
      desfaseRegistrado = desfase;
      console.log(`[dispositivo] Desfase de reloj de ${d.nombre}: ${desfase} ms (servidor − Pico).`);
    }
  }

  if (!esPrincipal || cambioImportante || ahora.getTime() - ultimaEscrituraMs >= ESCRIBIR_CADA_MS) {
    await Dispositivo.guardarLatido(d.id, {
      ultimoLatido: ahora, ip: actualizado.ip, firmware: actualizado.firmware,
      rssi: actualizado.rssi, uptimeS: actualizado.uptime_s,
    });
    if (esPrincipal) ultimaEscrituraMs = ahora.getTime();
  }

  if (esPrincipal) {
    disp = actualizado;
    if (enLineaDifundido !== true) {
      console.log(`[dispositivo] ${disp.nombre} en línea (${disp.ip ?? 'IP desconocida'}, firmware ${disp.firmware ?? '?'}).`);
      difundirEstado();
    }
  }
}

/**
 * Genera un token nuevo para el dispositivo principal (reemplaza al
 * anterior). Devuelve el token en claro: es la única vez que existe.
 */
export async function generarToken() {
  if (!disp) throw new Error('No hay ningún dispositivo registrado (ejecuta la migración 004)');
  const token = randomBytes(32).toString('base64url');
  await Dispositivo.guardarTokenHash(disp.id, hashDeToken(token));
  disp = { ...disp, tiene_token: true };
  difundirEstado();
  return { token, nombre: disp.nombre };
}

/** Quita el token: la Pico deja de poder enviar hasta que se genere otro */
export async function revocarToken() {
  if (!disp) return false;
  await Dispositivo.guardarTokenHash(disp.id, null);
  disp = { ...disp, tiene_token: false };
  difundirEstado();
  return true;
}

/** Activa o desactiva el dispositivo principal */
export async function cambiarActivo(activo) {
  if (!disp) return false;
  await Dispositivo.cambiarActivo(disp.id, activo);
  disp = { ...disp, activo };
  difundirEstado();
  return true;
}

/** Hash del token, para el middleware de autenticación */
export { hashDeToken };
