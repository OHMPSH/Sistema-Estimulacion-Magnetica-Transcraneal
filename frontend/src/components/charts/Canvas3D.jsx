/**
 * components/charts/Canvas3D.jsx
 * ─────────────────────────────────────────────────────────────
 * VISUALIZACIÓN 3D DEL CAMPO ELECTROMAGNÉTICO
 *
 * Usa Three.js para dibujar:
 *   - La cuadrícula de la placa (6×6 cm)
 *   - Los ejes X, Y, Z de referencia
 *   - Un marco por cada plano Z (0, 5, 10, 15, 20 mm)
 *   - Una FLECHA por cada punto medido:
 *       • Posición: (xMM, zMM, yMM) en el espacio 3D
 *       • Dirección: vector (bx, by, bz) normalizado
 *       • Longitud: proporcional a |B| (magnitud del campo)
 *       • Color: según el plano Z
 *
 * Las flechas representan tanto la dirección como la intensidad
 * del campo en cada punto, formando el mapa vectorial completo
 * cuando termina el barrido.
 *
 * Interacción: arrastrar para rotar, rueda para zoom.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Z_LEVELS, Z_COLORS_INT, GRID_SIZE_MM } from '../../constants/system.js';

export function Canvas3D({ points3D }) {
  const wrapRef    = useRef(null);   // div contenedor (para medir tamaño)
  const canvasRef  = useRef(null);   // canvas de WebGL
  const stateRef   = useRef({        // estado de Three.js (no reactivo)
    renderer: null,
    scene:    null,
    camera:   null,
    group:    null,                  // grupo de flechas de medición
    orbit:    { theta: 0.6, phi: 0.8, radius: 180, drag: false, mx: 0, my: 0, auto: true },
    frame:    null,
    prevLen:  0,
  });

  // ── Inicializar Three.js (solo una vez) ──────────────────
  useEffect(() => {
    const { current: s } = stateRef;
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight || 320;

    // Renderer: dibuja la escena 3D sobre el canvas
    s.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    s.renderer.setSize(W, H);
    s.renderer.setClearColor(0x0a0a0e, 1); // fondo negro

    // Escena: contenedor de todos los objetos 3D
    s.scene = new THREE.Scene();

    // Cámara perspectiva: simula visión humana
    s.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);

    // Grid de referencia en el piso (representa la placa 6×6 cm)
    s.scene.add(new THREE.GridHelper(60, 12, 0x222230, 0x1a1a24));

    // Ejes de referencia XYZ (líneas de colores)
    const addLine = (from, to, color) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from),
        new THREE.Vector3(...to),
      ]);
      s.scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
    };
    addLine([-32, 0, 0],  [32, 0, 0],  0x00e5ff); // eje X — cyan
    addLine([0,   0, 0],  [0, 32, 0],  0xff00c8); // eje Z (altura) — magenta
    addLine([0,   0, -32],[0, 0,  32], 0x00ffa3); // eje Y — verde

    // Marcos de los 5 planos Z (uno por nivel de altura)
    Z_LEVELS.forEach((zmm, zi) => {
      const mat = new THREE.LineBasicMaterial({
        color: Z_COLORS_INT[zi], transparent: true, opacity: 0.2,
      });
      const pts = [
        [-30, zmm, -30], [30, zmm, -30],
        [30, zmm, 30],   [-30, zmm, 30],
        [-30, zmm, -30], // cerrar el cuadrado
      ].map(p => new THREE.Vector3(...p));
      s.scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), mat
      ));
    });

    // Grupo vacío donde iremos añadiendo las flechas
    s.group = new THREE.Group();
    s.scene.add(s.group);

    // ── Controles de órbita (arrastrar = rotar) ────────────
    const o = s.orbit;
    const onDown  = e => { o.drag = true; o.mx = e.clientX; o.my = e.clientY; o.auto = false; };
    const onUp    = () => { o.drag = false; setTimeout(() => o.auto = true, 3000); };
    const onMove  = e => {
      if (!o.drag) return;
      o.theta -= (e.clientX - o.mx) * 0.01;
      o.phi    = Math.max(0.15, Math.min(1.5, o.phi - (e.clientY - o.my) * 0.008));
      o.mx = e.clientX; o.my = e.clientY;
    };
    const onWheel = e => {
      o.radius = Math.max(60, Math.min(400, o.radius + e.deltaY * 0.25));
    };
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('mousemove', onMove);
    canvas.addEventListener('wheel',     onWheel, { passive: true });

    // ── Resize del canvas ──────────────────────────────────
    const onResize = () => {
      const nW = wrap.clientWidth, nH = wrap.clientHeight || 320;
      s.renderer.setSize(nW, nH);
      s.camera.aspect = nW / nH;
      s.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ── Loop de animación ──────────────────────────────────
    const animate = () => {
      s.frame = requestAnimationFrame(animate);
      if (o.auto) o.theta += 0.003; // rotación automática lenta
      // Calcular posición de la cámara en coordenadas esféricas
      const cx = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
      const cy = o.radius * Math.cos(o.phi) + 10;
      const cz = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
      s.camera.position.set(cx, cy, cz);
      s.camera.lookAt(0, 10, 0);
      s.renderer.render(s.scene, s.camera);
    };
    animate();

    // Cleanup: liberar memoria GPU al desmontar
    return () => {
      cancelAnimationFrame(s.frame);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('wheel',     onWheel);
      window.removeEventListener('resize',    onResize);
      s.renderer.dispose();
    };
  }, []);

  // ── Agregar flechas para los nuevos puntos ───────────────
  useEffect(() => {
    const { current: s } = stateRef;
    if (!s.group) return;

    // Solo procesar los puntos que aún no se dibujaron
    const nuevos = points3D.slice(s.prevLen);
    s.prevLen = points3D.length;

    nuevos.forEach(({ xMM, yMM, zIdx, zMM, bx, by, bz, magnitud }) => {
      // ── Posición del punto en el espacio 3D ──────────────
      // Mapeamos: xMM [0..60] → [-30..30], yMM→ eje Z Three.js, zMM→ altura Y
      const px = (xMM / GRID_SIZE_MM) * 60 - 30;
      const py = zMM;   // altura real en mm
      const pz = (yMM / GRID_SIZE_MM) * 60 - 30;
      const origen = new THREE.Vector3(px, py, pz);

      // ── Vector del campo ──────────────────────────────────
      // Three.js usa ejes: X→bx, Y→bz (vertical), Z→by
      const vectorCampo = new THREE.Vector3(bx, bz, by);
      const longitud    = vectorCampo.length();

      if (longitud < 0.001) return; // ignorar puntos con campo nulo

      // Normalizar el vector para obtener solo la dirección
      const direccion = vectorCampo.clone().normalize();

      // ── Longitud visual de la flecha ──────────────────────
      // Escalar para que queden visibles: máximo 4 mm, mínimo 0.5 mm
      //const longitudVisual = 0.5 + Math.min(magnitud / 30, 1) * 3.5;
      // Línea 156 MODIFICADA (Flechas más largas):
      const longitudVisual = 1.0 + Math.min(magnitud / 30, 1) * 8.0;

      // ── Color según el plano Z ────────────────────────────
      const color = new THREE.Color(Z_COLORS_INT[zIdx] ?? Z_COLORS_INT[0]);

      // THREE.ArrowHelper dibuja: cono en la punta + línea de cuerpo
      const flecha = new THREE.ArrowHelper(
        direccion,       // dirección del vector normalizado
        origen,          // punto de inicio
        longitudVisual,  // longitud total de la flecha
        color,           // color
        // Líneas 167 y 168 MODIFICADAS (Puntas más gordas):
        longitudVisual * 0.40, // longitud de la cabeza (40% del total)
        longitudVisual * 0.60  // ancho de la cabeza (60% del total, más robusta)
      );
      s.group.add(flecha);
    });

    // Limitar memoria: si hay más de 845 flechas, borrar las más antiguas
    while (s.group.children.length > 900) {
      const old = s.group.children[0];
      s.group.remove(old);
      // Liberar geometrías y materiales de la GPU
      old.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }, [points3D]);

  // ── Limpiar flechas cuando se inicia un nuevo barrido ────
  useEffect(() => {
    const { current: s } = stateRef;
    if (points3D.length === 0 && s.group) {
      // Vaciar el grupo de flechas
      while (s.group.children.length > 0) {
        const old = s.group.children[0];
        s.group.remove(old);
        old.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      s.prevLen = 0;
    }
  }, [points3D.length]);

  // ── Render del componente ─────────────────────────────────
  return (
    <div className="chart-card" style={{ minHeight: 340 }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Mapa 3D de Mediciones</div>
          <div className="chart-desc">Placa 6×6cm — 5 planos Z (0–20mm)</div>
        </div>
      </div>
      <div className="chart-body" style={{ position: 'relative', minHeight: 280 }}>
        <div className="canvas3d-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} />
          {/* Leyenda de colores por nivel Z */}
          <div className="z-legend">
            {Z_LEVELS.map((zmm, zi) => (
              <div key={zi} className="z-legend-item">
                <div
                  className="z-legend-dot"
                  style={{ background: `#${Z_COLORS_INT[zi].toString(16).padStart(6, '0')}` }}
                />
                Z{zi} — {zmm} mm
              </div>
            ))}
          </div>
          <div className="z-axis-label">⟳ Arrastrar para rotar</div>
        </div>
      </div>
    </div>
  );
}
