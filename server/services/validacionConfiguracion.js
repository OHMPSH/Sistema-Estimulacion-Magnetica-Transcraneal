/**
 * services/validacionConfiguracion.js
 * ─────────────────────────────────────────────────────────────
 * Reglas de cada clave de la tabla `configuracion` (funciones puras).
 *
 * validarClave(clave, valor) → { valor, errores }
 *   - `valor` es la versión limpia que se guarda (por ejemplo, en
 *     `sensor` el lsb_por_ga se fija según el rango elegido).
 *   - `errores` es una lista de mensajes; si no está vacía, el
 *     controlador responde 422.
 *
 * Los objetos no aceptan claves desconocidas: un error de tipeo en
 * el nombre de un campo se rechaza en lugar de guardarse en silencio.
 * ─────────────────────────────────────────────────────────────
 */

import { PASOS_MM, MULTIPLO_GEOMETRIA } from './geometria.js';

/** Ganancias válidas del HMC5883L: rango en gauss → LSB por gauss */
export const GANANCIAS_HMC5883L = {
  0.88: 1370,
  1.3:  1090,
  1.9:  820,
  2.5:  660,
  4.0:  440,
  4.7:  390,
  5.6:  330,
  8.1:  230,
};
export const RANGOS_GA = Object.keys(GANANCIAS_HMC5883L).map(Number);

/** Máximo valor de un eje del ADC del HMC5883L (−2048..2047; −4096 = desborde) */
export const CUENTAS_MAXIMAS = 2047;

/**
 * Campo máximo que el sensor puede reportar por eje, en µT, con su
 * ganancia: 2047 cuentas / LSB por gauss × 100 µT por gauss.
 * Con 1,9 Ga (820 LSB/Ga, el valor por defecto) son 249,6 µT; con 1,3 Ga, 187,8 µT. Es algo más que el rango
 * nominal porque el ADC tiene margen; por encima, el registro desborda.
 */
export const limiteSensorUT = sensor => (CUENTAS_MAXIMAS / sensor.lsb_por_ga) * 100;

export const MODOS_OPERACION = ['simulacion', 'real'];
export const ESCALAS_SUPERFICIE = ['Jet', 'Viridis'];

export const CLAVES = [
  'modo_operacion', 'barrido', 'sensor', 'simulacion',
  'dispositivo', 'visualizacion', 'datos',
];

const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const esNumero = v => typeof v === 'number' && Number.isFinite(v);
const esEntero = v => Number.isSafeInteger(v);

/** Revisa que un objeto solo tenga las claves permitidas */
function clavesDesconocidas(obj, permitidas, prefijo = '') {
  return Object.keys(obj)
    .filter(k => !permitidas.includes(k))
    .map(k => `Campo desconocido: ${prefijo}${k}`);
}

/** Entero en [min, max] */
function entero(errores, nombre, v, min, max) {
  if (!esEntero(v) || v < min || v > max) errores.push(`${nombre} debe ser un entero entre ${min} y ${max}`);
}

/** Número en [min, max] */
function numero(errores, nombre, v, min, max) {
  if (!esNumero(v) || v < min || v > max) errores.push(`${nombre} debe ser un número entre ${min} y ${max}`);
}

function booleano(errores, nombre, v) {
  if (typeof v !== 'boolean') errores.push(`${nombre} debe ser true o false`);
}

const VALIDADORES = {
  modo_operacion(valor) {
    if (!MODOS_OPERACION.includes(valor)) {
      return { valor, errores: [`modo_operacion debe ser ${MODOS_OPERACION.join(' o ')}`] };
    }
    return { valor, errores: [] };
  },

  barrido(v) {
    const campos = ['grid_size_mm', 'z_max_mm', 'standoff_mm', 'paso_predeterminado_mm'];
    const errores = clavesDesconocidas(v, campos);
    const m = MULTIPLO_GEOMETRIA;
    if (!esEntero(v.grid_size_mm) || v.grid_size_mm < m || v.grid_size_mm > 300 || v.grid_size_mm % m !== 0) {
      errores.push(`grid_size_mm debe ser un múltiplo de ${m} entre ${m} y 300 (para que los pasos de ${PASOS_MM.join(', ')} mm caigan en el borde)`);
    }
    if (!esEntero(v.z_max_mm) || v.z_max_mm < 0 || v.z_max_mm > 200 || v.z_max_mm % m !== 0) {
      errores.push(`z_max_mm debe ser un múltiplo de ${m} entre 0 y 200`);
    }
    numero(errores, 'standoff_mm', v.standoff_mm, 0.1, 100);
    if (!PASOS_MM.includes(v.paso_predeterminado_mm)) {
      errores.push(`paso_predeterminado_mm debe ser ${PASOS_MM.join(', ')}`);
    }
    return { valor: v, errores };
  },

  sensor(v) {
    const campos = ['modelo', 'rango_ga', 'lsb_por_ga', 'lecturas_por_punto', 'offset_ut'];
    const errores = clavesDesconocidas(v, campos);
    if (v.modelo !== 'HMC5883L') errores.push('modelo debe ser HMC5883L');
    if (!RANGOS_GA.includes(v.rango_ga)) {
      errores.push(`rango_ga debe ser una de las ganancias del HMC5883L: ${RANGOS_GA.join(', ')}`);
    }
    entero(errores, 'lecturas_por_punto', v.lecturas_por_punto, 1, 100);
    if (!esObjeto(v.offset_ut)) {
      errores.push('offset_ut debe ser un objeto {x, y, z}');
    } else {
      errores.push(...clavesDesconocidas(v.offset_ut, ['x', 'y', 'z'], 'offset_ut.'));
      for (const eje of ['x', 'y', 'z']) numero(errores, `offset_ut.${eje}`, v.offset_ut[eje], -1000, 1000);
    }
    // lsb_por_ga no se elige: sale de la tabla de ganancias
    const lsb = GANANCIAS_HMC5883L[v.rango_ga];
    if (v.lsb_por_ga !== undefined && lsb !== undefined && v.lsb_por_ga !== lsb) {
      errores.push(`lsb_por_ga se calcula del rango: con ${v.rango_ga} Ga es ${lsb}`);
    }
    return { valor: { ...v, lsb_por_ga: lsb }, errores };
  },

  simulacion(v) {
    const campos = ['ms_por_punto', 'semilla', 'ruido_sigma_ut', 'radio_bobina_mm', 'campo_centro_ut', 'prob_hueco', 'prob_saturacion'];
    const errores = clavesDesconocidas(v, campos);
    if (!esObjeto(v.ms_por_punto)) {
      errores.push('ms_por_punto debe ser un objeto {DC, AC}');
    } else {
      errores.push(...clavesDesconocidas(v.ms_por_punto, ['DC', 'AC'], 'ms_por_punto.'));
      entero(errores, 'ms_por_punto.DC', v.ms_por_punto.DC, 20, 10000);
      entero(errores, 'ms_por_punto.AC', v.ms_por_punto.AC, 20, 10000);
    }
    entero(errores, 'semilla', v.semilla, 0, 4294967295);
    numero(errores, 'ruido_sigma_ut', v.ruido_sigma_ut, 0, 100);
    numero(errores, 'radio_bobina_mm', v.radio_bobina_mm, 1, 500);
    numero(errores, 'campo_centro_ut', v.campo_centro_ut, 0.001, 10000);
    numero(errores, 'prob_hueco', v.prob_hueco, 0, 1);
    numero(errores, 'prob_saturacion', v.prob_saturacion, 0, 1);
    return { valor: v, errores };
  },

  dispositivo(v) {
    const errores = clavesDesconocidas(v, ['intervalo_latido_s', 'umbral_desconexion_s']);
    entero(errores, 'intervalo_latido_s', v.intervalo_latido_s, 1, 300);
    entero(errores, 'umbral_desconexion_s', v.umbral_desconexion_s, 2, 3600);
    if (esEntero(v.intervalo_latido_s) && esEntero(v.umbral_desconexion_s) && v.umbral_desconexion_s <= v.intervalo_latido_s) {
      errores.push('umbral_desconexion_s debe ser mayor que intervalo_latido_s');
    }
    return { valor: v, errores };
  },

  visualizacion(v) {
    const campos = ['ventana_grafica', 'filas_tabla', 'decimales', 'escala_superficie', 'rotacion_auto', 'reducir_animaciones'];
    const errores = clavesDesconocidas(v, campos);
    entero(errores, 'ventana_grafica', v.ventana_grafica, 10, 2000);
    entero(errores, 'filas_tabla', v.filas_tabla, 10, 2000);
    entero(errores, 'decimales', v.decimales, 0, 6);
    if (!ESCALAS_SUPERFICIE.includes(v.escala_superficie)) {
      errores.push(`escala_superficie debe ser ${ESCALAS_SUPERFICIE.join(' o ')}`);
    }
    booleano(errores, 'rotacion_auto', v.rotacion_auto);
    booleano(errores, 'reducir_animaciones', v.reducir_animaciones);
    return { valor: v, errores };
  },

  datos(v) {
    const errores = clavesDesconocidas(v, ['zona_horaria']);
    let valida = typeof v.zona_horaria === 'string' && v.zona_horaria.length <= 64;
    if (valida) {
      try { new Intl.DateTimeFormat('es-MX', { timeZone: v.zona_horaria }); } catch { valida = false; }
    }
    if (!valida) errores.push('zona_horaria debe ser una zona IANA válida, por ejemplo America/Mexico_City');
    return { valor: v, errores };
  },
};

/**
 * Valida el valor completo de una clave.
 * Para las claves que son objetos, `valor` ya debe venir mezclado con
 * el valor actual (el servicio lo hace), así que se exigen todos los campos.
 */
export function validarClave(clave, valor) {
  const validador = VALIDADORES[clave];
  if (!validador) return { valor, errores: [`Clave de configuración desconocida: ${clave}`] };
  if (clave !== 'modo_operacion' && !esObjeto(valor)) {
    return { valor, errores: [`${clave} debe ser un objeto`] };
  }
  return validador(valor);
}

/**
 * Mezcla un cambio parcial con el valor actual (un nivel de
 * profundidad más para los subobjetos, como ms_por_punto u offset_ut).
 */
export function mezclar(actual, cambio) {
  if (!esObjeto(actual) || !esObjeto(cambio)) return cambio;
  const resultado = { ...actual };
  for (const [k, v] of Object.entries(cambio)) {
    resultado[k] = esObjeto(actual[k]) && esObjeto(v) ? { ...actual[k], ...v } : v;
  }
  return resultado;
}
