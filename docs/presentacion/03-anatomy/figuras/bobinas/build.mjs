// Figura de detalle D3 del SAVD (Anatomy): tres topologías de bobina y la sábana de su campo magnético.
//   node build.mjs            → escribe bobinas.html
//   node build.mjs --audit    → además audita la geometría (las sábanas son dibujo vivo y no entran en la auditoría)
// Medidas de dibujo: las tres bobinas son equivalentes a la doble D de la figura principal (estimada de las fotos): NO son datos.
// Datos: sesiones 117 y 127 (datos.json, solo SELECT); la anular es una simulación (ver LEEME.md).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, A, kitScript, taller } from "../comun/taller.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATOS = JSON.parse(readFileSync(join(HERE, "datos.json"), "utf8"));

const W = 1100, H = 400, AZ = 57, EL = 30;
const RAD = (AZ * Math.PI) / 180;
const ROW = [Math.sin(RAD), -Math.cos(RAD)]; // dirección horizontal en pantalla
const SPACING = 318;
const PLACA = { w: 200, d: 125, z: 62 }; // como la doble D: placa de 200 × 125 mm a 62 mm del tablero
const TOP = PLACA.z + 4; // cara de arriba de la placa
const PLANE_HI = TOP + 78, HS = 46; // plano de la sábana dibujado alto para verlo; altura máxima de la superficie
const UNITS = ["anular", "ocho", "dobleD"];
const ORIG = UNITS.map((_, i) => [(i - 1) * SPACING * ROW[0] - PLACA.w / 2, (i - 1) * SPACING * ROW[1] - PLACA.d / 2]);

const GROUPS = UNITS.map((u) => [u]);
const pts = [];
// margen para las etiquetas de abajo y la barra de color de la derecha (en la dirección de la fila)
ORIG.forEach(([x, y]) => { for (const sg of [-1, 1]) pts.push([x + 80 + sg * 125 * ROW[0], y + 185 + sg * 125 * ROW[1], 0]); });
pts.push([ORIG[2][0] + 200 + 75 * ROW[0], ORIG[2][1] + 75 * ROW[1], PLANE_HI + HS + 20]);
ORIG.forEach(([x, y]) => pts.push([x - 22, y - 26, 0], [x + 222, y - 26, 0], [x + 222, y + 182, 0], [x - 22, y + 182, 0], [x, y, PLANE_HI + HS], [x + 200, y + 125, PLANE_HI + HS], [x + 200, y, PLANE_HI + HS], [x, y + 125, PLANE_HI + HS]));
const P = k.fitProjection(pts, W, H, { pad: 20, azimuth: AZ, elevation: EL });
const T = taller({ P, groups: GROUPS, exp: {}, spring: { stagger: 0.05, stiffness: 60, damping: 14, substeps: 4 } });
const { at, Ln, Dots, extra, slab, prismZ, cyl, cable, R } = T;
const screwDots = (p, z, size = 0.55) => Dots(p.map(([x, y]) => at([x, y, z])), { size, tone: "mid" });

R.solid(A.slab({ x: -900, y: -900, w: 1800, d: 1800, r: 0 }, -2, 2, { name: "piso", ground: true }, 2));

// ---------------------------------------------------------------- devanados (líneas de cobre sobre la placa)
function devanado(kind, x0, y0) {
  const cx = x0 + PLACA.w / 2, cy = y0 + PLACA.d / 2, z = TOP;
  const out = [];
  if (kind === "dobleD") {
    // igual que en la figura principal: dos espirales en D con el lado plano al centro
    for (const side of [-1, 1]) for (let t = 0; t < 11; t++) {
      const inset = 6 + t * 3.6, w = 94 - inset, h = 58 - inset * 0.62;
      if (w < 14 || h < 10) break;
      const fx = cx + side * (2 + inset * 0.35);
      const q = [];
      for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; q.push([fx + side * w * Math.cos(a), cy + h * Math.sin(a)]); }
      out.push(k.onTop(q, z, P, true));
    }
  } else if (kind === "anular") {
    // espiral en forma de anillo: radio interior ~18 mm, exterior ~55 mm (estimados de la foto), salida del alambre hacia el borde
    for (let t = 0; t < 14; t++) out.push(k.ring(cx, cy, 18 + t * 2.85, z, P, 72));
    // salidas del alambre hasta los dos terminales (x0 + 90 y x0 + 110, a 7 mm del borde)
    out.push(k.onTop([[cx + 55, cy], [cx + 58, cy + 22], [cx + 30, cy + 50], [cx + 10, cy + PLACA.d / 2 - 7]], z, P, false));
    out.push(k.onTop([[cx, cy + 18], [cx - 6, cy + 40], [cx - 10, cy + PLACA.d / 2 - 7]], z, P, false));
  } else {
    // en forma de 8: dos espirales circulares unidas al centro (radio exterior ~45 mm, estimado de la foto); las vueltas
    // de afuera de cada anillo se tocan y el alambre pasa de un anillo al otro por la cintura del 8
    const R0 = 47, C = 40; // los anillos se enciman 14 mm: las vueltas de afuera forman la cintura del 8
    for (const sg of [-1, 1]) {
      const ox = cx + sg * C, other = cx - sg * C;
      for (let t = 0; t < 14; t++) {
        const r = 7 + t * ((R0 - 7) / 13);
        // cada vuelta se corta en la cintura (x = cx): ahí el alambre pasa de un anillo al otro
        let seg = [], prev = null;
        for (let q = 0; q <= 96; q++) {
          const a = (q / 96) * 2 * Math.PI, p = [ox + r * Math.cos(a), cy + r * Math.sin(a)];
          const inside = sg * (p[0] - cx) < 0;
          if (prev && inside !== (sg * (prev[0] - cx) < 0)) {
            // punto exacto sobre la cintura, para que la vuelta termine en la costura
            const y = cy + Math.sign(p[1] - cy || prev[1] - cy) * Math.sqrt(Math.max(0, r * r - (cx - ox) ** 2));
            if (inside) { seg.push([cx, y]); if (seg.length > 1) out.push(k.onTop(seg, z, P, false)); seg = []; }
            else seg = [[cx, y]];
          }
          if (!inside) seg.push(p);
          prev = p;
        }
        if (seg.length > 1) out.push(k.onTop(seg, z, P, seg.length === 97));
      }
    }
    // costura de la cintura, donde se juntan los dos anillos
    const w = Math.sqrt(R0 * R0 - C * C);
    out.push(k.onTop([[cx, cy - w], [cx, cy + w]], z, P, false));
  }
  return out.join("");
}

// ---------------------------------------------------------------- una bobina con su soporte rojo, tablero y cables (como la doble D)
UNITS.forEach((u, i) => {
  const [x0, y0] = ORIG[i];
  slab(`${u}.tablero`, u, [x0 - 22, y0 - 26, 0], [x0 + 222, y0 + 182, 12], { cls: "t-mdf", bevel: 1.2, r: 0.8, ground: true, extra: screwDots([[x0 - 14, y0 - 18], [x0 + 214, y0 - 18], [x0 - 14, y0 + 174], [x0 + 214, y0 + 174]], 12), inner: Ln(k.sideSeam({ x: x0 - 22, y: y0 - 26, w: 244, d: 208, r: 0.8 }, 6, P, 2), { tone: "faint" }) });
  for (const [dx, dy] of [[18, 14], [182, 14], [100, 128]]) cyl(`${u}.pata${dx}`, u, x0 + dx, y0 + dy, 7, 12, PLACA.z - 8, { tone: "mid", cls: "t-rojo" });
  prismZ(`${u}.marco`, u, [[x0 - 12, y0 - 6], [x0 + 212, y0 - 6], [x0 + 198, y0 + 142], [x0 + 2, y0 + 142]], PLACA.z - 8, PLACA.z, { tone: "mid", cls: "t-rojo", extra: screwDots([[x0 - 4, y0], [x0 + 204, y0], [x0 + 8, y0 + 136], [x0 + 192, y0 + 136]], PLACA.z) });
  slab(`${u}.placa`, u, [x0, y0, PLACA.z], [x0 + PLACA.w, y0 + PLACA.d, TOP], { tone: "lo", r: 1.2, steps: 3, extra: Ln(devanado(u, x0, y0), { tone: "mid", className: "cobre" }) });
  for (const dx of [90, 110]) cyl(`${u}.terminal${dx}`, u, x0 + dx, y0 + PLACA.d - 7, 3.2, TOP, TOP + 8, { tone: "hi", cls: "t-metal", bevel: 0.4 });
  for (const [dx, col] of [[90, "t-rojoCable"], [110, "t-negroCable"]]) {
    const r = 2.4, zl = 12 + r + 1.3, x = x0 + dx, end = y0 + (dx === 90 ? 152 : 160);
    cable(`${u}.cable${dx}`, u, [[x, y0 + PLACA.d - 7, TOP + 8], [x, y0 + PLACA.d - 7, TOP + 14], [x, y0 + PLACA.d + 22, TOP + 14], [x, y0 + PLACA.d + 22, zl], [x, end, zl]], r, { tone: "mid", cls: col, bend: 7, ends: [false, false] });
    slab(`${u}.${dx === 90 ? "pinza" : "banana"}`, u, [x - 6, end, 12], [x + 6, end + (dx === 90 ? 20 : 12), 12 + 2 * zl - 24], { tone: "mid", cls: dx === 90 ? "t-rojo" : "t-negro", r: 2, steps: 3 });
  }
});

// ---------------------------------------------------------------- campos
const r1 = (v) => Math.round(v * 10) / 10;
// fondo = promedio del borde del plano para cada componente (procesamiento para el dibujo, se declara en el pie)
function medida(id, { cropLong } = {}) {
  const s = DATOS.sesiones[id];
  let { xs, ys, grid } = s;
  let j0 = 0, j1 = ys.length - 1;
  if (cropLong) { j0 = ys.findIndex((y) => y >= cropLong[0]); j1 = ys.findLastIndex((y) => y <= cropLong[1]); }
  const edge = [];
  grid.forEach((row, i) => row.forEach((v, j) => { if (v && (i === 0 || i === xs.length - 1 || j === 0 || j === ys.length - 1)) edge.push(v); }));
  const bg = [0, 1, 2].map((c) => edge.reduce((a, v) => a + v[c], 0) / edge.length);
  const ysC = ys.slice(j0, j1 + 1);
  const comp = (c) => xs.map((_, i) => ysC.map((_, j) => r1(grid[i][j0 + j][c] - bg[c])));
  const bx = comp(0), by = comp(1), bz = comp(2);
  const m = bx.map((row, i) => row.map((_, j) => r1(Math.hypot(bx[i][j], by[i][j], bz[i][j]))));
  return { short: xs.map((x) => x / 2), long: ysC.map((y) => y / 2), comps: { m, x: bx, y: by, z: bz }, bg: bg.map(r1), s };
}
// anular: forma según la teoría (Biot–Savart de espiras circulares concéntricas), escala de la Fig. 2.10 de la tesis
// forma según la teoría: ley de Biot–Savart sobre espiras cerradas (polilíneas en mm desde el centro de la placa),
// en un plano paralelo a la bobina a h mm; la escala se toma del Hz máximo de la figura de la tesis (G → µT, ×100)
function biot(loops, hzMaxUT, h = 8, signo = "hz") {
  const NL = 37, NS = 25, LW = 180, SW = 120;
  const long = Array.from({ length: NL }, (_, j) => (j / (NL - 1)) * LW), short = Array.from({ length: NS }, (_, i) => (i / (NS - 1)) * SW);
  const segs = [];
  for (const L of loops) for (let q = 0; q < L.length; q++) { const s0 = L[q], s1 = L[(q + 1) % L.length]; segs.push([s1[0] - s0[0], s1[1] - s0[1], (s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2]); }
  const B = short.map((sy) => long.map((lx) => {
    const p = [lx - LW / 2, sy - SW / 2, h], b = [0, 0, 0];
    for (const [dx, dy, mx, my] of segs) {
      const r = [p[0] - mx, p[1] - my, p[2]], rn = Math.hypot(...r) ** 3;
      b[0] += (dy * r[2]) / rn; b[1] += (-dx * r[2]) / rn; b[2] += (dx * r[1] - dy * r[0]) / rn;
    }
    return b; // b[0] sobre el eje largo, b[1] sobre el corto
  }));
  const zmax = Math.max(...B.flat().map((b) => Math.abs(b[2])));
  // el signo depende del sentido de la corriente (no se conoce): se elige como en la figura de la tesis
  const c = B[Math.floor(NS / 2)][Math.floor(NL / 2)], ref = signo === "hz" ? c[2] : c[0];
  const sc = (hzMaxUT / zmax) * (ref < 0 ? -1 : 1);
  // nombres del sistema: Bx = eje corto, By = eje largo
  const bx = B.map((row) => row.map((b) => r1(b[1] * sc))), by = B.map((row) => row.map((b) => r1(b[0] * sc))), bz = B.map((row) => row.map((b) => r1(b[2] * sc)));
  const m = bx.map((row, i) => row.map((_, j) => r1(Math.hypot(bx[i][j], by[i][j], bz[i][j]))));
  return { short, long, comps: { m, x: bx, y: by, z: bz } };
}
const circle = (cx, r, n = 96) => Array.from({ length: n }, (_, q) => [cx + r * Math.cos((q / n) * 2 * Math.PI), r * Math.sin((q / n) * 2 * Math.PI)]);
// anular: 14 espiras concéntricas de 18 a 55 mm (las del dibujo); Fig. 2.10: Hz máximo ≈ 45 G
const FA = biot(Array.from({ length: 14 }, (_, t) => circle(0, 18 + t * 2.85)), 4500);
// doble D: las mismas espiras en D del dibujo; el reflejo invierte el sentido de giro (corrientes opuestas, como en
// una bobina de mariposa); Fig. 2.15: Hz máximo ≈ 45 G
const dLoops = [];
for (const side of [-1, 1]) for (let t = 0; t < 11; t++) {
  const inset = 6 + t * 3.6, w = 94 - inset, hh = 58 - inset * 0.62;
  if (w < 14 || hh < 10) break;
  const fx = side * (2 + inset * 0.35), q = [];
  for (let i = 0; i <= 48; i++) { const a = -Math.PI / 2 + (i / 48) * Math.PI; q.push([fx + side * w * Math.cos(a), hh * Math.sin(a)]); }
  dLoops.push(q);
}
const FD = biot(dLoops, 4500, 22, "largo"); // Fig. 2.15: la componente del eje largo es positiva al centro; // plano a 22 mm: a 8 mm los lados rectos del centro dan picos que la Fig. 2.15 no tiene
const F117 = medida(117, { cropLong: [30, 390] });
// centro de cada sábana sobre su placa (mm reales desde la esquina de la placa)
const SHEETS = [
  { unit: 0, ...FA, center: [PLACA.w / 2, PLACA.d / 2], nombre: "A) Anular", fuente: "simulación teórica (Fig. 2.10)", tipo: "sim", fig: "2.10" },
  { unit: 1, ...F117, center: [PLACA.w / 2, PLACA.d / 2], nombre: "B) En 8", fuente: "medición, sesión 117", tipo: "med", sesion: 117 },
  { unit: 2, ...FD, center: [PLACA.w / 2, PLACA.d / 2], nombre: "C) Doble D", fuente: "simulación teórica (Fig. 2.15)", tipo: "sim", fig: "2.15" },
].map((s) => ({ unit: s.unit, nombre: s.nombre, fuente: s.fuente, tipo: s.tipo, fig: s.fig || null, sesion: s.sesion || null, bg: s.bg || null, short: s.short, long: s.long, comps: s.comps, origin: [ORIG[s.unit][0] + s.center[0] - (s.long.at(-1) - s.long[0]) / 2, ORIG[s.unit][1] + s.center[1] - (s.short.at(-1) - s.short[0]) / 2] }));

// ---------------------------------------------------------------- SVG y página
const body = T.settle();
const LABEL = "Tres bobinas sobre su soporte rojo (anular, en forma de 8 y en doble D) y, encima de cada una, la sábana de su campo magnético: una superficie sobre un plano paralelo a la bobina cuya altura y color siguen la magnitud del campo.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<g data-root>${body}<g data-part="sabanas"></g></g>`] });
const DATA = { P, W, H, TOP, PLANE_HI, HS, sheets: SHEETS, units: UNITS, placa: PLACA, orig: ORIG };
const CSS = readFileSync(join(HERE, "..", "sistema", "savd.css"), "utf8") + readFileSync(join(HERE, "d3.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const nav = `<nav class="sv-nav" aria-label="Figuras del SAVD"><a href="../sistema/savd-sistema.html">Fig. 1 · Sistema completo</a><a href="../cabezal-bobina/cabezal-bobina.html">Fig. D1 · Sensor y bobina</a><a href="../pico-driver-motor/pico-driver-motor.html">Fig. D2 · Pico, driver y motor</a><a href="../bobinas/bobinas.html" aria-current="page">Fig. D3 · Bobinas y su campo</a></nav>`;
const btn = (attr, val, key, label, pressed) => `<button type="button" ${attr}="${val}" aria-pressed="${pressed}"><b>${key}</b> ${label}</button>`;
const controls = `${nav}<div class="sv-bar" role="toolbar" aria-label="Controles de la figura">
<span class="sv-grupo">${btn("data-foco", "0", "0", "Las tres", true)}${btn("data-foco", "1", "1", "Anular", false)}${btn("data-foco", "2", "2", "En 8", false)}${btn("data-foco", "3", "3", "Doble D", false)}</span>
<span class="sv-grupo">${btn("data-comp", "m", "M", "|B|", true)}${btn("data-comp", "x", "X", "Bx", false)}${btn("data-comp", "y", "Y", "By", false)}${btn("data-comp", "z", "Z", "Bz", false)}</span>
<span class="sv-grupo">${btn("data-sabana", "1", "S", "Sábana", true)}${btn("data-bajar", "1", "G", "Bajar al plano", false)}</span>
</div>`;
const page = k.pageHtml({
  title: "SAVD: bobinas y su campo", theme: "light", width: 1100, script: kitScript() + LIVE,
  body: `<style>${CSS}</style>` + k.plateHtml({
    fig: "Fig. D3",
    title: "Bobinas y su campo",
    hint: "1–3 bobina · M X Y Z · S · G",
    readout: "distribución del campo magnético |B|",
    keys: [
      { mark: "raised", label: "Cada topología de bobina produce un patrón de campo distinto" },
      { mark: "lit", label: "Sábana: el campo medido (o simulado) sobre un plano paralelo a la bobina; altura y color = magnitud" },
      { mark: "flat", label: "Guías punteadas: unen la bobina con el plano de su sábana" },
    ],
    caption: `Tres topologías de bobina para estimulación magnética transcraneal, dibujadas con el mismo soporte que la doble D del SAVD (medidas aproximadas, sacadas de las fotos; las tres se dibujan del mismo tamaño). Encima de cada una, la distribución del campo magnético sobre un plano paralelo a la bobina. A) Anular: forma según la teoría (ley de Biot–Savart para espiras circulares concéntricas), con la escala de la Fig. 2.10 de la tesis (Hz máximo ≈ 45 G = 4500 µT). B) En 8: medición real, sesión 117 (2026-11-19); se restó el fondo (el promedio del borde del plano: campo de la Tierra y del entorno), porque se guardó sin restarlo (offset 0). C) Doble D: forma según la teoría (Biot–Savart sobre las espiras en D del dibujo, con corrientes opuestas en las dos D), con la escala de la Fig. 2.15 (Hz máximo ≈ 45 G = 4500 µT); las mediciones reales de la doble D (sesiones 127, 128 y 130) están en la etapa 4 de la Fig. 1. Cada sábana tiene su propia escala de color. Posiciones en mm reales (mm reales = mm del sistema ÷ 2). El plano de la sábana se dibuja más alto que la altura real de medición para que se vea; la tecla G lo baja hasta la bobina.`,
    body: `${controls}<div class="iso-stage sv-stage" tabindex="0" role="group" aria-label="Bobinas y su campo. Teclas 1 a 3 enfocan una bobina y 0 las tres; M, X, Y y Z cambian la componente; S muestra u oculta la sábana; G la baja hasta la bobina.">${svg}<span class="sv-sr" role="status" aria-live="polite" data-status></span></div>`,
  }),
});
writeFileSync(join(HERE, "bobinas.html"), page);
console.log("escrito bobinas.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} piezas`, `${R.solids.length} sólidos`, "fondo 117", JSON.stringify(F117.bg));
A.auditOrExit(R, P);
