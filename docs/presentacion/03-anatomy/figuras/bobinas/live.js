// Parte viva de la figura D3: las sábanas del campo sobre cada bobina.
const D = __DATA__;
const P = D.P;
const diapo = new URLSearchParams(location.search).get("diapo") === "1";
if (diapo) document.body.classList.add("diapo");
// ?diapo=1&solo=1: solo el dibujo 3D (sin botones ni lectura); las teclas siguen funcionando
if (diapo && new URLSearchParams(location.search).get("solo") === "1") document.body.classList.add("solo");
const stage = document.querySelector(".sv-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v); if (parent) parent.appendChild(n); return n; };
const scr = (p) => iso(p, P);
const nf = (v, d = 0) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−").replace(".", ",");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const depth = (p) => depthOf(p, P);

// mapa de color «jet» (azul → cian → verde → amarillo → rojo)
const jet = (t) => { const c = (x) => Math.round(255 * clamp(1.5 - Math.abs(4 * t - x), 0, 1)); return `rgb(${c(3)},${c(2)},${c(1)})`; };
function upsample(g, f) {
  const nc = g.length, nl = g[0].length, NC = (nc - 1) * f + 1, NL = (nl - 1) * f + 1, out = [];
  for (let I = 0; I < NC; I++) { const row = []; for (let J = 0; J < NL; J++) { const i = Math.min(nc - 2, Math.floor(I / f)), j = Math.min(nl - 2, Math.floor(J / f)), ti = I / f - i, tj = J / f - j; row.push((1 - ti) * ((1 - tj) * g[i][j] + tj * g[i][j + 1]) + ti * ((1 - tj) * g[i + 1][j] + tj * g[i + 1][j + 1])); } out.push(row); }
  return out;
}
const lin = (a, f) => { const out = []; for (let i = 0; i < a.length - 1; i++) for (let s = 0; s < f; s++) out.push(a[i] + ((a[i + 1] - a[i]) * s) / f); out.push(a.at(-1)); return out; };
const NOMBRE = { m: "|B|", x: "Bx", y: "By", z: "Bz" };
const SHEETS = D.sheets.map((s) => {
  const f = s.tipo === "med" ? 3 : 1; // entre lecturas medidas solo se interpola para suavizar el dibujo
  const comps = {};
  for (const c of ["m", "x", "y", "z"]) {
    const raw = s.comps[c].flat();
    comps[c] = { g: f > 1 ? upsample(s.comps[c], f) : s.comps[c], max: Math.max(1, ...raw.map(Math.abs)), lo: Math.min(...raw), hi: Math.max(...raw) };
  }
  const short = f > 1 ? lin(s.short, f) : s.short, long = f > 1 ? lin(s.long, f) : s.long;
  return { ...s, comps, shortI: short.map((v) => v - s.short[0]), longI: long.map((v) => v - s.long[0]) };
});

const layer = svg.querySelector('[data-part="sabanas"]');
const unitG = D.units.map((u) => svg.querySelector(`[data-g="${u}"]`));
const sheetG = SHEETS.map(() => el("g", { class: "d3-sab" }, layer));
const state = { foco: 0, comp: "m", show: true, low: { x: 0, v: 0, target: 0 } };

function planeZ(signed) {
  const hi = D.PLANE_HI, lo = D.TOP + 4 + (signed ? D.HS / 2 : 0);
  return hi + (lo - hi) * state.low.x;
}
function draw() {
  const signed = state.comp !== "m";
  const pz = planeZ(signed);
  SHEETS.forEach((s, n) => {
    const g = sheetG[n];
    g.innerHTML = "";
    const on = state.show;
    const [ox, oy] = s.origin, L = s.longI.at(-1), Sw = s.shortI.at(-1);
    const cor = [[0, 0], [L, 0], [L, Sw], [0, Sw]].map(([a, b]) => [ox + a, oy + b]);
    // guías: de las esquinas de la zona en la placa a las esquinas del plano de la sábana
    const guide = el("g", { class: "d3-guia" }, g);
    cor.forEach(([x, y]) => { const a = scr([x, y, D.TOP]), b = scr([x, y, pz]); el("path", { d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}` }, guide); });
    el("path", { class: "d3-zona", d: "M" + cor.map(([x, y]) => scr([x, y, D.TOP]).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z" }, guide);
    el("path", { class: "d3-plano", d: "M" + cor.map(([x, y]) => scr([x, y, pz]).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z" }, guide);
    if (!on) return;
    const C = s.comps[state.comp], G = C.g, NI = G.length, NJ = G[0].length;
    const h = (v) => (signed ? (v / C.max) * (D.HS / 2) : (v / C.max) * D.HS);
    const P3 = (i, j) => [ox + s.longI[j], oy + s.shortI[i], pz + h(G[i][j])];
    const quads = [];
    for (let i = 0; i < NI - 1; i++) for (let j = 0; j < NJ - 1; j++) {
      const v = (G[i][j] + G[i + 1][j] + G[i][j + 1] + G[i + 1][j + 1]) / 4;
      const t = signed ? (v / C.max + 1) / 2 : v / C.max;
      const q = [P3(i, j), P3(i, j + 1), P3(i + 1, j + 1), P3(i + 1, j)];
      quads.push({ q, col: jet(clamp(t, 0, 1)), d: depth([(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2]) });
    }
    quads.sort((a, b) => a.d - b.d);
    const surf = el("g", { class: "d3-sup" }, g);
    for (const Q of quads) el("path", { d: "M" + Q.q.map((p) => scr(p).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z", fill: Q.col, stroke: Q.col }, surf);
    // barra de color a la derecha de la sábana
    const xs = cor.map(([x, y]) => scr([x, y, pz])[0]), right = Math.max(...xs);
    const top = scr([ox + L, oy, pz + D.HS])[1], bh = 92;
    const bx = right + 10, by = top + 4;
    for (let i = 0; i < 16; i++) el("rect", { x: bx.toFixed(1), y: (by + (bh * i) / 16).toFixed(1), width: 7, height: (bh / 16 + 0.3).toFixed(1), fill: jet(1 - i / 15) }, g);
    el("rect", { class: "d3-barra", x: bx.toFixed(1), y: by.toFixed(1), width: 7, height: bh }, g);
    el("text", { class: "d3-t", x: (bx - 2).toFixed(1), y: (by - 6).toFixed(1) }, g).textContent = `${NOMBRE[state.comp]} (µT)`;
    el("text", { class: "d3-s", x: (bx + 11).toFixed(1), y: (by + 9).toFixed(1) }, g).textContent = signed ? `+${nf(C.max)}` : nf(C.max);
    el("text", { class: "d3-s", x: (bx + 11).toFixed(1), y: (by + bh).toFixed(1) }, g).textContent = signed ? `−${nf(C.max)}` : "0";
  });
  // nombres debajo de cada bobina
  D.orig.forEach(([x0, y0], n) => {
    const g = sheetG[n];
    const p = scr([x0 + D.placa.w / 2 - 20, y0 + D.placa.d + 60, 0]);
    el("text", { class: "d3-nombre", x: p[0].toFixed(1), y: (p[1] + 8).toFixed(1), "text-anchor": "middle" }, g).textContent = SHEETS[n].nombre;
    el("text", { class: "d3-s", x: p[0].toFixed(1), y: (p[1] + 24).toFixed(1), "text-anchor": "middle" }, g).textContent = SHEETS[n].fuente;
  });
  // foco
  const f = state.foco;
  unitG.forEach((g, n) => g.setAttribute("opacity", !f || f === n + 1 ? "1" : "0.25"));
  sheetG.forEach((g, n) => g.setAttribute("opacity", !f || f === n + 1 ? "1" : "0.2"));
  readText();
}
function readText() {
  const f = state.foco, comp = NOMBRE[state.comp];
  const plano = state.low.target ? "sábana bajada hasta la bobina" : "plano dibujado más alto que la medición para verlo";
  if (!f) { readout.textContent = `distribución del campo magnético ${comp} de tres topologías · ${plano}`; return; }
  const s = SHEETS[f - 1], C = s.comps[state.comp];
  const fuente = s.tipo === "sim" ? `forma según la teoría (Biot–Savart), escala de la Fig. ${s.fig} (45 G = 4500 µT)` : `medición real, sesión ${s.sesion}, plano Z = 0, fondo restado (promedio del borde)`;
  readout.textContent = `${s.nombre.slice(3)} · ${comp} de ${nf(C.lo)} a ${nf(C.hi)} µT · ${fuente}`;
}
function stepLow(dt) {
  const s = state.low;
  if (still.matches) { s.x = s.target; s.v = 0; return false; }
  const n = 4, hh = dt / n;
  for (let i = 0; i < n; i++) { s.v += (40 * (s.target - s.x) - 12.6 * s.v) * hh; s.x += s.v * hh; }
  if (Math.abs(s.target - s.x) < 5e-4 && Math.abs(s.v) < 5e-4) { s.x = s.target; s.v = 0; return false; }
  return true;
}
let frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const moving = stepLow(dt);
  draw();
  frame = moving ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } }

// ---------------------------------------------------------------- controles (sin las teclas de la presentación)
const press = (sel, val) => document.querySelectorAll(`[${sel}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(sel) === String(val))));
function setFoco(n) { state.foco = n; press("data-foco", n); status.textContent = n ? SHEETS[n - 1].nombre : "las tres bobinas"; draw(); }
function setComp(c) { state.comp = c; press("data-comp", c); status.textContent = `componente ${NOMBRE[c]}`; draw(); }
function setShow(v) { state.show = v; document.querySelector("[data-sabana]").setAttribute("aria-pressed", String(v)); status.textContent = v ? "sábana visible" : "sábana oculta"; draw(); }
function setLow(v) { state.low.target = v ? 1 : 0; const b = document.querySelector("[data-bajar]"); b.setAttribute("aria-pressed", String(v)); b.innerHTML = `<b>G</b> ${v ? "Subir el plano" : "Bajar al plano"}`; status.textContent = v ? "sábana sobre la bobina" : "sábana arriba"; run(); }
document.querySelectorAll("[data-foco]").forEach((b) => b.addEventListener("click", () => setFoco(+b.dataset.foco)));
document.querySelectorAll("[data-comp]").forEach((b) => b.addEventListener("click", () => setComp(b.dataset.comp)));
document.querySelector("[data-sabana]").addEventListener("click", () => setShow(!state.show));
document.querySelector("[data-bajar]").addEventListener("click", () => setLow(!state.low.target));
const RESERVADAS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar", "Enter", "PageUp", "PageDown", "Home", "End", "Backspace", "f", "F", "n", "N", "b", "B", "h", "H", ".", "?"]);
document.addEventListener("keydown", (e) => {
  if (RESERVADAS.has(e.key)) { if (window.parent !== window) window.parent.postMessage({ tipo: "tecla", key: e.key }, "*"); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const kk = e.key.toLowerCase();
  if (/^[0-3]$/.test(kk)) setFoco(+kk);
  else if ("mxyz".includes(kk) && kk.length === 1) setComp(kk);
  else if (kk === "s") setShow(!state.show);
  else if (kk === "g") setLow(!state.low.target);
  else return;
  e.preventDefault();
});
draw();
