# Presentación del examen profesional (HTML)

La presentación parte de una conversión fiel de `Presentacion_TMS_v18.pptx` a HTML, en formato 16:9. Después se rehicieron o agregaron algunas diapositivas a pedido; la sección 6 dice cuáles. En total son **20**.

Funciona **sin internet**: las fuentes, las imágenes, las figuras 3D y el código están dentro de esta carpeta, con rutas relativas y en UTF-8.

## 1. Abrirla y presentar en Windows

1. Copia la carpeta `presentacion/` completa (por ejemplo, a una memoria USB). No la separes: `index.html` necesita `css/`, `js/`, `img/`, `figuras/` y `fuentes/`.
2. Haz doble clic en **`index.html`**. Se abre en el navegador predeterminado. Usa **Chrome o Edge** (si se abre en otro, clic derecho › *Abrir con* › Chrome o Edge).
3. Pulsa **F** para pantalla completa (o F11). La diapositiva se ajusta sola a la pantalla en 16:9.
4. Si el proyector es la segunda pantalla, arrastra la ventana a esa pantalla **antes** de pulsar F.

| Tecla | Acción |
|---|---|
| → · ↓ · Espacio · Av Pág · Intro · clic | Siguiente paso o diapositiva (ver «Pasos» abajo) |
| ← · ↑ · Re Pág · Retroceso | Paso o diapositiva anterior |
| Inicio / Fin | Primera / última |
| número + Intro (p. ej. `1` `2` Intro) | Ir a esa diapositiva |
| F | Pantalla completa (otra vez F o Esc para salir) |
| N | Abre la vista del orador en otra ventana |
| B o `.` | Pantalla en negro (cualquier tecla la quita) |
| H o `?` | Muestra las teclas |

- **Control remoto:** un control de presentaciones (*clicker*) funciona sin configurar nada, porque manda Av Pág / Re Pág.
- **Clic:** un clic izquierdo en la diapositiva también avanza, como en PowerPoint. Un clic sobre una figura 3D hace lo mismo.
- **Número de diapositiva:** va en el pie de cada una. Al cambiar de diapositiva aparece unos segundos un contador «N / 20» en la esquina, y abajo hay una barra de progreso delgada.
- **Cursor:** se oculta solo tras 2 s sin mover el ratón.
- **Recargar:** la dirección termina en `#N` (por ejemplo `index.html#12`), así que si recargas vuelves a la misma diapositiva.

**Pasos:** algunas diapositivas consumen uno o dos avances antes de pasar a la siguiente, como una animación «al hacer clic» de PowerPoint. Al regresar desde la siguiente, llegas con los pasos ya hechos.

| Diapositiva | Al llegar | Avance 1 | Avance 2 |
|---|---|---|---|
| 4 · Introducción (bobinas) | Sábanas abajo, sobre su bobina | Las sábanas suben | — |
| 7 · Objetivo general | El sistema con las capas separadas, quieto | Se arma y empieza a medir | — |
| 9 · Dashboard en vivo | Configuración e indicadores | Gráfica de Bx, By y Bz | Mapa 3D y sábana 3D |
| 10 · Historial | Lista de sesiones | Sábana 3D de una sesión | — |

**Servida localmente** (opcional): desde esta carpeta, `python -m http.server 8000` y abrir `http://localhost:8000`. Se comporta igual que con doble clic.

## 2. Notas del orador

- El `.pptx` v18 **no trae notas**: sus páginas de notas solo tienen el número de la diapositiva. Por eso `js/notas.js` está vacío, listo para escribir (números del 1 al 20).
- Para escribirlas, abre `js/notas.js` con el Bloc de notas (o cualquier editor) y escribe el texto entre las comillas invertidas de cada número, por ejemplo ``3: `Aquí hablo de la TMS…`,``. Los saltos de línea se respetan. Guarda en UTF-8, que es lo predeterminado en el Bloc de notas de Windows 10 y 11.
- Durante la presentación, pulsa **N**. Se abre otra ventana con:
  - la diapositiva actual y la siguiente;
  - las notas;
  - la hora;
  - un cronómetro, que empieza al primer cambio de diapositiva y tiene botones Pausar y Reiniciar.
- Lleva esa ventana a la pantalla de la laptop y deja la presentación en el proyector. Las dos ventanas se siguen entre sí: puedes avanzar desde cualquiera de ellas, y los pasos también se respetan desde la del orador.
- En la ventana del orador las figuras 3D se ven con su imagen fija.
- Si el navegador bloquea la ventana emergente, permite las ventanas emergentes para este archivo (icono a la derecha de la barra de direcciones) y vuelve a pulsar N.

## 3. Exportar a PDF (para entregar al jurado)

1. Abre `index.html` en Chrome o Edge y pulsa **Ctrl + P**.
2. Destino: **Guardar como PDF**.
3. En *Más opciones*:
   - Márgenes: **Ninguno**.
   - Activa **Gráficos de fondo**.
   - Desactiva **Encabezados y pies de página**.
4. Guarda. Salen **20 páginas de 10 × 5,625 pulgadas** (16:9), una diapositiva por página, sin la barra de progreso ni el contador.

El tamaño de página lo fija la propia presentación (`@page` en `css/presentacion.css`). Si el diálogo ofrece *Tamaño del papel*, déjalo en el predeterminado.

En el PDF:

- **Pasos:** cada diapositiva sale con todos sus pasos hechos. Por ejemplo, la 9 sale con el mapa 3D y la sábana 3D, y la 10 con la sábana de la sesión.
- **Figuras 3D:** salen con su imagen fija de respaldo.

## 4. Figuras 3D interactivas

Las figuras son copias de las de Anatomy (`docs/presentacion/03-anatomy/figuras/`); las fuentes de `docs/` no se tocaron. Son SVG con JavaScript, no usan WebGL ni internet, y se cargan al llegar a su diapositiva.

En la diapositiva van sin tarjeta, sin botones y sin cifras escritas: solo el dibujo y su animación.

Cada copia lleva un agregado al final, marcado con el comentario «añadido en presentacion/». Si una fuente cambia, hay que volver a copiarla y repetir ese agregado. Para la del sistema, el agregado lo aplica un script del scratchpad de la sesión del 2026-11-27, que ya no existe; el agregado está completo al final de `figuras/sistema.html`.

### `figuras/bobinas.html` (Fig. D3): diapositiva 4

- Muestra las tres bobinas con la sábana de **Bz**.
- `?comp=z` fija la componente y `?bajada=1` empieza con las sábanas abajo.
- El primer avance las sube.
- Respaldo: `figuras/bobinas-bz.png`.

### `figuras/sistema.html` (Fig. 1, el sistema completo)

Se usa en las diapositivas 7, 8, 12 a 15 y 20. `?diapo=1` quita la tarjeta, los botones, la leyenda y las cifras de la lectura (en el acercamiento al módulo solo quedan las flechas Bx, By y Bz). `?guion=…` elige la animación, que vuelve a empezar cada vez que se llega a la diapositiva:

| Guion | Diapositivas | Qué hace | Respaldo |
|---|---|---|---|
| `capas` | 7 | Llega con las capas separadas y quieta; al avanzar se arma y mide | `sistema-armado.png` |
| `medir` | 8 | Armada, midiendo (el recorrido de la sesión real 126) | `sistema-armado.png` |
| `etapa2` | 12 | 1 s el sistema completo; luego el acercamiento al módulo con la medición y los ejes | `sistema-etapa2.png` |
| `etapa3` | 13 y 14 | 1 s el sistema completo; luego los lotes de la Pico a la laptop y al teléfono | `sistema-etapa3.png` |
| `etapa4` | 15 | 1 s el sistema completo; luego la pantalla de la laptop se abre con las sábanas 3D | `sistema-etapa4.png` |
| `bucle` | 20 | Capas separadas → se arma → mide → se vuelve a separar, en ciclo | `sistema-armado.png` |

### Teclas con el foco dentro de una figura

Las teclas de la presentación siguen funcionando, porque la figura las reenvía. Con el foco dentro de una figura, los números son de la figura (en la del sistema, 1 a 4 cambian de etapa). Para saltar de diapositiva por número, primero haz clic fuera del dibujo, por ejemplo en el título.

### Si una figura no carga

Si ves el marco en blanco o un error:

1. Confirma que copiaste la carpeta completa, con `figuras/`.
2. Recarga con **Ctrl + F5**.
3. Si sigue sin verse, pulsa **Ctrl + Mayús + I** y revisa la pestaña *Consola*.
4. Como último recurso, abre la figura sola con doble clic (por ejemplo `figuras/sistema.html`) y preséntala desde esa ventana. Sola se ve con su tarjeta y sus botones.
5. Si nada funciona, la imagen fija de respaldo está en `figuras/` (es la misma que sale en el PDF).

## 5. Qué contiene la carpeta

```
presentacion/
├── index.html            ← la presentación (20 diapositivas; el diagrama de flujo va dentro, como SVG)
├── orador.html           ← vista del orador (se abre con N)
├── LEEME.md              ← este archivo
├── css/presentacion.css  ← lienzo 16:9, pasos, estilos e impresión
├── js/presentacion.js    ← navegación, pasos, escala, contador, progreso, figuras
├── js/orador.js          ← reloj, cronómetro y enlace con la ventana principal
├── js/notas.js           ← tus notas del orador (vacías)
├── img/                  ← imágenes del .pptx (dNN-… = diapositiva NN del .pptx) y capturas nuevas (nNN-… = diapositiva NN)
│   └── reemplazadas/     ← imágenes del .pptx que ya no se usan (mesa CNC, IoT, capturas viejas, diagramas y el entidad-relación viejo)
├── figuras/              ← bobinas.html, sistema.html y sus imágenes de respaldo
└── fuentes/              ← Gelasio y Carlito (WOFF2) con su licencia OFL
```

## 6. Cómo se hizo y qué cambió frente al original

**Base:** cada diapositiva es HTML real, con texto nítido y seleccionable, sobre un lienzo de 960 × 540 px (= 10 × 5,625 in).

- **Posiciones y estilos:** las posiciones, tamaños, colores, sombras, recortes y estilos de texto se tomaron del XML del `.pptx` (1 px = 9525 EMU; 1 pt = 4/3 px).
- **Plantilla:** la barra guinda, el pie, el número y el círculo decorativo vienen del diseño «SOLO_TITULO», y la portada del diseño «PORTADA».
- **Comprobación:** las 17 diapositivas del original se compararon una por una con el PDF exportado de PowerPoint.

**Diapositivas iguales al original:** 1 (portada), 3 (introducción), 5 (problemática) y 6 (justificación). El índice (2) es igual salvo los números, que se actualizaron, y la tarjeta nueva «19 · Problemáticas y conclusión».

**Diapositivas nuevas o rehechas, a pedido:**

| N.º | Qué cambió |
|---|---|
| 4 | Nueva: las bobinas y su campo (Fig. D3) |
| 7 | Sin la imagen de la mesa CNC ni la tarjeta negra. El mismo texto del objetivo general, en grande, y el modelo 3D del sistema |
| 8 | Los cinco objetivos específicos, con el mismo texto, en la mitad izquierda. El mismo modelo 3D en la derecha, en lugar de la imagen de IoT |
| 9 y 10 | Capturas nuevas del frontend real en tema claro, a 2× (ver abajo), en lugar de las capturas viejas |
| 11 | Diagrama de flujo rehecho y corregido, en cuatro bloques |
| 12 a 15 | Cada bloque del diagrama, en grande, con su animación 3D a la derecha |
| 19 | Nueva: problemáticas en el desarrollo |
| 16 y 17 | El mismo diseño, con los mismos nombres de las tarjetas y los mismos logos; se corrigieron los textos que no coincidían con el sistema (ver abajo) |
| 18 | El mismo diseño; el diagrama entidad-relación se redibujó con el esquema real (`server/setup_db.sql`) y la tarjeta derecha describe sus seis tablas |
| 20 | Nueva: conclusión, con la animación del sistema |

**Capturas de las diapositivas 9 y 10** (2026-11-27):

- **Cómo se tomaron:** son el frontend actual, compilado sin modificar, en tema claro, a 1640 px de ancho y escala 2. Corría contra una **copia temporal** de la base: tu `tms_db` solo se leyó, y la copia se borró al terminar.
- **Diapositiva 9:** muestra la **sesión real 126** (zona de 200 × 125 × 15 mm, paso de 15 mm, 252 puntos) reproducida con sus lecturas originales, como si la mandara la Pico. Se capturó a mitad del barrido, con 190 de 252 puntos. La duración y el tiempo restante que se ven son los de esa reproducción.
- **Diapositiva 10:** muestra la lista real de sesiones (130 a 125) y la sábana 3D de la **sesión real 124**, acercada con la rueda del ratón.

**Diagrama de flujo corregido** con el código y `CLAUDE.md`. Frente al original:

- **Sensor y conexión:** sensor QMC5883P por I2C, en lugar del «arreglo de sensores Hall», la «señal analógica» y el «ADC».
- **Firmware:** solo MicroPython, en lugar de «C++/MicroPython».
- **Tiempo real:** SSE, en lugar de «HTTP/WS».
- **Contraseñas:** scrypt.
- **Cifra de latencia:** se quitó «de 3 h a 30 min», que no está registrada.

**Datos de la conclusión y de las problemáticas** (todos salen de `CLAUDE.md`):

- **Barrido real más grande:** sesión 113, 777 puntos en 9,4 min.
- **Problemáticas:** el sensor mal identificado, el cableado de tierras, el DMA del RP2350, el ritmo del previsualizador y la escala ×2.
- **Apagones esporádicos de la Pico 2 W:** van como «en estudio», porque siguen sin diagnóstico.
- **Objetivos 3 y 5:** la instalación en la Raspberry Pi 5 y la prueba de la app se dan por hechas, según lo confirmó el usuario el 2026-11-27.

**Fuentes de letra:**

- En Windows se usan **Georgia** (títulos) y **Calibri** (texto), las mismas del original.
- En equipos sin ellas entran **Gelasio** y **Carlito**, libres y con las mismas medidas, así que los renglones cortan igual.

**Ecuación:** la «ecuación» de la diapositiva 18 (las X, Y, Z en cursiva matemática) está en MathML.

**Lo que no se pasó tal cual o sigue como en el original:**

- **Notas del orador:** el original no tiene.
- **Numeración de figuras y fuentes de las imágenes:** el original no tiene números de figura ni fuentes visibles, y no se agregaron. Solo tres imágenes traen su origen en el texto alternativo y se conservaron ahí:
  - diapositiva 5 (4 del original): Wikipédia;
  - diapositiva 6 (5 del original): Unidad de Terapias Avanzadas;
  - la imagen de IoT de la antigua diapositiva de objetivos específicos (Cirrus Blog), que ya no se usa.
- **Animaciones:** el original no tiene. Las de esta versión son las de las figuras 3D y los pasos de la tabla de la sección 1.
- **Marcadores «Logo» ocultos:** los dos de las diapositivas 16 y 17 no se ven en el original ni aquí.
- **Diapositivas 16 a 18, corregidas el 2026-11-27** (con el código y `CLAUDE.md`):
  - **Frontend:** Chart.js, Three.js y Plotly, y la app en React Native (Expo).
  - **Base de datos:** 6 tablas, transacciones y hora en UTC; se quitó «normalizada a 3FN», que no se comprobó.
  - **Sistema operativo:** Raspberry Pi OS (Debian) con Nginx HTTPS.
  - **Firmware:** MicroPython con POO, PIO y DMA, en lugar de «C++/MicroPython».
  - **Comunicación:** HTTP y JSON por Wi-Fi con token, SSE y scrypt, en lugar de «HTTP/TCP» y «bcrypt».
  - **Microcontrolador:** Pico 2 W (RP2350) con Wi-Fi, I2C y PIO, en lugar de «ADC concurrente».
  - **Sensado:** magnetómetro QMC5883P de 3 ejes por I2C, ±30 G, en lugar de «Sensores Hall 3D».
  - **Posicionador:** se agregaron los drivers TB6600 y «husillos T8» en lugar de «tornillos Acme T8».
  - **Sin cambios, porque no hay registro para comprobarlos:** «Alimentación» (5 V/12 V, PCB), «Servidor» (8 GB, SSD) y «Equipo existente».
  - **Logo de la tarjeta «Firmware»:** sigue siendo el de C++, como en el original, aunque el texto ya dice MicroPython.
