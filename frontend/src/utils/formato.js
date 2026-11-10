/**
 * utils/formato.js
 * ─────────────────────────────────────────────────────────────
 * Formatos de números y fechas con Intl (nada escrito a mano).
 * Los decimales salen de la configuración de visualización; la zona
 * horaria, de la configuración `datos` (America/Mexico_City por defecto).
 * Solo para mostrar: nunca se redondea antes de guardar.
 * ─────────────────────────────────────────────────────────────
 */

const cacheNumeros = new Map();

/** Formateador de números con `decimales` fijos (es-MX) */
export function formatoNumero(decimales = 3) {
  const clave = decimales;
  if (!cacheNumeros.has(clave)) {
    cacheNumeros.set(clave, new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimales, maximumFractionDigits: decimales,
    }));
  }
  return cacheNumeros.get(clave);
}

/** Número con decimales, o "—" si no hay valor (0 sí se muestra) */
export function numero(v, decimales = 3) {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : formatoNumero(decimales).format(v);
}

const enteros = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
export const entero = v => (v === null || v === undefined ? '—' : enteros.format(v));

/** Fecha y hora en la zona del laboratorio */
export function fechaHora(v, zona = 'America/Mexico_City') {
  if (!v) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium', timeZone: zona }).format(new Date(v));
  } catch {
    return new Date(v).toLocaleString('es-MX');
  }
}

/** Hora con centésimas (para la tabla en vivo) */
export function horaPrecisa(v, zona = 'America/Mexico_City') {
  if (!v) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2, hour12: false, timeZone: zona,
    }).format(new Date(v));
  } catch {
    return new Date(v).toLocaleTimeString('es-MX');
  }
}

/** Fecha (AAAA-MM-DD) en la zona dada, para filtrar por día */
export function diaLocal(v, zona = 'America/Mexico_City') {
  try {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zona }).format(new Date(v));
  } catch {
    return String(v).slice(0, 10);
  }
}

/** mm:ss o h:mm:ss */
export function duracion(seg) {
  if (seg === null || seg === undefined || seg < 0) return '—';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  const dos = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

export const ROLES_TEXTO = { admin: 'Administrador', operador: 'Operador', observador: 'Observador' };
