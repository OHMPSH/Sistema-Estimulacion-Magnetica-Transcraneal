/**
 * controllers/mediciones.controller.js
 * ─────────────────────────────────────────────────────────────
 * CAPA DE CONTROLADOR (MVC) — sesiones de medición y mediciones
 *
 *   getStatus        — GET    /api/status        health-check (público)
 *   sseHandler       — GET    /api/stream        canal en tiempo real
 *   iniciarSesion    — POST   /api/sesiones      {modo, paso_mm?, medio?}
 *   finalizarSesion  — PUT    /api/sesiones/:id  cierra la sesión
 *   getSesiones      — GET    /api/sesiones      lista (?modo=&paso_mm=&medio=&origen=)
 *   deleteSesion     — DELETE /api/sesiones/:id  borrado lógico (Fase 5)
 *   restaurarSesion  — POST   /api/sesiones/:id/restaurar
 *   patchSesion      — PATCH  /api/sesiones/:id  {notas}
 *   getSesionActiva  — GET    /api/sesiones/activa  la abierta con sus mediciones
 *   getCsv           — GET    /api/sesiones/:id/csv  CSV con metadatos
 *   medicionRetirada — POST   /api/mediciones    410: se usa /dispositivo/mediciones
 *   getMedicionesDeSesion — GET /api/sesiones/:id/mediciones
 *
 * Las reglas de negocio viven en services/: sesiones.js (una sola
 * sesión abierta, simulador), ingesta.js (validar, guardar y difundir)
 * y tiempoReal.js (SSE).
 * ─────────────────────────────────────────────────────────────
 */

import * as Medicion from '../models/Medicion.js';
import * as sesiones from '../services/sesiones.js';
import { ErrorIngesta } from '../services/ingesta.js';
import { conectar, totalClientes, difundir } from '../services/tiempoReal.js';
import { obtener } from '../services/configuracion.js';
import { VERSION_SOFTWARE, VERSION_PAQUETE, COMMIT } from '../services/version.js';
import {
  encabezadoCSV, lineaCSV, COLUMNAS_CSV, nombreArchivoCSV,
} from '../services/trazabilidad.js';

/** Traduce los errores conocidos de los servicios a su respuesta HTTP */
function responderError(res, next, err) {
  if (err instanceof sesiones.ErrorSesion) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  if (err instanceof ErrorIngesta) {
    return res.status(err.status).json({ ok: false, error: err.message, errores: err.errores });
  }
  return next(err);
}

// ── Health-check y SSE ───────────────────────────────────────

/** GET /api/status — el frontend lo llama cada 15 s */
export const getStatus = (_req, res) => {
  res.json({
    ok:             true,
    version:        VERSION_PAQUETE,    // de server/package.json (Fase 5)
    commit:         COMMIT,
    version_software: VERSION_SOFTWARE,
    uptime:         process.uptime(),
    clientes:       totalClientes(),
    modo_operacion: obtener('modo_operacion'),
  });
};

/** GET /api/stream — eventos medicion, sesion y configuracion */
export const sseHandler = (req, res) => conectar(req, res);

// ── Sesiones ─────────────────────────────────────────────────

/** POST /api/sesiones — crea la sesión (409 si ya hay otra abierta) */
export const iniciarSesion = async (req, res, next) => {
  try {
    const sesion = await sesiones.iniciar({ ...req.nuevaSesion, usuarioId: req.usuario.id });
    // sesionId se mantiene por compatibilidad con el frontend anterior
    res.status(201).json({ ok: true, sesionId: sesion.id, sesion });
  } catch (err) {
    responderError(res, next, err);
  }
};

/** PUT /api/sesiones/:id — cierra la sesión y detiene el simulador */
export const finalizarSesion = async (req, res, next) => {
  try {
    const sesion = await sesiones.finalizar(req.idSesion, 'manual');
    res.json({ ok: true, sesion });
  } catch (err) {
    responderError(res, next, err);
  }
};

/** GET /api/sesiones — sesiones con estadísticas, filtradas */
export const getSesiones = async (req, res, next) => {
  try {
    res.json({ ok: true, data: await Medicion.obtenerSesiones(req.filtros), activa: sesiones.sesionAbierta() });
  } catch (err) {
    next(err);
  }
};

/** 404 si la sesión no existe o está eliminada (borrado lógico) */
async function sesionVisible(res, id) {
  const estado = await Medicion.obtenerEstadoSesion(id);
  if (!estado || estado.eliminada_en) {
    res.status(404).json({ ok: false, error: `La sesión ${id} no existe` });
    return null;
  }
  return estado;
}

/** DELETE /api/sesiones/:id — borrado lógico (solo admin) */
export const deleteSesion = async (req, res, next) => {
  try {
    if (sesiones.sesionAbierta()?.id === req.idSesion) {
      return res.status(409).json({ ok: false, error: `La sesión ${req.idSesion} está en curso. Deténla antes de eliminarla.` });
    }
    const estado = await Medicion.obtenerEstadoSesion(req.idSesion);
    if (!estado) return res.status(404).json({ ok: false, error: `La sesión ${req.idSesion} no existe` });
    if (estado.eliminada_en) return res.status(409).json({ ok: false, error: `La sesión ${req.idSesion} ya estaba eliminada` });
    await Medicion.marcarEliminada(req.idSesion);
    console.log(`[sesiones] "${req.usuario.usuario}" eliminó (borrado lógico) la sesión ${req.idSesion}.`);
    difundir('sesion', { tipo: 'eliminada', sesionId: req.idSesion });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/sesiones/:id/restaurar — quita el borrado lógico (solo admin) */
export const restaurarSesion = async (req, res, next) => {
  try {
    const estado = await Medicion.obtenerEstadoSesion(req.idSesion);
    if (!estado) return res.status(404).json({ ok: false, error: `La sesión ${req.idSesion} no existe` });
    if (!estado.eliminada_en) return res.status(409).json({ ok: false, error: `La sesión ${req.idSesion} no está eliminada` });
    await Medicion.restaurar(req.idSesion);
    console.log(`[sesiones] "${req.usuario.usuario}" restauró la sesión ${req.idSesion}.`);
    difundir('sesion', { tipo: 'restaurada', sesionId: req.idSesion });
    res.json({ ok: true, sesion: await Medicion.obtenerSesion(req.idSesion) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sesiones/:id {notas}
 * Lo puede hacer un admin, o el operador que inició la sesión.
 */
export const patchSesion = async (req, res, next) => {
  try {
    const estado = await sesionVisible(res, req.idSesion);
    if (!estado) return;
    const esAdmin = req.usuario.rol === 'admin';
    const esSuya = req.usuario.rol === 'operador' && estado.usuario_id === req.usuario.id;
    if (!esAdmin && !esSuya) {
      return res.status(403).json({ ok: false, error: 'Solo un admin, o el operador que inició la sesión, puede editar sus notas.' });
    }
    await Medicion.actualizarNotas(req.idSesion, req.notas);
    const sesion = await Medicion.obtenerSesion(req.idSesion);
    difundir('sesion', { tipo: 'notas', sesionId: req.idSesion, notas: sesion.notas });
    res.json({ ok: true, sesion });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sesiones/activa — la sesión abierta con todo lo medido hasta
 * ahora (para quien abre o recarga el dashboard a mitad del barrido).
 */
export const getSesionActiva = async (_req, res, next) => {
  try {
    const abierta = sesiones.sesionAbierta();
    if (!abierta) return res.json({ ok: true, sesion: null, mediciones: [] });
    const mediciones = await Medicion.medicionesComoEventos(abierta.id, abierta.z_levels_mm);
    res.json({ ok: true, sesion: abierta, mediciones });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sesiones/:id/csv — CSV generado en el servidor, en streaming,
 * con un encabezado de metadatos "# clave: valor" y los datos sin redondear.
 */
export const getCsv = async (req, res, next) => {
  try {
    if (!(await sesionVisible(res, req.idSesion))) return;
    const s = await Medicion.obtenerSesion(req.idSesion, { conConfig: true });
    const malla = sesiones.mallaDeSesion(s);
    const iso = v => (v ? new Date(v).toISOString() : '');

    const meta = [
      ['sistema', 'TMS — Sistema de Adquisición de Datos (IPN, ESIME Zacatenco)'],
      ['sesion_id', s.id],
      ['modo', s.modo],
      ['paso_mm', s.paso_mm],
      ['medio', s.medio],
      ['origen', s.origen === 'hw' ? 'hw (Pico W)' : 'sim (simulador del servidor)'],
      ['iniciada_utc', iso(s.iniciada_en)],
      ['terminada_utc', iso(s.terminada_en)],
      ['usuario', s.iniciada_por ?? ''],
      ['version_software', s.version_software ?? ''],
      ['version_firmware', s.version_firmware ?? ''],
      ['zona_mm', `${malla.zona.x} x ${malla.zona.y} x ${malla.zona.z} (x, y, z)`],
      ['malla', `${malla.gridNx} x ${malla.gridNy} x ${malla.zLevels.length} planos (z = ${malla.zLevels.join(', ')} mm)`],
      ['puntos_esperados', s.puntos_esperados ?? malla.totalPuntos],
      ['puntos_recibidos', s.puntos_recibidos ?? ''],
      ['huecos', s.huecos ? s.huecos.total : ''],
      ['config_barrido', s.config_barrido ?? ''],
      ['config_sensor', s.config_sensor ?? ''],
      ...(s.origen === 'sim' ? [['config_simulacion', s.config_simulacion ?? '']] : []),
      ['unidades', 'posiciones en mm; campo en µT; tiempos en UTC (ISO 8601); raw en cuentas del HMC5883L (−4096 = desborde)'],
      ['saturado', '1 = algún eje se desbordó: ese eje y magnitud_uT quedan vacíos'],
      ['notas', s.notas ?? ''],
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivoCSV(s.id, s.iniciada_en)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.write(encabezadoCSV(meta));
    res.write(COLUMNAS_CSV.join(',') + '\n');

    const flujo = Medicion.streamMediciones(s.id);
    req.on('close', () => flujo.destroy());
    for await (const fila of flujo) {
      if (!res.write(lineaCSV(fila))) await new Promise(r => res.once('drain', r));
    }
    res.end();
  } catch (err) {
    if (res.headersSent) { res.destroy(err); return; }
    next(err);
  }
};

// ── Mediciones ───────────────────────────────────────────────

/**
 * POST /api/mediciones — retirada en la Fase 4.
 * Las lecturas reales llegan de la Pico W por POST /dispositivo/mediciones,
 * con su token; las simuladas las genera el servidor. Se responde 410
 * (Gone) en lugar de 404 para que quien la use sepa a dónde ir.
 */
export const medicionRetirada = (_req, res) => {
  res.status(410).json({
    ok: false,
    error: 'POST /mediciones se retiró. La Pico W envía sus lecturas por lotes a POST /api/dispositivo/mediciones con su token (ver docs/firmware-pico-w.md).',
  });
};

/** GET /api/sesiones/:id/mediciones — datos de una sesión en JSON (con seq, crudos y saturado) */
export const getMedicionesDeSesion = async (req, res, next) => {
  try {
    if (!(await sesionVisible(res, req.idSesion))) return;
    res.json({ ok: true, data: await Medicion.obtenerMedicionesDeSesion(req.idSesion) });
  } catch (err) {
    next(err);
  }
};
