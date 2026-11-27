# Material para la exposición del SAVD

Carpeta preparada el **2026-11-25** (commit `521c47b`) para armar la exposición de la tesis en HTML. **Todavía no es la presentación final:** es la información verificada, los diagramas, las instrucciones de Anatomy y el esqueleto de las diapositivas, para combinarlo en otra laptop (Windows) con el trabajo escrito de la tesis.

Todo está dentro de esta carpeta, con rutas relativas, en UTF-8 y sin enlaces simbólicos. Los HTML funcionan **sin conexión** (sin CDN). No se modificó nada del sistema (`server/`, `frontend/`, `firmware/`, `app/`, `nginx/`), la base solo se consultó con `SELECT` y no se copió ningún secreto.

## Qué hay

| Archivo o carpeta | Qué es |
|---|---|
| [00-dossier-proyecto.md](00-dossier-proyecto.md) | Todo el proyecto, verificado y con su fuente: objetivo, hardware, firmware, servidor, base de datos, web y app, pruebas, versiones, problemas resueltos, limitaciones |
| [01-cifras-reales.md](01-cifras-reales.md) | Tabla de números con su fuente (mecánica, sensor, comunicación, simulador, base de datos). **Es la fuente de las cifras de todo lo demás** |
| [PREGUNTAS.md](PREGUNTAS.md) | Lo que no se pudo comprobar («por confirmar») |
| `02-diagramas/` | 9 diagramas en Mermaid (`01-…md` a `09-…md`), el visor `index.html` (tema oscuro o claro, botón «Descargar SVG») y `construir.mjs`, que regenera el visor. `vendor/` trae Mermaid 11.4.1 (MIT) |
| `03-anatomy/` | [INSTALAR.md](03-anatomy/INSTALAR.md) (Linux y Windows), [prompts.md](03-anatomy/prompts.md) (cuatro figuras con cifras reales y «Mi montaje real»), [PLAN-FIGURA.md](03-anatomy/PLAN-FIGURA.md) (el plan acordado de la figura principal, para retomar), `fotos/` (11 fotos del montaje; la 01 muestra un correo en el pizarrón) y `figuras/sistema/savd-sistema.html`: **la figura interactiva del sistema físico** (etapas 1–4 y separación de capas, sin conexión; ver su [LEEME](03-anatomy/figuras/sistema/LEEME.md)) |
| `04-presentacion-base/` | [guion.md](04-presentacion-base/guion.md) (21 diapositivas y qué visual va en cada una), `plantilla.html` (lo que se edita), `presentacion.html` (generado), `construir.mjs`, `img/` (8 capturas reales) y `fuentes/` (Rajdhani, Inter y Share Tech Mono, licencia OFL) |

## Dos convenciones que no hay que perder

1. **Milímetros reales = mm del sistema ÷ 2.** El firmware, la base, el CSV y los logs están en mm del sistema; la web y todo este material, en mm reales.
2. **Nombres de los ejes:** la web llama X al eje largo e Y al corto; el firmware y la base, al revés. Aquí se dice «eje corto» y «eje largo» cuando importa.

## Cómo seguir en Windows

1. **Copiar** la carpeta `docs/presentacion/` completa (o todo el repositorio). No hace falta nada más para ver los HTML.
2. **Abrir los HTML** con doble clic (Chrome o Edge):
   - `02-diagramas/index.html` — los diagramas; «Descargar SVG» guarda cada uno para Word o para la presentación.
   - `03-anatomy/figuras/sistema/savd-sistema.html` — la figura interactiva del sistema (teclas 1–4 y E).
   - `04-presentacion-base/presentacion.html` — las diapositivas. Teclas: ← →, espacio, Inicio, Fin, **N** (notas del orador), **F** (pantalla completa). Para PDF: Ctrl+P, horizontal, sin márgenes, con gráficos de fondo.
   - Con doble clic, Chrome y Edge suelen bloquear las fuentes propias en `file://` (se ve Segoe UI; todo lo demás funciona). Para verlas, o si algo no carga, servir la carpeta: en PowerShell, dentro de `docs\presentacion`, `npx http-server -p 8080` o `python -m http.server 8080`, y abrir `http://localhost:8080/`.
3. **Node.js:** 22.20 o más nuevo (lo pide la CLI de Anatomy; los `construir.mjs` funcionan desde Node 18). Comprobar con `node -v`.
4. **Editar la presentación:** cambiar `04-presentacion-base/plantilla.html` y, en esa carpeta, ejecutar `node construir.mjs` para regenerar `presentacion.html` (inserta los diagramas de `02-diagramas/`). Si cambias un diagrama `.md`, ejecuta también `node construir.mjs` dentro de `02-diagramas`.
5. **Anatomy:** en esta laptop ya está instalada (1.1.0, 2026-11-25); en Windows, instalarla según `03-anatomy/INSTALAR.md` (sección Windows, no verificada por el README), llenar «Mi montaje real» en `prompts.md` con las fotos y ejecutar los prompts cuando quieras. Las figuras van en `03-anatomy/figuras/`.

## Cómo combinarlo con la tesis

- Busca en `plantilla.html` los recuadros **`[TESIS: …]`** (amarillos, con borde punteado): título, autor y asesor, contexto, objetivos, metodología formal, análisis del campo medido, conclusiones, trabajo futuro y agradecimientos. Ahí va el texto del trabajo escrito.
- Los números técnicos ya están verificados: tómalos de `01-cifras-reales.md` y cita la fuente si el escrito lo pide.
- Si una cifra del escrito no coincide con este material, manda el código y la base (este material dice de dónde sale cada número). `docs/tesis/` (del 14 de noviembre) está desactualizado en el microcontrolador, el firmware, las estadísticas y la app.
- Las capturas de `img/` son anteriores a la escala ×2 y al cambio de nombres de ejes: conviene retomarlas o aclararlo.

## Qué llevar a la laptop con Windows

- Esta carpeta completa (≈ 4,6 MB).
- Opcional, para regenerar capturas o hacer una demo: el repositorio completo y los respaldos de `~/tms-respaldos/` (base de datos y APK), que no están en git.
- Este chat exportado, como contexto para la siguiente sesión.
