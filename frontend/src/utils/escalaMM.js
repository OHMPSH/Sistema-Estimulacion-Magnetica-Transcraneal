/**
 * utils/escalaMM.js
 * ─────────────────────────────────────────────────────────────
 * Corrección de escala de los rieles (2026-11-24, pedido del usuario).
 *
 * Medido en la mesa: cuando el sistema (servidor y Pico) dice 400 mm, la
 * mesa avanza 200 mm reales. Los mm del sistema están al DOBLE. El usuario
 * pidió NO tocar la Pico ni la lógica: solo la página.
 *
 *   - Lo que el usuario escribe (mm reales) se multiplica por FACTOR_MM
 *     antes de mandarlo al servidor (aSistema).
 *   - Lo que llega del servidor (mm del sistema) se divide entre FACTOR_MM
 *     antes de mostrarlo (aReal).
 *
 * La conversión se hace solo en la frontera con la API (hooks y páginas que
 * piden o mandan datos); el resto de la página trabaja en mm reales.
 * Para quitar la corrección, FACTOR_MM = 1.
 * El CSV lo genera el servidor: sigue en mm del sistema.
 * ─────────────────────────────────────────────────────────────
 */
export const FACTOR_MM = 2;

const escalar = (v, f) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? v : f(Number(v)));

/** mm del sistema → mm reales (para mostrar) */
export const aReal = v => escalar(v, n => n / FACTOR_MM);
/** mm reales → mm del sistema (para mandar) */
export const aSistema = v => escalar(v, n => n * FACTOR_MM);

/** Aplica la conversión a las claves indicadas de un objeto (las demás quedan igual) */
function convertirClaves(obj, claves, f) {
  if (!obj) return obj;
  const r = { ...obj };
  for (const k of claves) if (k in r) r[k] = f(r[k]);
  return r;
}

const XYZ = ['x', 'y', 'z'];
const XYZ_MM = ['x_mm', 'y_mm', 'z_mm'];
const XYZ_LECTURA = ['xMM', 'yMM', 'zMM'];

export const xyzMMAReal = o => convertirClaves(o, XYZ_MM, aReal);
export const xyzMMASistema = o => convertirClaves(o, XYZ_MM, aSistema);
export const zonaASistema = o => convertirClaves(o, XYZ, aSistema);

/** Lectura (`event: medicion`, /sesiones/activa, huecos) */
export const lecturaAReal = m => convertirClaves(m, XYZ_LECTURA, aReal);

/** Sesión: la del dashboard (zona_mm, z_levels_mm) y la del historial (zona_*_mm) */
export function sesionAReal(s) {
  if (!s) return s;
  const r = convertirClaves(s, ['paso_mm', 'zona_x_mm', 'zona_y_mm', 'zona_z_mm'], aReal);
  if (s.zona_mm) r.zona_mm = convertirClaves(s.zona_mm, XYZ, aReal);
  if (Array.isArray(s.z_levels_mm)) r.z_levels_mm = s.z_levels_mm.map(aReal);
  if (s.huecos?.posiciones) r.huecos = { ...s.huecos, posiciones: s.huecos.posiciones.map(lecturaAReal) };
  return r;
}

/** Claves de configuración con mm de los rieles (el standoff no es de los rieles) */
const BARRIDO_MM = ['limite_x_mm', 'limite_y_mm', 'limite_z_mm', 'paso_predeterminado_mm'];

export function configClaveAReal(clave, valor) {
  if (clave === 'barrido') return convertirClaves(valor, BARRIDO_MM, aReal);
  if (clave === 'general' && valor?.inicio_medicion) return { ...valor, inicio_medicion: xyzMMAReal(valor.inicio_medicion) };
  return valor;
}

export function configClaveASistema(clave, valor) {
  if (clave === 'barrido') return convertirClaves(valor, BARRIDO_MM, aSistema);
  if (clave === 'general' && valor?.inicio_medicion) return { ...valor, inicio_medicion: xyzMMASistema(valor.inicio_medicion) };
  return valor;
}

export const configAReal = data => (data
  ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, configClaveAReal(k, v)]))
  : data);

/** Estado del previsualizador (GET /calibracion, SSE y respuestas) */
export function calibracionAReal(c) {
  if (!c) return c;
  return {
    ...c,
    objetivo: xyzMMAReal(c.objetivo),
    limites_mm: xyzMMAReal(c.limites_mm),
    pico: c.pico ? { ...c.pico, posicion_mm: xyzMMAReal(c.pico.posicion_mm) } : c.pico,
    ultima_lectura: c.ultima_lectura ? { ...c.ultima_lectura, posicion_mm: xyzMMAReal(c.ultima_lectura.posicion_mm) } : c.ultima_lectura,
  };
}
