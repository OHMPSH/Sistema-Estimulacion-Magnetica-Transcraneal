// Figura principal del SAVD (Anatomy). Genera savd-sistema.html junto a este archivo.
//   node build.mjs            → escribe la página
//   node build.mjs --audit    → además audita la geometría (uniones, cables, orden de dibujo)
//   node build.mjs --audit --pose 205,281,44   → audita con la mesa en otra posición (eje corto, eje largo, Z en mm reales)
// Necesita la skill Anatomy (por defecto en ~/.claude/skills/anatomy; otra ruta con ANATOMY_KIT).
// Medidas de dibujo (caja, arco, soporte de la bobina) estimadas de las fotos: NO son datos.
// Datos (recorridos, velocidades, sensor, lecturas): ver LEEME.md y datos.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = process.env.ANATOMY_KIT || join(homedir(), ".claude", "skills", "anatomy");
const imp = (rel) => import(pathToFileURL(join(KIT, rel)).href);
const k = await imp("kit/iso-kit.mjs");
const G = await imp("kit/lathe.mjs");
const { tubePieces, tubeSvg } = await imp("kit/tube.mjs");
const A = await imp("kit/audit.mjs");
const { kitScript } = await imp("scripts/inline-kit.mjs");

// ---------------------------------------------------------------- datos verdaderos
const DATOS = JSON.parse(readFileSync(join(HERE, "datos.json"), "utf8"));
const REC = { corto: 205, largo: 281, z: 44 }; // firmware/config.py (410, 562, 88 mm del sistema) ÷ 2

const poseArg = process.argv.indexOf("--pose");
const [PC, PL, PZ] = poseArg > 0 ? process.argv[poseArg + 1].split(",").map(Number) : [0, 0, 0];

// ---------------------------------------------------------------- mundo (1 unidad = 1 mm real)
// x = eje largo (riel del arco) · y = eje corto (cama oculta; arrastra el arco) · z = altura
const W = 760;
const H = 720;
const AZ = 57;
const EL = 30;
const BY0 = 71.5; // centro del arco en reposo (= centro de la cama)
const X0 = 70; // x del cabezal en reposo
const BY = BY0 + PC;
const XC = X0 + PL;
const HZ = 150.5 + PZ; // cara superior del plato (sensor sobre la bobina; la separación real está por confirmar)

// Capas que se separan (vector de cada una) y orden de salida: la de afuera sale primero.
const EXP = {
  electronica: [0, 0, 170],
  arco: [0, 0, 130],
  bobina: [0, 0, 95],
  tapa: [0, 0, 60],
};
const STAGGER = Object.keys(EXP);
const SPRING = { stagger: 0.045, stiffness: 64, damping: 14.2, substeps: 4 };

// Grupos de dibujo en orden fijo (de atrás hacia adelante). Cada grupo se mueve entero:
// mov = qué ejes lo arrastran; capa = vector de separación.
const GROUPS = [
  ["suelo", "", ""],
  ["caja", "", ""],
  ["base", "", ""],
  ["cama", "c", ""],
  ["arcoIzq", "c", "arco"],
  ["paredDer", "", ""],
  ["camaDer", "c", ""],
  ["paredFrente", "", ""],
  ["tapa", "", "tapa"],
  ["cablesFondo", "", ""],
  ["bobina", "", "bobina"],
  ["bobinaFrente", "", "bobina"],
  ["arco", "c", "arco"],
  ["electronica", "c", "electronica"],
  ["cableLargo", "c", "arco"],
  ["cablesAtras", "", ""],
  ["carro", "cl", "arco"],
  ["cabezal", "clz", "arco"],
  ["cablesFrente", "", ""],
  ["pantallas", "", ""],
];
const GI = Object.fromEntries(GROUPS.map(([g], i) => [g, i]));
const GROUP = Object.fromEntries(GROUPS.map(([g, mov, capa]) => [g, { mov, capa }]));

// ---------------------------------------------------------------- cámara
const FIT = [
  [-40, -10, 0], [470, -10, 0], [470, 440, 0], [-40, 440, 0], [640, 380, 0], [700, 580, 0], [430, 560, 0],
  [-40, -10, 470 + 70], [470, -10, 470 + 70], [-40, 120, 470 + 70], [470, 120, 470],
];
const P = k.fitProjection(FIT, W, H, { pad: 26, azimuth: AZ, elevation: EL });
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (pts, closed = false) => k.pathOf(pts.map(at), closed);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (pts, style) => k.dotsSvg(pts, style);
const wrap = (cls, svg) => (cls ? `<g class="${cls}">${svg}</g>` : svg);

// ---------------------------------------------------------------- registro (auditoría)
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const EXTRA = {};
const extra = (g, svg) => (EXTRA[g] = (EXTRA[g] || "") + svg);
let CAPA = "madera"; // capa de la leyenda para lo que se pone a continuación
function put(name, g, ref, svg, shapes = [], { bias = 0, capa = CAPA } = {}) {
  const grp = GROUP[g];
  const ride = grp.capa || "";
  return R.put({ name, at: ref, bias, svg, shapes, piece: ride, ride, move: ride ? EXP[ride] : [0, 0, 0], g, capa });
}
function slab(name, g, [x0, y0, z0], [x1, y1, z1], { tone = "mid", cls = "", r = 0.6, steps = 2, bevel = 0, inner = "", extra = "", bias = 0, lit, ground } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = R.solid(A.slab(plan, z0, z1 - z0, { name, ...(ground ? { ground: true } : {}) }, steps));
  const svg = wrap(cls, S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone, inner, lit }) + extra);
  return put(name, g, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], svg, [shape], { bias });
}
function prismZ(name, g, ring, z0, z1, { tone = "mid", cls = "", extra = "", inner = "", bias = 0, lit } = {}) {
  const shape = R.solid(A.extruded(ring, z0, z1 - z0, { name }));
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const svg = wrap(cls, S(k.extrude(ring, z0, z1 - z0, P, { convex: true }), { tone, inner, lit }) + extra);
  return put(name, g, [cx, cy, (z0 + z1) / 2], svg, [shape], { bias });
}
function cyl(name, g, cx, cy, r, z0, z1, { tone = "mid", cls = "", extra = "", inner = "", bias = 0, lit, bevel = 0 } = {}) {
  const shape = R.solid(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
  const steps = Math.max(16, Math.min(72, Math.round(r * KS * 2)));
  const svg = wrap(cls, S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone, inner, lit }) + extra);
  return put(name, g, [cx, cy, (z0 + z1) / 2], svg, [shape], { bias });
}
// Barra redonda a lo largo de un eje (varillas, husillos, acoples)
function rod(name, g, a, axis, s0, s1, r, { tone = "mid", cls = "", extra = "", bias = 0, lit } = {}) {
  const F = G.frameAlong(a, axis);
  const shape = R.solid(A.disc(F, s0, s1, r, { name }));
  const svg = wrap(cls, S(G.disc(s0, s1, r, F, P), { tone, lit }) + extra);
  return put(name, g, G.add3(a, G.mul3(axis, (s0 + s1) / 2)), svg, [shape], { bias });
}
function prismF(name, g, F, poly, s0, s1, { tone = "mid", cls = "", extra = "", bias = 0, lit } = {}) {
  const shape = R.solid(A.prism(F, poly, s0, s1, { name }));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const c = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
  return put(name, g, c, wrap(cls, S(G.prismOf(F, poly, s0, s1, P), { tone, lit }) + extra), [shape], { bias });
}
const CABLES = [];
function cable(name, g, points, r, { tone = "mid", cls = "", bend = 3, free = [false, false], shells = [false, false], ends = [true, true], maxLength = 14, gaps = [], touch, bias = 0.05 } = {}) {
  const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = Math.max(2.4, r * 2.4);
  const allGaps = [...(shells[0] ? [[0, SHELL]] : []), ...gaps, ...(shells[1] ? [[total - SHELL, total]] : [])];
  const grp = GROUP[g];
  const ride = grp.capa || "";
  R.route(name, route, r, { gaps: allGaps, limp: true, touch, rims: shells.map((on) => (on ? r * 1.8 : r)), free, piece: ride, ride, move: ride ? EXP[ride] : [0, 0, 0] });
  CABLES.push(name);
  tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)), gaps: allGaps }).forEach((piece, i) =>
    put(`${name}:${i}`, g, piece.mid, wrap(cls, tubeSvg(piece, { tone })), [A.tube(piece.points, piece.radii)], { bias }),
  );
  [0, 1].forEach((i) => {
    const end = i ? route[route.length - 1] : route[0];
    const tangent = G.tangentAlong(route, i ? total : 0);
    if (shells[i]) {
      const F = G.frameAlong(end, tangent);
      const [s0, s1] = i ? [-SHELL, 0] : [0, SHELL];
      const shape = R.solid(A.disc(F, s0, s1, r * 1.8, { name: `${name}.conector${i}`, owner: name }));
      put(`${name}.conector${i}`, g, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, r * 1.8, F, P, { bevel: 0.2 }), { tone: "mid" }), [shape], { bias: bias + 0.1 });
    } else if (ends[i]) {
      const size = Math.max(0.5, r * KS * 0.9);
      put(`${name}.punta${i}`, g, end, Dots([at(end)], { size, tone: "hi" }), [A.ball(end, size / KS, { name: `${name}.punta${i}`, owner: name })], { bias: bias + 0.15 });
    }
  });
  return route;
}
const screwDots = (pts, z, size = 0.55) => Dots(pts.map(([x, y]) => at([x, y, z])), { size, tone: "mid" });
const rule = (a, b, z, tone = "lo") => Ln(k.lineOnTop(a, b, z, P), { tone, free: true });

// ================================================================ 1. BASE DE MADERA (caja de MDF)
const BOX = { x: 0, y: 0, w: 420, d: 430 };
const LID = [88, 100];
CAPA = "madera";
R.solid(A.slab({ x: -60, y: -40, w: 740, d: 640, r: 0 }, -2, 2, { name: "stand.piso", ground: true }, 2));
extra("suelo", `<path class="iso-halo" d="${k.haloOf({ x: -34, y: -4, w: 488, d: 440, r: 10 }, 0, 100, P)}"/>`);
slab("caja.fondo", "caja", [0, 0, 0], [420, 430, 12], { cls: "t-mdf", tone: "lo", ground: true, inner: Ln(k.sideSeam({ x: 0, y: 0, w: 420, d: 430, r: 0.6 }, 6, P, 2), { tone: "faint" }) });
slab("caja.trasera", "caja", [0, 0, 12], [420, 12, LID[0]], { cls: "t-mdf" });
slab("caja.izq", "caja", [0, 12, 12], [12, 418, 40], { cls: "t-mdf" });
slab("caja.der", "paredDer", [408, 12, 12], [420, 418, 40], { cls: "t-mdf", extra: Dots([40, 140, 290, 390].map((y) => at([420, y, 26])), { size: 0.55, tone: "mid" }) });
{
  const scr = [30, 130, 290, 390].map((x) => at([x, 430, 70]));
  const scr2 = [30, 390].map((x) => at([x, 430, 24]));
  slab("caja.frente", "paredFrente", [0, 418, 12], [420, 430, LID[0]], { cls: "t-mdf", extra: Dots([...scr, ...scr2], { size: 0.55, tone: "mid" }) });
  // escuadras metálicas al pie de la pared del frente
  for (const x of [56, 364]) {
    slab(`caja.escuadra${x}`, "paredFrente", [x - 8, 430, 12], [x + 8, 432, 30], { tone: "mid", extra: Dots([at([x, 432, 24])], { size: 0.5, tone: "hi" }) });
    slab(`caja.escuadraPie${x}`, "paredFrente", [x - 8, 432, 12], [x + 8, 446, 14], { tone: "mid", extra: Dots([at([x, 441, 14])], { size: 0.5, tone: "hi" }) });
  }
}
{
  const lidPlan = { x: 0, y: 0, w: 420, d: 430, r: 0.8 };
  const screws = [[14, 6], [406, 6], [14, 424], [406, 424], [210, 6], [210, 424]];
  slab("tapa.tablero", "tapa", [0, 0, LID[0]], [420, 430, LID[1]], {
    cls: "t-mdf", bevel: 1.2, r: 0.8,
    extra: screwDots(screws, LID[1]) + Ln(screws.map(([x, y]) => k.ring(x, y, 1.6, LID[1], P, 14)).join(""), { tone: "lo" }),
    inner: Ln(k.sideSeam(lidPlan, 94, P, 2), { tone: "faint" }),
  });
}
// regla del eje corto sobre el borde derecho de la tapa (marcas cada 5 mm reales, mayor cada 25)
const RULER_C = { x: 402, y: BY0 - 6, w: 12, d: REC.corto + 12, r: 0.6 };
{
  const t = k.topTicks(RULER_C.y + 6, RULER_C.y + 6 + REC.corto, 5, 5, RULER_C.x, LID[1] + 0.6, [2.2, 4.2], P, "y");
  slab("tapa.regla", "tapa", [RULER_C.x, RULER_C.y, LID[1]], [RULER_C.x + RULER_C.w, RULER_C.y + RULER_C.d, LID[1] + 0.6], { tone: "lo", r: 0.6, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
}
// fuente de 12 V de los motores (caja negra detrás del arco)
{
  const x0 = 296, x1 = 386, y0 = 8, y1 = 52, z0 = LID[1], z1 = LID[1] + 44;
  const vents = Array.from({ length: 7 }, (_, i) => path3([[x0 + 14 + i * 9, y1, z0 + 14], [x0 + 18 + i * 9, y1, z0 + 14], [x0 + 18 + i * 9, y1, z0 + 34], [x0 + 14 + i * 9, y1, z0 + 34]], true)).join("");
  slab("fuente.caja", "tapa", [x0, y0, z0], [x1, y1, z1], { tone: "mid", cls: "t-negro", r: 1.2, steps: 3, bevel: 0.6, extra: Ln(vents, { tone: "faint" }) });
  slab("fuente.bornera", "tapa", [x1, y0 + 8, z0 + 6], [x1 + 4, y1 - 8, z0 + 16], { tone: "lo", cls: "t-verde", extra: Dots([16, 22, 28, 34].map((y) => at([x1 + 4, y0 + y - 4, z0 + 11])), { size: 0.55, tone: "hi" }) });
  slab("fuente.etiqueta", "tapa", [x0 + 12, y0 + 10, z1], [x0 + 52, y0 + 30, z1 + 0.4], { tone: "lo", extra: rule([x0 + 16, y0 + 15], [x0 + 44, y0 + 15], z1 + 0.4) + rule([x0 + 16, y0 + 20], [x0 + 38, y0 + 20], z1 + 0.4) + rule([x0 + 16, y0 + 25], [x0 + 46, y0 + 25], z1 + 0.4) });
}

// ================================================================ 2. BASE 3018 OCULTA: EL EJE CORTO
CAPA = "base3018";
const RODZ = 44;
const profile = (name, a, b) => slab(name, "base", a, b, { tone: "lo", cls: "t-negro", r: 0.8, extra: "" });
profile("base.perfilIzq", [92, 36, 12], [112, 320, 32]);
profile("base.perfilDer", [308, 36, 12], [328, 320, 32]);
profile("base.travAtras", [92, 16, 12], [328, 36, 32]);
profile("base.travFrente", [92, 320, 12], [328, 340, 32]);
for (const x of [140, 280]) {
  slab(`base.soporteAtras${x}`, "base", [x - 12, 16, 32], [x + 12, 30, 54], { tone: "mid", extra: Dots([at([x - 7, 30, 50]), at([x + 7, 30, 50])], { size: 0.5, tone: "hi" }) });
  slab(`base.soporteFrente${x}`, "base", [x - 12, 320, 32], [x + 12, 334, 54], { tone: "mid", extra: Dots([at([x - 7, 334, 50]), at([x + 7, 334, 50])], { size: 0.5, tone: "hi" }) });
  rod(`base.varilla${x}`, "base", [x, 0, RODZ], [0, 1, 0], 30, 320, 5, { tone: "hi" });
}
slab("base.chumacera", "base", [200, 16, 32], [220, 30, 54], { tone: "mid" });
rod("base.husillo", "base", [210, 0, RODZ], [0, 1, 0], 30, 336, 4, { tone: "mid" });
rod("base.acople", "base", [210, 0, RODZ], [0, 1, 0], 336, 360, 9, { tone: "mid", cls: "t-azul" });
slab("base.soporteMotor", "base", [186, 360, 12], [234, 366, 80], { tone: "mid", extra: Dots([[192, 30], [228, 30], [192, 58], [228, 58]].map(([x, z]) => at([x, 366, z])), { size: 0.55, tone: "hi" }) });
function nema(name, g, F, s0, len, { conn = null } = {}) {
  // NEMA 17 corto: cuerpo de 42 × 42 con tapas y anillo; F.a sale del motor hacia su eje
  const sq = [[-21, -21], [21, -21], [21, 21], [-21, 21]];
  const cham = [[-21, -17], [-17, -21], [17, -21], [21, -17], [21, 17], [17, 21], [-17, 21], [-21, 17]];
  prismF(`${name}.tapaAtras`, g, F, cham, s0 - len, s0 - len + 7, { tone: "mid" });
  prismF(`${name}.cuerpo`, g, F, cham.map(([u, v]) => [u * 0.985, v * 0.985]), s0 - len + 7, s0 - 7, { tone: "lo", cls: "t-negro" });
  prismF(`${name}.tapa`, g, F, cham, s0 - 7, s0, { tone: "mid" });
  return sq;
}
nema("base.motor", "base", G.frameOf([210, 366, RODZ], [0, -1, 0], [1, 0, 0], [0, 0, 1]), 0, 34);
// la cama: 5 tablillas de aluminio sobre bloques abiertos (eje corto)
const BED = { x0: 100, x1: 320, y0: 30 + PC, y1: 113 + PC };
for (const x of [140, 280]) for (const y of [BED.y0 + 4, BED.y1 - 18]) slab(`cama.bloque${x}_${Math.round(y - PC)}`, "cama", [x - 10, y, RODZ + 5], [x + 10, y + 14, 56], { tone: "mid" });
slab("cama.tuerca", "cama", [200, BY - 8, RODZ + 4], [220, BY + 8, 56], { tone: "mid", cls: "t-azul" });
{
  const n = 5, gap = 0.8, wd = (BED.y1 - BED.y0 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const y0 = BED.y0 + i * (wd + gap);
    const groove = Ln(k.lineOnTop([BED.x0, y0 + wd / 2], [BED.x1, y0 + wd / 2], 66, P), { tone: "faint" });
    slab(`cama.tablilla${i}`, "cama", [BED.x0, y0, 56], [BED.x1, y0 + wd, 66], { tone: "hi", cls: "t-alu", r: 0.8, extra: groove + (i === 2 ? Dots([at([210, y0 + wd / 2, 66])], { size: 0.8, tone: "hi" }) : "") });
  }
}
// listones de MDF que unen la cama con el arco (salen por el hueco lateral de la caja)
slab("cama.liston", "cama", [-34, BY - 20, 66], [130, BY + 20, 78], { cls: "t-mdf", tone: "mid", extra: screwDots([[115, BY - 10], [115, BY + 10]], 78) });
slab("cama.listonDer", "camaDer", [290, BY - 20, 66], [454, BY + 20, 78], { cls: "t-mdf", tone: "mid", extra: screwDots([[305, BY - 10], [305, BY + 10]], 78) });

// ================================================================ 3. ARCO (se mueve con la cama)
CAPA = "arco";
const PL_Z = [78, 370];
const BEAM = { y0: BY - 20, y1: BY + 20, z0: 370, z1: 390 };
const plate = (name, g, x0, x1) => slab(name, g, [x0, BY - 35, PL_Z[0]], [x1, BY + 35, PL_Z[1]], {
  tone: "lo", cls: "t-negro", r: 1.2, steps: 3, bevel: 0.6,
  extra: Dots([[BY - 26, 96], [BY + 26, 96], [BY - 26, 352], [BY + 26, 352], [BY + 25, 300], [BY + 25, 350], [BY + 25, 325]].map(([y, z]) => at([x1, y, z])), { size: 0.6, tone: "mid" }),
});
plate("arco.placaIzq", "arcoIzq", -34, -22);
slab("arco.escuadraIzqV", "arcoIzq", [-22, BY - 12, 78], [-19, BY + 12, 100], { tone: "mid" });
slab("arco.escuadraIzqH", "arcoIzq", [-19, BY - 12, 78], [0, BY + 12, 81], { tone: "mid", extra: Dots([at([-10, BY, 81])], { size: 0.5, tone: "hi" }) });
plate("arco.placaDer", "arco", 442, 454);
slab("arco.escuadraDerV", "arco", [439, BY - 12, 78], [442, BY + 12, 100], { tone: "mid", extra: Dots([at([439, BY - 5, 92]), at([439, BY + 5, 92])], { size: 0.5, tone: "hi" }) });
slab("arco.escuadraDerH", "arco", [420, BY - 12, 78], [439, BY + 12, 81], { tone: "mid", extra: Dots([at([428, BY, 81])], { size: 0.5, tone: "hi" }) });
// índice del eje corto: brazo en la placa derecha que marca sobre la regla de la tapa
slab("arco.indiceCorto", "arco", [412, BY - 1.6, 101.4], [442, BY + 1.6, 104], { tone: "mid", extra: Ln(k.lineOnTop([412, BY], [418, BY], 104, P), { tone: "lit", free: "start" }) });
{
  // perfil superior ranurado con la regla del eje largo en su cara de enfrente
  const plan = { x: -34, y: BEAM.y0, w: 488, d: 40, r: 1 };
  const slots = [BY - 10, BY, BY + 10].map((y) => k.lineOnTop([-34, y], [454, y], BEAM.z1, P)).join("");
  slab("arco.perfil", "arco", [-34, BEAM.y0, BEAM.z0], [454, BEAM.y1, BEAM.z1], { tone: "mid", cls: "t-negro", r: 1, steps: 3, bevel: 0.6, extra: Ln(slots, { tone: "faint" }), inner: Ln(k.sideSeam(plan, 380, P, 3), { tone: "faint" }) });
  const strip = { x: X0 - 40, y: BEAM.y1, w: REC.largo + 9, d: 0.6, r: 0 };
  const t = k.sideTicks(X0 - 36.5, X0 - 36.5 + REC.largo, 5, 5, BEAM.y1 + 0.6, 381, [2.2, 4.2], P, "x");
  slab("arco.regla", "arco", [strip.x, BEAM.y1, 371], [strip.x + strip.w, BEAM.y1 + 0.6, 381], { tone: "lo", r: 0, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) });
}
CAPA = "ejes";
for (const z of [300, 350]) rod(`arco.varilla${z}`, "arco", [0, BY + 25, z], [1, 0, 0], -22, 442, 5, { tone: "hi" });
rod("arco.husillo", "arco", [0, BY + 25, 325], [1, 0, 0], -22, 414, 4, { tone: "mid" });
rod("arco.acople", "arco", [0, BY + 25, 325], [1, 0, 0], 414, 442, 9, { tone: "mid", cls: "t-azul" });
CAPA = "motores";
nema("arco.motorLargo", "arco", G.frameOf([454, BY + 25, 325], [-1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 34);

// ================================================================ 4. ELECTRÓNICA (sobre el perfil)
CAPA = "electronica";
const DRV = [0, 112, 224].map((x, i) => ({ x0: x, x1: x + 96, eje: ["corto", "z", "largo"][i] }));
const DZ = [BEAM.z1, BEAM.z1 + 33];
DRV.forEach((d, i) => {
  const n = `driver${i + 1}`;
  const fins = Array.from({ length: 9 }, (_, j) => k.planOutline({ x: d.x0 + 9.4 + j * 9.5, y: BY - 25, w: 1.4, d: 11, r: 0.6 }, DZ[1], P, 2)).join("");
  slab(`${n}.caja`, "electronica", [d.x0, BY - 28, DZ[0]], [d.x1, BY + 28, DZ[1]], { tone: "lo", cls: "t-negro", r: 1.4, steps: 3, bevel: 0.5, extra: Ln(fins, { tone: "faint" }) });
  // interruptores DIP (S1–S6; 400 pulsos/vuelta)
  slab(`${n}.dip`, "electronica", [d.x0 + 58, BY - 8, DZ[1]], [d.x0 + 82, BY + 2, DZ[1] + 1.6], { tone: "hi", cls: "t-blanco", extra: Dots(Array.from({ length: 6 }, (_, j) => at([d.x0 + 60.5 + j * 3.8, BY - 3 + (j < 3 ? 2 : -2) * (j % 2 ? 1 : 0), DZ[1] + 1.6])), { size: 0.45, tone: "hi" }) });
  slab(`${n}.etiqueta`, "electronica", [d.x0 + 10, BY - 8, DZ[1]], [d.x0 + 50, BY + 20, DZ[1] + 0.3], { tone: "lo", extra: rule([d.x0 + 14, BY - 3], [d.x0 + 44, BY - 3], DZ[1] + 0.3) + rule([d.x0 + 14, BY + 3], [d.x0 + 38, BY + 3], DZ[1] + 0.3) + rule([d.x0 + 14, BY + 9], [d.x0 + 46, BY + 9], DZ[1] + 0.3) + rule([d.x0 + 14, BY + 15], [d.x0 + 30, BY + 15], DZ[1] + 0.3) });
  // bornera verde en la cara de enfrente: ENA DIR PUL · B− B+ A− A+ · GND VCC
  const term = Array.from({ length: 12 }, (_, j) => at([d.x0 + 13 + j * 6.4, BY + 34, DZ[0] + 13]));
  slab(`${n}.bornera`, "electronica", [d.x0 + 9, BY + 28, DZ[0] + 4], [d.x0 + 89, BY + 34, DZ[0] + 18], { tone: "mid", cls: "t-verde", extra: Dots(term, { size: 0.6, tone: "hi" }) });
  slab(`${n}.led`, "electronica", [d.x0 + 88, BY + 12, DZ[1]], [d.x0 + 92, BY + 16, DZ[1] + 1.2], { tone: "hi", cls: "led-pul", extra: "" });
  slab(`${n}.cincho`, "electronica", [d.x0 + 2, BY - 29, DZ[1]], [d.x0 + 6, BY + 29, DZ[1] + 1], { tone: "lo" });
});
// shield de placa perforada con la Pico 2 W
const SH = { x0: 334, x1: 414, y0: BY - 25, y1: BY + 25, z: DZ[0] + 4 };
for (const [x, y] of [[SH.x0 + 5, SH.y0 + 5], [SH.x1 - 5, SH.y0 + 5], [SH.x0 + 5, SH.y1 - 5], [SH.x1 - 5, SH.y1 - 5]]) cyl(`shield.poste${x}_${Math.round(y - PC)}`, "electronica", x, y, 2.2, DZ[0], SH.z, { tone: "mid", cls: "t-blanco" });
{
  const holes = [];
  for (let x = SH.x0 + 4; x < SH.x1 - 2; x += 5.08) for (let y = SH.y0 + 4; y < SH.y1 - 2; y += 5.08) holes.push(at([x, y, SH.z + 1.6]));
  slab("shield.placa", "electronica", [SH.x0, SH.y0, SH.z], [SH.x1, SH.y1, SH.z + 1.6], { tone: "mid", cls: "t-pcb", r: 1, extra: Dots(holes, { size: 0.35, tone: "lo" }) });
}
const PICO = { x0: 346, x1: 397, y0: BY - 10.5, y1: BY + 10.5, z: SH.z + 1.6 + 8.5 };
slab("pico.peineA", "electronica", [PICO.x0 + 1, PICO.y0, SH.z + 1.6], [PICO.x1 - 1, PICO.y0 + 2.6, PICO.z], { tone: "lo" });
slab("pico.peineB", "electronica", [PICO.x0 + 1, PICO.y1 - 2.6, SH.z + 1.6], [PICO.x1 - 1, PICO.y1, PICO.z], { tone: "lo" });
{
  const pads = [];
  for (let i = 0; i < 20; i++) pads.push(at([PICO.x0 + 1.6 + i * 2.54, PICO.y0 + 1.2, PICO.z + 1]), at([PICO.x0 + 1.6 + i * 2.54, PICO.y1 - 1.2, PICO.z + 1]));
  slab("pico.placa", "electronica", [PICO.x0, PICO.y0, PICO.z], [PICO.x1, PICO.y1, PICO.z + 1], { tone: "hi", cls: "t-pcbPico", r: 1.2, extra: Dots(pads, { size: 0.4, tone: "mid" }) });
}
slab("pico.rp2350", "electronica", [PICO.x0 + 18, BY - 3.5, PICO.z + 1], [PICO.x0 + 25, BY + 3.5, PICO.z + 1.9], { tone: "lo", extra: Dots([at([PICO.x0 + 19, BY - 2.5, PICO.z + 1.9])], { size: 0.35, tone: "mid" }) });
slab("pico.wifi", "electronica", [PICO.x0 + 34, BY - 5.5, PICO.z + 1], [PICO.x0 + 46, BY + 5.5, PICO.z + 2.6], { tone: "hi", cls: "t-metal", r: 0.6, bevel: 0.3 });
slab("pico.usb", "electronica", [PICO.x0 - 1.4, BY - 4, PICO.z + 1], [PICO.x0 + 4.4, BY + 4, PICO.z + 3.6], { tone: "hi", cls: "t-metal", r: 0.5 });
slab("pico.bootsel", "electronica", [PICO.x0 + 9, BY + 3, PICO.z + 1], [PICO.x0 + 13, BY + 7, PICO.z + 2.4], { tone: "hi", cls: "t-blanco" });
slab("pico.led", "electronica", [PICO.x0 + 6, BY - 6, PICO.z + 1], [PICO.x0 + 7.6, BY - 4.4, PICO.z + 1.6], { tone: "hi", cls: "led-pico" });
const ANTENA = [PICO.x1 - 2.5, BY, PICO.z + 1.2];
// conector del sensor en el shield (GP0 SDA, GP1 SCL, 3V3, GND)
const SCONN = { x0: 400, x1: 410, y0: BY + 14, y1: BY + 22, z0: SH.z + 1.6, z1: SH.z + 10 };
slab("shield.conectorSensor", "electronica", [SCONN.x0, SCONN.y0, SCONN.z0], [SCONN.x1, SCONN.y1, SCONN.z1], { tone: "lo" });

// cable del motor del eje largo (del driver 3 al motor, por el perfil y la placa derecha)
CAPA = "electronica";
{
  const d = DRV[2];
  cable("cable.motorLargo", "cableLargo", [[d.x0 + 54, BY + 34, DZ[0] + 11], [d.x0 + 54, BY + 37.5, DZ[0] + 11], [496, BY + 37.5, DZ[0] + 11], [496, BY + 37.5, 325], [496, BY + 25, 325], [488, BY + 25, 325]], 1.5, { tone: "mid", bend: 4, shells: [true, false], free: [true, false] });
}

// ================================================================ 5. CARRO DEL EJE LARGO Y EJE Z
CAPA = "ejes";
const CAR = { x0: XC - 35, x1: XC + 35, y0: BY + 30, y1: BY + 44, z0: 280, z1: 388 };
slab("carro.placa", "carro", [CAR.x0, CAR.y0, CAR.z0], [CAR.x1, CAR.y1, CAR.z1], {
  tone: "mid", cls: "t-negro", r: 1.2, steps: 3, bevel: 0.6,
  extra: Dots([[CAR.x0 + 6, 290], [CAR.x1 - 6, 290], [CAR.x0 + 6, 380], [CAR.x1 - 6, 380], [CAR.x0 + 6, 335], [CAR.x1 - 6, 335]].map(([x, z]) => at([x, CAR.y1, z])), { size: 0.6, tone: "mid" }),
});
slab("carro.indice", "carro", [CAR.x0 - 3.5, BEAM.y1 + 0.6, 371.5], [CAR.x0, CAR.y0, 379], { tone: "mid", extra: Ln(k.lineOnTop([CAR.x0 - 3.5 + 1.75, BEAM.y1 + 0.6], [CAR.x0 - 3.5 + 1.75, BEAM.y1 + 4], 379, P), { tone: "lit", free: "end" }) });
const ZF = { y0: BY + 44, y1: BY + 70 };
slab("carro.bloqueInf", "carro", [XC - 32, ZF.y0, 240], [XC + 32, ZF.y1, 252], { tone: "lo", cls: "t-negro", r: 1, steps: 3 });
slab("carro.bloqueSup", "carro", [XC - 32, ZF.y0, 380], [XC + 32, ZF.y1, 392], { tone: "lo", cls: "t-negro", r: 1, steps: 3 });
for (const dx of [-22, 22]) rod(`carro.varillaZ${dx}`, "carro", [XC + dx, BY + 57, 0], [0, 0, 1], 252, 380, 4, { tone: "hi" });
rod("carro.husilloZ", "carro", [XC, BY + 57, 0], [0, 0, 1], 252, 380, 4, { tone: "mid" });
CAPA = "motores";
for (const [dx, dy] of [[-16, -10], [16, -10], [-16, 10], [16, 10]]) cyl(`carro.separador${dx}_${dy}`, "carro", XC + dx, BY + 57 + dy, 3, 392, 422, { tone: "hi", cls: "t-blanco" });
rod("carro.acopleZ", "carro", [XC, BY + 57, 0], [0, 0, 1], 392, 422, 8, { tone: "mid", cls: "t-azul" });
slab("carro.placaMotor", "carro", [XC - 24, BY + 35, 422], [XC + 24, BY + 79, 425], { tone: "lo", cls: "t-negro", r: 1.4, steps: 3 });
nema("carro.motorZ", "carro", G.frameOf([XC, BY + 57, 425], [0, 0, -1], [1, 0, 0], [0, 1, 0]), 0, 34);
const ZMOTOR_TOP = 459;

// ================================================================ 6. CABEZAL (lo que sube y baja en Z)
CAPA = "cabezal";
const CY = BY + 105; // eje del cilindro rojo
slab("cabezal.bloqueZ", "cabezal", [XC - 30, BY + 61, HZ + 106], [XC + 30, BY + 75, HZ + 156], { tone: "mid", cls: "t-negro", r: 1, steps: 3, bevel: 0.5, extra: Dots([[XC - 24, HZ + 112], [XC + 24, HZ + 112], [XC - 24, HZ + 150], [XC + 24, HZ + 150]].map(([x, z]) => at([x, BY + 75, z])), { size: 0.55, tone: "mid" }) });
{
  const oct = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 + Math.PI / 8 + Math.PI / 2; const R0 = 30 / Math.cos(Math.PI / 8); return [XC + R0 * Math.cos(a), CY + R0 * Math.sin(a)]; });
  // abrazadera octagonal de dos mitades: la junta y el tornillo a la derecha
  const seam = [7].map((i) => { const [x, y] = oct[i]; return path3([[x, y, HZ + 116], [x, y, HZ + 146]]); }).join("");
  prismZ("cabezal.abrazadera", "cabezal", oct, HZ + 116, HZ + 146, { tone: "lo", cls: "t-negro", inner: Ln(seam, { tone: "faint" }) });
  rod("cabezal.tornillo", "cabezal", [XC + 30, CY + 12, HZ + 131], [1, 0, 0], 0, 5, 3.2, { tone: "hi", cls: "t-metal" });
}
cyl("cabezal.cilindroBajo", "cabezal", XC, CY, 26, HZ + 100, HZ + 116, { tone: "mid", cls: "t-rojo" });
cyl("cabezal.cilindroAlto", "cabezal", XC, CY, 26, HZ + 146, HZ + 162, { tone: "mid", cls: "t-rojo" });
cyl("cabezal.aro", "cabezal", XC, CY, 28, HZ + 162, HZ + 166, { tone: "mid", cls: "t-rojo", bevel: 0.6 });
slab("cabezal.columna", "cabezal", [XC - 5, CY - 14, HZ], [XC + 5, CY - 6, HZ + 100], { tone: "mid", cls: "t-rojo", r: 0.8 });
cyl("cabezal.plato", "cabezal", XC, CY, 16, HZ - 2, HZ, { tone: "mid", cls: "t-rojo" });
// módulo azul (rotulado HMC5883L; el chip es un QMC5883P en 0x2C) con sus 5 pines hacia arriba
const MOD = { x0: XC - 7, x1: XC + 7, y0: CY - 4, y1: CY + 14, z0: HZ, z1: HZ + 1.6 };
const SENSOR = [XC, CY + 5, MOD.z1];
slab("cabezal.modulo", "cabezal", [MOD.x0, MOD.y0, MOD.z0], [MOD.x1, MOD.y1, MOD.z1], {
  tone: "hi", cls: "t-azulMod", lit: true, r: 0.6,
  extra: Ln(k.lineOnTop([XC - 4, CY + 11], [XC + 1, CY + 11], MOD.z1, P) + k.lineOnTop([XC - 4, CY + 11], [XC - 4, CY + 7], MOD.z1, P), { tone: "lit", free: true }),
});
slab("cabezal.chip", "cabezal", [XC - 1.5, CY + 3.5, MOD.z1], [XC + 1.5, CY + 6.5, MOD.z1 + 0.9], { tone: "lo", extra: "" });
// componentes SMD del módulo (se ven en el acercamiento de la etapa 2): capacitores, regulador y resistencias
for (const [x0, y0, w, d, cls] of [[XC + 3, CY + 1, 1.6, 0.8, "t-oro"], [XC + 3, CY + 3, 1.6, 0.8, "t-oro"], [XC - 5.5, CY + 2, 1.6, 0.8, "t-oro"], [XC + 3, CY + 8, 1, 2, "t-blanco"], [XC + 5, CY + 8, 1, 2, "t-blanco"]]) slab(`cabezal.smd${x0 - XC}_${y0 - CY}`, "cabezal", [x0, y0, MOD.z1], [x0 + w, y0 + d, MOD.z1 + 0.5], { tone: "mid", cls, r: 0.15 });
slab("cabezal.regulador", "cabezal", [XC - 5.8, CY + 5, MOD.z1], [XC - 3.2, CY + 8.4, MOD.z1 + 0.9], { tone: "lo", cls: "t-negro", r: 0.2 });
extra("cabezal", `<g data-part="drdy" opacity="0">${Dots([at([XC, CY + 5, MOD.z1 + 0.95])], { size: 1.6, tone: "hi" })}</g>`);
for (let i = 0; i < 5; i++) cyl(`cabezal.pin${i}`, "cabezal", XC - 4 + i * 2, CY - 2.5, 0.35, MOD.z1, HZ + 4, { tone: "hi", cls: "t-oro" });
slab("cabezal.dupont", "cabezal", [XC - 5.5, CY - 4, HZ + 4], [XC + 5.5, CY - 1, HZ + 11], { tone: "lo" });
// cable del sensor por la columna, con el cincho rojo
{
  const route = [[XC, CY - 2.5, HZ + 11], [XC, CY - 2.5, HZ + 18], [XC, CY - 3.9, HZ + 26], [XC, CY - 3.9, HZ + 100]];
  const rr = G.fillet(route, 3.2, 10, { P, tube: 1.3 });
  const tieAt = G.pathLength(rr) - (HZ + 100 - (HZ + 52));
  cable("cabezal.cableSensor", "cabezal", route, 1.3, { tone: "mid", cls: "t-azulCable", bend: 3.2, ends: [false, false], gaps: [[tieAt - 2.9, tieAt + 2.9]] });
  slab("cabezal.cincho", "cabezal", [XC - 6, CY - 6, HZ + 50], [XC + 6, CY - 1.9, HZ + 54], { tone: "mid", cls: "t-rojo" });
}

// ================================================================ 7. BOBINA EN DOBLE D
CAPA = "bobina";
const COIL = { x0: 60, x1: 260, y0: 172, y1: 297, z: 138 };
for (const [x, y] of [[78, 186], [242, 186], [160, 300]]) cyl(`bobina.pata${x}`, "bobina", x, y, 7, LID[1], 130, { tone: "mid", cls: "t-rojo" });
prismZ("bobina.marco", "bobina", [[48, 166], [272, 166], [258, 314], [62, 314]], 130, COIL.z, { tone: "mid", cls: "t-rojo" });
{
  // las dos espirales en D (figura de 8), lado plano hacia el centro; quedan a la vista
  const cx = (COIL.x0 + COIL.x1) / 2, cy = (COIL.y0 + COIL.y1) / 2;
  const turns = [];
  for (const side of [-1, 1]) {
    for (let t = 0; t < 11; t++) {
      const inset = 6 + t * 3.6;
      const w = 94 - inset, h = 58 - inset * 0.62;
      if (w < 14 || h < 10) break;
      const fx = cx + side * (2 + inset * 0.35);
      const pts = [];
      for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; pts.push([fx + side * w * Math.cos(a), cy + h * Math.sin(a)]); }
      turns.push(k.onTop(pts, COIL.z + 4, P, true));
    }
  }
  slab("bobina.placa", "bobina", [COIL.x0, COIL.y0, COIL.z], [COIL.x1, COIL.y1, COIL.z + 4], { tone: "lo", r: 1.2, steps: 3, extra: Ln(turns.join(""), { tone: "mid", className: "cobre" }) });
  for (const x of [150, 170]) cyl(`bobina.terminal${x}`, "bobinaFrente", x, 302 - 12, 3.2, COIL.z + 4, COIL.z + 12, { tone: "hi", cls: "t-metal" });
}
// cables gruesos rojo y negro hacia la fuente de laboratorio (fuera de la figura)
for (const [x, col, end] of [[150, "t-rojoCable", 476], [170, "t-negroCable", 462]]) {
  const r = 2.4, zf = r + 1.3, zl = LID[1] + r + 1.3;
  cable(`bobina.cable${x}`, "bobinaFrente", [[x, 290, COIL.z + 12], [x, 290, COIL.z + 18], [x, 322, COIL.z + 18], [x, 322, zl], [x, 408, zl], [x, 437, zl + 5], [x, 437, zf], [x, end, zf]], r, { tone: "mid", cls: col, bend: 7, free: [false, true], ends: [false, false] });
  slab(`bobina.${x === 150 ? "pinza" : "banana"}`, "bobinaFrente", [x - 6, end, 0], [x + 6, end + (x === 150 ? 20 : 12), 7.4], { tone: "mid", cls: x === 150 ? "t-rojo" : "", r: 2, steps: 3 });
}
CAPA = "bobina";
// sin espuma (pedido del usuario, 2026-11-25): las gotas de los puntos medidos se dibujan sobre la placa de la bobina
const FOAM_TOP = COIL.z + 4;
// gotas de la malla (se encienden al visitar cada punto) y contorno de la zona de la sesión 126 (toda la bobina)
const S93 = DATOS.s126;
const ZONE = S93.zona_mm.map((v) => v / 2);
const STEP = S93.paso_mm / 2;
const gx = Math.round(ZONE[1] / STEP) + 1, gy = Math.round(ZONE[0] / STEP) + 1;
const DROPS = [];
for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) DROPS.push([X0 + i * STEP, BY0 + 110 + j * STEP]);
extra("bobina", Ln(k.planOutline({ x: X0 - 2.5, y: BY0 + 110 - 2.5, w: ZONE[1] + 5, d: ZONE[0] + 5, r: 1.5 }, FOAM_TOP, P, 3), { tone: "faint" }) + `<g data-part="gotas">${DROPS.map(([x, y], i) => { const [sx, sy] = at([x, y, FOAM_TOP]); return `<circle class="gota" data-i="${i}" cx="${f2(sx)}" cy="${f2(sy)}" r="1.3"/>`; }).join("")}</g>`);

// ================================================================ 8. PANTALLAS (laptop = servidor de hoy; teléfono)
CAPA = "pantallas";
const FACE = ((AZ - 38) * Math.PI) / 180; // la laptop mira un poco hacia la mesa
const LAP = { o: [548, 400], u: [Math.sin(FACE), -Math.cos(FACE)], w: 150, d: 100, tilt: 14 };
{
  const f = [Math.cos(FACE), Math.sin(FACE)];
  const [ox, oy] = LAP.o;
  const P2 = (a, b) => [ox + LAP.u[0] * a + f[0] * b, oy + LAP.u[1] * a + f[1] * b];
  const base = [P2(-LAP.w / 2, 0), P2(LAP.w / 2, 0), P2(LAP.w / 2, LAP.d), P2(-LAP.w / 2, LAP.d)];
  const keys = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) keys.push(P2(-60 + c * 10.9, 20 + r * 10.5));
  prismZ("pantallas.laptopBase", "pantallas", base, 0, 7, { tone: "mid", extra: Ln(k.onTop([P2(-62, 15), P2(62, 15), P2(62, 60), P2(-62, 60)], 7, P, true), { tone: "faint" }) + Dots(keys.map(([x, y]) => at([x, y, 7])), { size: 0.5, tone: "lo" }) + Ln(k.onTop([P2(-20, 68), P2(20, 68), P2(20, 92), P2(-20, 92)], 7, P, true), { tone: "faint" }) });
  // pantalla inclinada: marco y vidrio, dibujados en su propio plano
  const tilt = (LAP.tilt * Math.PI) / 180;
  const up = [-f[0] * Math.sin(tilt), -f[1] * Math.sin(tilt), Math.cos(tilt)];
  const hinge = (a) => [ox + LAP.u[0] * a, oy + LAP.u[1] * a, 7];
  const SCR_H = 100;
  const F = G.frameOf(hinge(0), [f[0] * Math.cos(tilt), f[1] * Math.cos(tilt), Math.sin(tilt)], [LAP.u[0], LAP.u[1], 0], up);
  prismF("pantallas.laptopTapa", "pantallas", F, [[-LAP.w / 2, 0], [LAP.w / 2, 0], [LAP.w / 2, SCR_H], [-LAP.w / 2, SCR_H]], -5, 0, { tone: "mid" });
  const o = G.add3(hinge(0), [0, 0, 0]);
  const ex = [LAP.u[0], LAP.u[1], 0];
  const ey = G.mul3(up, -1);
  const scr = (a, b) => G.add3(G.add3(o, G.mul3(ex, a)), G.mul3(up, b));
  const p0 = at(scr(0, SCR_H)), px = at(scr(1, SCR_H)), py = at(G.add3(scr(0, SCR_H), ey));
  const M = `matrix(${[px[0] - p0[0], px[1] - p0[1], py[0] - p0[0], py[1] - p0[1], p0[0], p0[1]].map((v) => v.toFixed(4)).join(" ")})`;
  { const c = [[-75, 0], [75, 0], [75, 100], [-75, 100]].map(([a, b]) => [p0[0] + (px[0] - p0[0]) * a + (py[0] - p0[0]) * b, p0[1] + (px[1] - p0[1]) * a + (py[1] - p0[1]) * b]); const xs = c.map((q) => q[0]), ys = c.map((q) => q[1]); LAP.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(f2); }
  LAP.matrix = M; // coordenadas de la pantalla: x de −75 a 75, y de 0 (arriba) a 100 (abajo)
  extra("pantallas", `<g transform="${M}"><rect class="vidrio" x="-70" y="5" width="140" height="88" rx="1.5"/><g data-part="web"></g></g>`);
}
{
  const f = [Math.cos(FACE), Math.sin(FACE)];
  const u = LAP.u;
  const c = [668, 548];
  const P2 = (a, b) => [c[0] + u[0] * a + f[0] * b, c[1] + u[1] * a + f[1] * b];
  prismZ("pantallas.telefono", "pantallas", [P2(-19, -38), P2(19, -38), P2(19, 38), P2(-19, 38)], 0, 4, { tone: "lo" });
  const p0 = at([...P2(-16, -34), 4]), px = at([...P2(-15, -34), 4]), py = at([...P2(-16, -33), 4]);
  const M = `matrix(${[px[0] - p0[0], px[1] - p0[1], py[0] - p0[0], py[1] - p0[1], p0[0], p0[1]].map((v) => v.toFixed(4)).join(" ")})`;
  extra("pantallas", `<g transform="${M}"><rect class="vidrio" x="0" y="0" width="32" height="68" rx="2"/><g data-part="app"></g></g>`);
  LAP.phone = M;
}

// ---------------------------------------------------------------- orden: dentro de cada grupo, por profundidad medida
A.settle(R, P, { states: [0] });
const ranked = R.items.map((it, i) => ({ it, i })).sort((a, b) => GI[a.it.g] - GI[b.it.g] || a.it.key - b.it.key);
ranked.forEach(({ it }, rank) => (it.key = GI[it.g] * 10000 + rank));
R.items.sort((a, b) => a.key - b.key);

// ---------------------------------------------------------------- SVG
const groupsSvg = GROUPS.map(([g]) => {
  const items = R.items.filter((it) => it.g === g);
  const body = items.map((it) => `<g class="it" data-capa="${it.capa}">${it.svg}</g>`).join("");
  return `<g data-g="${g}">${body}${EXTRA[g] || ""}${g.startsWith("cables") ? `<g data-part="${g}"></g>` : ""}</g>${g === "pantallas" ? `<g data-part="paquetes"></g>` : ""}`;
}).join("");

const LABEL = "Mesa de tres ejes del SAVD vista en isométrico: caja de MDF con la base de una CNC 3018 oculta cuya cama mueve el arco (eje corto); en el arco, el riel del eje largo con su carro y el eje Z, que sube la pieza roja con el sensor QMC5883P sobre la bobina en doble D; encima del perfil, tres drivers TB6600 y la Pico 2 W; a un lado, la laptop que hace de servidor y el teléfono.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<g data-root>${groupsSvg}</g>`] });

// ---------------------------------------------------------------- datos para la página
const anchors = {
  psu: [330, 24, LID[1] + 44],
  drv1: [DRV[2].x0 + 70, BY0 - 24, DZ[0]],
  drv2: [DRV[1].x0 + 70, BY0 + 34, DZ[0] + 11],
  zmotor: [X0, BY0 + 57, ZMOTOR_TOP],
  sconn: [(SCONN.x0 + SCONN.x1) / 2, (SCONN.y0 + SCONN.y1) / 2, SCONN.z1],
  ring: [X0, BY0 + 105 - 14, 150.5 + 166],
  antena: [ANTENA[0], BY0, ANTENA[2]],
  laptop: [LAP.o[0], LAP.o[1], 60],
  phone: [668, 548, 6],
  sensor: [X0, BY0 + 110, 152.1],
};
const DATA = {
  P, W, H, AZ, REC, EXP, STAGGER, SPRING, X0, BY0,
  groups: GROUPS.map(([g, mov, capa]) => ({ g, mov, capa })),
  anchors,
  lap: LAP.matrix, phone: LAP.phone, lapBox: LAP.box,
  sabanas: DATOS.sabanas,
  s126: DATOS.s126,
  drops: DROPS.length,
};
const CSS = readFileSync(join(HERE, "savd.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const controls = `<nav class="sv-nav" aria-label="Figuras del SAVD"><a href="../sistema/savd-sistema.html" aria-current="page">Fig. 1 · Sistema completo</a><a href="../cabezal-bobina/cabezal-bobina.html">Fig. D1 · Sensor y bobina</a><a href="../pico-driver-motor/pico-driver-motor.html">Fig. D2 · Pico, driver y motor</a></nav><div class="sv-bar" role="toolbar" aria-label="Etapas del recorrido">
<button type="button" data-etapa="1" aria-pressed="true"><b>1</b> Movimiento</button>
<button type="button" data-etapa="2" aria-pressed="false"><b>2</b> Adquisición</button>
<button type="button" data-etapa="3" aria-pressed="false"><b>3</b> Envío de datos</button>
<button type="button" data-etapa="4" aria-pressed="false"><b>4</b> Previsualizador</button>
<button type="button" data-explode aria-pressed="false"><b>E</b> Separar capas</button>
</div>`;
const body = `<style>${CSS}</style>` + k.plateHtml({
  fig: "Fig. 1",
  title: "SAVD: mapeo del campo de una bobina en doble D",
  hint: "1–4 etapas · E capas",
  readout: "etapa 1 · movimiento",
  keys: [
    { mark: "lit", label: "El módulo del sensor (QMC5883P) en la pieza roja: lo que se mide en cada punto" },
    { mark: "raised", label: "Eje corto: la cama de metal oculta mueve el arco completo · eje largo: el carro por el riel · Z: la abrazadera" },
    { mark: "flat", label: "La tabla de MDF con la bobina nunca se mueve" },
  ],
  caption: `Mesa cartesiana del SAVD dibujada a partir de las fotos del montaje (las medidas de la caja, el arco y el soporte son aproximadas). Las cifras que muestra la lectura son verdaderas: recorridos 0–205 (eje corto), 0–281 (eje largo) y 0–44 mm (Z), 30 mm/s, 150 mm/s² y asentamiento de 300 ms (firmware/config.py); sensor QMC5883P en 0x2C a 100 kHz y 30 G, promedio de 10 con DRDY y OVFL (firmware/sensor.py). Todo en milímetros reales: mm reales = mm del sistema ÷ 2 (frontend/src/utils/escalaMM.js). El recorrido, las lecturas y los lotes son los de la sesión real 126, que cubrió toda la bobina: zona de 125 × 200 × 15 mm reales con paso de 15 mm, 9 × 14 puntos por plano en 2 planos (252 puntos, 2026-11-24, firmware 2.4); los lotes salieron cada 3 s con unas 3 lecturas. La etapa 4 acerca la pantalla de la laptop y dibuja las sábanas 3D de Bx, By y Bz de las últimas mediciones de la bobina en doble D (sesiones 127, 128 y 130 del 2026-11-24, tal como las guardó el servidor, sin restar el fondo). Las líneas de campo y los ejes del acercamiento de la etapa 2 son un dibujo explicativo; las cuentas y los µT son los medidos. Limitación honesta: la Pico 2 W a veces se apaga sola; la causa sigue en estudio.`,
  body: `${controls}<div class="iso-stage sv-stage" tabindex="0" role="group" aria-label="Modelo del SAVD. Teclas 1 a 4 para las etapas: movimiento, adquisición, envío de datos y previsualizador; E separa las capas.">${svg}<span class="sv-sr" role="status" aria-live="polite" data-status></span></div><div class="sv-legend" data-legend></div>`,
});
const page = k.pageHtml({ title: "SAVD: modelo del sistema", theme: "light", body, script: kitScript() + LIVE, width: 980 });
if (poseArg < 0) writeFileSync(join(HERE, "savd-sistema.html"), page);
console.log("escrito savd-sistema.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} piezas dibujadas`, `${R.solids.length} sólidos`, `${CABLES.length} cables`, `escala ${KS.toFixed(3)}`, `pose ${PC},${PL},${PZ}`);
A.auditOrExit(R, P, { crowd: [["cable.motorLargo", "arco.perfil"]] });
