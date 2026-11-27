// Dibujo de una medición en el módulo (compartido por las figuras de detalle): líneas de campo explicativas
// que cruzan el chip y flechas de Bx, By, Bz con el valor medido. Los ejes del sensor se suponen iguales a los
// del sistema: Bx sobre el eje corto (y del dibujo), By sobre el largo (x del dibujo), Bz hacia arriba (por confirmar).
function crearMedida(parent, scr, { utMm = 0.2 } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, p) => { const n = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v); p.appendChild(n); return n; };
  const g = mk("g", { "data-part": "medida" }, parent);
  const lines = [0, 1, 2, 3, 4].map(() => mk("path", { class: "sv-campo" }, g));
  const DIRS = { x: [0, 1, 0], y: [1, 0, 0], z: [0, 0, 1] };
  const ejes = ["x", "y", "z"].map((a) => ({ a, line: mk("path", { class: `sv-eje sv-eje-${a}` }, g), head: mk("path", { class: `sv-eje sv-eje-${a}` }, g), lab: mk("text", { class: `sv-zt sv-lab-${a}` }, g) }));
  const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1, 2].map((q) => u * u * u * p0[q] + 3 * u * u * t * p1[q] + 3 * u * t * t * p2[q] + t * t * t * p3[q]); });
  const f = (p) => scr(p).map((v) => v.toFixed(2)).join(" ");
  const nf = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace("-", "−").replace(".", ",");
  return {
    node: g,
    draw(S0, b, grow, clock) {
      lines.forEach((n, i) => {
        const k = i - 2;
        const p0 = [S0[0] + k * 2.2, S0[1] + 4, S0[2] - 0.2], p3 = [S0[0] + k * 9, S0[1] - 6, S0[2] + 22];
        n.setAttribute("d", "M" + bez(p0, [p0[0], p0[1], S0[2] + 8], [p3[0] - k * 2, p3[1] + 3, S0[2] + 14], p3, 18).map(f).join("L"));
        n.style.strokeDashoffset = String((-clock * 14) % 60);
      });
      const o = [S0[0], S0[1], S0[2] + 1];
      const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, grow)), 3);
      ejes.forEach((ax, i) => {
        const d = DIRS[ax.a], len = b ? b[i] * utMm * e : 0;
        const a = scr(o), q = scr([o[0] + d[0] * len, o[1] + d[1] * len, o[2] + d[2] * len]);
        ax.line.setAttribute("d", `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`);
        const dx = q[0] - a[0], dy = q[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = Math.min(1.6, L * 0.35);
        ax.head.setAttribute("d", L < 0.2 ? "" : `M${q[0].toFixed(2)} ${q[1].toFixed(2)}L${(q[0] - ux * hs - uy * hs * 0.5).toFixed(2)} ${(q[1] - uy * hs + ux * hs * 0.5).toFixed(2)}L${(q[0] - ux * hs + uy * hs * 0.5).toFixed(2)} ${(q[1] - uy * hs - ux * hs * 0.5).toFixed(2)}Z`);
        ax.lab.setAttribute("x", (q[0] + ux * 1.4 - (ux < -0.3 ? 5 : 0.4)).toFixed(2));
        ax.lab.setAttribute("y", (q[1] + uy * 1.4 + 0.3).toFixed(2));
        ax.lab.textContent = b && e > 0.5 ? `B${ax.a} ${nf(b[i])} µT` : "";
        for (const n of [ax.line, ax.head, ax.lab]) n.setAttribute("opacity", b && e > 0 ? "1" : "0");
      });
    },
  };
}
