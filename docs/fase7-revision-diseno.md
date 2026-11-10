# Fase 7 — Revisión de la interfaz y plan de diseño

Revisión hecha con la skill **web-design-guidelines** (reglas de *Vercel Web Interface Guidelines*, descargadas el 2026-11-10) sobre `frontend/src/**/*.jsx`, `frontend/src/styles/*.css` y `frontend/index.html`, **después** de la Fase 6. Los números de línea son los de antes de corregir.

## 1. Salida de la revisión (formato archivo:línea)

### Problemas de la revisión anterior (lista del prompt de la Fase 7)

Ya resueltos en la Fase 6 (se comprobaron de nuevo):

- `<div onClick>` en las tarjetas de modo y en los encabezados de sesión → ahora son radios con `<label>` y `<button aria-expanded>` (`ControlPanel.jsx`, `HistorialPage.jsx:82`).
- Selects e inputs sin `<label>` → todos tienen `<label htmlFor>` o `visually-hidden`.
- `aria-pressed` / `role="progressbar"` / `aria-live` / `aria-hidden` en los iconos → presentes (`ControlPanel.jsx`, `Navbar.jsx`).
- `<main>`, enlace para saltar al contenido, `h1` y `h2` → `App.jsx`, cada página tiene un `h1`.
- `:focus-visible` global y sin `transition: all` → `global.css`.
- `--text-dim` en texto legible → ya no se usa en ningún texto (solo queda definido).
- Texto de 9 a 10 px → el mínimo ahora es 12 px.
- `alert()` → reemplazado por avisos en la página y `ModalConfirmacion`.
- `color-scheme` y `meta theme-color` → `index.html` y `ConfigContext.jsx`.
- Canvas sin alternativa → `aria-label` con resumen y tabla oculta (`LineChart.jsx`), resumen en el 3D y la superficie.
- Historial sin confirmación de borrado → modal de borrado lógico.
- Fechas y números a mano → `utils/formato.js` con `Intl`.

### Hallazgos nuevos

## frontend/src/pages/CambiarPasswordPage.jsx

frontend/src/pages/CambiarPasswordPage.jsx:100 - clase `mode-btn` ya no existe tras la Fase 6 → botón sin estilo
frontend/src/pages/CambiarPasswordPage.jsx:49 - rol en crudo (`admin`) → texto legible
frontend/src/pages/CambiarPasswordPage.jsx:44 - clase `fade-in` sin definir
frontend/src/pages/CambiarPasswordPage.jsx:67 - `autoFocus` también en teléfono

## frontend/src/pages/LoginPage.jsx

frontend/src/pages/LoginPage.jsx:35 - clase `fade-in` sin definir
frontend/src/pages/LoginPage.jsx:54 - `autoFocus` también en teléfono (abre el teclado)

## frontend/src/pages/HistorialPage.jsx

frontend/src/pages/HistorialPage.jsx:161 - filtros solo en el estado → no se reflejan en la URL ni se pueden enlazar
frontend/src/pages/HistorialPage.jsx:53 - textarea sin `name`
frontend/src/pages/HistorialPage.jsx:233-266 - selects y casilla de filtros sin `name`
frontend/src/pages/HistorialPage.jsx:202 - comillas rectas `"Ver eliminadas"` → «Ver eliminadas»
frontend/src/pages/HistorialPage.jsx:82 - lista sin `content-visibility` (crece con cada sesión)

## frontend/src/components/config/SeccionFormulario.jsx

frontend/src/components/config/SeccionFormulario.jsx:45 - al fallar, el foco no va al primer campo con error
frontend/src/components/config/SeccionFormulario.jsx:94-109 - inputs sin `name`
frontend/src/components/config/SeccionFormulario.jsx - sin aviso al salir con cambios sin guardar (`beforeunload`)

## frontend/src/components/config/SeccionUsuarios.jsx

frontend/src/components/config/SeccionUsuarios.jsx:54,75,116,149 - controles sin `name`

## frontend/src/components/charts/Canvas3D.jsx

frontend/src/components/charts/Canvas3D.jsx:314 - `role="img"` en un elemento enfocable con `onKeyDown` → rol interactivo incoherente (usar `role="region"` + descripción)

## frontend/src/components/charts/Superficie3D.jsx

frontend/src/components/charts/Superficie3D.jsx:107 - select sin `name`

## frontend/src/styles/global.css

frontend/src/styles/global.css:154 - navbar `sticky` puede tapar el elemento enfocado al tabular → `scroll-padding-top` en `html`
frontend/src/styles/global.css:118 - títulos sin `text-wrap: balance`
frontend/src/styles/global.css:151 - navbar sin `env(safe-area-inset-*)` (muesca de los iPhone)
frontend/src/styles/global.css:287 - botones sin `touch-action: manipulation` ni `-webkit-tap-highlight-color`
frontend/src/styles/global.css:306 - `transition: width` en la barra de progreso → usar `transform: scaleX`
frontend/src/styles/global.css:388 - `fila-nueva` anima `background` (no es compositor) — se mantiene, ver justificación
frontend/src/styles/global.css:239 - `.main-container:focus { outline: none; }` — se mantiene, ver justificación

## frontend/index.html

frontend/index.html:32 - fuentes desde el CDN de Google: el navegador integrado las bloqueó (`ERR_BLOCKED_BY_CLIENT`) y sin internet en el hotspot no cargan → empaquetar con @fontsource (excepción permitida por el prompt)

## Varios archivos (tipografía)

- Unidades separadas por un espacio normal (`20 mm`, `845 puntos`): se cortan entre líneas → espacio de no separación en KPI, píldoras de planos, leyendas y progreso.
- Marcas y códigos (`TMS`, `Pico W`, `HMC5883L`, el token) sin `translate="no"`.

## frontend/src/components/ui/KpiCards.jsx · DataTable.jsx · LineChart.jsx · Navbar.jsx · MenuLateral.jsx · ControlPanel.jsx · modals/*

✓ pass (salvo los puntos de tipografía de arriba)

## 2. Hallazgos que se mantienen, con su justificación

| Hallazgo | Por qué se mantiene |
|---|---|
| Títulos y botones en *Title Case* (Chicago) | La interfaz está en español: la norma (RAE) es mayúscula solo inicial. |
| `.main-container:focus { outline: none; }` | `<main tabIndex={-1}>` solo recibe el foco del enlace «Saltar al contenido» por programa; no es interactivo y el contorno sería ruido. Todo lo interactivo dentro sí tiene `:focus-visible`. |
| `fila-nueva` anima el color de fondo | Es el único movimiento con sentido (marca la lectura nueva); dura 0,6 s, en una sola fila y se desactiva con movimiento reducido. Un pseudo-elemento con `opacity` no funciona bien en celdas de tabla. |
| Filas de la tabla en vivo sin virtualizar | Como máximo `filas_tabla` (60 por defecto), ya limitadas. |
| Paneles expandidos del historial fuera de la URL | Son detalles de lectura; los filtros sí van a la URL. |
| Mensajes 422 con el nombre técnico del campo | Vienen del servidor y se muestran junto al campo correcto; traducirlos duplicaría las reglas. |

## 3. Plan de diseño (skill frontend-design)

El prompt pide presentar el plan y esperar la aprobación. El usuario dejó la instrucción de trabajar sin pausas («acepta todos los permisos en automático»), así que el plan se aplicó directamente y queda aquí para revisarlo.

**Dirección:** instrumento de laboratorio. Oscuro de base (sin cambiar ningún valor de `:root`), guinda del IPN como único color de marca, y los colores de Bx, By, Bz y |B| reservados para los datos. Nada decorativo compite con las gráficas.

**Tokens:**
- Oscuro: los de `:root`, intactos. Se agregaron alias semánticos (`--color-bx`, `--peligro`, `--lienzo-3d`, `--rejilla`, `--foco`…) que repiten esos mismos valores.
- Claro (contraste AA verificado, sección 4): fondo `#F4F5F7`, superficie `#EDEFF2`, tarjeta `#FFFFFF`, texto `#1B1D23`, secundario `#5C6273`, Bx `#0062A8`, By `#A3007F`, Bz `#00704D`, |B| `#7A6500`, guinda `#8b1a2f`, peligro `#B3261E`.

**Escala tipográfica (mínimo 12 px):**

| Papel | Familia | Tamaño |
|---|---|---|
| Título de página (`h1`) | Rajdhani 700 | 1,6 rem |
| Título de panel o gráfica (`h2`) | Rajdhani 700 | 1,15–1,2 rem |
| Etiquetas, ayudas, texto de interfaz | Inter 400/500, minúscula normal, sin espaciado extra ni prefijo «//» | 13–14 px |
| Cifras (KPI, tabla, progreso, tiempos) | Share Tech Mono con `tabular-nums` | 13 px a 1,7 rem |

**Jerarquía del dashboard:** configuración y progreso arriba (lo que se hace), luego los cuatro indicadores (estado, plano, |B|, posición de la última lectura), la gráfica de líneas a todo el ancho, los dos 3D lado a lado (apilados en teléfono) y la tabla al final.

**Movimiento:** uno solo con sentido, el destello de la fila nueva de la tabla. El punto de «Adquiriendo» parpadea suave; el menú entra con un desplazamiento corto. Todo se apaga con `prefers-reduced-motion` o con «Reducir animaciones». La rotación del 3D solo si la configuración lo pide y nunca con movimiento reducido.

## 4. Contraste AA de los pares texto/fondo

Calculado con la fórmula de WCAG 2.1 (luminancia relativa). Mínimo 4,5:1 para texto normal.

**Oscuro** (fondo `#0d0d0f` / tarjeta `#1a1a20` / superficie `#141418`):

| Texto | Fondo | Tarjeta | Superficie |
|---|---|---|---|
| `--text-primary` #eef0f5 | 17,03 | 15,19 | 16,11 |
| `--text-secondary` #8a8fa8 | 6,08 | 5,42 | 5,75 |
| Bx #00e5ff | 12,62 | 11,26 | 11,94 |
| By #ff00c8 | 5,63 | 5,02 | 5,32 |
| Bz #00ffa3 | 14,64 | 13,06 | 13,85 |
| \|B\| #ffe600 | 15,32 | 13,67 | 14,50 |
| Peligro #ff7070 | 7,22 | 6,44 | 6,83 |
| Salina #ff8c00 | 8,32 | 7,43 | 7,88 |
| ~~`--text-dim` #505568~~ | 2,63 | 2,34 | 2,49 → **no se usa para texto** |
| ~~`--guinda-bright` #c0233f~~ | 3,29 | 2,93 | 3,11 → **solo bordes e iconos**; los enlaces del tema oscuro usan el texto primario |
| Blanco sobre botón guinda #c0233f | 5,91 | | |

**Claro** (fondo `#F4F5F7` / tarjeta `#FFFFFF` / superficie `#EDEFF2`):

| Texto | Fondo | Tarjeta | Superficie |
|---|---|---|---|
| `--text-primary` #1B1D23 | 15,44 | 16,85 | 14,62 |
| `--text-secondary` #5C6273 | 5,58 | 6,09 | 5,28 |
| Bx #0062A8 | 5,81 | 6,34 | 5,50 |
| By #A3007F | 6,72 | 7,33 | 6,26 |
| Bz #00704D | 5,62 | 6,13 | 5,32 |
| \|B\| #7A6500 | 5,22 | 5,69 | 4,94 |
| Guinda #8b1a2f | 8,42 | 9,18 | 7,84 |
| Peligro #B3261E | 5,99 | 6,54 | 5,58 |
| Salina #9A5B00 | 4,97 | 5,43 | 4,71 |
| Blanco sobre botón guinda #8b1a2f | 9,18 | | |

## 5. Segunda pasada de web-design-guidelines (después de corregir)

Todos los hallazgos nuevos de la sección 1 quedaron corregidos, salvo los justificados en la sección 2:

- `CambiarPasswordPage`: botón con `btn-tms btn-secundario`, rol legible, sin `fade-in`, `autoFocus` solo con puntero fino.
- `LoginPage`: sin `fade-in`, `autoFocus` solo con puntero fino (no abre el teclado del teléfono).
- `HistorialPage`: filtros en la URL (`?vista=historial&modo=…&paso_mm=…&medio=…&origen=…&dia=…&eliminadas=1`), `name` en todos los controles, «Ver eliminadas» con comillas latinas, `content-visibility: auto` en las tarjetas, versiones con `translate="no"`.
- `SeccionFormulario`: `name` en cada campo, foco al primer campo con error, aviso `beforeunload` con cambios sin guardar.
- `SeccionUsuarios`, `Superficie3D`: `name` en los controles; el selector de rol tiene ancho mínimo (en el teléfono se encogía hasta no mostrar el texto; encontrado al verificar a 375 px).
- `Canvas3D`: `role="region"` con `aria-roledescription="visor 3D"` y el resumen en `aria-describedby`.
- `global.css`: `scroll-padding-top` (la barra fija no tapa el foco), `text-wrap: balance/pretty`, `env(safe-area-inset-*)`, `touch-action: manipulation` y resaltado táctil propio, barra de progreso con `transform: scaleX`.
- `index.html` + `main.jsx`: fuentes con @fontsource (Rajdhani 500/600/700, Inter 400/500/600, Share Tech Mono); ya no se usa el CDN de Google.
- Espacios de no separación entre cifra y unidad en KPI, píldoras de planos y progreso; `translate="no"` en TMS, el estado de la Pico, el firmware y el token.
- Ajuste extra del tema claro al ver las capturas: Bx pasó a azul `#0062A8` porque el verde azulado `#00717F` no se distinguía de Bz `#00704D` en la gráfica.

## 6. Verificación en el navegador integrado

- Teclado: el foco siempre es visible (`:focus-visible`, contorno de 2 px) y nunca queda bajo la barra fija; el menú atrapa el foco, Esc lo cierra y el foco vuelve a ☰; los modales de Bootstrap devuelven el foco.
- Movimiento reducido: con «Reducir animaciones» (o `prefers-reduced-motion`) las transiciones bajan a 0,01 ms y el 3D no rota.
- Temas: oscuro, claro y sistema; persistencia al recargar (localStorage + preferencia del usuario en el servidor).
- 375 px y 1440 px: sin desplazamiento horizontal de la página; el 3D se arrastra con el dedo sin desplazar la página.
- Consola: sin errores propios (solo las respuestas 422 y 409 de las pruebas intencionales).
- Lighthouse y axe no se pasaron: no están instalados y la regla del proyecto no permite agregar librerías.
- `npm run build` sin errores.
