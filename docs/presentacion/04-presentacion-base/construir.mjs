// construir.mjs — genera presentacion.html desde plantilla.html.
// Reemplaza cada @@DIAGRAMA:nombre@@ por el código Mermaid de ../02-diagramas/nombre.md.
// Uso (Linux o Windows, Node 18 o más nuevo):   node construir.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let html = readFileSync(join(aqui, 'plantilla.html'), 'utf8');
let n = 0;
html = html.replace(/@@DIAGRAMA:([\w-]+)@@/g, (_, nombre) => {
  const md = readFileSync(join(aqui, '..', '02-diagramas', nombre + '.md'), 'utf8').replace(/\r\n/g, '\n');
  const m = md.match(/```mermaid\n([\s\S]*?)```/);
  if (!m) throw new Error('Sin bloque mermaid en ' + nombre + '.md');
  n++;
  return esc(m[1]);
});
html = html.replace('<title>SAVD · Exposición</title>', '<title>SAVD · Exposición</title>\n<!-- GENERADO por construir.mjs desde plantilla.html: no editar a mano. -->');
writeFileSync(join(aqui, 'presentacion.html'), html, 'utf8');
console.log('presentacion.html generado con ' + n + ' diagramas.');
