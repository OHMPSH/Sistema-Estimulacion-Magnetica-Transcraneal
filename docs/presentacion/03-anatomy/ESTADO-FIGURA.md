# Estado de la figura Anatomy del SAVD (para retomar después del compact)

**Última actualización: 2026-11-25, noche.** Este archivo manda sobre `PLAN-FIGURA.md`, que queda como historia del plan original (fotos, mecanismo confirmado y datos).

## 1. Qué está hecho

**Figura principal construida** en `figuras/sistema/`:

| Archivo | Qué es |
|---|---|
| `build.mjs` | Genera `savd-sistema.html`. `--audit` audita la geometría; `--audit --pose c,l,z` audita con la mesa en otra posición (mm reales) y no reescribe la página |
| `live.js` | Parte viva: movimiento con la rampa real, etapas, cables flexibles, separación de capas y leyenda |
| `savd.css` | Tintes de las fotos (MDF, PLA rojo, acoples azules, borneras verdes y módulo azul), controles y estilos de las pantallas |
| `datos.json` | Exportación de `tms_db` (solo `SELECT`): sesiones 93 y 126, en mm del sistema y cuentas crudas. Lo genera un script del scratchpad (`exportar.cjs` y `datos.mjs`) que ya no existe tras el compact; si hace falta, se rehace con `server/node_modules/mysql2` y `dotenv` sin imprimir la contraseña |
| `savd-sistema.html` | La página: independiente, tema oscuro y sin conexión, unos 420 KB |
| `LEEME.md` | Uso, qué es dato y qué es dibujo, cómo regenerarla y la verificación |
| `shots/` | Capturas de cada etapa, de las capas separadas y del teléfono (390 px) |

**Cómo funciona hoy:**

- **Etapa 1 (movimiento):** recorre la sesión real **126**, que cubre toda la bobina. Zona de 125 × 200 × 15 mm reales con paso de 15 mm: 9 × 14 puntos por plano en 2 planos (252 puntos), con los tiempos reales de la Pico. Va a ×8. Se usa la rampa del firmware (3 mm/s de arranque, 150 mm/s², 30 mm/s de crucero, 300 ms de asentamiento) y el orden de `mover_a`. Cada punto deja una gota sobre la espuma y el LED del driver del eje que se mueve parpadea.
  - El usuario pidió «toda el área de la bobina, sin demasiados puntos». Se usó la 126 para no inventar lecturas. Si los quiere más espaciados, la opción ofrecida es mostrar uno de cada dos puntos (cada 30 mm), que siguen siendo medidos.
- **Etapa 2 (adquisición):** 10 DRDY sobre el módulo y luego las cuentas reales del punto, convertidas a µT, con \|B\| y OVFL.
- **Etapa 3 (envío):** los 86 lotes reales de la 126 (de 1 a 4 lecturas; misma hora del servidor = mismo lote) van de la Pico a la laptop y por SSE al teléfono, más un latido cada 5 s. Va a ×10. No se muestra «duplicadas», porque la base no lo guarda.
- **Etapa 4 (previsualizador):** sliders de eje corto, eje largo y Z; la mesa se mueve con la rampa. Un medidor de aguja en la laptop muestra la componente mayor entre 3000 µT, interpolada de la 126, con los avisos del firmware. Fuera de la zona dice «fuera de la zona medida».
- **E (separar capas):** stagger `electronica, arco, espuma, bobina, tapa`; las paredes de la caja no se mueven. Debajo aparece una leyenda 01–09 que resalta cada capa.
- **Teclas:** 1–4 y E funcionan aunque el foco esté en un slider; Esc junta las capas.

**Verificación hecha:** `audit passed` en reposo y en 12 poses (incluida la separación de capas cuadro a cuadro), y `line ends: 0` en reposo, en una pose extrema y con las capas separadas. Consola limpia. Se abrió en el navegador integrado con un `python3 -m http.server` temporal, ya detenido.

**Publicación:** se publicó como Artifact y el usuario lo compartió con sus colegas. **A pedido del usuario se borró** (2026-11-25): el enlace ya no existe. No volver a publicar sin que lo pida.

## 2. Cómo está armado (para no romperlo al mejorar)

- **Mundo:** 1 unidad = 1 mm real. x = eje largo (riel del arco), y = eje corto (la cama oculta arrastra el arco), z = altura. Cámara con azimut 57° y elevación 30°.
- **Orden de dibujo:** grupos fijos (`GROUPS` en `build.mjs`), de atrás hacia adelante. Dentro de cada grupo el orden lo mide `A.settle`, y luego `key = grupo·10000 + rango`.
  - Cada grupo se mueve entero: `mov` dice qué ejes lo arrastran (c, l, z) y `capa`, su vector de separación.
  - Si una pieza nueva cambia de lado respecto de otro grupo, **hay que ponerla en el grupo correcto**. Se comprueba con `--audit --pose`, probando por lo menos 0,0,0 · 205,281,44 · 0,281,0 · 60,200,10.
- **Cables flexibles en `live.js`** (no los revisa la auditoría):
  - fuente → driver 3, en `cablesFondo`;
  - driver 2 → motor Z: el tramo que sube va en `cablesAtras` y el arco, en `cablesFrente`;
  - shield → aro del cilindro: igual, un tramo en cada capa.
- **Cable del motor del eje largo:** está en el grupo `cableLargo`, que viaja con el arco. Corre a z ≈ 401, entre la parte de arriba del carro (388) y la placa del motor Z (422).
- **Medidas estimadas de las fotos** (no son datos): caja de 420 × 430 × 100, arco, soporte de la bobina, fuente atrás a la derecha, laptop y teléfono.

## 3. Reglas que siguen vigentes

- Solo crear o cambiar archivos dentro de `docs/presentacion/` (la figura, en `03-anatomy/figuras/`). No tocar `server/`, `frontend/`, `firmware/`, `app/` ni `nginx/`.
- **Sin commits, push ni ramas**: los hace el usuario.
- Base de datos: **solo `SELECT`** contra `tms_db`; sin INSERT, UPDATE ni DELETE, y sin crear sesiones.
- No copiar secretos (`server/.env`, `firmware/secretos.py`, tokens) a ningún archivo.
- No agregar librerías al proyecto.
- **Cada dato debe salir del código, de la base o de CLAUDE.md, con su fuente.** Lo que no se pueda comprobar se marca «por confirmar» y se pregunta; no se inventa. Las medidas de dibujo no se rotulan como datos.
- mm reales = mm del sistema ÷ 2, con la conversión anotada.
- Portable a Windows: rutas relativas, UTF-8, sin enlaces simbólicos, HTML sin conexión.
- La foto `fotos/01-sistema-frente.webp` muestra el correo de otra persona: lo decide el usuario antes de compartir.
- No usar `scripts/publish.mjs` de Anatomy ni publicar Artifacts salvo que el usuario lo pida.
- Incluir los apagones de la Pico como limitación, con honestidad (ya está en el pie de la figura).
- Responder en español, en prosa completa, con decimales con coma.
- Al terminar cada mejora: auditoría (reposo y poses) en `audit passed`, `lines.mjs` en 0, revisar en el navegador y mostrar capturas.

## 4. Dónde nos quedamos y qué falta

- **Lo siguiente:** las mejoras de la sección 5 están hechas; esperar nuevos pedidos del usuario.
- **Opcional, sin hacer:**
  - ~~figuras de detalle D1 y D2~~ hechas (sección 5);
  - ~~la versión en tema claro~~ hecha: ahora es la única;
  - mostrar uno de cada dos puntos en la etapa 1.
- **Abierto en `PREGUNTAS.md`:** la separación sensor–bobina en mm, el avance del T8 y el ángulo de paso (la causa del ×2), y las preguntas 1, 2, 6, 8, 9 y 10.

## 5. Mejoras del 2026-11-25 (noche), hechas

Pedido del usuario: solo tema claro; acercamiento al módulo en la adquisición; previsualizador sin sliders, con la pantalla al frente y sábanas 3D de las últimas mediciones de la doble D; figuras de detalle D1 y D2; «no cambies absolutamente nada más».

- **Figura principal (`figuras/sistema/`):**
  - Solo tema claro: `pageHtml` con theme `light` y `savd.css` reescrito con tintes claros. La clase nueva `t-negro` se usa en los TB6600, la fuente y el cuerpo de los NEMA.
  - Etapa 2: acercamiento animando el `viewBox` (`moduleBox`); mientras dura, las líneas conservan su grosor en pantalla (`vector-effect`). La capa `medida` dibuja las líneas de campo (explicativas), los bits I2C, las flechas de Bx, By y Bz con los µT medidos y un recuadro con la lectura. Al módulo se le agregaron piezas SMD y un regulador.
  - Etapa 4: ya no hay sliders ni medidor. La pantalla de la laptop pasa al frente: la matriz se interpola de la del plano isométrico a una plana (`stepFront`) y un velo cubre lo de atrás. Las sábanas 3D de Bx, By y Bz (mapa «jet») rotan cada 7 s entre 127 Z0, 127 Z15, 128 y 130. Los datos están en `datos.json → sabanas` (µT del servidor, sin restar el fondo).
  - El pie de figura se actualizó.
- **D1 (`figuras/cabezal-bobina/`) y D2 (`figuras/pico-driver-motor/`):** construidas, con LEEME propio. Comparten `figuras/comun/taller.mjs` (los ayudantes de piezas, iguales a los de `build.mjs`) y `comun/medida.js`.
- **Verificación:**
  - Auditoría y líneas en cero en las tres figuras.
  - Figura principal: `audit passed` en reposo y en 5 poses.
  - D1: poses 0, 97,5 y 195.
  - D2: poses 0, 11, 20 y 22.
  - Consola limpia. Capturas nuevas en cada `shots/`.
- **Por confirmar (marcado en los LEEME):**
  - La dirección de los ejes del sensor respecto de la mesa.
  - La separación entre el sensor y la bobina.
  - La corriente S4–S6 del DIP.
  - Qué valor de DIR corresponde a cada sentido.
  - El avance del T8.
- **Detalle que ya estaba antes:** a 390 px de ancho, el título de la tarjeta se encima con «Fig. 1». Es del kit y no se tocó.

## 6. Corrección del 2026-11-25 (noche)

- **En negro (`t-negro`), como en las fotos:**
  - La estructura de la CNC: los perfiles de la base 3018 oculta, las placas y el perfil del arco, la placa del carro, los bloques del eje Z, la placa del motor Z, el bloque Z y la abrazadera del cabezal.
  - En D1, también el bloque Z y la abrazadera.
- **Navegación:** las tres páginas tienen arriba una fila de enlaces (`.sv-nav`) con rutas relativas: Fig. 1 · Sistema completo, Fig. D1 · Sensor y bobina, Fig. D2 · Pico, driver y motor. Funcionan sin conexión si se copian las tres carpetas juntas.
- **Verificación:** `audit passed` en las tres figuras y en las poses de la principal, `line ends: 0` y capturas rehechas.

## 7. Sin espuma (2026-11-25, noche)

- A pedido del usuario se quitó la espuma negra de la figura principal y de D1, para que se vea bien la bobina.
- **Figura principal:** salió de `EXP` y de `GROUPS`. Las gotas y el contorno de la zona medida pasaron al grupo `bobina`, sobre la placa (z = COIL.z + 4), y ahora son oscuras (`--anatomy-hi`).
- **D1:** ya no tiene la tecla E ni el botón de la espuma; el sensor conserva su altura.
- **Verificación:** auditoría en reposo y en poses, `line ends: 0` y capturas rehechas.

## 8. Figura D3 · Bobinas y su campo (2026-11-25, noche)

- **Para qué:** pedido para la introducción del examen (segunda diapositiva). Carpeta nueva: `figuras/bobinas/` (ver su LEEME).
- **Qué muestra:** tres bobinas (anular, en 8 y doble D) con el mismo soporte que la doble D y, encima, la sábana del campo.
  - Teclas: 0–3, M/X/Y/Z, S y G.
  - Modo `?diapo=1` para el iframe de 864 × 375.
  - Reenvía las teclas de la presentación con `postMessage`.
- **Datos:**
  - En 8: sesión 117 (por confirmar que es esa bobina).
  - Doble D: sesión 127.
  - En las dos se resta el fondo (promedio del borde).
  - Anular: simulación de Biot–Savart con la escala de la Fig. 2.10.
- **Lo que no se tocó:** las otras tres figuras (ni su barra de navegación), `comun/` y la carpeta `presentacion/` de la raíz. D3 tiene su propia barra con enlaces a las cuatro figuras; las otras no enlazan a D3.
- **Verificación:** `audit passed`, `line ends: 0`, consola limpia y capturas en `shots/`.
- **Corrección (pedido del usuario):** los dos anillos de la bobina en 8 se enciman. Cada uno mide 47 mm de radio y sus centros están a ±40 mm, así que las vueltas se cortan en la cintura (x = centro) sobre una costura recta, como en la foto. En modo diapositiva se quitó el contorno de foco del dibujo. `audit passed`, `line ends: 0` y capturas rehechas.
- **Corrección (pedido del usuario):** la sábana de la doble D ya no usa la sesión 127. Ahora es la simulación teórica: Biot–Savart sobre las espiras en D del dibujo, plano a 22 mm, escala y signo de la Fig. 2.15 de la tesis. Las mediciones reales de la doble D siguen en la etapa 4 de la Fig. 1. `audit passed`, `line ends: 0` y capturas rehechas.
- **Modo `?diapo=1&solo=1`:** solo el dibujo 3D, sin botones ni lectura; captura en `shots/d3-solo-3d.png`. Las instrucciones para la sesión que integra `presentacion/` están en `figuras/bobinas/PARA-LA-PRESENTACION.md`.

## 9. Dónde quedó todo (2026-11-25, noche, antes del compact)

- **Cuatro figuras** en `docs/presentacion/03-anatomy/figuras/`:

| Carpeta | Página |
|---|---|
| `sistema/` | `savd-sistema.html` |
| `cabezal-bobina/` | `cabezal-bobina.html` |
| `pico-driver-motor/` | `pico-driver-motor.html` |
| `bobinas/` | `bobinas.html` |

- Comparten `comun/`. Cada una tiene su LEEME, su `build.mjs` y su carpeta `shots/`. Todas están en tema claro y funcionan sin conexión.
- **Pendiente del usuario:**
  - Confirmar que la sesión 117 es la de la bobina en 8.
  - Pasarle `figuras/bobinas/PARA-LA-PRESENTACION.md` a la sesión de la presentación.
- **Por confirmar (desde antes):**
  - La separación entre el sensor y la bobina.
  - La orientación de los ejes del sensor.
  - Los interruptores S4–S6 del DIP.
  - Qué valor de DIR corresponde a cada sentido.
  - El avance del T8.
- **Nada tiene commit.** Los respaldos de datos se exportaron solo con `SELECT`; los scripts de exportación estaban en el scratchpad y se pierden, pero se pueden rehacer con `server/node_modules/mysql2` y `dotenv` sin imprimir la contraseña.
