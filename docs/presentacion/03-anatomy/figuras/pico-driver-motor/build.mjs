// Figura de detalle D2 del SAVD (Anatomy): la Pico 2 W en su shield, un TB6600 y un NEMA 17 con acople y husillo.
//   node build.mjs                 → escribe pico-driver-motor.html
//   node build.mjs --audit         → además audita la geometría
//   node build.mjs --audit --pose 22   → audita con la tuerca en otra posición (mm reales sobre el husillo)
// Medidas de dibujo estimadas (tablero, soporte, husillo): NO son datos. Datos: firmware/config.py, CLAUDE.md (ver LEEME.md).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, A, kitScript, taller } from "../comun/taller.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const poseArg = process.argv.indexOf("--pose");
const POSE = poseArg > 0 ? Number(process.argv[poseArg + 1]) : 0;

const W = 760, H = 450, AZ = 57, EL = 30;
const GROUPS = [["fijo"], ["tuerca"], ["frente"]];
const P = k.fitProjection([[10, 28, 0], [348, 28, 0], [348, 208, 0], [10, 208, 0], [110, 40, 64], [340, 50, 64], [100, 170, 40]], W, H, { pad: 18, azimuth: AZ, elevation: EL });
const T = taller({ P, groups: GROUPS, exp: {}, spring: { stagger: 0.05, stiffness: 60, damping: 14, substeps: 4 } });
const { at, Ln, Dots, extra, slab, cyl, rod, prismF, cable, R } = T;
const screwDots = (pts, z, size = 0.55) => Dots(pts.map(([x, y]) => at([x, y, z])), { size, tone: "mid" });
const rule = (a, b, z, tone = "lo") => Ln(k.lineOnTop(a, b, z, P), { tone, free: true });

// ---------------------------------------------------------------- tablero
R.solid(A.slab({ x: -40, y: -40, w: 440, d: 300, r: 0 }, -2, 2, { name: "piso", ground: true }, 2));
extra("fijo", `<path class="iso-halo" d="${k.haloOf({ x: 4, y: 24, w: 352, d: 190, r: 8 }, 0, 40, P)}"/>`);
slab("tablero", "fijo", [10, 28, 0], [350, 210, 12], { cls: "t-mdf", bevel: 1.2, r: 0.8, ground: true, extra: screwDots([[18, 36], [342, 36], [18, 202], [342, 202]], 12), inner: Ln(k.sideSeam({ x: 10, y: 28, w: 340, d: 182, r: 0.8 }, 6, P, 2), { tone: "faint" }) });

// ---------------------------------------------------------------- shield con la Pico 2 W (como en la figura principal)
const SH = { x0: 20, x1: 100, y0: 120, y1: 170, z: 20 };
for (const [x, y] of [[SH.x0 + 5, SH.y0 + 5], [SH.x1 - 5, SH.y0 + 5], [SH.x0 + 5, SH.y1 - 5], [SH.x1 - 5, SH.y1 - 5]]) cyl(`shield.poste${x}_${y}`, "fijo", x, y, 2.2, 12, SH.z, { tone: "mid", cls: "t-blanco" });
{
  const holes = [];
  for (let x = SH.x0 + 4; x < SH.x1 - 2; x += 5.08) for (let y = SH.y0 + 4; y < SH.y1 - 2; y += 5.08) holes.push(at([x, y, SH.z + 1.6]));
  slab("shield.placa", "fijo", [SH.x0, SH.y0, SH.z], [SH.x1, SH.y1, SH.z + 1.6], { tone: "mid", cls: "t-pcb", r: 1, extra: Dots(holes, { size: 0.35, tone: "lo" }) });
}
const PY = 145;
const PICO = { x0: 26, x1: 77, y0: PY - 10.5, y1: PY + 10.5, z: SH.z + 1.6 + 8.5 };
slab("pico.peineA", "fijo", [PICO.x0 + 1, PICO.y0, SH.z + 1.6], [PICO.x1 - 1, PICO.y0 + 2.6, PICO.z], { tone: "lo", cls: "t-negro" });
slab("pico.peineB", "fijo", [PICO.x0 + 1, PICO.y1 - 2.6, SH.z + 1.6], [PICO.x1 - 1, PICO.y1, PICO.z], { tone: "lo", cls: "t-negro" });
{
  const pads = [];
  for (let i = 0; i < 20; i++) pads.push(at([PICO.x0 + 1.6 + i * 2.54, PICO.y0 + 1.2, PICO.z + 1]), at([PICO.x0 + 1.6 + i * 2.54, PICO.y1 - 1.2, PICO.z + 1]));
  slab("pico.placa", "fijo", [PICO.x0, PICO.y0, PICO.z], [PICO.x1, PICO.y1, PICO.z + 1], { tone: "hi", cls: "t-pcbPico", r: 1.2, extra: Dots(pads, { size: 0.4, tone: "mid" }) });
}
slab("pico.rp2350", "fijo", [PICO.x0 + 18, PY - 3.5, PICO.z + 1], [PICO.x0 + 25, PY + 3.5, PICO.z + 1.9], { tone: "lo", cls: "t-negro", extra: Dots([at([PICO.x0 + 19, PY - 2.5, PICO.z + 1.9])], { size: 0.35, tone: "hi" }) });
slab("pico.wifi", "fijo", [PICO.x0 + 34, PY - 5.5, PICO.z + 1], [PICO.x0 + 46, PY + 5.5, PICO.z + 2.6], { tone: "hi", cls: "t-metal", r: 0.6, bevel: 0.3 });
slab("pico.usb", "fijo", [PICO.x0 - 1.4, PY - 4, PICO.z + 1], [PICO.x0 + 4.4, PY + 4, PICO.z + 3.6], { tone: "hi", cls: "t-metal", r: 0.5 });
slab("pico.bootsel", "fijo", [PICO.x0 + 9, PY + 3, PICO.z + 1], [PICO.x0 + 13, PY + 7, PICO.z + 2.4], { tone: "hi", cls: "t-blanco" });
slab("pico.led", "fijo", [PICO.x0 + 6, PY - 6, PICO.z + 1], [PICO.x0 + 7.6, PY - 4.4, PICO.z + 1.6], { tone: "hi", cls: "led-pico" });
// conector de las señales en el shield: ENA (GP16), DIR (GP13), PUL (GP12) del eje largo
const HDR = { x0: 84, x1: 98, y0: 123, y1: 128, z1: SH.z + 1.6 + 8.5 };
slab("shield.conector", "fijo", [HDR.x0, HDR.y0, SH.z + 1.6], [HDR.x1, HDR.y1, HDR.z1], { tone: "lo", cls: "t-negro", extra: Dots([87, 91, 95].map((x) => at([x, 125.5, HDR.z1])), { size: 0.5, tone: "hi" }) });

// ---------------------------------------------------------------- TB6600
const DR = { x0: 110, x1: 206, y0: 40, y1: 96, z0: 12, z1: 45 };
{
  const fins = Array.from({ length: 9 }, (_, j) => k.planOutline({ x: DR.x0 + 9.4 + j * 9.5, y: DR.y0 + 3, w: 1.4, d: 11, r: 0.6 }, DR.z1, P, 2)).join("");
  slab("driver.caja", "fijo", [DR.x0, DR.y0, DR.z0], [DR.x1, DR.y1, DR.z1], { tone: "lo", cls: "t-negro", r: 1.4, steps: 3, bevel: 0.5, extra: Ln(fins, { tone: "faint" }) });
  const ym = (DR.y0 + DR.y1) / 2;
  // interruptores DIP S1–S6: S1 ON, S2 OFF, S3 ON = 400 pulsos/vuelta (instructivo, tabla 3.1); S4–S6 (corriente) por confirmar
  slab("driver.dip", "fijo", [DR.x0 + 58, ym - 8, DR.z1], [DR.x0 + 82, ym + 2, DR.z1 + 1.6], { tone: "hi", cls: "t-blanco", extra: Ln(Array.from({ length: 6 }, (_, j) => k.planOutline({ x: DR.x0 + 59.4 + j * 3.8, y: ym - 6.5, w: 2.2, d: 7, r: 0.3 }, DR.z1 + 1.6, P, 1)).join(""), { tone: "lo" }) });
  [1, 0, 1].forEach((on, j) => slab(`driver.palanca${j + 1}`, "fijo", [DR.x0 + 59.8 + j * 3.8, on ? ym - 6 : ym - 2.5, DR.z1 + 1.6], [DR.x0 + 61.2 + j * 3.8, on ? ym - 2.5 : ym + 1, DR.z1 + 2.6], { tone: "hi", cls: "t-negro", r: 0.2 }));
  slab("driver.etiqueta", "fijo", [DR.x0 + 10, ym - 8, DR.z1], [DR.x0 + 50, ym + 20, DR.z1 + 0.3], { tone: "lo", extra: rule([DR.x0 + 14, ym - 3], [DR.x0 + 44, ym - 3], DR.z1 + 0.3) + rule([DR.x0 + 14, ym + 3], [DR.x0 + 38, ym + 3], DR.z1 + 0.3) + rule([DR.x0 + 14, ym + 9], [DR.x0 + 46, ym + 9], DR.z1 + 0.3) + rule([DR.x0 + 14, ym + 15], [DR.x0 + 30, ym + 15], DR.z1 + 0.3) });
  slab("driver.led", "fijo", [DR.x0 + 88, ym + 12, DR.z1], [DR.x0 + 92, ym + 16, DR.z1 + 1.2], { tone: "hi", cls: "led-pul" });
}
// bornera verde: ENA− ENA+ DIR− DIR+ PUL− PUL+ · B− B+ A− A+ · GND VCC (se dibujan los + de las señales)
const TX = (j) => DR.x0 + 13 + j * 6.4;
const TZ = DR.z0 + 13;
slab("driver.bornera", "fijo", [DR.x0 + 9, DR.y1, DR.z0 + 4], [DR.x0 + 89, DR.y1 + 6, DR.z0 + 18], { tone: "mid", cls: "t-verde", extra: Dots(Array.from({ length: 12 }, (_, j) => at([TX(j), DR.y1 + 6, TZ + 4])), { size: 0.6, tone: "hi" }) });

// ---------------------------------------------------------------- NEMA 17, acople, husillo y tuerca
const AXZ = 35, AXY = 70;
{
  const cham = [[-21, -17], [-17, -21], [17, -21], [21, -17], [21, 17], [17, 21], [-17, 21], [-21, 17]];
  const F = G.frameOf([250, AXY, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  prismF("motor.tapaAtras", "fijo", F, cham, -34, -27, { tone: "mid" });
  prismF("motor.cuerpo", "fijo", F, cham.map(([u, v]) => [u * 0.985, v * 0.985]), -27, -7, { tone: "lo", cls: "t-negro" });
  prismF("motor.tapa", "fijo", F, cham, -7, 0, { tone: "mid" });
}
slab("soporte.placa", "fijo", [250, 44, 12], [255, 96, 62], { tone: "mid", cls: "t-alu", r: 0.6, extra: Dots([[50, 18], [90, 18], [50, 52], [90, 52]].map(([y, z]) => at([255, y, z])), { size: 0.55, tone: "mid" }) });
slab("soporte.pie", "fijo", [255, 44, 12], [278, 96, 15], { tone: "mid", cls: "t-alu", r: 0.6, extra: screwDots([[268, 50], [268, 90]], 15) });
rod("acople", "fijo", [0, AXY, AXZ], [1, 0, 0], 255, 280, 9, { tone: "mid", cls: "t-azul", extra: "" });
rod("husillo", "fijo", [0, AXY, AXZ], [1, 0, 0], 280, 326, 4, { tone: "hi", cls: "t-metal" });
slab("chumacera", "frente", [326, AXY - 12, 12], [338, AXY + 12, 46], { tone: "mid", cls: "t-alu", r: 1, steps: 3, extra: Dots([at([338, AXY - 7, 40]), at([338, AXY + 7, 40])], { size: 0.5, tone: "hi" }) });
const NX = 292 + POSE; // la tuerca recorre 22 mm sobre el husillo
slab("tuerca.bloque", "tuerca", [NX - 8, AXY - 10, AXZ + 4], [NX + 8, AXY + 10, AXZ + 19], { tone: "mid", cls: "t-oro", r: 1, steps: 3, bevel: 0.4, extra: Dots([at([NX - 4, AXY, AXZ + 19]), at([NX + 4, AXY, AXZ + 19])], { size: 0.5, tone: "hi" }) });

// ---------------------------------------------------------------- cables
// señales del eje largo (firmware/config.py): ENA GP16, DIR GP13, PUL GP12 → bornera; cada uno a su altura para no cruzarse
const SIG = [["ena", "t-blanco", 0], ["dir", "t-verdeCable", 2], ["pul", "t-amarilloCable", 4]];
const ROUTES = {};
SIG.forEach(([n, cls, j], i) => {
  const hx = 87 + i * 4, tx = TX(j + 1), zl = HDR.z1 + 6 + i * 3.2;
  ROUTES[n] = cable(`cable.${n}`, "fijo", [[hx, 125.5, HDR.z1], [hx, 125.5, zl], [hx, 112 - i * 3, zl], [tx, 112 - i * 3, zl], [tx, 112 - i * 3, TZ + 4], [tx, DR.y1 + 6, TZ + 4]], 0.9, { tone: "mid", cls, bend: 3, shells: [true, false] });
});
// del driver al motor: las cuatro fases en un solo cable
cable("cable.motor", "fijo", [[TX(7.5), DR.y1 + 6, DR.z0 + 11], [TX(7.5), 116, DR.z0 + 11], [210, 116, DR.z0 + 11], [210, 116, AXZ], [210, AXY, AXZ], [216, AXY, AXZ]], 1.8, { tone: "mid", cls: "t-negroCable", bend: 5, shells: [true, true] });
// 12 V de la fuente (fuera de la figura)
for (const [j, cls] of [[10, "t-negroCable"], [11, "t-rojoCable"]]) {
  const x = TX(j), zf = 12 + 1.6 + 1.3;
  cable(`cable.v${j}`, "fijo", [[x, DR.y1 + 6, DR.z0 + 11], [x, DR.y1 + 16, DR.z0 + 11], [x, DR.y1 + 16, zf], [x, 186, zf]], 1.6, { tone: "mid", cls, bend: 5, shells: [true, false], ends: [false, false] });
}
// clavija de los 12 V que llegan de la fuente (fuera de la figura)
slab("clavija12V", "fijo", [TX(10) - 5, 186, 12], [TX(11) + 5, 200, 12 + 2 * (1.6 + 1.3)], { tone: "mid", cls: "t-negro", r: 1.5, steps: 3 });

// ---------------------------------------------------------------- SVG y página
const body = T.settle();
const LABEL = "Detalle de la electrónica del SAVD: la Pico 2 W en su shield manda pulsos por el cable PUL a un driver TB6600, que mueve un motor NEMA 17; el acople gira el husillo y la tuerca avanza.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<g data-root>${body}<g data-part="vivo"></g></g>`] });
const DATA = { P, W, H, pul: ROUTES.pul, dir: ROUTES.dir, nx0: 292, axy: AXY, axz: AXZ };
const CSS = readFileSync(join(HERE, "..", "sistema", "savd.css"), "utf8") + readFileSync(join(HERE, "d2.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const controls = `<nav class="sv-nav" aria-label="Figuras del SAVD"><a href="../sistema/savd-sistema.html">Fig. 1 · Sistema completo</a><a href="../cabezal-bobina/cabezal-bobina.html">Fig. D1 · Sensor y bobina</a><a href="../pico-driver-motor/pico-driver-motor.html" aria-current="page">Fig. D2 · Pico, driver y motor</a></nav><div class="sv-bar" role="toolbar" aria-label="Controles"><button type="button" data-pausa aria-pressed="false"><b>Espacio</b> Pausa</button></div>`;
const page = k.pageHtml({
  title: "SAVD: Pico, driver y motor", theme: "light", width: 900, script: kitScript() + LIVE,
  body: `<style>${CSS}</style>` + k.plateHtml({
    fig: "Fig. D2",
    title: "Un pulso, un micropaso",
    hint: "espacio pausa",
    readout: "PUL",
    keys: [
      { mark: "lit", label: "Cable PUL (amarillo): cada pulso del PIO de la Pico avanza un micropaso" },
      { mark: "raised", label: "TB6600: DIP en 400 pulsos/vuelta; ENA común a los tres drivers, DIR elige el sentido" },
      { mark: "flat", label: "NEMA 17 → acople → husillo T8: la tuerca avanza" },
    ],
    caption: `Un eje del SAVD (el largo: PUL en GP12, DIR en GP13, ENA común en GP16; firmware/config.py). El PIO de la Pico 2 W genera los pulsos (tope de 15 kHz, FRECUENCIA_MAX_HZ) y el TB6600 los convierte en corriente para el NEMA 17. El firmware usa 50 pulsos por mm del sistema, que son 100 por mm real (mm reales = mm del sistema ÷ 2), y el DIP está en 400 pulsos/vuelta (S1 ON, S2 OFF, S3 ON; CLAUDE.md e instructivo); de ahí sale un avance de 4 mm reales por vuelta, deducido (el avance del T8 y la causa del ×2 siguen por confirmar). A la velocidad de crucero de 30 mm/s reales salen 3000 pulsos/s y el motor da 7,5 vueltas/s; aquí todo va 20 veces más lento y cada punto amarillo representa unos 25 pulsos. La corriente (S4–S6) está por confirmar. Las medidas del dibujo salen de las fotos.`,
    body: `${controls}<div class="iso-stage sv-stage" tabindex="0" role="group" aria-label="Detalle de la Pico, el driver y el motor. Espacio pausa.">${svg}<span class="sv-sr" role="status" aria-live="polite" data-status></span></div>`,
  }),
});
if (poseArg < 0) writeFileSync(join(HERE, "pico-driver-motor.html"), page);
console.log("escrito pico-driver-motor.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} piezas`, `${R.solids.length} sólidos`, `pose ${POSE}`);
A.auditOrExit(R, P);
