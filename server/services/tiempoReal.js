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
 *
 * Un solo temporizador manda un comentario ": ping" cada 25 s a todos
 * los clientes para que Nginx y los navegadores no cierren la conexión.
 * (Los ids de evento y la reconexión con Last-Event-ID llegan en la Fase 5.)
 * ─────────────────────────────────────────────────────────────
 */

import { randomUUID } from 'node:crypto';

const clientes = new Map();   // id → res
let temporizadorPing = null;

function escribir(res, texto) {
  try { res.write(texto); } catch { /* el cliente ya se desconectó */ }
}

/** Atiende GET /stream: deja la respuesta abierta y la registra */
export function conectar(req, res) {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');   // Nginx no debe almacenar el stream
  res.flushHeaders();

  const id = randomUUID();
  clientes.set(id, res);
  console.log(`[SSE] +cliente (${req.usuario?.usuario ?? '?'}). Total: ${clientes.size}`);

  temporizadorPing ??= setInterval(() => {
    for (const r of clientes.values()) escribir(r, ': ping\n\n');
  }, 25_000).unref();

  req.on('close', () => {
    clientes.delete(id);
    console.log(`[SSE] -cliente. Total: ${clientes.size}`);
    if (clientes.size === 0 && temporizadorPing) {
      clearInterval(temporizadorPing);
      temporizadorPing = null;
    }
  });
}

/** Envía un evento con datos JSON a todos los clientes conectados */
export function difundir(evento, datos) {
  const mensaje = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const res of clientes.values()) escribir(res, mensaje);
}

export const totalClientes = () => clientes.size;
