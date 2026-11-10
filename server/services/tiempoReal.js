/**
 * services/tiempoReal.js
 * ─────────────────────────────────────────────────────────────
 * Canal SSE (Server-Sent Events) compartido por todo el servidor.
 *
 *   conectar(req, res)        — registra un navegador en GET /stream
 *   difundir(evento, datos)   — envía un evento a todos los conectados
 *   totalClientes()           — cuántos dashboards hay conectados
 *
 * Eventos que se difunden:
 *   medicion       — una lectura nueva (services/ingesta.js)
 *   sesion         — {tipo:'iniciada'|'finalizada', sesion} (services/sesiones.js)
 *   configuracion  — {clave, valor} (services/configuracion.js)
 *   dispositivo    — estado de la Pico W (services/dispositivo.js)
 *   resincronizar  — solo a un cliente que se reconecta y ya no se le
 *                    puede reenviar lo que se perdió: debe volver a cargar
 *                    GET /sesiones/activa
 *
 * Recuperable (Fase 5):
 *   - Cada evento lleva `id:`, un número creciente. Empieza en la hora
 *     de arranque en ms, así los ids de un proceso nuevo son siempre
 *     mayores que los del anterior.
 *   - Un búfer circular guarda los últimos 2000 eventos. Al reconectarse,
 *     el navegador manda la cabecera Last-Event-ID y se le reenvía lo
 *     posterior; si ese id ya no está en el búfer, recibe `resincronizar`.
 *   - `retry: 3000`: el navegador espera 3 s antes de reconectarse.
 *   - Si res.write devuelve false (el cliente va lento), los mensajes se
 *     encolan hasta el evento `drain`. Si un cliente acumula más de 1000
 *     pendientes, se cierra su conexión (se reconectará y resincronizará).
 *
 * Un solo temporizador manda un comentario ": ping" cada 25 s a todos
 * los clientes para que Nginx y los navegadores no cierren la conexión.
 * ─────────────────────────────────────────────────────────────
 */

import { randomUUID } from 'node:crypto';
import { BuferEventos } from './bufferEventos.js';

export const TAMANO_BUFER = 2000;
export const MAX_PENDIENTES = 1000;
export const RETRY_MS = 3000;

const clientes = new Map();   // id → { res, usuario, pendientes: string[] | null }
const bufer = new BuferEventos(TAMANO_BUFER);
let siguienteId = Date.now();
let temporizadorPing = null;

/** Escribe respetando la contrapresión del socket */
function escribir(cliente, texto) {
  if (cliente.cerrado) return;
  if (cliente.pendientes) {
    cliente.pendientes.push(texto);
    if (cliente.pendientes.length > MAX_PENDIENTES) {
      console.warn(`[SSE] Cliente ${cliente.usuario} con más de ${MAX_PENDIENTES} eventos pendientes: se cierra su conexión.`);
      cliente.cerrado = true;
      cliente.res.end();
    }
    return;
  }
  try {
    if (!cliente.res.write(texto)) {
      cliente.pendientes = [];
      cliente.res.once('drain', () => vaciar(cliente));
    }
  } catch { /* el cliente ya se desconectó */ }
}

function vaciar(cliente) {
  const cola = cliente.pendientes ?? [];
  cliente.pendientes = null;
  for (let i = 0; i < cola.length; i++) {
    if (cliente.cerrado) return;
    try {
      if (!cliente.res.write(cola[i])) {
        cliente.pendientes = cola.slice(i + 1);
        cliente.res.once('drain', () => vaciar(cliente));
        return;
      }
    } catch { return; }
  }
}

const formatear = (id, evento, datos) => `id: ${id}\nevent: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;

/** Atiende GET /stream: deja la respuesta abierta y la registra */
export function conectar(req, res) {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');   // Nginx no debe almacenar el stream
  res.flushHeaders();

  const id = randomUUID();
  const cliente = { res, usuario: req.usuario?.usuario ?? '?', pendientes: null, cerrado: false };
  clientes.set(id, cliente);

  escribir(cliente, `retry: ${RETRY_MS}\n\n`);

  // Reconexión: reenviar lo que se perdió, o pedir que resincronice
  const cabecera = req.get('last-event-id');
  let reenviados = 0;
  if (cabecera !== undefined && cabecera !== '') {
    const ultimo = /^\d+$/.test(cabecera) ? Number(cabecera) : NaN;
    const faltantes = bufer.desde(ultimo, siguienteId - 1);
    if (faltantes === null) {
      escribir(cliente, formatear(siguienteId - 1, 'resincronizar', { motivo: 'eventos fuera del búfer', ultimoId: cabecera }));
    } else {
      for (const e of faltantes) escribir(cliente, e.texto);
      reenviados = faltantes.length;
    }
  }
  console.log(`[SSE] +cliente (${cliente.usuario})${cabecera ? `, reconexión desde ${cabecera}: ${reenviados} reenviados` : ''}. Total: ${clientes.size}`);

  temporizadorPing ??= setInterval(() => {
    for (const c of clientes.values()) escribir(c, ': ping\n\n');
  }, 25_000).unref();

  req.on('close', () => {
    cliente.cerrado = true;
    clientes.delete(id);
    console.log(`[SSE] -cliente. Total: ${clientes.size}`);
    if (clientes.size === 0 && temporizadorPing) {
      clearInterval(temporizadorPing);
      temporizadorPing = null;
    }
  });
}

/** Envía un evento con datos JSON a todos los clientes conectados y lo guarda en el búfer */
export function difundir(evento, datos) {
  const id = siguienteId++;
  const texto = formatear(id, evento, datos);
  bufer.agregar({ id, texto });
  for (const c of clientes.values()) escribir(c, texto);
}

export const totalClientes = () => clientes.size;
export const ultimoIdEvento = () => siguienteId - 1;
