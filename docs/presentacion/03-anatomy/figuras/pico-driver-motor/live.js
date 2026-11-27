// Parte viva de la figura D2: pulsos por el cable PUL, el motor gira y la tuerca avanza (20 veces más lento).
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".sv-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const scr = (p) => iso(p, P);
const nf = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−").replace(".", ",");
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v); parent.appendChild(n); return n; };

// cifras (firmware/config.py y CLAUDE.md): 50 pulsos/mm del sistema = 100 por mm real; 400 pulsos/vuelta → 4 mm reales por vuelta (deducido)
const PULSOS_MM = 100, PULSOS_VUELTA = 400, MM_VUELTA = PULSOS_VUELTA / PULSOS_MM, V_REAL = 30, LENTO = 20, POR_PUNTO = 25;
const V = V_REAL / LENTO; // mm/s en pantalla
const CARRERA = 22, PAUSA = 1.6;
const vivo = svg.querySelector('[data-part="vivo"]');
const tuerca = svg.querySelector('[data-g="tuerca"]');
const ledDrv = svg.querySelector(".led-pul"), ledPico = svg.querySelector(".led-pico");
const marca = el("path", { class: "sv-marca" }, vivo);
const pulsos = [];
function along(route) {
  const L = [0];
  for (let i = 1; i < route.length; i++) L.push(L[i - 1] + Math.hypot(...[0, 1, 2].map((a) => route[i][a] - route[i - 1][a])));
  return { total: L[L.length - 1], at(s) { let i = 1; while (i < L.length - 1 && L[i] < s) i++; const t = Math.min(1, Math.max(0, (s - L[i - 1]) / (L[i] - L[i - 1] || 1))); return [0, 1, 2].map((a) => route[i - 1][a] + (route[i][a] - route[i - 1][a]) * t); } };
}
const PUL = along(D.pul), DIR = along(D.dir);
const state = { t: 0, s: 0, dir: 1, phase: "mueve", paused: false, spawn: 0, clock: 0, theta: 0 };
let say = "";
const setReadout = (t) => { if (t !== say) { say = t; readout.textContent = t; } };
const setOn = (n, on) => n && (on ? n.setAttribute("data-on", "") : n.removeAttribute("data-on"));

function step(dt) {
  if (state.paused) dt = 0;
  state.clock += dt;
  state.t += dt;
  if (state.phase === "mueve") {
    state.s += state.dir * V * dt;
    state.theta += (state.dir * V * dt / MM_VUELTA) * 2 * Math.PI;
    state.spawn += dt * (V_REAL * PULSOS_MM) / LENTO / POR_PUNTO;
    while (state.spawn >= 1) { state.spawn -= 1; pulsos.push({ s: 0, node: el("circle", { class: "sv-pulso", r: "1.3" }, vivo), ruta: PUL }); }
    if ((state.dir > 0 && state.s >= CARRERA) || (state.dir < 0 && state.s <= 0)) { state.s = Math.min(CARRERA, Math.max(0, state.s)); state.phase = "pausa"; state.t = 0; }
  } else if (state.t > PAUSA) {
    state.dir = -state.dir; state.phase = "mueve"; state.t = 0;
    pulsos.push({ s: 0, node: el("circle", { class: "sv-pulso", r: "1.6", style: "fill:#45a866;stroke:#1d6a39" }, vivo), ruta: DIR });
  }
  let llega = false;
  for (let i = pulsos.length - 1; i >= 0; i--) {
    const q = pulsos[i];
    q.s += dt * 90;
    if (q.s >= q.ruta.total) { q.node.remove(); pulsos.splice(i, 1); llega = true; continue; }
    const p = scr(q.ruta.at(q.s));
    q.node.setAttribute("cx", p[0].toFixed(2)); q.node.setAttribute("cy", p[1].toFixed(2));
  }
  setOn(ledDrv, state.phase === "mueve" && Math.floor(state.clock * 10) % 2 === 0);
  setOn(ledPico, true);
  tuerca.setAttribute("transform", state.s ? translateAlong(P, [state.s, 0, 0]) : "");
  // marca blanca sobre el acople: gira con el eje (solo se dibuja en la cara que se ve)
  const c = Math.cos(state.theta), sn = Math.sin(state.theta);
  if (c * 0.87 + sn * 0.5 > 0.15) {
    const a = scr([256, D.axy + 9.1 * c, D.axz + 9.1 * sn]), b = scr([279, D.axy + 9.1 * c, D.axz + 9.1 * sn]);
    marca.setAttribute("d", `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`);
  } else marca.setAttribute("d", "");
  const sentido = state.dir > 0 ? "sentido +" : "sentido −";
  if (state.phase === "pausa") setReadout(`tuerca en ${nf(state.s)} mm · sin pulsos · DIR (GP13) cambia: el motor girará al revés`);
  else setReadout(`PUL (GP12) → TB6600: ${V_REAL} mm/s reales = ${V_REAL * PULSOS_MM} pulsos/s · ${PULSOS_MM} pulsos/mm real (50 del sistema) · ${PULSOS_VUELTA} por vuelta → ${nf((V_REAL * PULSOS_MM) / PULSOS_VUELTA)} vueltas/s · ${sentido} · tuerca ${nf(state.s)} mm · ×1/${LENTO}`);
}
const btnP = document.querySelector("[data-pausa]");
function setPause(p) { state.paused = p; btnP.setAttribute("aria-pressed", String(p)); status.textContent = p ? "en pausa" : "en marcha"; run(); }
btnP.addEventListener("click", () => setPause(!state.paused));
document.addEventListener("keydown", (e) => { if (e.key === " " && (e.target === document.body || e.target === stage)) { setPause(!state.paused); e.preventDefault(); } });
let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  step(still.matches ? 0 : dt);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
step(0);
