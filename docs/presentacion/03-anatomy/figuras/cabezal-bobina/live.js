// Parte viva de la figura D1: el cabezal recorre la fila real de la sesión 127 y mide en cada punto.
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".sv-stage");
const svg = stage.querySelector("svg");
const root = svg.querySelector("[data-root]");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const scr = (p) => iso(p, P);
const nf = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−").replace(".", ",");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const node = (g) => svg.querySelector(`[data-g="${g}"]`);

// rampa del firmware (config.py ÷ 2): arranque 3 mm/s, 150 mm/s², crucero 30 mm/s; asentamiento 300 ms
const V0 = 3, AC = 150, VM = 30, SETTLE = 0.3;
function profile(d) {
  const L = Math.abs(d), sg = Math.sign(d);
  if (L < 1e-6) return { T: 0, at: () => 0 };
  const dAcc = (VM * VM - V0 * V0) / (2 * AC);
  let vp, ta, tc;
  if (2 * dAcc >= L) { vp = Math.sqrt(V0 * V0 + AC * L); ta = (vp - V0) / AC; tc = 0; } else { vp = VM; ta = (VM - V0) / AC; tc = (L - 2 * dAcc) / VM; }
  const T = 2 * ta + tc, da = V0 * ta + 0.5 * AC * ta * ta;
  return { T, at: (t) => (t <= 0 ? 0 : t < ta ? sg * (V0 * t + 0.5 * AC * t * t) : t < ta + tc ? sg * (da + vp * (t - ta)) : t < T ? sg * (L - (V0 * (T - t) + 0.5 * AC * (T - t) ** 2)) : sg * L) };
}
const FILA = D.fila.map((f) => ({ ...f, l: f.y / 2, b: f.b }));
const T_DRDY = 0.42, N_DRDY = 10, DWELL = 3.2; // DRDY mostrado 80 veces más lento; pausa alargada para leer
const steps = FILA.map((f, i) => {
  const prev = i ? FILA[i - 1].l : FILA[FILA.length - 1].l;
  const pr = profile(f.l - prev);
  return { f, from: prev, pr, tMove: pr.T, tMeas: pr.T + SETTLE, tEnd: pr.T + SETTLE + N_DRDY * T_DRDY + DWELL };
});

const medida = crearMedida(root, scr, { utMm: 0.5 });
const drdy = svg.querySelector('[data-part="drdy"]');
const state = { i: 0, t: 0, l: 0, paused: false, clock: 0 };
let say = "";
const setReadout = (t) => { if (t !== say) { say = t; readout.textContent = t; } };

function place() {
  const head = node("cabezal");
  head.setAttribute("transform", state.l ? translateAlong(P, [state.l, 0, 0]) : "");
}
function step(dt) {
  const s = steps[state.i];
  if (!state.paused) state.t += dt;
  if (state.t > s.tEnd) { state.t = 0; state.i = (state.i + 1) % steps.length; return step(0); }
  const t = state.t, f = s.f;
  state.l = s.from + s.pr.at(Math.min(t, s.tMove));
  const S0 = [D.sensor0[0] + state.l, D.sensor0[1], D.sensor0[2]];
  const u = t - s.tMeas, n = Math.floor(u / T_DRDY);
  const reading = u >= 0 && n < N_DRDY, done = u >= N_DRDY * T_DRDY;
  drdy.setAttribute("opacity", reading && u % T_DRDY < 0.16 ? "1" : "0");
  medida.draw(S0, done ? f.b : null, done ? (u - N_DRDY * T_DRDY) / 0.6 : 0, state.clock);
  medida.node.setAttribute("opacity", t < s.tMove ? "0.25" : "1");
  const pos = `seq ${f.seq} · largo ${nf(state.l)} mm · corto 60,0 mm · Z 0 mm`;
  if (t < s.tMove) setReadout(`${pos} · moviéndose (rampa del firmware)`);
  else if (u < 0) setReadout(`${pos} · asentando 300 ms`);
  else if (reading) setReadout(`${pos} · DRDY ${n + 1}/10 (200 Hz, aquí ×1/80) · I2C 0x2C`);
  else setReadout(`${pos} · cuentas ${f.raw.join(" · ").replace(/-/g, "−")} → Bx ${nf(f.b[0])} · By ${nf(f.b[1])} · Bz ${nf(f.b[2])} µT · |B| ${nf(Math.hypot(...f.b))} µT · OVFL ${f.sat}`);
}
const btnP = document.querySelector("[data-pausa]");
function setPause(p) { state.paused = p; btnP.setAttribute("aria-pressed", String(p)); status.textContent = p ? "en pausa" : "en marcha"; run(); }
btnP.addEventListener("click", () => setPause(!state.paused));
document.addEventListener("keydown", (e) => {
  if (e.key === " " && (e.target === document.body || e.target === stage)) { setPause(!state.paused); e.preventDefault(); }
});
let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  state.clock += dt;
  step(still.matches ? 0 : dt);
  place();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
place();
