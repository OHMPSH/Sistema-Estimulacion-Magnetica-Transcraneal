// Ayudas compartidas por las figuras de detalle D1 y D2 (las mismas piezas que build.mjs de la figura principal).
// Cada pieza queda registrada en la auditoría de la skill Anatomy con su forma verdadera.
import { join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

export const KIT = process.env.ANATOMY_KIT || join(homedir(), ".claude", "skills", "anatomy");
const imp = (rel) => import(pathToFileURL(join(KIT, rel)).href);
export const k = await imp("kit/iso-kit.mjs");
export const G = await imp("kit/lathe.mjs");
export const { tubePieces, tubeSvg } = await imp("kit/tube.mjs");
export const A = await imp("kit/audit.mjs");
export const { kitScript } = await imp("scripts/inline-kit.mjs");

// groups: [[nombre, capa]] en orden de dibujo; exp: {capa: vector de separación}
export function taller({ P, groups, exp, spring }) {
  const order = Object.keys(exp);
  const R = A.recorder(P, { order, spring });
  const KS = G.scaleOf(P);
  const GI = Object.fromEntries(groups.map(([g], i) => [g, i]));
  const CAPA = Object.fromEntries(groups.map(([g, c]) => [g, c || ""]));
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (pts, style) => k.dotsSvg(pts, style);
  const wrap = (cls, svg) => (cls ? `<g class="${cls}">${svg}</g>` : svg);
  const EXTRA = {};
  const extra = (g, svg) => (EXTRA[g] = (EXTRA[g] || "") + svg);
  function put(name, g, ref, svg, shapes = [], { bias = 0 } = {}) {
    const ride = CAPA[g];
    return R.put({ name, at: ref, bias, svg, shapes, piece: ride, ride, move: ride ? exp[ride] : [0, 0, 0], g });
  }
  function slab(name, g, [x0, y0, z0], [x1, y1, z1], { tone = "mid", cls = "", r = 0.6, steps = 2, bevel = 0, inner = "", extra: ex = "", bias = 0, lit, ground } = {}) {
    const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
    const shape = R.solid(A.slab(plan, z0, z1 - z0, { name, ...(ground ? { ground: true } : {}) }, steps));
    return put(name, g, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrap(cls, S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone, inner, lit }) + ex), [shape], { bias });
  }
  function prismZ(name, g, ring, z0, z1, { tone = "mid", cls = "", extra: ex = "", inner = "", bias = 0, lit } = {}) {
    const shape = R.solid(A.extruded(ring, z0, z1 - z0, { name }));
    const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length, cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    return put(name, g, [cx, cy, (z0 + z1) / 2], wrap(cls, S(k.extrude(ring, z0, z1 - z0, P, { convex: true }), { tone, inner, lit }) + ex), [shape], { bias });
  }
  function cyl(name, g, cx, cy, r, z0, z1, { tone = "mid", cls = "", extra: ex = "", inner = "", bias = 0, lit, bevel = 0 } = {}) {
    const shape = R.solid(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
    const steps = Math.max(16, Math.min(72, Math.round(r * KS * 2)));
    return put(name, g, [cx, cy, (z0 + z1) / 2], wrap(cls, S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone, inner, lit }) + ex), [shape], { bias });
  }
  function rod(name, g, a, axis, s0, s1, r, { tone = "mid", cls = "", extra: ex = "", bias = 0, lit } = {}) {
    const F = G.frameAlong(a, axis);
    const shape = R.solid(A.disc(F, s0, s1, r, { name }));
    return put(name, g, G.add3(a, G.mul3(axis, (s0 + s1) / 2)), wrap(cls, S(G.disc(s0, s1, r, F, P), { tone, lit }) + ex), [shape], { bias });
  }
  function prismF(name, g, F, poly, s0, s1, { tone = "mid", cls = "", extra: ex = "", bias = 0, lit } = {}) {
    const shape = R.solid(A.prism(F, poly, s0, s1, { name }));
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const c = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
    return put(name, g, c, wrap(cls, S(G.prismOf(F, poly, s0, s1, P), { tone, lit }) + ex), [shape], { bias });
  }
  const CABLES = [];
  function cable(name, g, points, r, { tone = "mid", cls = "", bend = 3, free = [false, false], shells = [false, false], ends = [true, true], maxLength = 14, gaps = [], touch, bias = 0.05 } = {}) {
    const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    const total = G.pathLength(route);
    const SHELL = Math.max(2.4, r * 2.4);
    const allGaps = [...(shells[0] ? [[0, SHELL]] : []), ...gaps, ...(shells[1] ? [[total - SHELL, total]] : [])];
    const ride = CAPA[g];
    R.route(name, route, r, { gaps: allGaps, limp: true, touch, rims: shells.map((on) => (on ? r * 1.8 : r)), free, piece: ride, ride, move: ride ? exp[ride] : [0, 0, 0] });
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
  function settle() {
    A.settle(R, P, { states: [0] });
    const ranked = R.items.map((it, i) => ({ it, i })).sort((a, b) => GI[a.it.g] - GI[b.it.g] || a.it.key - b.it.key);
    ranked.forEach(({ it }, rank) => (it.key = GI[it.g] * 10000 + rank));
    R.items.sort((a, b) => a.key - b.key);
    return groups.map(([g]) => `<g data-g="${g}">${R.items.filter((it) => it.g === g).map((it) => it.svg).join("")}${EXTRA[g] || ""}</g>`).join("");
  }
  return { R, KS, at, S, Ln, Dots, wrap, extra, put, slab, prismZ, cyl, rod, prismF, cable, settle, CABLES };
}
