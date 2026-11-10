/**
 * controllers/dispositivo.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — la Pico W (Fase 4)
 *
 * Para el dashboard (cookie de usuario):
 *   getEstado      — GET    /dispositivo/estado   cualquier usuario con sesión
 *   generarToken   — POST   /dispositivo/token    admin; el token se muestra UNA vez
 *   revocarToken   — DELETE /dispositivo/token    admin
 *   patchDispositivo — PATCH /dispositivo {activo} admin
 *
 * Para la Pico (Authorization: Bearer <token>):
 *   latido         — POST /dispositivo/latido
 *   lote           — POST /dispositivo/mediciones
 * ─────────────────────────────────────────────────────────────
 */

import * as dispositivo from '../services/dispositivo.js';
import * as sesiones from '../services/sesiones.js';
import { registrarLoteDispositivo, ultimoSeq, ErrorIngesta } from '../services/ingesta.js';
import { obtener } from '../services/configuracion.js';
import * as Medicion from '../models/Medicion.js';

/** GET /dispositivo/estado */
export const getEstado = (_req, res) => {
  res.json({ ok: true, ...dispositivo.estadoPublico() });
};

/** POST /dispositivo/token — genera (o regenera) el token */
export const generarToken = async (req, res, next) => {
  try {
    const { token, nombre } = await dispositivo.generarToken();
    console.log(`[dispositivo] "${req.usuario.usuario}" generó un token nuevo para ${nombre}.`);
    res.status(201).json({
      ok: true,
      token,
      dispositivo: nombre,
      aviso: 'Copia el token ahora: no se volverá a mostrar. Si lo pierdes, genera otro (el anterior deja de funcionar).',
    });
  } catch (err) {
    next(err);
  }
};

/** DELETE /dispositivo/token — la Pico deja de poder enviar */
export const revocarToken = async (req, res, next) => {
  try {
    if (!(await dispositivo.revocarToken())) return res.status(404).json({ ok: false, error: 'No hay ningún dispositivo registrado' });
    console.log(`[dispositivo] "${req.usuario.usuario}" revocó el token.`);
    res.json({ ok: true, ...dispositivo.estadoPublico() });
  } catch (err) {
    next(err);
  }
};

/** PATCH /dispositivo {activo} */
export const patchDispositivo = async (req, res, next) => {
  try {
    if (!(await dispositivo.cambiarActivo(req.cambiosDispositivo.activo))) {
      return res.status(404).json({ ok: false, error: 'No hay ningún dispositivo registrado' });
    }
    res.json({ ok: true, ...dispositivo.estadoPublico() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /dispositivo/latido
 * Responde lo que la Pico necesita para saber si debe medir:
 * el modo, la sesión abierta (solo si es de origen 'hw') con la
 * configuración del barrido y del sensor, y el último seq guardado,
 * para que una Pico que se reinicia a mitad de sesión siga numerando.
 */
export const latido = async (req, res, next) => {
  try {
    await dispositivo.registrarLatido(req.dispositivo, req.latido, req.ip);
    await sesiones.anotarFirmware(req.latido.firmware);
    const modo = obtener('modo_operacion');
    const abierta = sesiones.sesionAbierta();
    let sesionActiva = null;
    if (modo === 'real' && abierta && abierta.origen === 'hw') {
      sesionActiva = {
        id: abierta.id,
        modo: abierta.modo,
        paso_mm: abierta.paso_mm,
        medio: abierta.medio,
        grid_n: abierta.grid_n,
        z_levels_mm: abierta.z_levels_mm,
        puntos_esperados: abierta.puntos_esperados,
        ultimo_seq: await ultimoSeq(abierta.id),
        barrido: obtener('barrido'),
        sensor: obtener('sensor'),
      };
    }
    res.json({
      ok: true,
      modo_operacion: modo,
      sesion_activa: sesionActiva,
      intervalo_latido_s: obtener('dispositivo').intervalo_latido_s,
      servidor_ts_ms: Date.now(),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /dispositivo/mediciones — lote de lecturas crudas */
export const lote = async (req, res, next) => {
  try {
    const { sesionId, lecturas } = req.lote;
    if (obtener('modo_operacion') !== 'real') {
      return res.status(409).json({ ok: false, error: 'El sistema está en modo simulación: no se aceptan lecturas de la Pico W.' });
    }
    const abierta = sesiones.sesionAbierta();
    if (!abierta || abierta.id !== sesionId) {
      const estado = await Medicion.obtenerEstadoSesion(sesionId);
      if (!estado) return res.status(404).json({ ok: false, error: `La sesión ${sesionId} no existe` });
      return res.status(409).json({ ok: false, error: `La sesión ${sesionId} no está abierta` });
    }
    if (abierta.origen !== 'hw') {
      return res.status(409).json({ ok: false, error: `La sesión ${sesionId} es simulada: no acepta lecturas de la Pico W` });
    }
    const r = await registrarLoteDispositivo(abierta, lecturas);
    res.json({ ok: true, ...r });
  } catch (err) {
    if (err instanceof ErrorIngesta) {
      return res.status(err.status).json({ ok: false, error: err.message, errores: err.errores });
    }
    next(err);
  }
};
