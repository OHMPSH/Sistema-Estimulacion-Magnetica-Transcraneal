// Parte viva de la figura del SAVD: movimiento, adquisición, envío, previsualizador y separación de capas.
// Todo en mm reales (= mm del sistema ÷ 2). Las cifras salen de firmware/config.py, firmware/sensor.py y de tms_db.
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".sv-stage");
const svg = stage.querySelector("svg");
const root = svg.querySelector("[data-root]");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (sel) => svg.querySelector(sel);
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const [k2, v] of Object.entries(attrs)) n.setAttribute(k2, v); if (parent) parent.appendChild(n); return n; };
const nf = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−").replace(".", ",");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const scr = (p) => iso(p, P);
const groups = Object.fromEntries(D.groups.map((g) => [g.g, { ...g, node: svg.querySelector(`[data-g="${g.g}"]`) }]));

// ---------------------------------------------------------------- mecánica real (config.py ÷ 2)
const V0 = 3, AC = 150, VM = 30, SETTLE = 0.3; // mm/s, mm/s², mm/s, s
function profile(d) {
  const L = Math.abs(d), sg = Math.sign(d);
  if (L < 1e-6) return { T: 0, at: () => 0, v: () => 0 };
  const dAcc = (VM * VM - V0 * V0) / (2 * AC);
  let vp, ta, tc;
  if (2 * dAcc >= L) { vp = Math.sqrt(V0 * V0 + AC * L); ta = (vp - V0) / AC; tc = 0; } else { vp = VM; ta = (VM - V0) / AC; tc = (L - 2 * dAcc) / VM; }
  const T = 2 * ta + tc, da = V0 * ta + 0.5 * AC * ta * ta;
  const at = (t) => {
    if (t <= 0) return 0;
    if (t < ta) return sg * (V0 * t + 0.5 * AC * t * t);
    if (t < ta + tc) return sg * (da + vp * (t - ta));
    if (t < T) { const u = T - t; return sg * (L - (V0 * u + 0.5 * AC * u * u)); }
    return sg * L;
  };
  const v = (t) => (t <= 0 || t >= T ? 0 : t < ta ? V0 + AC * t : t < ta + tc ? vp : V0 + AC * (T - t));
  return { T, at, v };
}
// mover_a: si Z baja, primero los ejes del plano y luego Z; si sube, primero Z (motores.py)
function plan(from, to) {
  const xy = { c: profile(to.c - from.c), l: profile(to.l - from.l) };
  const pxy = { kind: "xy", T: Math.max(xy.c.T, xy.l.T), prof: xy };
  const pz = { kind: "z", T: profile(to.z - from.z).T, prof: { z: profile(to.z - from.z) } };
  const phases = to.z < from.z ? [pxy, pz] : [pz, pxy];
  return { from: { ...from }, to: { ...to }, phases, T: phases[0].T + phases[1].T };
}
function planAt(pl, t) {
  const p = { ...pl.from };
  let rest = t, moving = "", speed = 0;
  for (const ph of pl.phases) {
    const u = clamp(rest, 0, ph.T);
    for (const [ax, pr] of Object.entries(ph.prof)) { p[ax] = pl.from[ax] + pr.at(u); if (rest > 0 && rest < ph.T && pr.T > 0 && u < pr.T) { moving += ax; speed = Math.max(speed, pr.v(u)); } }
    if (rest < ph.T) { for (const later of pl.phases.slice(pl.phases.indexOf(ph) + 1)) for (const ax of Object.keys(later.prof)) p[ax] = pl.from[ax]; break; }
    rest -= ph.T;
  }
  return { p, moving, speed };
}

// ---------------------------------------------------------------- sesión 126 (sistema ÷ 2)
const S93 = D.s126; // recorrido real que cubre toda la bobina
const PTS = S93.puntos.map(([seq, x, y, z, rx, ry, rz, sat, t]) => ({ seq, c: x / 2, l: y / 2, z: z / 2, sys: [x, y, z], raw: [rx, ry, rz], sat, t: t / 1000 }));
const STEP = S93.paso_mm / 2;
const GY = Math.round(S93.zona_mm[0] / 2 / STEP) + 1;
const SPEED1 = 8;
const SCHED = [];
for (let i = 0; i < PTS.length; i++) {
  const a = PTS[i], b = PTS[i + 1] || { c: 0, l: 0, z: 0, t: a.t + 0 };
  const pl = plan(a, b);
  SCHED.push({ i, t0: a.t, pl, home: !PTS[i + 1] });
}
const T_END = PTS[PTS.length - 1].t + SCHED[SCHED.length - 1].pl.T + 2.5;
const uT = (raw) => raw / 10; // QMC5883P a 30 G: 1000 cuentas/G → 1 cuenta = 0,1 µT (conversionSensor.js)
const mag = (b) => Math.hypot(b[0], b[1], b[2]);

// ---------------------------------------------------------------- estado
const state = {
  etapa: 1,
  pos: { c: 0, l: 0, z: 0 },
  move: null, moveT: 0,
  clock1: 0, k1: 0, last1: -1,
  clock2: 0, k2: 0,
  clock3: 0,
  clock4: 0, sab: 0, sabT: 0, done2: false,
  apart: false,
  springs: Object.fromEntries(D.STAGGER.map((p) => [p, { x: 0, v: 0, target: 0, at: 0 }])),
  clock: 0,
};

// ---------------------------------------------------------------- dibujo: grupos
const offsetOf = (g) => {
  const G0 = groups[g];
  let o = [0, 0, 0];
  if (G0.mov.includes("c")) o = add(o, [0, state.pos.c, 0]);
  if (G0.mov.includes("l")) o = add(o, [state.pos.l, 0, 0]);
  if (G0.mov.includes("z")) o = add(o, [0, 0, state.pos.z]);
  if (G0.capa) o = add(o, mul(D.EXP[G0.capa], state.springs[G0.capa].x));
  return o;
};
let SHIFT = 0;
function placeGroups() {
  for (const g of Object.keys(groups)) {
    const o = offsetOf(g);
    const node = groups[g].node;
    if (!node) continue;
    if (o[0] === 0 && o[1] === 0 && o[2] === 0) node.removeAttribute("transform");
    else node.setAttribute("transform", translateAlong(P, o));
  }
  const lift = state.springs.electronica.x;
  SHIFT = (iso([0, 0, 0], P)[1] - iso([0, 0, 85], P)[1]) * lift;
  root.setAttribute("transform", SHIFT ? `translate(0 ${SHIFT.toFixed(2)})` : "");
  // las pantallas no bajan con el resto: así no se salen del cuadro al separar capas
  const pan = groups.pantallas.node;
  if (SHIFT) pan.setAttribute("transform", `translate(0 ${(-SHIFT).toFixed(2)})`); else pan.removeAttribute("transform");
}

// ---------------------------------------------------------------- cables flexibles (se recalculan cada cuadro)
const layer = (name) => $(`[data-part="${name}"]`);
function makeCable(parent, color, w) {
  const o = el("path", { class: "sv-cable-o", "stroke-width": (w + 0.9).toFixed(2) }, parent);
  const i = el("path", { class: "sv-cable-i", stroke: color, "stroke-width": w.toFixed(2) }, parent);
  return { set: (d) => { o.setAttribute("d", d); i.setAttribute("d", d); } };
}
const endDot = (parent) => el("circle", { class: "sv-end", r: "1.1" }, parent);
const bez = (p0, p1, p2, p3, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1, 2].map((a) => u * u * u * p0[a] + 3 * u * u * t * p1[a] + 3 * u * t * t * p2[a] + t * t * t * p3[a]); });
const dOf = (pts) => "M" + pts.map((p) => scr(p).map((v) => v.toFixed(1)).join(" ")).join("L");
const CW = 1.15;
const cab = {
  pwr: makeCable(layer("cablesFondo"), "#2a2a2a", CW * 1.2),
  zUp: makeCable(layer("cablesAtras"), "#3a3a3a", CW),
  sUp: makeCable(layer("cablesAtras"), "#2a4a80", CW),
  zArc: makeCable(layer("cablesFrente"), "#3a3a3a", CW),
  sArc: makeCable(layer("cablesFrente"), "#2a4a80", CW),
};
const dots = { pwr0: endDot(layer("cablesFondo")), z1: endDot(layer("cablesFrente")), s1: endDot(layer("cablesFrente")) };
const A0 = D.anchors;
let SENSOR_PATH = [];
function drawCables() {
  const oT = offsetOf("tapa"), oE = offsetOf("electronica"), oC = offsetOf("carro"), oH = offsetOf("cabezal");
  const psu = add(A0.psu, oT), d1 = add(A0.drv1, oE);
  cab.pwr.set(dOf(bez(psu, add(psu, [0, 0, 80]), add(d1, [8, -10, -120]), d1)));
  const pp = scr(psu); dots.pwr0.setAttribute("cx", pp[0].toFixed(1)); dots.pwr0.setAttribute("cy", pp[1].toFixed(1));
  const TOP = 470;
  const d2 = add(A0.drv2, oE), up2 = [d2[0], d2[1] + 3, Math.max(TOP - 8, d2[2] + 40)];
  const zm = add(A0.zmotor, oC);
  cab.zUp.set(dOf([d2, add(d2, [0, 2, 0]), [d2[0], d2[1] + 3, d2[2] + 6], up2]));
  cab.zArc.set(dOf(bez(up2, add(up2, [0, 0, 26]), add(zm, [0, -4, 34]), zm)));
  const zs = scr(zm); dots.z1.setAttribute("cx", zs[0].toFixed(1)); dots.z1.setAttribute("cy", zs[1].toFixed(1));
  const sc = add(A0.sconn, oE), upS = [sc[0], sc[1], Math.max(TOP, sc[2] + 50)];
  const ring = add(A0.ring, oH);
  cab.sUp.set(dOf([sc, upS]));
  const arc = bez(upS, add(upS, [0, 10, 34]), add(ring, [0, -6, 60]), ring);
  cab.sArc.set(dOf(arc));
  SENSOR_PATH = [sc, upS, ...arc];
  const rs = scr(ring); dots.s1.setAttribute("cx", rs[0].toFixed(1)); dots.s1.setAttribute("cy", rs[1].toFixed(1));
}

// ---------------------------------------------------------------- piezas que se encienden
const gotas = [...svg.querySelectorAll(".gota")];
const leds = [...svg.querySelectorAll('[data-g="electronica"] .led-pul')];
const ledPico = svg.querySelector(".led-pico");
const drdy = $('[data-part="drdy"]');
const setOn = (node, on) => node && (on ? node.setAttribute("data-on", "") : node.removeAttribute("data-on"));

// ---------------------------------------------------------------- pantallas (web y app)
const web = $('[data-part="web"]'), app = $('[data-part="app"]'), pk = $('[data-part="paquetes"]');
let webMode = "";
const WEB = {};
function webChart() {
  if (webMode === "chart") return;
  webMode = "chart";
  web.innerHTML = "";
  el("text", { class: "sv-web-t", x: -64, y: 15 }, web).textContent = "SAVD · sesión 126 · |B| (µT)";
  for (let i = 0; i <= 4; i++) el("path", { class: "sv-web-g", d: `M-64 ${30 + i * 14}H64` }, web);
  WEB.line = el("path", { class: "sv-web-l", d: "" }, web);
  WEB.count = el("text", { class: "sv-web-s", x: -64, y: 24 }, web);
  app.innerHTML = "";
  el("text", { class: "sv-web-s", x: 3, y: 8 }, app).textContent = "TMS Monitor";
  for (let i = 0; i <= 3; i++) el("path", { class: "sv-web-g", d: `M3 ${20 + i * 12}H29` }, app);
  WEB.appLine = el("path", { class: "sv-web-l", d: "" }, app);
  WEB.appCount = el("text", { class: "sv-web-s", x: 3, y: 64 }, app);
}
const MAGS = PTS.map((p) => mag(p.raw.map(uT)));
const MAG_MAX = Math.max(...MAGS);
function webShow(n, nApp) {
  webChart();
  const xy = (i, x0, x1, y0, y1) => `${(x0 + ((x1 - x0) * i) / (PTS.length - 1)).toFixed(1)} ${(y1 - ((y1 - y0) * MAGS[i]) / MAG_MAX).toFixed(1)}`;
  WEB.line.setAttribute("d", n > 1 ? "M" + Array.from({ length: n }, (_, i) => xy(i, -64, 64, 30, 86)).join("L") : "");
  WEB.count.textContent = `${n} / ${PTS.length} lecturas · SSE`;
  WEB.appLine.setAttribute("d", nApp > 1 ? "M" + Array.from({ length: nApp }, (_, i) => xy(i, 3, 29, 20, 56)).join("L") : "");
  WEB.appCount.textContent = `${nApp} / ${PTS.length}`;
}
// ---------------------------------------------------------------- sábanas 3D en la pantalla (etapa 4)
// Sesiones reales de la bobina en doble D (2026-11-24): Bx, By, Bz en µT tal como los guardó el servidor (sin restar el fondo).
const SAB = D.sabanas;
const jet = (t) => {
  // mapa de color «jet» (azul → cian → verde → amarillo → rojo), el de las figuras de la tesis
  const c = (x) => Math.round(255 * clamp(1.5 - Math.abs(4 * t - x), 0, 1));
  return `rgb(${c(3)},${c(2)},${c(1)})`;
};
function upsample(g, f = 2) {
  // interpolación bilineal ×f entre las lecturas medidas (solo para suavizar el dibujo)
  const nc = g.length, nl = g[0].length, NC = (nc - 1) * f + 1, NL = (nl - 1) * f + 1;
  const out = [];
  for (let I = 0; I < NC; I++) {
    const row = [];
    for (let J = 0; J < NL; J++) {
      const i = Math.min(nc - 2, Math.floor(I / f)), j = Math.min(nl - 2, Math.floor(J / f));
      const ti = I / f - i, tj = J / f - j;
      row.push((1 - ti) * ((1 - tj) * g[i][j] + tj * g[i][j + 1]) + ti * ((1 - tj) * g[i + 1][j] + tj * g[i + 1][j + 1]));
    }
    out.push(row);
  }
  return out;
}
const SAB_AZ = (-32 * Math.PI) / 180, SAB_EL = (32 * Math.PI) / 180, SAB_HZ = 0.42;
const SHEETS = SAB.map((s) => {
  const comps = ["bx", "by", "bz"].map((c) => {
    const g = upsample(s[c]);
    const vmax = Math.max(1, ...s[c].flat().map(Math.abs));
    const vmin = Math.min(...s[c].flat()), vtop = Math.max(...s[c].flat());
    return { c, g, vmax, vmin, vtop };
  });
  const lx = (s.zona_mm[1] / s.zona_mm[0]) || 1.6; // eje largo / eje corto
  return { s, comps, lx };
});
function projSab(u, v, h, lx, cx, cy, S) {
  const X = (u - 0.5) * lx, Y = (v - 0.5), Z = h;
  const xr = X * Math.cos(SAB_AZ) - Y * Math.sin(SAB_AZ), yr = X * Math.sin(SAB_AZ) + Y * Math.cos(SAB_AZ);
  return { x: cx + xr * S, y: cy + (yr * Math.sin(SAB_EL) - Z * Math.cos(SAB_EL)) * S, d: yr * Math.cos(SAB_EL) + Z * Math.sin(SAB_EL) };
}
const SAB_PANELS = [-46, 0, 46];
function webSabana(k, rise) {
  const sh = SHEETS[k];
  if (webMode !== `sab${k}`) {
    webMode = `sab${k}`;
    web.innerHTML = "";
    const s = sh.s;
    const fecha = s.iniciada.slice(0, 10), zr = s.z_mm / 2;
    el("text", { class: "sv-sab-t", x: -66, y: 11 }, web).textContent = `Sábana 3D · bobina en doble D · sesión ${s.id} · plano Z = ${nf(zr, 0)} mm`;
    el("text", { class: "sv-sab-s", x: -66, y: 15.4 }, web).textContent = `${fecha} · zona ${nf(s.zona_mm[1] / 2, 0)} × ${nf(s.zona_mm[0] / 2, 0)} mm · paso ${nf(s.paso_mm / 2, 0)} mm · ${s.puntos_plano} puntos · µT sin restar el fondo`;
    WEB.sab = sh.comps.map((cm, p) => {
      const cx = SAB_PANELS[p], cy = 52, S = 21;
      const g = cm.g, NC = g.length, NL = g[0].length;
      const quads = [];
      for (let I = 0; I < NC - 1; I++) for (let J = 0; J < NL - 1; J++) {
        const val = (g[I][J] + g[I + 1][J] + g[I][J + 1] + g[I + 1][J + 1]) / 4;
        const t = (val / cm.vmax + 1) / 2;
        const col = jet(clamp(t, 0, 1));
        const node = el("path", { class: "sv-sab-q", fill: col, stroke: col }, null);
        const c = projSab((J + 0.5) / (NL - 1), (I + 0.5) / (NC - 1), (val / cm.vmax) * SAB_HZ, sh.lx, cx, cy, S);
        quads.push({ I, J, node, depth: c.d });
      }
      quads.sort((a, b) => a.depth - b.depth);
      const grp = el("g", {}, web);
      // piso de la sábana (contorno de la zona medida)
      const fl = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => projSab(u, v, -SAB_HZ - 0.05, sh.lx, cx, cy, S));
      el("path", { class: "sv-sab-e", d: "M" + fl.map((q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join("L") + "Z", opacity: ".45" }, grp);
      quads.forEach((q) => grp.appendChild(q.node));
      // barra de color con los extremos medidos
      const bx = cx + 19, by0 = 24, bh = 26;
      for (let i = 0; i < 12; i++) el("rect", { x: bx, y: (by0 + (bh * i) / 12).toFixed(2), width: 1.6, height: (bh / 12 + 0.05).toFixed(2), fill: jet(1 - i / 11) }, web);
      el("text", { class: "sv-sab-s", x: bx - 1, y: by0 - 1.2 }, web).textContent = `+${nf(cm.vmax, 0)}`;
      el("text", { class: "sv-sab-s", x: bx - 1, y: by0 + bh + 3 }, web).textContent = `−${nf(cm.vmax, 0)}`;
      el("text", { class: "sv-sab-t", x: cx - 8, y: 88 }, web).textContent = `${"ABC"[p]}) ${cm.c[0].toUpperCase()}${cm.c[1]}`;
      el("text", { class: "sv-sab-s", x: cx - 17, y: 92 }, web).textContent = `${nf(cm.vmin, 0)} a ${nf(cm.vtop, 0)} µT`;
      return { cm, quads, cx, cy, S };
    });
    app.innerHTML = "";
    el("text", { class: "sv-web-s", x: 3, y: 8 }, app).textContent = "TMS Monitor";
    el("text", { class: "sv-web-s", x: 3, y: 14 }, app).textContent = `Sábana 3D · ${s.id}`;
    WEB.appSab = SHEETS[k].comps[2];
    const g = WEB.appSab.g, NC = g.length, NL = g[0].length;
    for (let I = 0; I < NC; I++) for (let J = 0; J < NL; J++) el("rect", { x: (3 + (26 * I) / NC).toFixed(2), y: (20 + (40 * J) / NL).toFixed(2), width: (26 / NC + 0.05).toFixed(2), height: (40 / NL + 0.05).toFixed(2), fill: jet(clamp((g[I][J] / WEB.appSab.vmax + 1) / 2, 0, 1)) }, app);
  }
  const e = rise >= 1 ? 1 : 1 - Math.pow(1 - rise, 3);
  for (const P0 of WEB.sab) {
    const g = P0.cm.g, NC = g.length, NL = g[0].length;
    for (const q of P0.quads) {
      const pts = [[q.I, q.J], [q.I + 1, q.J], [q.I + 1, q.J + 1], [q.I, q.J + 1]].map(([i, j]) => projSab(j / (NL - 1), i / (NC - 1), (g[i][j] / P0.cm.vmax) * SAB_HZ * e, sh.lx, P0.cx, P0.cy, P0.S));
      q.node.setAttribute("d", "M" + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("L") + "Z");
    }
  }
}

// ---------------------------------------------------------------- paquetes (etapa 3)
const PKTS = [];
function packet(kind, from, to, dur, onArrive) {
  const node = kind === "beat" ? el("circle", { class: "sv-beat", r: "3" }, pk) : el("rect", { class: "sv-pkt", width: kind === "sse" ? 4 : 7, height: kind === "sse" ? 2.4 : 3.6, rx: 1 }, pk);
  PKTS.push({ node, kind, from, to, t: 0, dur, onArrive });
}
function stepPackets(dt) {
  for (let i = PKTS.length - 1; i >= 0; i--) {
    const q = PKTS[i];
    q.t += dt;
    const u = clamp(q.t / q.dur, 0, 1), e = u * u * (3 - 2 * u);
    const fix = (pt, f) => (f === laptopAt || f === phoneAt ? [pt[0], pt[1] - SHIFT] : pt);
    const a = fix(scr(q.from()), q.from), b = fix(scr(q.to()), q.to);
    const lift = Math.min(90, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.35);
    const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e - Math.sin(Math.PI * e) * lift;
    if (q.kind === "beat") { q.node.setAttribute("cx", x.toFixed(1)); q.node.setAttribute("cy", y.toFixed(1)); q.node.setAttribute("opacity", (1 - 0.6 * e).toFixed(2)); }
    else { const w = +q.node.getAttribute("width"), h = +q.node.getAttribute("height"); q.node.setAttribute("x", (x - w / 2).toFixed(1)); q.node.setAttribute("y", (y - h / 2).toFixed(1)); }
    if (u >= 1) { q.node.remove(); PKTS.splice(i, 1); q.onArrive && q.onArrive(); }
  }
}
const clearPackets = () => { for (const q of PKTS) q.node.remove(); PKTS.length = 0; };
const antenna = () => add(A0.antena, offsetOf("electronica"));
const laptopAt = () => A0.laptop;
const phoneAt = () => A0.phone;

// ---------------------------------------------------------------- etapas
const LOTES = S93.lotes; // [desde, hasta] reconstruidos de la hora del servidor (misma hora = mismo lote)
const SPEED3 = 10;
let say = "";
function setReadout(text) { if (text !== say) { say = text; readout.textContent = text; } }

function etapa1(dt) {
  state.clock1 += dt * SPEED1;
  if (state.clock1 > T_END) { state.clock1 = 0; state.last1 = -1; gotas.forEach((g) => g.removeAttribute("data-on")); }
  const t = state.clock1;
  let s = SCHED[0];
  for (const x of SCHED) if (x.t0 <= t) s = x; else break;
  const a = PTS[s.i];
  if (s.i > state.last1) {
    for (let i = state.last1 + 1; i <= s.i; i++) {
      const p = PTS[i];
      if (i > 0 && p.z !== PTS[i - 1].z) gotas.forEach((g) => g.getAttribute("data-on") === "" && g.setAttribute("data-on", "old"));
      const gi = Math.round(p.l / STEP) * GY + Math.round(p.c / STEP);
      if (gotas[gi]) gotas[gi].setAttribute("data-on", "");
    }
    state.last1 = s.i;
  }
  const u = t - s.t0;
  const at = planAt(s.pl, u);
  state.pos = at.p;
  state.k1 = s.i;
  const ph = at.moving ? (s.home ? "regreso al descanso" : "moviéndose") : u < s.pl.T + SETTLE ? "asentando 300 ms" : s.home ? "en el descanso (0, 0, 0)" : "midiendo";
  leds.forEach((n, i) => setOn(n, at.moving.includes(["c", "z", "l"][i]) && Math.floor(state.clock * 14) % 2 === 0));
  setOn(drdy, false);
  drdy.setAttribute("opacity", ph === "midiendo" && u < s.pl.T + SETTLE + 0.12 ? "1" : "0");
  const p = state.pos;
  setReadout(`seq ${a.seq}/${PTS.length} · corto ${nf(p.c)} · largo ${nf(p.l)} · Z ${nf(p.z)} mm · ${ph}${at.moving && !still.matches ? ` ${nf(at.speed, 0)} mm/s` : ""} · ×${SPEED1}`);
}
// ---------------------------------------------------------------- acercamiento de la cámara (viewBox)
const VB0 = [0, 0, D.W, D.H];
const vb = [...VB0];
let zoomFn = null;
const boxAt = (cx, cy, w) => { const h = (w * D.H) / D.W; return [cx - w / 2, cy - h / 2, w, h]; };
const sensorAt = () => add(A0.sensor, offsetOf("cabezal"));
function moduleBox() { const s = scr(sensorAt()); return boxAt(s[0] + 8, s[1] - 10 + SHIFT, 72); }
// Etapa 4: la pantalla de la laptop sale de su plano y pasa al frente, de cara al lector
const LAP_M = D.lap.match(/-?[\d.]+/g).map(Number);
const FLAT_S = 4.7, FLAT_M = [FLAT_S, 0, 0, FLAT_S, D.W / 2, D.H / 2 - 50 * FLAT_S];
const veil = el("rect", { x: 0, y: 0, width: D.W, height: D.H, class: "sv-velo", opacity: "0", display: "none" }, svg);
const fg = el("g", { "data-part": "frente", display: "none" }, svg);
el("rect", { class: "sv-bisel", x: -75, y: 0, width: 150, height: 100, rx: 3 }, fg);
el("rect", { class: "vidrio", x: -70, y: 5, width: 140, height: 88, rx: 1.5 }, fg);
const webHome = web.parentNode;
let fgK = 0;
function stepFront(dt) {
  const on = state.etapa === 4;
  const target = on ? 1 : 0;
  if (still.matches) fgK = target; else fgK += (target - fgK) * (1 - Math.exp(-dt * 4));
  if (Math.abs(target - fgK) < 0.002) fgK = target;
  if (fgK > 0) {
    if (web.parentNode !== fg) fg.appendChild(web);
    const e = fgK * fgK * (3 - 2 * fgK);
    fg.setAttribute("transform", `matrix(${LAP_M.map((v, i) => (v + (FLAT_M[i] - v) * e).toFixed(4)).join(" ")})`);
    fg.removeAttribute("display"); veil.removeAttribute("display");
    veil.setAttribute("opacity", (0.82 * e).toFixed(3));
  } else {
    if (web.parentNode !== webHome) webHome.appendChild(web);
    fg.setAttribute("display", "none"); veil.setAttribute("display", "none");
  }
  return fgK !== target;
}
function stepZoom(dt) {
  const t = zoomFn ? zoomFn() : VB0;
  const k = still.matches ? 1 : 1 - Math.exp(-dt * 3.4);
  let far = 0;
  for (let i = 0; i < 4; i++) { vb[i] += (t[i] - vb[i]) * k; far = Math.max(far, Math.abs(t[i] - vb[i])); }
  if (far < 0.02) for (let i = 0; i < 4; i++) vb[i] = t[i];
  svg.setAttribute("viewBox", vb.map((v) => v.toFixed(2)).join(" "));
  if (vb[2] < D.W * 0.97) stage.setAttribute("data-zoom", ""); else stage.removeAttribute("data-zoom");
  return far >= 0.02;
}

// ---------------------------------------------------------------- etapa 2: medición en el módulo
// Dibujo explicativo: líneas de campo que suben de la bobina y cruzan el chip; bits I2C que suben por el cable.
// Lo que es dato: las cuentas del punto, su conversión a µT y OVFL (sesión 126).
const med = el("g", { "data-part": "medida", display: "none" }, root);
const fieldLines = [-2, -1, 0, 1, 2].map(() => el("path", { class: "sv-campo" }, med));
const ejes = ["x", "y", "z"].map((a) => ({ a, line: el("path", { class: `sv-eje sv-eje-${a}` }, med), head: el("path", { class: `sv-eje sv-eje-${a}` }, med), lab: el("text", { class: `sv-zt sv-lab-${a}` }, med) }));
const bits = Array.from({ length: 10 }, () => el("circle", { class: "sv-bit", r: "0.45", opacity: "0" }, med));
const lupa = el("g", { opacity: "0" }, med);
const lupaBox = el("rect", { class: "sv-lupa", width: "15", height: "6.6", rx: "0.4" }, lupa);
const lupaT = [0, 1, 2, 3, 4].map((i) => el("text", { class: i ? "sv-zs" : "sv-zt", x: "0.8", y: (1.6 + i * 1.2).toFixed(2) }, lupa));
const UT_MM = 0.2; // largo de las flechas: 0,2 mm por µT (solo dibujo)
// ejes del sensor supuestos iguales a los del sistema: Bx sobre el eje corto, By sobre el largo, Bz hacia arriba (por confirmar)
const DIRS = { x: [0, 1, 0], y: [1, 0, 0], z: [0, 0, 1] };
function arrow(e, o, dir, len) {
  const a = scr(o), b = scr(add(o, mul(dir, len)));
  e.line.setAttribute("d", `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`);
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = Math.min(1.6, L * 0.35);
  e.head.setAttribute("d", L < 0.2 ? "" : `M${b[0].toFixed(2)} ${b[1].toFixed(2)}L${(b[0] - ux * hs - uy * hs * 0.5).toFixed(2)} ${(b[1] - uy * hs + ux * hs * 0.5).toFixed(2)}L${(b[0] - ux * hs + uy * hs * 0.5).toFixed(2)} ${(b[1] - uy * hs - ux * hs * 0.5).toFixed(2)}Z`);
  e.lab.setAttribute("x", (b[0] + ux * 1.4 - (ux < -0.3 ? 4.5 : 0.4)).toFixed(2));
  e.lab.setAttribute("y", (b[1] + uy * 1.4 + 0.3).toFixed(2));
}
const T2 = 0.42;
function drawMedida(dt) {
  const S0 = sensorAt();
  // líneas de campo (dibujo): cruzan el chip y siguen hacia arriba, abriéndose
  fieldLines.forEach((n, i) => {
    const k = i - 2;
    const p0 = [S0[0] + k * 2.2, S0[1] + 4, S0[2] - 0.2], p3 = [S0[0] + k * 9, S0[1] - 6, S0[2] + 22];
    const pts = bez(p0, [p0[0], p0[1], S0[2] + 8], [p3[0] - k * 2, p3[1] + 3, S0[2] + 14], p3, 18);
    n.setAttribute("d", "M" + pts.map((p) => scr(p).map((v) => v.toFixed(2)).join(" ")).join("L"));
    n.style.strokeDashoffset = String((-state.clock * 14) % 60);
  });
  const p = PTS[state.k2], b = p.raw.map(uT), n = Math.floor(state.clock2 / T2);
  const reading = !state.move && n < 10, done = !state.move && n >= 10;
  // bits I2C: uno por lectura (DRDY), del chip al conector y por la columna
  const route = [[0, 0, 0.9], [0, -7.5, 2.4], [0, -7.5, 9.4], [0, -8.9, 40]].map((q) => add(S0, q));
  bits.forEach((c, i) => {
    const age = state.clock2 - i * T2;
    if (state.move || i >= 10 || age < 0.16 || age > 1.6) { c.setAttribute("opacity", "0"); return; }
    const u = (age - 0.16) / 1.44, segs = [0.12, 0.2, 1];
    let s = 0; while (s < 2 && u > segs[s]) s++;
    const u0 = s ? segs[s - 1] : 0, f = (u - u0) / (segs[s] - u0);
    const q = add(route[s], mul(add(route[s + 1], mul(route[s], -1)), clamp(f, 0, 1)));
    const sp = scr(q);
    c.setAttribute("cx", sp[0].toFixed(2)); c.setAttribute("cy", sp[1].toFixed(2)); c.setAttribute("opacity", "1");
  });
  // flechas de Bx, By, Bz (el promedio de las 10 lecturas, el valor guardado)
  const o = add(S0, [0, 0, 1]);
  const grow = done ? clamp((state.clock2 - 10 * T2) / 0.6, 0, 1) : 0;
  ejes.forEach((e, i) => {
    arrow(e, o, DIRS[e.a], b[i] * UT_MM * (1 - Math.pow(1 - grow, 3)));
    e.lab.textContent = grow > 0.5 ? `B${e.a} ${nf(b[i])} µT` : "";
    for (const nd of [e.line, e.head, e.lab]) nd.setAttribute("opacity", grow > 0 ? "1" : "0");
  });
  // recuadro con la lectura, junto al módulo
  const sm = scr(S0);
  lupa.setAttribute("transform", `translate(${(sm[0] + 13).toFixed(2)} ${(sm[1] - 27).toFixed(2)})`);
  lupa.setAttribute("opacity", vb[2] < D.W * 0.3 ? "1" : "0");
  lupaT[0].textContent = "QMC5883P · 0x2C · 30 G";
  lupaT[1].textContent = state.move ? "yendo al punto…" : reading ? `DRDY ${n + 1}/10 · lectura I2C` : "promedio de 10 lecturas";
  lupaT[2].textContent = done ? `cuentas ${p.raw.map((v) => String(v).replace("-", "−")).join(" · ")}` : `seq ${p.seq} · 200 Hz (aquí ×1/80)`;
  lupaT[3].textContent = done ? `1 cuenta = 0,1 µT · |B| ${nf(mag(b))} µT` : "";
  lupaT[4].textContent = done ? `OVFL ${p.sat}` : "";
}
function etapa2(dt) {
  if (state.move) return moveStep(dt, "yendo al punto");
  state.clock2 += dt;
  const n = Math.floor(state.clock2 / T2);
  const k = state.k2, p = PTS[k];
  const b = p.raw.map(uT);
  drdy.setAttribute("opacity", n < 10 && state.clock2 % T2 < 0.16 ? "1" : "0");
  if (n < 10) setReadout(`seq ${p.seq} · DRDY ${n + 1}/10 · 200 Hz (aquí ×1/80) · I2C 0x2C a 100 kHz · promedio de 10`);
  else setReadout(`seq ${p.seq} · cuentas ${p.raw.join(" · ").replace(/-/g, "−")} → Bx ${nf(b[0])} · By ${nf(b[1])} · Bz ${nf(b[2])} µT · |B| ${nf(mag(b))} µT · OVFL ${p.sat}`);
  if (state.clock2 > 10 * T2 + 5) state.clock2 = 0;
  setOn(ledPico, n < 10 && Math.floor(state.clock2 * 6) % 2 === 0);
}
let lote3 = -1, beat3 = -1, recv3 = 0, recvApp3 = 0;
function etapa3(dt) {
  state.clock3 += dt * SPEED3;
  const t = state.clock3, last = PTS[PTS.length - 1].t + 4;
  if (t > last + 6) { state.clock3 = 0; lote3 = -1; beat3 = -1; recv3 = 0; recvApp3 = 0; clearPackets(); }
  // un lote sale cuando su lectura más vieja cumple 3 s (o junta 25): config.py
  for (let i = lote3 + 1; i < LOTES.length; i++) {
    const [a, b] = LOTES[i];
    const sendAt = Math.min(PTS[a - 1].t + 3, PTS[Math.min(b, PTS.length) - 1].t + 0.05);
    if (t < sendAt) break;
    lote3 = i;
    packet("lote", antenna, laptopAt, 0.9, () => { recv3 = b; packet("sse", laptopAt, phoneAt, 0.7, () => (recvApp3 = b)); });
  }
  const beat = Math.floor(t / 5);
  if (beat > beat3) { beat3 = beat; packet("beat", antenna, laptopAt, 1.0); }
  stepPackets(dt);
  webShow(recv3, recvApp3);
  setOn(ledPico, PKTS.some((q) => q.kind !== "sse" && q.t < 0.25));
  const L = LOTES[Math.max(0, lote3)];
  setReadout(lote3 < 0 ? `esperando el primer lote · latido cada 5 s · ×${SPEED3}` : `lote ${lote3 + 1}/${LOTES.length} · seq ${L[0]}–${L[1]} · ${L[1] - L[0] + 1} lecturas · Wi-Fi, HTTP con token → MariaDB → SSE · ×${SPEED3}`);
}
const SAB_DWELL = 7; // s por sábana
function etapa4(dt) {
  state.clock4 += dt;
  state.sabT += dt;
  if (state.sabT > SAB_DWELL) { state.sabT = 0; state.sab = (state.sab + 1) % SHEETS.length; }
  const rise = still.matches ? 1 : clamp((state.sabT - 0.25) / 1.3, 0, 1);
  if (state.sabT < 1.7 || webMode !== `sab${state.sab}`) webSabana(state.sab, rise);
  const s = SHEETS[state.sab].s;
  setReadout(`sábanas 3D · sesión ${s.id} (${state.sab + 1}/${SHEETS.length}) · plano Z = ${nf(s.z_mm / 2, 0)} mm · ${s.xs.length} × ${s.ys.length} puntos · ${s.saturadas} saturadas · ${s.iniciada.slice(0, 10)} ${s.iniciada.slice(11, 16)} UTC`);
}
function moveStep(dt, word) {
  state.moveT += dt;
  const at = planAt(state.move, state.moveT);
  state.pos = at.p;
  leds.forEach((n, i) => setOn(n, at.moving.includes(["c", "z", "l"][i]) && Math.floor(state.clock * 14) % 2 === 0));
  if (state.moveT >= state.move.T) { state.pos = { ...state.move.to }; state.move = null; leds.forEach((n) => setOn(n, false)); }
  const p = state.pos;
  setReadout(`${word} · corto ${nf(p.c)} · largo ${nf(p.l)} · Z ${nf(p.z)} mm${at.moving ? ` · ${nf(at.speed, 0)} mm/s` : ""}`);
}
function goTo(to) { state.move = plan(state.pos, to); state.moveT = 0; if (still.matches) { state.pos = { ...to }; state.move = null; } }

// ---------------------------------------------------------------- separar capas (resortes escalonados)
function setApart(on) {
  state.apart = on;
  const order = on ? D.STAGGER : [...D.STAGGER].reverse();
  const changing = order.filter((p) => state.springs[p].target !== (on ? 1 : 0) || state.springs[p].at > state.clock);
  changing.forEach((p, i) => { state.springs[p].target = on ? 1 : 0; state.springs[p].at = state.clock + i * D.SPRING.stagger; });
  btnE.setAttribute("aria-pressed", String(on));
  legend.hidden = !on;
  if (!on) pickCapa(null);
  announce(on ? "capas separadas" : "capas juntas");
  run();
}
function stepSprings(dt) {
  let moving = false;
  for (const p of D.STAGGER) {
    const s = state.springs[p];
    if (state.clock < s.at) { moving = true; continue; }
    if (still.matches) { s.x = s.target; s.v = 0; continue; }
    const n = D.SPRING.substeps, h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (D.SPRING.stiffness * (s.target - s.x) - D.SPRING.damping * s.v) * h; s.x += s.v * h; }
    if (Math.abs(s.target - s.x) < 5e-4 && Math.abs(s.v) < 5e-4) { s.x = s.target; s.v = 0; } else moving = true;
  }
  return moving;
}

// ---------------------------------------------------------------- leyenda de capas
const CAPAS = [["madera", "01 Base de madera"], ["base3018", "02 Base 3018 oculta: eje corto"], ["arco", "03 Arco"], ["ejes", "04 Ejes, husillos y carro"], ["motores", "05 Motores NEMA 17"], ["cabezal", "06 Cabezal con el sensor"], ["bobina", "07 Bobina en doble D"], ["electronica", "08 TB6600 y Pico 2 W"], ["pantallas", "09 Servidor y app"]];
const legend = document.querySelector("[data-legend]");
legend.hidden = true;
const items = [...svg.querySelectorAll(".it")];
let capaSel = null;
function pickCapa(c) {
  capaSel = c;
  if (c) stage.setAttribute("data-capa", c); else stage.removeAttribute("data-capa");
  items.forEach((n) => setOn(n, c && n.dataset.capa === c));
  legend.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.capa === c)));
}
for (const [c, label] of CAPAS) {
  const b = document.createElement("button");
  b.type = "button"; b.dataset.capa = c; b.textContent = label; b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () => pickCapa(capaSel === c ? null : c));
  b.addEventListener("pointerenter", () => pickCapa(c));
  legend.appendChild(b);
}
legend.addEventListener("pointerleave", () => pickCapa(null));

// ---------------------------------------------------------------- controles
const btns = [...document.querySelectorAll("[data-etapa]")];
const btnE = document.querySelector("[data-explode]");
function announce(text) { status.textContent = text; }
const NAMES = { 1: "movimiento", 2: "adquisición", 3: "envío de datos", 4: "previsualizador" };
function setEtapa(n) {
  if (n === 2 && state.etapa === 1) state.k2 = state.k1;
  state.etapa = n;
  btns.forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.etapa === n)));
  clearPackets();
  setOn(ledPico, false);
  leds.forEach((x) => setOn(x, false));
  drdy.setAttribute("opacity", "0");
  if (n === 1) { state.move = null; state.clock1 = 0; state.last1 = -1; gotas.forEach((g) => g.removeAttribute("data-on")); }
  if (n === 2) { state.clock2 = 0; const p = PTS[state.k2]; goTo({ c: p.c, l: p.l, z: p.z }); zoomFn = moduleBox; med.removeAttribute("display"); }
  else med.setAttribute("display", "none");
  if (n === 3) { state.clock3 = 0; lote3 = -1; beat3 = -1; recv3 = 0; recvApp3 = 0; webMode = ""; webShow(0, 0); }
  if (n === 4) { state.move = null; state.clock4 = 0; state.sab = 0; state.sabT = 0; webMode = ""; zoomFn = null; }
  if (n === 1 || n === 3) zoomFn = null;
  if (n !== 3 && n !== 4) { webMode = ""; webShow(n === 1 ? 0 : 0, 0); }
  stage.dataset.etapa = String(n);
  announce(`etapa ${n}: ${NAMES[n]}`);
  run();
}
btns.forEach((b) => b.addEventListener("click", () => setEtapa(+b.dataset.etapa)));
btnE.addEventListener("click", () => setApart(!state.apart));
document.addEventListener("keydown", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  if (/^[1-4]$/.test(e.key)) { setEtapa(+e.key); e.preventDefault(); }
  else if (e.key === "e" || e.key === "E") { setApart(!state.apart); e.preventDefault(); }
  else if (e.key === "Escape" && state.apart) setApart(false);
});

// ---------------------------------------------------------------- bucle
let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  state.clock += dt;
  const calm = still.matches;
  if (state.etapa === 1) etapa1(calm ? 0 : dt);
  else if (state.etapa === 2) etapa2(calm ? 4 : dt);
  else if (state.etapa === 3) etapa3(calm ? 0 : dt);
  else etapa4(dt);
  const springing = stepSprings(dt);
  placeGroups();
  drawCables();
  if (state.etapa === 2) drawMedida(dt);
  const zooming = stepZoom(dt) | stepFront(dt);
  const busy = !calm || springing || state.move || zooming || state.etapa === 4 || state.etapa === 2;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
placeGroups();
drawCables();
webShow(0, 0);
