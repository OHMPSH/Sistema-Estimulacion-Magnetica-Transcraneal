// Figura de detalle D1 del SAVD (Anatomy): el cabezal con el QMC5883P sobre la bobina en doble D.
//   node build.mjs                 → escribe cabezal-bobina.html
//   node build.mjs --audit         → además audita la geometría
//   node build.mjs --audit --pose 120   → audita con el cabezal en otra posición del eje largo (mm reales)
// Medidas de dibujo (tablero, soporte, cabezal) estimadas de las fotos, como en la figura principal: NO son datos.
// Datos: fila real de la sesión 127 (datos.json; ver LEEME.md).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, A, kitScript, taller } from "../comun/taller.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATOS = JSON.parse(readFileSync(join(HERE, "datos.json"), "utf8"));
const poseArg = process.argv.indexOf("--pose");
const POSE = poseArg > 0 ? Number(process.argv[poseArg + 1]) : 0;

const W = 760, H = 560, AZ = 57, EL = 30;
const EXP = {};
const SPRING = { stagger: 0.05, stiffness: 52, damping: 13, substeps: 4 };
const GROUPS = [["tablero"], ["bobina"], ["cabezal"], ["bobinaFrente"]];
const FIT = [[0, 0, 0], [300, 0, 0], [300, 230, 0], [0, 230, 0], [55, 70, 245], [260, 130, 245], [150, 236, 0]];
const P = k.fitProjection(FIT, W, H, { pad: 24, azimuth: AZ, elevation: EL });
const T = taller({ P, groups: GROUPS, exp: EXP, spring: SPRING });
const { at, Ln, Dots, extra, slab, prismZ, cyl, rod, cable, R } = T;
const screwDots = (pts, z, size = 0.55) => Dots(pts.map(([x, y]) => at([x, y, z])), { size, tone: "mid" });

// ---------------------------------------------------------------- tablero de MDF (la tapa de la caja, recortada)
R.solid(A.slab({ x: -40, y: -200, w: 400, d: 480, r: 0 }, -2, 2, { name: "piso", ground: true }, 2));
extra("tablero", `<path class="iso-halo" d="${k.haloOf({ x: -6, y: -4, w: 312, d: 238, r: 8 }, 0, 40, P)}"/>`);
slab("tablero.mdf", "tablero", [0, 0, 0], [300, 230, 12], { cls: "t-mdf", bevel: 1.2, r: 0.8, ground: true, extra: screwDots([[12, 10], [288, 10], [12, 220], [288, 220]], 12) + Ln([[12, 10], [288, 10], [12, 220], [288, 220]].map(([x, y]) => k.ring(x, y, 1.6, 12, P, 14)).join(""), { tone: "lo" }), inner: Ln(k.sideSeam({ x: 0, y: 0, w: 300, d: 230, r: 0.8 }, 6, P, 2), { tone: "faint" }) });

// ---------------------------------------------------------------- bobina en doble D (misma geometría que la figura principal)
const COIL = { x0: 50, x1: 250, y0: 38, y1: 163, z: 62 };
for (const [x, y] of [[68, 52], [232, 52], [150, 166]]) cyl(`bobina.pata${x}`, "bobina", x, y, 7, 12, 54, { tone: "mid", cls: "t-rojo" });
prismZ("bobina.marco", "bobina", [[38, 32], [262, 32], [248, 180], [52, 180]], 54, COIL.z, { tone: "mid", cls: "t-rojo", extra: screwDots([[46, 38], [254, 38], [58, 174], [242, 174]], COIL.z) });
{
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
  for (const x of [140, 160]) cyl(`bobina.terminal${x}`, "bobinaFrente", x, COIL.y1 - 7, 3.2, COIL.z + 4, COIL.z + 12, { tone: "hi", cls: "t-metal", bevel: 0.4 });
}
for (const [x, col] of [[140, "t-rojoCable"], [160, "t-negroCable"]]) {
  const r = 2.4, zl = 12 + r + 1.3;
  const end = x === 140 ? 206 : 214;
  cable(`bobina.cable${x}`, "bobinaFrente", [[x, COIL.y1 - 7, COIL.z + 12], [x, COIL.y1 - 7, COIL.z + 18], [x, COIL.y1 + 22, COIL.z + 18], [x, COIL.y1 + 22, zl], [x, end, zl]], r, { tone: "mid", cls: col, bend: 7, ends: [false, false] });
  // pinza (rojo) y banana (negro) hacia la fuente de laboratorio, fuera de la figura
  slab(`bobina.${x === 140 ? "pinza" : "banana"}`, "bobinaFrente", [x - 6, end, 12], [x + 6, end + (x === 140 ? 20 : 12), 12 + 2 * zl - 24], { tone: "mid", cls: x === 140 ? "t-rojo" : "t-negro", r: 2, steps: 3 });
}
// sin espuma (pedido del usuario, 2026-11-25): la bobina queda a la vista; el sensor conserva la altura de la figura principal
const FOAM_TOP = COIL.z + 10;

// ---------------------------------------------------------------- cabezal (pieza roja de PLA con el módulo)
const L0 = 10; // x del primer punto de la zona sobre la placa (como en la figura principal)
const XC = COIL.x0 + L0 + POSE;
const SY = COIL.y0 + 9.5 + 60; // fila de la sesión 127: 120 mm del sistema = 60 mm reales del eje corto
const CY = SY - 5;
const HZ = FOAM_TOP + 2.5;
slab("cabezal.bloqueZ", "cabezal", [XC - 30, CY - 44, HZ + 106], [XC + 30, CY - 30, HZ + 156], { ground: true, tone: "mid", cls: "t-negro", r: 1, steps: 3, bevel: 0.5, extra: Dots([[XC - 24, HZ + 112], [XC + 24, HZ + 112], [XC - 24, HZ + 150], [XC + 24, HZ + 150]].map(([x, z]) => at([x, CY - 30, z])), { size: 0.55, tone: "mid" }) });
{
  const oct = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 + Math.PI / 8 + Math.PI / 2; const R0 = 30 / Math.cos(Math.PI / 8); return [XC + R0 * Math.cos(a), CY + R0 * Math.sin(a)]; });
  const [sx, sy] = oct[7];
  prismZ("cabezal.abrazadera", "cabezal", oct, HZ + 116, HZ + 146, { tone: "lo", cls: "t-negro", inner: Ln(k.pathOf([at([sx, sy, HZ + 116]), at([sx, sy, HZ + 146])]), { tone: "faint" }) });
  rod("cabezal.tornillo", "cabezal", [XC + 30, CY + 12, HZ + 131], [1, 0, 0], 0, 5, 3.2, { tone: "hi", cls: "t-metal" });
}
cyl("cabezal.cilindroBajo", "cabezal", XC, CY, 26, HZ + 100, HZ + 116, { tone: "mid", cls: "t-rojo" });
cyl("cabezal.cilindroAlto", "cabezal", XC, CY, 26, HZ + 146, HZ + 162, { tone: "mid", cls: "t-rojo" });
cyl("cabezal.aro", "cabezal", XC, CY, 28, HZ + 162, HZ + 166, { tone: "mid", cls: "t-rojo", bevel: 0.6 });
slab("cabezal.columna", "cabezal", [XC - 5, CY - 14, HZ], [XC + 5, CY - 6, HZ + 100], { tone: "mid", cls: "t-rojo", r: 0.8 });
cyl("cabezal.plato", "cabezal", XC, CY, 16, HZ - 2, HZ, { tone: "mid", cls: "t-rojo" });
const MOD = { x0: XC - 7, x1: XC + 7, y0: CY - 4, y1: CY + 14, z0: HZ, z1: HZ + 1.6 };
{
  // serigrafía: flechas X (eje corto) e Y (eje largo) y el punto de Z; orientación respecto de la mesa por confirmar
  const z = MOD.z1, o = [XC - 4.6, CY + 11.6];
  const silk = k.lineOnTop(o, [o[0], o[1] - 3.6], z, P) + k.lineOnTop([o[0], o[1] - 3.6], [o[0] - 0.7, o[1] - 2.7], z, P) + k.lineOnTop([o[0], o[1] - 3.6], [o[0] + 0.7, o[1] - 2.7], z, P)
    + k.lineOnTop(o, [o[0] + 3.6, o[1]], z, P) + k.lineOnTop([o[0] + 3.6, o[1]], [o[0] + 2.7, o[1] - 0.7], z, P) + k.lineOnTop([o[0] + 3.6, o[1]], [o[0] + 2.7, o[1] + 0.7], z, P);
  slab("cabezal.modulo", "cabezal", [MOD.x0, MOD.y0, MOD.z0], [MOD.x1, MOD.y1, MOD.z1], {
    tone: "hi", cls: "t-azulMod", lit: true, r: 0.6,
    extra: Ln(silk, { tone: "lit", free: true }) + Ln(k.ring(o[0], o[1], 0.5, z, P, 10), { tone: "lit" }) + Dots([at([MOD.x0 + 1.4, MOD.y1 - 1.4, z]), at([MOD.x1 - 1.4, MOD.y1 - 1.4, z])], { size: 0.7, tone: "lo" }),
  });
}
slab("cabezal.chip", "cabezal", [XC - 1.5, CY + 3.5, MOD.z1], [XC + 1.5, CY + 6.5, MOD.z1 + 0.9], { tone: "lo", cls: "t-negro", extra: Dots([at([XC - 1, CY + 4, MOD.z1 + 0.9])], { size: 0.3, tone: "hi" }) });
for (const [x0, y0, w, d, cls] of [[XC + 3, CY + 1, 1.6, 0.8, "t-oro"], [XC + 3, CY + 3, 1.6, 0.8, "t-oro"], [XC - 5.5, CY + 2, 1.6, 0.8, "t-oro"], [XC + 3, CY + 8, 1, 2, "t-blanco"], [XC + 5, CY + 8, 1, 2, "t-blanco"]]) slab(`cabezal.smd${x0 - XC}_${y0 - CY}`, "cabezal", [x0, y0, MOD.z1], [x0 + w, y0 + d, MOD.z1 + 0.5], { tone: "mid", cls, r: 0.15 });
slab("cabezal.regulador", "cabezal", [XC - 5.8, CY + 5, MOD.z1], [XC - 3.2, CY + 8.4, MOD.z1 + 0.9], { tone: "lo", cls: "t-negro", r: 0.2 });
extra("cabezal", `<g data-part="drdy" opacity="0">${Dots([at([XC, CY + 5, MOD.z1 + 0.95])], { size: 1.6, tone: "hi" })}</g>`);
for (let i = 0; i < 5; i++) cyl(`cabezal.pin${i}`, "cabezal", XC - 4 + i * 2, CY - 2.5, 0.35, MOD.z1, HZ + 4, { tone: "hi", cls: "t-oro" });
slab("cabezal.dupont", "cabezal", [XC - 5.5, CY - 4, HZ + 4], [XC + 5.5, CY - 1, HZ + 11], { tone: "lo", cls: "t-negro" });
{
  const route = [[XC, CY - 2.5, HZ + 11], [XC, CY - 2.5, HZ + 18], [XC, CY - 3.9, HZ + 26], [XC, CY - 3.9, HZ + 100]];
  const rr = G.fillet(route, 3.2, 10, { P, tube: 1.3 });
  const tieAt = G.pathLength(rr) - (HZ + 100 - (HZ + 52));
  cable("cabezal.cableSensor", "cabezal", route, 1.3, { tone: "mid", cls: "t-azulCable", bend: 3.2, ends: [false, false], gaps: [[tieAt - 2.9, tieAt + 2.9]] });
  slab("cabezal.cincho", "cabezal", [XC - 6, CY - 6, HZ + 50], [XC + 6, CY - 1.9, HZ + 54], { tone: "mid", cls: "t-rojo" });
}

// ---------------------------------------------------------------- SVG y página
const body = T.settle();
const LABEL = "Detalle del cabezal del SAVD: pieza roja de PLA con el módulo azul del QMC5883P en su plato, sobre la bobina en doble D; se ven las dos espirales de cobre.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<g data-root>${body}</g>`] });
const DATA = { P, W, H, EXP, SPRING, groups: GROUPS.map(([g, c]) => ({ g, capa: c || "" })), fila: DATOS.fila, sesion: DATOS.sesion, iniciada: DATOS.iniciada, sensor0: [COIL.x0 + L0, SY, HZ + 1.6], foamTop: FOAM_TOP };
const CSS = readFileSync(join(HERE, "..", "sistema", "savd.css"), "utf8") + readFileSync(join(HERE, "d1.css"), "utf8");
const LIVE = readFileSync(join(HERE, "..", "comun", "medida.js"), "utf8") + readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const controls = `<nav class="sv-nav" aria-label="Figuras del SAVD"><a href="../sistema/savd-sistema.html">Fig. 1 · Sistema completo</a><a href="../cabezal-bobina/cabezal-bobina.html" aria-current="page">Fig. D1 · Sensor y bobina</a><a href="../pico-driver-motor/pico-driver-motor.html">Fig. D2 · Pico, driver y motor</a></nav><div class="sv-bar" role="toolbar" aria-label="Controles"><button type="button" data-pausa aria-pressed="false"><b>Espacio</b> Pausa</button></div>`;
const page = k.pageHtml({
  title: "SAVD: cabezal y bobina", theme: "light", width: 900, script: kitScript() + LIVE,
  body: `<style>${CSS}</style>` + k.plateHtml({
    fig: "Fig. D1",
    title: "El sensor sobre la bobina en doble D",
    hint: "espacio pausa",
    readout: "sesión 127",
    keys: [
      { mark: "lit", label: "Módulo azul con el QMC5883P (0x2C): mide Bx, By y Bz en cada punto" },
      { mark: "raised", label: "Bobina en doble D: dos espirales de cobre con el lado plano al centro" },
      { mark: "flat", label: "Tablero de MDF y soporte rojo de la bobina: no se mueven" },
    ],
    caption: `El cabezal recorre la fila central de la sesión real 127 (2026-11-24, firmware 2.4): eje corto en 60 mm reales (120 mm del sistema), eje largo de 0 a 195 mm reales con paso de 15 mm, plano Z = 0. En cada punto aparecen las cuentas que mandó la Pico y su conversión: 1 cuenta = 0,1 µT a 30 G (conversionSensor.js); los µT son los que guardó el servidor, sin restar el fondo (offset 0). Los movimientos usan la rampa del firmware (30 mm/s, 150 mm/s², 300 ms de asentamiento); la pausa en cada punto se alarga para leer. Separación sensor–bobina: por confirmar (en el montaje real hay una capa de espuma, que aquí no se dibuja para ver la bobina). La dirección de los ejes del sensor respecto de la mesa se supone igual a la del sistema (por confirmar). Las medidas del dibujo salen de las fotos; las líneas de campo son explicativas.`,
    body: `${controls}<div class="iso-stage sv-stage" tabindex="0" role="group" aria-label="Detalle del cabezal y la bobina. Espacio pausa el recorrido.">${svg}<span class="sv-sr" role="status" aria-live="polite" data-status></span></div>`,
  }),
});
if (poseArg < 0) writeFileSync(join(HERE, "cabezal-bobina.html"), page);
console.log("escrito cabezal-bobina.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} piezas`, `${R.solids.length} sólidos`, `pose ${POSE}`);
A.auditOrExit(R, P);
