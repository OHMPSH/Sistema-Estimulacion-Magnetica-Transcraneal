# Plan de la figura Anatomy del SAVD (para retomar después del compact)

**➜ Para retomar, leer primero [`ESTADO-FIGURA.md`](ESTADO-FIGURA.md).** Estado (2026-11-25, tarde): FIGURA PRINCIPAL CONSTRUIDA en [`figuras/sistema/`](figuras/sistema/LEEME.md) (`savd-sistema.html`, con las cuatro etapas, la separación de capas y la auditoría en cero). Faltan las dos figuras de detalle (D1 y D2), que son opcionales. Lo de abajo es el plan original, que sigue sirviendo como referencia.

---

## 0. Cómo retomar (en este orden)

1. Leer este archivo completo.
2. Leer `CLAUDE.md` (secciones 0, 0.11 y 1), [`../01-cifras-reales.md`](../01-cifras-reales.md), [`../PREGUNTAS.md`](../PREGUNTAS.md) y la sección «Mi montaje real» de [`prompts.md`](prompts.md).
3. P1 ya está resuelto (sección 5): no hay que volver a preguntarlo.
4. Cargar la skill con la herramienta `Skill` (`anatomy`). Está instalada en `~/.claude/skills/anatomy` (versión 1.1.0). Leer su `SKILL.md` y, antes de diseñar, `references/craft.md`, `references/kit.md`, `references/motion.md` y `references/verify.md`. Abrir los ejemplos más cercanos: `examples/arcade-cabinet/` (corte, explosión, cables, varias piezas que se mueven), `examples/test-rig/` (calidad del dibujo, carro sobre rieles) y `examples/dial-indicator/` (el más chico, para arrancar).
5. Correr `date` al empezar y en cada paso (la skill lo pide para controlar el tiempo).
6. Tener una página que abra en el navegador **dentro de la primera hora**, y de ahí detallar.

## 1. Reglas (del usuario y del proyecto)

- **Solo crear archivos dentro de `docs/presentacion/03-anatomy/`** (las figuras, en `figuras/`). No tocar `server/`, `frontend/`, `firmware/`, `app/` ni `nginx/`. **Sin commits, push ni ramas.**
- Base de datos: **solo `SELECT`** contra `tms_db`. No copiar secretos (`server/.env`, `firmware/secretos.py`, tokens) a ningún archivo.
- **No inventar cifras.** Las lecturas en vivo salen de `01-cifras-reales.md`, del código o de la base, y lo que no se sepa se marca. Las medidas de dibujo estimadas de las fotos no se muestran como datos.
- **mm reales = mm del sistema ÷ 2** (`frontend/src/utils/escalaMM.js`, `FACTOR_MM = 2`). En la figura, mm reales con la conversión anotada.
- Página HTML independiente, **tema oscuro**, **sin conexión** (nada de CDN ni fuentes remotas), etiquetas en español con el nombre real de cada pieza.
- **No usar `scripts/publish.mjs`** de Anatomy (sube a una galería pública) salvo que el usuario lo pida.
- Responder en español, en prosa completa.
- Al terminar: revisar uniones y orden de dibujo (auditoría de la skill en cero, revisión de líneas sueltas en cero), abrir la página en el navegador y **mostrar una captura de cada etapa**.

## 2. El pedido (fiel al mensaje del usuario)

> Quiero el modelo completo de mi sistema físico de tesis para exponer, parte por parte, cómo funciona: desde el movimiento de la mesa hasta la adquisición del campo magnético y el envío de los datos.

**Qué debe explicar (con números reales):**

- **A. Movimiento.**
  - Mesa cartesiana de 3 ejes: X eje corto, Y eje largo, Z altura. Sin finales de carrera.
  - Cada eje con NEMA 17, husillo T8 y TB6600, con ENA común.
  - Pulsos por PIO y DMA: 50 pulsos/mm del sistema, 60 mm/s, 300 mm/s², asentamiento de 300 ms.
  - Serpentina plano por plano; Z sube desde la bobina (z = 0 es el plano más cercano).
  - Descanso y origen en (0, 0, 0) con Z abajo. Al terminar o detener, vuelve al descanso: primero X e Y y al final baja Z.
  - Escala de los rieles ×2 (en mm reales, con la conversión).
- **B. Adquisición.**
  - QMC5883P por I2C: 0x2C, SDA en GP0, SCL en GP1, 100 kHz, 30 G (±3000 µT), 200 Hz.
  - En cada punto: espera DRDY, promedia 10 lecturas y marca la saturación con OVFL.
  - La pieza impresa coloca el sensor sobre la bobina en doble D.
- **C. Envío.**
  - Latido cada 5 s y lotes de 25 lecturas (o cada 3 s), por Wi-Fi.
  - HTTP con token al servidor: hoy la laptop; el destino final es una Raspberry Pi 5 con Node, MariaDB y Nginx.
  - El servidor convierte las cuentas a µT, guarda en MariaDB y difunde por SSE a la web y a la app.
- **D. Previsualizador (opcional, un modo más).** Un slider manda el punto, la mesa va ahí y un medidor muestra qué parte del rango se usa, con aviso de saturación.

**Cómo la quiere:**

- **Fiel al montaje de las fotos:**
  - Estructura de CNC sobre madera.
  - La pieza impresa en lugar del *spindle*.
  - La bobina en doble D debajo.
  - La electrónica (Pico, 3 TB6600, fuente). En las fotos va **sobre el perfil superior del arco**, no a un costado (ver sección 4).
- **Explotable:** separar las capas (estructura, ejes y husillos, motores y drivers, cabezal con el sensor, bobina, electrónica; y ahora también la caja de madera con la base oculta).
- **Recorrido por etapas** con botones, en este orden: **1 Movimiento → 2 Adquisición → 3 Envío de datos → (4 Previsualizador)**. En cada etapa se anima solo lo suyo, y la lectura en vivo de la ficha muestra las cifras de esa etapa.
- **Figuras:** una principal y, si conviene, dos de detalle:
  - cabezal con el sensor y la bobina;
  - Pico con un driver y un motor.

## 3. Fotos

Las del usuario están copiadas en [`fotos/`](fotos/). Las de catálogo no se copiaron (son de terceros): se describen abajo.

> ⚠ `fotos/01-sistema-frente.webp` muestra en el pizarrón una dirección de correo de otra persona. Decidir antes de compartir o hacer commit de la carpeta `fotos/`.

| Archivo | Qué se ve |
|---|---|
| `01-sistema-frente.webp` | Vista de frente. **Arco tipo CNC 3018**: dos placas laterales negras unidas arriba por un perfil de aluminio negro ranurado. Bajo el perfil, dos varillas cromadas y un husillo T8 horizontales (eje largo), con su motor en la placa derecha y un acople azul. A la izquierda, el carro Z con su motor arriba sobre separadores blancos. La abrazadera negra octagonal sujeta el cilindro rojo, del que baja la columna con el sensor. Delante, el soporte rojo trapezoidal de la bobina con espuma negra, sobre tres patas, en la tabla de MDF. Cables gruesos rojo y negro con conectores y una pinza roja. Sobre el perfil superior, **tres TB6600** (cuerpo negro, borneras verdes) y una placa perforada (el *shield* de la Pico), todo con cinchos. Al fondo, una fuente de laboratorio con dos medidores analógicos |
| `02-sistema-lateral-izquierdo.webp` | La placa lateral del arco, atornillada con una escuadra metálica a un listón de MDF. Bajo la tabla asoma el perfil de aluminio negro de la base 3018. El cable azul y blanco del sensor entra por el cilindro rojo |
| `03-sistema-perspectiva.webp` | Perspectiva: la columna roja baja del cilindro y el plato con el módulo azul queda junto a la esquina izquierda del soporte de la bobina, a la altura de su superficie |
| `04-sistema-cenital.webp` | Vista desde arriba. El arco va atrás y la bobina delante. Se ven los tres drivers y el *shield* sobre el perfil, el motor de Z sobre el carro (a la izquierda) y el del eje largo en el extremo derecho. Detrás, una caja negra: **la fuente de los motores, de 12 V** |
| `05-bobina-doble-d-por-debajo.webp` | La bobina por debajo: **dos espirales planas en D, una junto a otra (doble D, figura de 8)**, sobre una placa negra en el marco rojo trapezoidal. Un soporte rojo en Y con tornillos y resortes en tres puntos. Cables gruesos rojo y negro desde las terminales centrales. Un hilo fino de cobre **que NO se dibuja** (es de otros experimentos) |
| `06-cabezal-frente-pieza-roja.webp` | El cabezal de frente. Motor de Z arriba, con cables azul, morado y blanco. La abrazadera negra octagonal de dos mitades, con un tornillo a la derecha, aprieta el **cilindro rojo**, que tiene un aro rojo arriba. Del cilindro baja una **columna roja**; el cable corre por ella hasta un **conector Dupont de 5 pines** sujeto con un **cincho rojo**. La columna termina en un **plato redondo rojo**. El **módulo azul** (pines hacia arriba) va al pie de la columna, sobre el plato. Atrás, las varillas y el husillo del eje largo |
| `07-eje-z-sin-pieza-roja.webp` | El eje Z **sin la pieza roja**. Motor de Z arriba sobre **cuatro separadores blancos** y una placa negra impresa. **Acople azul** y **husillo T8 vertical** entre **dos varillas cromadas verticales**. Abajo, el bloque del carro con la **abrazadera octagonal vacía** (dos mitades, un tornillo Allen), donde entra el cilindro rojo. Atrás, las dos varillas horizontales y el husillo del eje largo. A la derecha, la placa lateral del arco con el **motor del eje largo por fuera**, con su acople azul. Arriba, las borneras verdes de los drivers |
| `08-piezas-mdf-de-la-caja.webp` | Piezas de MDF de la caja de la base: un tablero grande con cuatro escuadras metálicas y dos tiras con escuadras |
| `09-base-3018-dentro-de-la-caja.webp` | **La base de la CNC 3018 que queda tapada por la caja.** Marco de perfiles negros atornillado con escuadras a un tablero de MDF. Encima, la **cama de aluminio ranurada** (5 tablillas, con manchas rojas) sobre **dos varillas** y un **husillo T8**, movido por un **motor con acople azul** en el lado derecho. Las varillas y el husillo van de izquierda a derecha en la foto |
| `10-caja-mdf-cerrada.webp` | La caja de MDF cerrada (tapa y costados): es la base de madera sobre la que va todo |
| `11-cama-metal-3018-eje-corto.png` | **La cama de metal del eje corto**, de cerca: cinco tablillas de aluminio ranurado (con manchas rojas y un tornillo de latón al centro), sobre dos varillas y un husillo T8 que corren de izquierda a derecha, dentro del marco de perfiles negros con escuadras. **El arco va fijo a esta cama** |

**Catálogo (referencia, no copiadas):**

- **Raspberry Pi Pico 2 W:** placa verde, chip RP2350, módulo Wi-Fi con blindaje metálico, micro-USB, botón BOOTSEL y LED.
- **TB6600:** caja negra con aletas. Tabla de micropasos en S1–S3: 400 pulsos/vuelta en «2/A» o «2/B» y 800 en «4». Tabla de corriente en S4–S6. Borneras verdes: ENA−, ENA+, DIR−, DIR+, PUL−, PUL+, B−, B+, A−, A+, GND, VCC. Entrada «DC: 9–42 VDC».
- **NEMA 17:** foto de referencia de un 42BYGHM809. Los del usuario son **más cortos** (y se consideran NEMA 17 como dicen los documentos).
- **CNC 3018 Pro de referencia:** se ignora su *spindle*.
- **Módulo del sensor:** placa azul rotulada «HMC5883L», con pines VCC, GND, SCL, SDA y DRDY y los ejes X, Y, Z serigrafiados. Según CLAUDE.md, el chip es un QMC5883P (0x2C).

## 4. Respuestas del usuario (en orden)

1. **Pieza impresa:** «el brazo en L» era la pieza 3D. Mandó la foto del cabezal (`06`).
2. **Electrónica:** se dibuja como en las fotos, sobre el perfil del arco (lo aceptó implícitamente; confirmar si hace falta).
3. **Qué se mueve** (dos mensajes):
   - Primer mensaje: «se mueve una base en el arco, tiene un eje z donde iba abrazado el motor del cnc, quité el motor y metí una pieza 3d como soporte del sensor, la pieza es en forma de cilindro y entra donde iba el motor, **la base o cama nunca se mueve**».
   - Segundo mensaje: «el eje corto está montado sobre el eje largo del arco, **solo se mueve la base naranja con su abrazadera negra, el arco se queda estático**».
   - Tercer mensaje: mandó la foto del eje Z sin la pieza roja (`07`) y dijo que después manda «**el último eje, el que no se ve, ya que está tapado por una tipo caja que es mi base de madera**; también contémplala en el diseño» (fotos `08`, `09` y `10`).
   - **Cuarto mensaje (manda sobre los anteriores):** «el arco va fijo a la base de metal (la de la imagen `11`); esto hace que la mesa, o sea mi base de MDF, nunca se mueva; lo que se mueve es la mesa de metal de abajo y con eso el arco. El arco se mueve: ese es un eje. En el arco hay un riel largo: ese es el otro eje. Y en ese eje largo va fijo el eje Z, que es el último eje». Cuando antes dijo «el arco se queda estático», se refería a que el arco no se mueve respecto del carro; **el arco sí se desplaza con la cama de metal**.
4. **Motores y drivers:** TB6600 en **400 pulsos/vuelta**; motores NEMA 17 como en los documentos, aunque los suyos son **más cortos**.
5. **Bobina:** doble D, medida por fuera **~200 × 125 mm** (aproximada). **Corriente constante de 0,5–1 A.** El hilo fino de cobre no se dibuja.
6. **Fuente de motores:** la caja negra, **12 V**.
7. **Separación sensor–bobina:** lo más cerca posible sin chocar; **solo el espesor de la impresión**.

## 5. Lo que se entiende del mecanismo, y lo que no cuadra

**Seguro:**

- **Arco fijo:** dos placas laterales, el perfil superior con la electrónica, dos varillas horizontales y el husillo del eje largo, con su motor por fuera de la placa derecha.
- **Carro del eje largo:** corre por las varillas del arco. Lleva el **eje Z**: el motor arriba sobre cuatro separadores blancos, el acople azul, el husillo T8 vertical y dos varillas verticales. En Z se desliza el bloque con la **abrazadera octagonal**, que sujeta el **cilindro rojo**, la **columna**, el **plato** y el **módulo**.
- **Tabla de MDF con la bobina:** fija.
- **Base de madera:** la caja de MDF (`10`), que tapa una **base de CNC 3018** con su cama de aluminio, dos varillas, husillo T8 y motor (`09`). Ese es el tercer motor que no se veía.

**Cómo se mueve (confirmado por el usuario, 2026-11-25):** la **tabla de MDF con la bobina nunca se mueve**. Dentro de la caja de MDF hay una base de CNC 3018 cuya **cama de metal** (aluminio ranurado, sobre dos varillas y un husillo T8, con su motor) se desliza: es el **eje corto**. El **arco va fijo a esa cama**, así que **el arco completo se mueve en el eje corto**. En el arco hay un **riel largo** (dos varillas y husillo T8): es el **eje largo**, por el que corre el carro. Sobre ese carro va fijo el **eje Z**, que sube y baja la abrazadera con la pieza impresa.

**Antes (ya resuelto, solo como historia) — P1:**

- La base 3018 escondida tiene una **cama móvil**, pero el usuario dijo que «la cama nunca se mueve» y que «el arco se queda estático».
- Si la cama oculta es la que mueve el eje corto, **¿qué carga?** Hay dos posibilidades:
  - **(a)** Los listones de MDF que salen por los costados de la caja (bajo las placas laterales, fotos `01` y `02`) van atornillados a esa cama. Entonces lo que se mueve en el eje corto sería el arco completo.
  - **(b)** Otra unión que no se ve en las fotos.
- Hay que pedir la foto o la explicación del último eje y **confirmar qué pieza visible se desplaza en el eje corto** (205 mm reales). La etapa 1 depende de esto.
- Dato a favor: la carrera de la cama de una 3018 (180 mm según el fabricante) es del orden del eje corto real (~205 mm).

## 6. Datos para la figura (todos de `01-cifras-reales.md`, en mm reales)

| Qué | Valor | Origen |
|---|---|---|
| Recorridos | eje corto 0–205, eje largo 0–281, Z 0–44 mm (sistema 410 / 562 / 88) | `firmware/config.py` ÷ 2 |
| Resolución | 100 pulsos por mm real (50 por mm del sistema) | `pasos_por_mm` |
| Movimiento | 30 mm/s de crucero, 150 mm/s² de aceleración, arranque a 3 mm/s; holgura 0,25 mm; asentamiento 300 ms | `config.py` ÷ 2 |
| Pulsos | PIO a 1 MHz, máximo 15 kHz; DMA pasa segmentos de la rampa | `motores.py` |
| Orden de ejes | si Z baja: primero X e Y y luego Z; si sube: primero Z. Descanso (0, 0, 0) con Z abajo | `motores.py` |
| Pines | SDA GP0 (1), SCL GP1 (2), 3V3 (36), GND (38); PUL/DIR del eje corto GP10/11, del eje largo GP12/13, de Z GP14/15; ENA GP16 (21) | `config.py` |
| Sensor | QMC5883P, 0x2C, 100 kHz, 200 Hz, 30 G (±3000 µT; 1000 cuentas/G; 1 cuenta = 0,1 µT), promedio de 10, DRDY (0x09 bit 0) con límite de 100 ms, OVFL (0x09 bit 1) | `sensor.py` |
| Envío | latido 5 s; lote de 25 o 3 s; búfer de 1000; reintento 0,25 → 8 s; timeout 5 s; SSE con búfer de 2000 eventos | `config.py`, base, `tiempoReal.js` |
| Conversión | µT = cuentas ÷ 1000 × 100 − offset (offset 0); \|B\| = √(Bx² + By² + Bz²) | `conversionSensor.js` |
| Previsualizador | 1 petición por segundo como máximo (5 s tras un fallo); avisos: saturado (OVFL), cerca del tope ≥ 80 %, señal baja \|B\| < 2 % | `calibracion.py`, CLAUDE.md §0.11 |
| Ritmo real | mediana 0,97 s por punto (0,72–1,53 s; 26 barridos completos) | base |
| Hardware | TB6600 en 400 pulsos/vuelta; fuente de motores 12 V; bobina doble D ~200 × 125 mm; 0,5–1 A constante | usuario |
| Servidor | hoy la laptop (Node 22, Express, MariaDB 11.8, Nginx); destino Raspberry Pi 5 | CLAUDE.md §0.1 |

**Ejes en la web:** la página llama X al eje largo e Y al corto. El firmware y la base, al revés. En las etiquetas de la figura, decir «eje corto» y «eje largo» y, si se ponen letras, usar las del pedido del usuario (X corto, Y largo, Z altura), con una nota.

## 7. Plan de la figura

**Tamaño:**
- **Principal:** un **Hero** de unas 130–160 piezas, solo SVG (sin WebGL, para que funcione en cualquier equipo). Estimado **3–5 h**.
- **Detalles:** dos figuras chicas, de **~1 h** cada una.
- Archivos en `figuras/sistema/` (principal), `figuras/cabezal-bobina/` y `figuras/pico-driver-motor/`: cada uno con su `build.mjs`, el `index.html` generado y las capturas.

**Mundo y cámara:**
- 1 unidad = 1 mm real; x e y en el piso, z hacia arriba.
- Azimut de unos 35–45° para ver el lado largo del arco y la bobina delante, con elevación de ~30–35°.
- Las medidas de dibujo que no están en los datos (la caja, el arco, el soporte de la bobina) se estiman de las fotos y no se rotulan como datos.

**Piezas por capa** (cada capa se separa al explotar):

1. **Base de madera:**
   - caja de MDF: tapa, cuatro costados, cantos visibles;
   - tablero inferior;
   - escuadras metálicas con tornillos;
   - listones laterales bajo las placas del arco;
   - halo en el piso.
2. **Base 3018 oculta: el eje corto** (se ve al levantar la tapa; **se mueve y arrastra el arco**):
   - marco de perfiles negros;
   - cama de aluminio de 5 tablillas;
   - dos varillas, husillo T8, tuerca, acople azul y **el motor del eje corto**;
   - la unión cama–arco: listones de MDF con escuadras bajo las placas laterales (fotos `01`, `02`);
   - escuadras.
3. **Estructura del arco:**
   - dos placas laterales negras con tornillos Allen;
   - perfil superior ranurado;
   - escuadras a los listones.
4. **Ejes y husillos:**
   - eje largo: dos varillas horizontales, husillo T8 con rosca, tuerca anti-holgura, acople azul y bujes del carro;
   - eje Z: dos varillas verticales, husillo, acople y placa superior;
   - reglas con marcas cada 5 mm reales (mayor cada 25).
5. **Motores:**
   - tres NEMA 17 cortos: cuerpo con aletas, tapas, conector blanco, cuatro tornillos y eje;
   - los cuatro separadores blancos de Z.
6. **Cabezal:**
   - bloque del carro y abrazadera octagonal de dos mitades con su tornillo;
   - cilindro rojo con su aro;
   - columna roja con el cable (azul, morado, blanco);
   - conector Dupont de 5 pines y cincho rojo;
   - plato redondo y módulo azul (chip, 5 pines, ejes serigrafiados) — **la pieza `lit` (la que se mira)**.
7. **Bobina:**
   - soporte rojo trapezoidal con marco negro y tres patas;
   - espuma negra (se levanta al explotar);
   - **dos espirales en D**, devanado plano con sus vueltas;
   - terminales centrales;
   - cables gruesos rojo y negro con conectores y pinza roja.
   - No se dibujan el hilo fino de cobre ni el soporte en Y de abajo (opcional en la figura de detalle).
8. **Electrónica** (sobre el perfil del arco):
   - tres TB6600: caja con aletas, borneras verdes, interruptores DIP, LED;
   - *shield* de placa perforada con la Pico 2 W: blindaje del Wi-Fi, RP2350, USB, LED;
   - cinchos;
   - cables de motor de 4 colores, con conectores en ambos extremos;
   - cable del sensor (GP0/GP1) que baja al cabezal;
   - fuente de 12 V detrás del arco.
9. **Pantallas** (sobre la mesa de trabajo, a un lado):
   - laptop (el servidor de hoy) con la web abierta;
   - teléfono con la app;
   - la Raspberry Pi 5 se menciona en el pie de figura.

**Etapas:** botones 1–4 en la ficha, más «Separar capas». La lectura de abajo a la derecha cambia con la etapa.

1. **Movimiento.** Qué se mueve en cada eje: **eje corto = la cama de metal oculta y, con ella, el arco completo** (se ve el arco deslizarse sobre la caja; con la tapa levantada al explotar, se ve la cama sobre sus varillas); **eje largo = el carro por el riel del arco**; **Z = la abrazadera con la pieza roja**. La tabla de MDF y la bobina nunca se mueven.
   - El cabezal recorre la **serpentina** de una malla real, la de la **sesión 93**: zona de 25 × 25 × 15 mm reales con paso de 5 mm, 6 × 6 puntos por plano y 4 planos (144 puntos). El orden es el del contrato (`firmware/barrido.py`).
   - Z sube un plano a la vez.
   - Los acoples giran, el LED PUL del driver de ese eje parpadea, y cada punto visitado queda marcado con una gota sobre la espuma.
   - Al final, el regreso al descanso: X e Y primero y Z al final.
   - Lectura: posición en mm reales (y en mm del sistema), punto k/144, seq, velocidad 30 mm/s, rampa y asentamiento 300 ms.
2. **Adquisición.**
   - La mesa queda quieta. En el módulo, 10 destellos de DRDY (a 200 Hz, ralentizados).
   - Lectura: cuentas X, Y, Z → µT, \|B\| y la bandera OVFL. Valores de una **lectura real** de la sesión 124 o 126 (sección 8).
3. **Envío.**
   - De la antena de la Pico salen cápsulas: un **lote** cada 25 lecturas o 3 s (con su rango de seq) y un **latido** distinto cada 5 s.
   - Viajan a la laptop, que muestra «convierte → guarda en MariaDB», y por SSE al dashboard y al teléfono, donde la gráfica crece.
   - Lectura: lote n, seq a–b, aceptadas, duplicadas 0 y latido.
4. **Previsualizador.**
   - Tres sliders (eje corto, eje largo, Z en mm reales) en la ficha. La mesa va al punto con su rampa y el orden de ejes.
   - En la pantalla de la laptop, un **medidor de aguja** del uso del rango (componente mayor ÷ 3000 µT) con los avisos.
   - Valores interpolados entre puntos **medidos de verdad** (sesiones 124/126), y el pie de figura lo dice.

**Interacción y movimiento:**
- Gira el recorrido solo cuando nadie toca la figura.
- Teclado: 1–4 para las etapas y E para explotar.
- Se detiene fuera de pantalla y se queda quieta con movimiento reducido.
- La explosión usa resortes escalonados.

**Ficha:** «Fig. 1» arriba a la izquierda; título «SAVD: mapeo del campo de una bobina en doble D» arriba a la derecha; indicación de interacción abajo a la izquierda; lectura en vivo abajo a la derecha. Leyenda y pie de figura (con la nota de mm reales = sistema ÷ 2 y el origen de los datos) debajo.

**Figuras de detalle:**
- **(D1) Cabezal y bobina:** cilindro, columna, plato y módulo (con los ejes X, Y, Z del sensor serigrafiados) sobre la bobina con la espuma levantada para ver las dos D. Lectura: separación de una pared impresa y las cuentas → µT.
- **(D2) Pico, driver y motor:** la Pico en el *shield*, un TB6600 (DIP en 400 pulsos/vuelta, ENA/DIR/PUL), un NEMA 17 corto con acople y husillo. Un pulso del PIO viaja por el cable PUL y el motor avanza; lectura de 50 pulsos/mm del sistema = 100 por mm real y 15 kHz como máximo.

## 8. Datos reales para las lecturas (preparar antes de dibujar)

Exportar con un script en el *scratchpad*, como el usado para las cifras: `server/node_modules/mysql2` y `dotenv` leyendo `server/.env` **sin imprimir la contraseña**. **Solo `SELECT`.** Guardar el resultado como `figuras/sistema/datos.json` (o incrustado en el `build.mjs`), con:

- Sesión 93: `zona_*`, `paso_mm`, `grid` y la lista de posiciones en orden de `seq`, más sus Bx, By, Bz y \|B\|.
- Sesiones 124 y 126: posiciones, `raw_x/y/z`, `bx/by/bz/magnitud`, `saturado`, para la etapa 2 y el previsualizador.
- Todo convertido a mm reales (÷ 2) al usarlo, conservando el valor del sistema para la lectura.

## 9. Verificación (lo pide la skill y el usuario)

- `node build.mjs --audit` hasta `audit passed`.
- `node ~/.claude/skills/anatomy/scripts/lines.mjs <página> --out shots/lines.png` hasta `line ends: 0`.
- Capturas con `scripts/capture.mjs` y secuencias con `scripts/drive.mjs`:
  - escritorio y teléfono (390 px);
  - cada etapa (1–4) y la vista explotada;
  - acercamientos a 4× de las uniones.
  - Usan el Chromium de Playwright que ya está en `~/.cache/ms-playwright`.
- Abrir la página en el navegador integrado y **mostrar al usuario una captura de cada etapa**.
- Actualizar este archivo, `LEEME.md` y `PREGUNTAS.md` con lo hecho.

## 10. Pendientes

- **Diferencias entre lo construido y el plan:** los paquetes de la etapa 3 son los lotes reales de la sesión 93 (32 lotes de 1 a 5 lecturas, no de 25, porque con ~1 s por punto manda la regla de los 3 s). La fuente de 12 V se dibujó atrás a la derecha, para que su cable no se confunda con el cabezal. Las paredes de la caja no se separan: al levantar la tapa ya se ve la base 3018. El previsualizador usa solo la sesión 126, porque mezclarla con la 93 (otro día y otra corriente) no sería honesto.
- Figuras de detalle D1 (cabezal y bobina) y D2 (Pico, driver y motor): sin hacer.

- ~~P1~~ **Resuelto el 2026-11-25:** la cama de metal oculta mueve el arco completo en el eje corto (sección 5). Falta, si se quiere, ver cómo pasa la unión cama–arco por los costados de la caja: en las fotos `01` y `02` se ven listones de MDF con escuadras bajo las placas del arco; se dibuja así salvo que el usuario diga otra cosa.
- Opcional: medidas reales de la caja de MDF, del arco y del soporte de la bobina, si se quieren rotular (si no, se dibujan a ojo y no se rotulan).
- Separación sensor–bobina en mm (hoy: «el espesor de la pared impresa»).
- Avance del husillo T8 y ángulo de paso de los motores (la causa del ×2; no bloquea la figura).
