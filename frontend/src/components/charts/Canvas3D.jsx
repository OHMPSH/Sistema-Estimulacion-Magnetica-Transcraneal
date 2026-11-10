/**
 * components/charts/Canvas3D.jsx
 * ─────────────────────────────────────────────────────────────
 * Mapa 3D de flechas del campo (Three.js): una flecha por lectura.
 *
 * Orientación (diestra, como en el laboratorio):
 *   laboratorio (x, y, z)  →  Three.js (X, Y, Z) = (x − c, z, −(y − c))
 *   donde c es el centro de la placa. Three.js usa Y hacia arriba; con
 *   este mapeo X queda a la derecha, Y del laboratorio "hacia el fondo"
 *   y Z hacia arriba, y el sistema sigue siendo diestro (determinante +1).
 *   El vector se mapea igual: (Bx, By, Bz) → (Bx, Bz, −By).
 *   (Antes se usaba (x, z, y), que es un espejo.)
 *
 * - Longitud de la flecha proporcional a |B| / |B| máximo de la sesión
 *   (con una leyenda de escala); el color indica el plano Z.
 * - Arrastrar con el ratón o el dedo (Pointer Events) rota; la rueda o
 *   pellizcar hace zoom sin desplazar la página. También hay botones, y
 *   con el foco en el lienzo: flechas para rotar, + y − para el zoom.
 * - Rotación automática según la configuración, nunca con
 *   prefers-reduced-motion. Sin rotación ni interacción, el bucle de
 *   dibujo se detiene: solo se redibuja cuando algo cambia.
 * - Al desmontar: forceContextLoss y se liberan los materiales; NO las
 *   geometrías de ArrowHelper, que Three.js comparte entre todas las flechas.
 * ─────────────────────────────────────────────────────────────
 */
import React, { memo, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useTokensTema } from '../../hooks/useTokensTema.js';
import { numero } from '../../utils/formato.js';
import { clasePlano, indicePlano, etiquetaZona } from '../../utils/geometria.js';

const L_MIN = 1.5;   // longitud visual de la flecha más corta (mm de escena)
const L_MAX = 9;     // la del |B| máximo
const claveDe = m => (m.seq ?? `${m.timestamp}|${m.xMM}|${m.yMM}|${m.zMM}`);

const ZONA_POR_DEFECTO = { x: 60, y: 60, z: 20 };

export const Canvas3D = memo(function Canvas3D({ mediciones, zLevels, zona = ZONA_POR_DEFECTO, sesionId, rotacionAuto, reducirMovimiento }) {
  // La escena está en mm: la cámara se aleja según el tamaño de la zona (60 mm = escala 1)
  const escala = Math.max(zona.x, zona.y, 10) / 60;
  const escalaRef = useRef(escala);
  escalaRef.current = escala;
  const t = useTokensTema();
  const wrapRef = useRef(null);
  const s = useRef({
    renderer: null, scene: null, camera: null, flechas: null, planos: null, ejes: null, rejilla: null,
    materiales: new Map(), dibujadas: new Map(), maxB: 0, sesionId: null,
    orbita: { theta: 0.7, phi: 0.95, radio: 105, arrastre: null, punteros: new Map(), distPellizco: 0 },
    girar: false, cuadro: 0, pendiente: false, vivo: true,
  });
  const etiquetaEscala = useRef(null);

  // ── Dibujo bajo demanda ──────────────────────────────────
  const dibujar = useCallback(() => {
    const e = s.current;
    if (!e.renderer) return;
    const o = e.orbita;
    e.camera.position.set(
      o.radio * Math.sin(o.phi) * Math.sin(o.theta),
      o.radio * Math.cos(o.phi) + 10,
      o.radio * Math.sin(o.phi) * Math.cos(o.theta),
    );
    e.camera.lookAt(0, 10, 0);
    e.renderer.render(e.scene, e.camera);
  }, []);

  const pedirDibujo = useCallback(() => {
    const e = s.current;
    if (e.cuadro) return;
    const bucle = () => {
      e.cuadro = 0;
      if (!e.vivo) return;
      if (e.girar && !e.orbita.arrastre) e.orbita.theta += 0.003;
      dibujar();
      if (e.girar) e.cuadro = requestAnimationFrame(bucle);
    };
    e.cuadro = requestAnimationFrame(bucle);
  }, [dibujar]);

  // ── Inicializar Three.js (una vez) ───────────────────────
  useEffect(() => {
    const e = s.current;
    const wrap = wrapRef.current;
    // El canvas se crea aquí (no en el JSX): tras forceContextLoss un canvas
    // no se puede reutilizar, y React StrictMode monta los efectos dos veces
    const canvas = document.createElement('canvas');
    wrap.prepend(canvas);
    e.vivo = true;
    e.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    e.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    e.scene = new THREE.Scene();
    e.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    e.planos = new THREE.Group();
    e.flechas = new THREE.Group();
    e.ejes = new THREE.Group();
    e.scene.add(e.planos, e.flechas, e.ejes);

    const ajustar = () => {
      const w = wrap.clientWidth || 300;
      const h = wrap.clientHeight || 320;
      e.renderer.setSize(w, h, false);
      e.camera.aspect = w / h;
      e.camera.updateProjectionMatrix();
      pedirDibujo();
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(wrap);
    ajustar();

    // Pointer Events: un dedo o el ratón rotan; dos dedos hacen zoom
    const o = e.orbita;
    const abajo = ev => {
      canvas.setPointerCapture(ev.pointerId);
      o.punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      o.arrastre = { x: ev.clientX, y: ev.clientY };
      if (o.punteros.size === 2) {
        const [a, b] = [...o.punteros.values()];
        o.distPellizco = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const mover = ev => {
      if (!o.punteros.has(ev.pointerId)) return;
      o.punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (o.punteros.size === 2) {
        const [a, b] = [...o.punteros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (o.distPellizco) o.radio = Math.max(40 * escalaRef.current, Math.min(400 * escalaRef.current, o.radio * (o.distPellizco / d)));
        o.distPellizco = d;
      } else if (o.arrastre) {
        o.theta -= (ev.clientX - o.arrastre.x) * 0.01;
        o.phi = Math.max(0.15, Math.min(1.5, o.phi - (ev.clientY - o.arrastre.y) * 0.008));
        o.arrastre = { x: ev.clientX, y: ev.clientY };
      }
      pedirDibujo();
    };
    const arriba = ev => {
      o.punteros.delete(ev.pointerId);
      if (o.punteros.size === 0) o.arrastre = null;
      o.distPellizco = 0;
    };
    const rueda = ev => {
      ev.preventDefault();   // zoom sin desplazar la página
      o.radio = Math.max(40 * escalaRef.current, Math.min(400 * escalaRef.current, o.radio + ev.deltaY * 0.25));
      pedirDibujo();
    };
    canvas.addEventListener('pointerdown', abajo);
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerup', arriba);
    canvas.addEventListener('pointercancel', arriba);
    canvas.addEventListener('wheel', rueda, { passive: false });

    return () => {
      e.vivo = false;
      cancelAnimationFrame(e.cuadro);
      e.cuadro = 0;
      observador.disconnect();
      canvas.removeEventListener('pointerdown', abajo);
      canvas.removeEventListener('pointermove', mover);
      canvas.removeEventListener('pointerup', arriba);
      canvas.removeEventListener('pointercancel', arriba);
      canvas.removeEventListener('wheel', rueda);
      // Materiales propios; las geometrías de ArrowHelper son compartidas y no se liberan
      for (const m of e.materiales.values()) m.dispose();
      e.materiales.clear();
      e.dibujadas.clear();
      for (const g of [e.planos, e.ejes]) g.traverse(o3 => { o3.geometry?.dispose(); o3.material?.dispose(); });
      e.rejilla?.geometry.dispose();
      e.rejilla?.material.dispose();
      e.renderer.forceContextLoss();
      e.renderer.dispose();
      e.renderer = null;
      e.rejilla = null;
      canvas.remove();
    };
  }, [pedirDibujo]);

  // Al cambiar el tamaño de la zona, la cámara se encuadra de nuevo
  useEffect(() => {
    s.current.orbita.radio = 105 * escala;
    pedirDibujo();
  }, [escala, pedirDibujo]);

  // ── Tema y zona: fondo, rejilla, ejes, contorno de los planos ───
  const clavePlanos = `${zLevels.join(',')}|${zona.x}|${zona.y}`;
  useEffect(() => {
    const e = s.current;
    if (!e.renderer) return;
    e.renderer.setClearColor(new THREE.Color(t.lienzo3d || '#0a0a0e'), 1);

    if (e.rejilla) { e.scene.remove(e.rejilla); e.rejilla.geometry.dispose(); e.rejilla.material.dispose(); }
 const hx = zona.x / 2;
    const hy = zona.y / 2;
    const lado = Math.max(zona.x, zona.y, 10);
    e.rejilla = new THREE.GridHelper(lado, Math.max(1, Math.round(lado / 5)), new THREE.Color(t.textoSecundario), new THREE.Color(t.bordeFuerte || t.textoSecundario));
    e.rejilla.material.transparent = true;
    e.rejilla.material.opacity = 0.35;
    e.scene.add(e.rejilla);

    const vaciar = g => { while (g.children.length) { const c = g.children[0]; g.remove(c); c.geometry?.dispose(); c.material?.dispose(); } };
    vaciar(e.ejes);
    const linea = (a, b, color) => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]),
      new THREE.LineBasicMaterial({ color: new THREE.Color(color) }));
    // X del laboratorio → +X; Y → −Z de Three.js; Z (altura) → +Y
    e.ejes.add(linea([-hx - 2, 0, 0], [hx + 4, 0, 0], t.bx));
    e.ejes.add(linea([0, 0, hy + 2], [0, 0, -hy - 4], t.by));
    e.ejes.add(linea([0, 0, 0], [0, Math.max(zona.z, 10) + 14, 0], t.bz));

    vaciar(e.planos);
    zLevels.forEach((z, i) => {
      const pts = [[-hx, z, -hy], [hx, z, -hy], [hx, z, hy], [-hx, z, hy], [-hx, z, -hy]].map(p => new THREE.Vector3(...p));
      e.planos.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: new THREE.Color(t.planos[i % t.planos.length] || t.planos[0]), transparent: true, opacity: 0.3 })));
    });

    // Colores de las flechas por plano (materiales compartidos)
    for (const [i, m] of e.materiales) {
      const color = new THREE.Color(t.planos[Number(String(i).split('-')[1]) % t.planos.length] || t.planos[0]);
      m.color.copy(color);
    }
    pedirDibujo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, clavePlanos, pedirDibujo]);

  // ── Flechas: solo las nuevas; todas de nuevo si cambia la sesión ──
  useEffect(() => {
    const e = s.current;
    if (!e.renderer) return;
    if (e.sesionId !== sesionId) {
      while (e.flechas.children.length) e.flechas.remove(e.flechas.children[0]);
      e.dibujadas.clear();
      e.maxB = 0;
      e.sesionId = sesionId;
    }
    const material = (tipo, zIdx) => {
      const clave = `${tipo}-${zIdx}`;
      if (!e.materiales.has(clave)) {
        const color = new THREE.Color(t.planos[zIdx % t.planos.length] || t.planos[0]);
        e.materiales.set(clave, tipo === 'l' ? new THREE.LineBasicMaterial({ color }) : new THREE.MeshBasicMaterial({ color }));
      }
      return e.materiales.get(clave);
    };
    const longitud = b => L_MIN + (e.maxB > 0 ? b / e.maxB : 0) * (L_MAX - L_MIN);
    const cx = zona.x / 2;
    const cy = zona.y / 2;
    let maxNuevo = e.maxB;
    for (const m of mediciones) if (!m.saturado && m.magnitud > maxNuevo) maxNuevo = m.magnitud;
    const reescalar = maxNuevo > e.maxB * 1.02;
    e.maxB = Math.max(e.maxB, maxNuevo);

    for (const m of mediciones) {
      if (m.saturado || m.bx === null || m.by === null || m.bz === null) continue;
      const k = claveDe(m);
      if (e.dibujadas.has(k)) continue;
      const v = new THREE.Vector3(m.bx, m.bz, -m.by);
      if (v.length() < 1e-6) continue;
      const L = longitud(m.magnitud);
      const flecha = new THREE.ArrowHelper(v.normalize(), new THREE.Vector3(m.xMM - cx, m.zMM, -(m.yMM - cy)), L, 0xffffff, L * 0.35, L * 0.45);
      const zIdx = Math.max(0, m.zIdx ?? indicePlano(zLevels, m.zMM));
      // Materiales compartidos por plano (los propios de la flecha se liberan ya)
      flecha.line.material.dispose(); flecha.line.material = material('l', zIdx);
      flecha.cone.material.dispose(); flecha.cone.material = material('c', zIdx);
      flecha.userData.magnitud = m.magnitud;
      e.flechas.add(flecha);
      e.dibujadas.set(k, flecha);
    }
    if (reescalar) {
      for (const f of e.flechas.children) {
        const L = longitud(f.userData.magnitud);
        f.setLength(L, L * 0.35, L * 0.45);
      }
    }
    if (etiquetaEscala.current) {
      etiquetaEscala.current.textContent = e.maxB > 0 ? `Flecha más larga = ${numero(e.maxB, 1)} µT` : 'Sin lecturas';
    }
    pedirDibujo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediciones, sesionId, zona.x, zona.y, pedirDibujo]);

  // ── Rotación automática (nunca con movimiento reducido) ──
  useEffect(() => {
    const e = s.current;
    e.girar = Boolean(rotacionAuto && !reducirMovimiento);
    cancelAnimationFrame(e.cuadro);
    e.cuadro = 0;
    pedirDibujo();
  }, [rotacionAuto, reducirMovimiento, pedirDibujo]);

  // ── Controles alternativos (botones y teclado) ───────────
  const mover = useCallback((dTheta, dPhi, dRadio) => {
    const o = s.current.orbita;
    o.theta += dTheta;
    o.phi = Math.max(0.15, Math.min(1.5, o.phi + dPhi));
    o.radio = Math.max(40 * escalaRef.current, Math.min(400 * escalaRef.current, o.radio + dRadio));
    pedirDibujo();
  }, [pedirDibujo]);
  const reiniciarVista = () => { Object.assign(s.current.orbita, { theta: 0.7, phi: 0.95, radio: 105 * escalaRef.current }); pedirDibujo(); };
  const alTeclear = (ev) => {
    const acciones = {
      ArrowLeft: [0.15, 0, 0], ArrowRight: [-0.15, 0, 0], ArrowUp: [0, -0.1, 0], ArrowDown: [0, 0.1, 0],
      '+': [0, 0, -15], '=': [0, 0, -15], '-': [0, 0, 15],
    }[ev.key];
    if (!acciones) return;
    ev.preventDefault();
    mover(...acciones);
  };

  const validas = mediciones.filter(m => !m.saturado).length;
  const resumen = `Mapa 3D de flechas del campo magnético: ${validas} lecturas en ${zLevels.length} planos (${zLevels.join(', ')} mm). `
    + 'La dirección de cada flecha es la del campo y su longitud es proporcional a |B|; el color indica el plano. '
    + 'Usa las flechas del teclado para rotar y + o − para acercar.';

  return (
    <section className="chart-card" aria-labelledby="titulo-mapa3d">
      <div className="chart-header">
        <div>
          <h2 id="titulo-mapa3d" className="chart-title">Mapa 3D de flechas</h2>
          <p className="chart-desc">Zona de {etiquetaZona(zona)} · {zLevels.length} planos Z ({zLevels[0]}–{zLevels[zLevels.length - 1]} mm)</p>
        </div>
        <div className="controles-3d" role="group" aria-label="Controles de la vista 3D">
          <button type="button" className="btn-icono" onClick={() => mover(0.3, 0, 0)} aria-label="Rotar a la izquierda"><i className="bi bi-arrow-counterclockwise" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={() => mover(-0.3, 0, 0)} aria-label="Rotar a la derecha"><i className="bi bi-arrow-clockwise" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={() => mover(0, -0.15, 0)} aria-label="Ver más desde arriba"><i className="bi bi-arrow-up" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={() => mover(0, 0.15, 0)} aria-label="Ver más de lado"><i className="bi bi-arrow-down" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={() => mover(0, 0, -25)} aria-label="Acercar"><i className="bi bi-zoom-in" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={() => mover(0, 0, 25)} aria-label="Alejar"><i className="bi bi-zoom-out" aria-hidden="true" /></button>
          <button type="button" className="btn-icono" onClick={reiniciarVista} aria-label="Restablecer la vista"><i className="bi bi-bullseye" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="chart-body">
        <div className="canvas3d-wrap" ref={wrapRef} tabIndex={0} role="region" aria-roledescription="visor 3D"
          aria-label="Mapa 3D de flechas" aria-describedby="resumen-mapa3d" onKeyDown={alTeclear}>
          <p id="resumen-mapa3d" className="visually-hidden">{resumen}</p>
          <div className="z-legend" aria-hidden="true">
            {zLevels.map((z, i) => (
              <div key={z} className="z-legend-item"><span className={`z-legend-dot ${clasePlano(i)}`} /> Z = {z} mm</div>
            ))}
            <div className="z-legend-item escala" ref={etiquetaEscala}>Sin lecturas</div>
          </div>
          <div className="ejes-3d" aria-hidden="true">
            <span className="color-bx">X</span> · <span className="color-by">Y</span> · <span className="color-bz">Z ↑</span>
          </div>
        </div>
      </div>
    </section>
  );
});
