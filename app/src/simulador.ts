// Simulación local: el celular genera sus propios números aleatorios (sin servidor ni red).
// Recorre la malla en serpentina, en el mismo orden que la Pico W y el simulador del servidor.
import type { Medicion } from './store';
import { indicesDeSerpentina } from './util';

export const CONFIG_LOCAL = {
  modo_operacion: 'simulacion',
  barrido: { limite_x_mm: 60, limite_y_mm: 60, limite_z_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 },
  simulacion: { ms_por_punto: { DC: 40, AC: 120 }, ruido_sigma_ut: 0.4, radio_bobina_mm: 25, campo_centro_ut: 120, prob_hueco: 0.01, prob_saturacion: 0.005 },
  visualizacion: { ventana_grafica: 80, filas_tabla: 60, decimales: 3, rotacion_auto: true, reducir_animaciones: false },
  datos: { zona_horaria: 'America/Mexico_City' },
};

export const USUARIO_LOCAL = { id: 1, usuario: 'local', nombre: 'Simulación local', rol: 'admin' as const, debe_cambiar_password: false };

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

/** Campo de una bobina circular aproximado + ruido aleatorio. Devuelve µT. */
function campo(x: number, y: number, z: number, zona: { x: number; y: number }, c: any, standoff: number) {
  const R = c.radio_bobina_mm, B0 = c.campo_centro_ut;
  const dx = x - zona.x / 2, dy = y - zona.y / 2, r = Math.hypot(dx, dy), h = z + standoff;
  const d = (R * R + r * r + h * h) ** 1.5, K = (R * R + standoff * standoff) ** 1.5 / (R * R);
  const br = B0 * K * 0.75 * r * h / d, a = Math.atan2(dy, dx), s = c.ruido_sigma_ut;
  return [br * Math.cos(a) + gauss() * s, br * Math.sin(a) + gauss() * s, B0 * K * R * R / d + gauss() * s];
}

export function nuevaSesion(id: number, p: { modo: string; pasoMM: number; medio: string; zona: any; malla: any }, version = 'app local') {
  const ahora = new Date().toISOString();
  return {
    id, modo: p.modo, medio: p.medio, paso_mm: p.pasoMM, zona_mm: p.zona, zona_x_mm: p.zona.x, zona_y_mm: p.zona.y, zona_z_mm: p.zona.z,
    grid_nx: p.malla.gridNx, grid_ny: p.malla.gridNy, z_levels_mm: p.malla.zLevels, puntos_esperados: p.malla.totalPuntos,
    iniciada_en: ahora, terminada_en: null as string | null, iniciada_por: 'Simulación local', usuario_id: 1, origen: 'sim',
    version_software: version, notas: '', eliminada_en: null as string | null,
  };
}

export class Motor {
  private timer: any = null; private n = 0; private seq = 0;
  constructor(private s: any, private cfg: any, private emitir: (m: Medicion) => void, private fin: () => void) {}
  arrancar() {
    const ms = Math.max(15, Number(this.cfg.simulacion.ms_por_punto?.[this.s.modo]) || 60);
    this.timer = setInterval(() => this.paso(), ms);
  }
  detener() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private paso() {
    const s = this.s, total = s.puntos_esperados;
    if (this.n >= total) { this.detener(); this.fin(); return; }
    const k = this.n++;
    const { ix, iy, iz } = indicesDeSerpentina(s.grid_nx, s.grid_ny, k);
    const c = this.cfg.simulacion;
    if (Math.random() < c.prob_hueco) return;                       // hueco: no llega la lectura (como el servidor, sin salto en seq)
    const x = Math.round(ix * s.paso_mm * 10) / 10, y = Math.round(iy * s.paso_mm * 10) / 10, z = s.z_levels_mm[iz];
    const base = { sesionId: s.id, seq: ++this.seq, xMM: x, yMM: y, zMM: z, zIdx: iz, timestamp: new Date().toISOString() };
    if (Math.random() < c.prob_saturacion) { this.emitir({ ...base, bx: null, by: null, bz: null, magnitud: null, saturado: true }); return; }
    const [bx, by, bz] = campo(x, y, z, s.zona_mm, c, this.cfg.barrido.standoff_mm);
    this.emitir({ ...base, bx, by, bz, magnitud: Math.hypot(bx, by, bz), saturado: false });
  }
}
