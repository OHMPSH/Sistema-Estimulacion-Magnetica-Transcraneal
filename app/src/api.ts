import { Platform } from 'react-native';

/**
 * Cliente de la API del servidor TMS.
 * En Android la cookie de sesión (tms_sesion, HttpOnly) se lee del Set-Cookie y se manda a mano en cada petición.
 * En el navegador (vista previa con `expo start --web` detrás de un proxy del mismo origen) la maneja el propio
 * navegador: se usa credentials: 'include' y la cookie queda como una marca.
 */
export const EN_NAVEGADOR = Platform.OS === 'web';
const MARCA_NAVEGADOR = 'navegador';

export interface Resp { status: number; ok: boolean; json: any }
const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisa la dirección y que el celular esté en la misma red.';

export class Api {
  private _c: string | null;
  private gen = 0;   // cambia con cada login/logout: las respuestas de una sesión anterior se ignoran
  constructor(
    public base: string,
    cookie: string | null,
    private alPerderSesion: () => void,
    private alCookie: (c: string | null) => void,
  ) { this._c = cookie; }

  get cookie() { return this._c; }
  set cookie(v: string | null) { if (v !== this._c) { this._c = v; this.gen++; } }

  private cabeceras(json: boolean): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (this.cookie && !EN_NAVEGADOR) h.Cookie = `tms_sesion=${this.cookie}`;
    return h;
  }

  async req(ruta: string, metodo = 'GET', cuerpo?: unknown, timeoutMs = 10000): Promise<Resp> {
    const teniaCookie = !!this.cookie;   // el 401 llega junto con un Set-Cookie que la borra
    const gen = this.gen;
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.base}/api${ruta}`, {
        method: metodo, headers: this.cabeceras(cuerpo !== undefined), credentials: EN_NAVEGADOR ? 'include' : 'omit',
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined, signal: ctl.signal,
      });
      const vigente = gen === this.gen;   // false = esta respuesta es de una sesión que ya se cerró o se reemplazó
      if (EN_NAVEGADOR) {
        if (vigente && ruta === '/auth/login' && res.ok) { this.cookie = MARCA_NAVEGADOR; this.alCookie(this.cookie); }
      } else {
        const set = res.headers.get('set-cookie');
        const todas = set ? [...set.matchAll(/tms_sesion=([^;,\s]*)/g)].map(x => x[1]) : [];
        const valor = todas.filter(Boolean).pop();                       // la última cookie no vacía
        if (vigente && (valor || todas.length)) { this.cookie = valor || null; this.alCookie(this.cookie); }
      }
      let json: any;
      try { json = await res.json(); } catch { json = { ok: false, error: `El servidor respondió ${res.status} sin un cuerpo válido` }; }
      if (res.status === 401 && ruta !== '/auth/login' && teniaCookie && vigente) this.alPerderSesion();
      return { status: res.status, ok: res.ok && json?.ok !== false, json };
    } catch {
      return { status: 0, ok: false, json: { ok: false, error: SIN_CONEXION } };
    } finally { clearTimeout(reloj); }
  }

  /** Texto plano (CSV) */
  async texto(ruta: string): Promise<{ ok: boolean; texto: string }> {
    try {
      const res = await fetch(`${this.base}/api${ruta}`, { headers: this.cabeceras(false), credentials: EN_NAVEGADOR ? 'include' : 'omit' });
      const texto = await res.text();
      if (!res.ok) { try { return { ok: false, texto: JSON.parse(texto).error ?? `El servidor respondió ${res.status}.` }; } catch { return { ok: false, texto: `El servidor respondió ${res.status}.` }; } }
      return { ok: true, texto };
    } catch { return { ok: false, texto: SIN_CONEXION }; }
  }

  /** Cabeceras para el SSE (en el navegador la cookie va sola) */
  cabecerasStream(): Record<string, string> { return this.cookie && !EN_NAVEGADOR ? { Cookie: `tms_sesion=${this.cookie}` } : {}; }

  get = (r: string) => this.req(r);
  post = (r: string, b?: unknown) => this.req(r, 'POST', b ?? {});
  put = (r: string, b?: unknown) => this.req(r, 'PUT', b ?? {});
  patch = (r: string, b: unknown) => this.req(r, 'PATCH', b);
  del = (r: string) => this.req(r, 'DELETE');
}

/** Prueba de conexión sin sesión: GET /api/status (ruta pública) */
export async function probarServidor(base: string) {
  const r = await new Api(base, null, () => {}, () => {}).req('/status', 'GET', undefined, 6000);
  return r.status === 0 ? { ok: false, error: SIN_CONEXION } : r.ok ? { ok: true, datos: r.json } : { ok: false, error: `El servidor respondió ${r.status}.` };
}
