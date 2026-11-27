// construir.mjs — genera index.html a partir de los NN-*.md de esta carpeta.
// Uso (Linux o Windows, Node 18 o más nuevo):   node construir.mjs
// El HTML resultante funciona sin conexión: usa vendor/mermaid.min.js (Mermaid 11.4.1, MIT).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const enLinea = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');

const diagramas = readdirSync(aqui).filter(f => /^\d\d-.*\.md$/.test(f)).sort().map(archivo => {
  const texto = readFileSync(join(aqui, archivo), 'utf8').replace(/\r\n/g, '\n');
  const titulo = (texto.match(/^# (.+)$/m) || [, archivo])[1];
  const codigo = (texto.match(/```mermaid\n([\s\S]*?)```/) || [, ''])[1];
  const cuerpo = texto.replace(/^# .+$/m, '').replace(/```mermaid[\s\S]*?```/, '').trim();
  const parrafos = cuerpo.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return { archivo, id: archivo.replace(/\.md$/, ''), titulo, codigo, parrafos };
});

const secciones = diagramas.map(d => `
  <section class="diagrama" id="${d.id}">
    <header>
      <h2>${esc(d.titulo)}</h2>
      <div class="acciones">
        <button type="button" data-svg="${d.id}">Descargar SVG</button>
        <span class="archivo">${esc(d.archivo)}</span>
      </div>
    </header>
    ${d.parrafos.map(p => `<p>${enLinea(p)}</p>`).join('\n    ')}
    <div class="lienzo"><pre class="mermaid" data-fuente="${d.id}">${esc(d.codigo)}</pre></div>
  </section>`).join('\n');

const indice = diagramas.map(d => `<li><a href="#${d.id}">${esc(d.titulo)}</a></li>`).join('');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagramas del SAVD</title>
<style>
  :root { --fondo:#0d0d0f; --tarjeta:#1a1a20; --texto:#eef0f5; --tenue:#a9adb8; --borde:#2c2c36; --guinda:#c0233f; --lienzo:#121217; }
  :root[data-theme="light"] { --fondo:#f4f5f7; --tarjeta:#ffffff; --texto:#1b1d23; --tenue:#5c6273; --borde:#d9dce3; --guinda:#8b1a2f; --lienzo:#fbfbfc; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--fondo); color:var(--texto); font:15px/1.55 system-ui, "Segoe UI", Roboto, Arial, sans-serif; }
  .contenedor { max-width:1180px; margin:0 auto; padding:24px 16px 64px; }
  h1 { font-size:1.6rem; margin:0 0 4px; }
  .sub { color:var(--tenue); margin:0 0 16px; }
  nav ol { columns:2; gap:24px; padding-left:20px; margin:0 0 24px; }
  nav a, a { color:inherit; }
  .barra { display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
  button { background:var(--tarjeta); color:var(--texto); border:1px solid var(--borde); border-radius:6px; padding:6px 12px; font:inherit; cursor:pointer; }
  button:hover { border-color:var(--guinda); }
  .diagrama { background:var(--tarjeta); border:1px solid var(--borde); border-left:4px solid var(--guinda); border-radius:8px; padding:16px; margin:0 0 24px; }
  .diagrama header { display:flex; justify-content:space-between; gap:12px; align-items:baseline; flex-wrap:wrap; }
  .diagrama h2 { font-size:1.2rem; margin:0 0 8px; }
  .acciones { display:flex; gap:10px; align-items:center; }
  .archivo { color:var(--tenue); font-size:.85rem; font-family:ui-monospace, Consolas, monospace; }
  .diagrama p { margin:0 0 8px; color:var(--texto); max-width:80ch; }
  code { font-family:ui-monospace, Consolas, monospace; font-size:.9em; }
  .lienzo { background:var(--lienzo); border:1px solid var(--borde); border-radius:6px; padding:12px; overflow-x:auto; margin-top:8px; }
  .lienzo svg { max-width:100%; height:auto; }
  pre.mermaid { margin:0; white-space:pre; }
  @media (max-width:700px) { nav ol { columns:1; } }
</style>
</head>
<body>
<div class="contenedor">
  <h1>Diagramas del SAVD</h1>
  <p class="sub">Sistema de adquisición y visualización del campo magnético (tesis TMS, IPN ESIME Zacatenco). Generado con <code>node construir.mjs</code>; funciona sin conexión.</p>
  <div class="barra">
    <button type="button" id="tema">Cambiar a tema claro</button>
  </div>
  <nav aria-label="Índice"><ol>${indice}</ol></nav>
  ${secciones}
</div>
<script src="vendor/mermaid.min.js"></script>
<script>
  const fuentes = {};
  document.querySelectorAll('pre.mermaid').forEach(p => { fuentes[p.dataset.fuente] = p.textContent; });
  let claro = false;
  try { claro = localStorage.getItem('savd-diagramas-tema') === 'claro'; } catch (e) {}
  async function dibujar() {
    document.documentElement.dataset.theme = claro ? 'light' : 'dark';
    document.getElementById('tema').textContent = claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
    mermaid.initialize({ startOnLoad: false, theme: claro ? 'default' : 'dark', securityLevel: 'loose',
      fontFamily: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif', flowchart: { htmlLabels: true }, er: { layoutDirection: 'TB' } });
    const nodos = [];
    document.querySelectorAll('pre.mermaid').forEach(p => { p.removeAttribute('data-processed'); p.textContent = fuentes[p.dataset.fuente]; nodos.push(p); });
    await mermaid.run({ nodes: nodos });
  }
  document.getElementById('tema').addEventListener('click', () => {
    claro = !claro;
    try { localStorage.setItem('savd-diagramas-tema', claro ? 'claro' : 'oscuro'); } catch (e) {}
    dibujar();
  });
  document.addEventListener('click', e => {
    const id = e.target.dataset && e.target.dataset.svg;
    if (!id) return;
    const svg = document.getElementById(id).querySelector('.lienzo svg');
    if (!svg) return;
    const texto = new XMLSerializer().serializeToString(svg);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }));
    a.download = id + (claro ? '-claro' : '-oscuro') + '.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  dibujar();
</script>
</body>
</html>
`;
writeFileSync(join(aqui, 'index.html'), html, 'utf8');
console.log('index.html generado con ' + diagramas.length + ' diagramas.');
