# Prompts para Anatomy

**Estado:** borradores listos, **sin ejecutar**. La skill ya está instalada en esta laptop (2026-11-25; en Windows, ver [INSTALAR.md](INSTALAR.md)). Antes de usarlos: (1) que el usuario lo pida; (2) llenar la sección «Mi montaje real» con la descripción de las fotos; (3) resolver los «por confirmar» de [../PREGUNTAS.md](../PREGUNTAS.md). Las cifras salen de [../01-cifras-reales.md](../01-cifras-reales.md) y van en **mm reales** (mm del sistema ÷ 2).

**Cómo se usa cada prompt:** copia el bloque completo después de `/anatomy` en Claude Code, abierto en la carpeta del proyecto. Cada figura se guarda en `docs/presentacion/03-anatomy/figuras/<nombre>/`.

---

## 0. Mi montaje real (llenar con las fotos)

> Esta sección se pega al final de cada prompt. Se llenó el 2026-11-25 con 11 fotos del usuario y sus respuestas; el eje corto quedó confirmado el mismo día.

```
MI MONTAJE REAL (fotos y respuestas del usuario, 2026-11-25):
- Estructura: CNC de escritorio tipo 3018 reutilizada. Arco (pórtico) de dos placas laterales negras con tornillos Allen, unidas arriba por un perfil de aluminio negro ranurado. Bajo el perfil, dos varillas cromadas y un husillo T8 horizontales; el motor de ese eje va en la placa derecha con acople azul. Las placas laterales se apoyan, con escuadras metálicas atornilladas, sobre listones de MDF.
- Base: tabla de MDF FIJA (nunca se mueve) sobre una caja de MDF; bajo la tabla asoma el perfil de aluminio negro de la base de la CNC.
- Ejes: el carro corre a lo largo del arco (eje largo, 281 mm reales); Z sube y baja el cabezal (44 mm reales); el eje corto (205 mm reales) lo hace una base de CNC 3018 escondida dentro de la caja de MDF: su cama de metal (aluminio ranurado sobre dos varillas y un husillo T8, con su motor) se desliza y lleva el ARCO COMPLETO, que va fijo a ella. La tabla de MDF con la bobina NUNCA se mueve.
- Cabezal (pieza impresa en lugar del spindle): carro Z con su motor arriba sobre separadores blancos; abrazadera negra octagonal en dos mitades, con un tornillo lateral, que aprieta un cilindro rojo impreso con un aro rojo arriba. Del cilindro baja una columna roja por la que corre el cable del sensor (azul, morado y blanco) hasta un conector Dupont de 5 pines y un cincho rojo; la columna termina en un plato redondo rojo. El módulo azul (GY-271, rotulado HMC5883L; el chip es un QMC5883P) va al pie de la columna, sobre el plato, con los pines hacia arriba.
- Separación: en Z = 0 el plato casi toca la espuma de la bobina; entre el sensor y la bobina solo queda el espesor de la pared impresa.
- Bobina: plana en doble D (dos espirales en D, una junto a otra), unos 200 × 125 mm por fuera, en un soporte rojo trapezoidal impreso con marco negro y espuma negra encima, sobre tres patas rojas; por debajo, un soporte en Y con tornillos y resortes. Cables gruesos rojo y negro desde las terminales centrales hasta conectores con una pinza roja. Corriente constante de 0,5 a 1 A.
- Electrónica: tres drivers TB6600 (caja negra con aletas y borneras verdes, DIP en 400 pulsos/vuelta) y el shield de placa perforada con la Pico 2 W, sujetos con cinchos SOBRE el perfil superior del arco; cables de motor de 4 colores. Fuente de los motores: caja negra de 12 V detrás del arco.
- Motores: NEMA 17, más cortos que el estándar.
- NO dibujar: finales de carrera, el spindle, el hilo fino de cobre de la bobina, el resto del laboratorio.
```

---

## (a) El sistema completo como objeto físico

**Figura:** `figuras/a-sistema-completo/`

```
/anatomy Dibuja cómo funciona un sistema automático que mapea el campo magnético de una bobina de estimulación magnética transcraneal (TMS) sobre un phantom de solución salina, interactive.

Es una máquina real (tesis de ingeniería, IPN ESIME Zacatenco); dibuja ESTE objeto, no uno inventado:
- Mesa cartesiana XYZ sin finales de carrera. Recorridos reales: eje corto 205 mm, eje largo 281 mm, Z 44 mm. Tres motores paso a paso NEMA 17, uno por eje, con husillos T8. Cada motor lo maneja un driver TB6600 (caja metálica con disipador; entradas PUL, DIR, ENA con optoacoplador). Una fuente de CC alimenta los tres drivers.
- Montado en el eje Z, apuntando hacia abajo, un magnetómetro de 3 ejes QMC5883P (placa pequeña, I2C) que se mueve por encima de la bobina. La bobina está fija debajo de la zona de medición, con el phantom.
- Una Raspberry Pi Pico 2 W en un shield: genera los pulsos de los 3 motores (PIO + DMA, pulsos con resolución de 1 µs, hasta 15 kHz), lee el sensor por I2C y manda las lecturas por Wi-Fi.
- Un servidor (laptop; después una Raspberry Pi 5) con Node.js, MariaDB y Nginx, y varias pantallas mirando en vivo: dos laptops y dos teléfonos (uno con la app Android).

Lo que se mueve (animación en bucle, controlable):
1. El sensor recorre una malla de puntos en serpentina: avanza por el eje largo, sube un paso en el eje corto, regresa; al terminar el plano, Z sube un paso (aleja el sensor de la bobina) y repite.
2. En cada punto: la mesa frena (rampa trapezoidal: crucero 30 mm/s, aceleración 150 mm/s², arranque 3 mm/s), espera 300 ms, el sensor promedia 10 lecturas a 200 Hz.
3. Cada 25 lecturas (o cada 3 s) sale un paquete por Wi-Fi hacia el servidor; las pantallas reciben cada lectura y la dibujan.
4. Al terminar, la mesa vuelve al descanso (0, 0, 0): primero los ejes horizontales y al final baja Z.

Números para la lectura en vivo: ~0,97 s por punto (mediana de 26 barridos reales), latido de la Pico cada 5 s, campo en µT (rango del sensor ±3000 µT), barrido real más grande 777 puntos en 9 min 26 s.

Etiqueta cada pieza con su nombre real. Permite pasar el cursor sobre una pieza para ver su función y sus números.

Dónde vive: página HTML independiente, autocontenida y sin conexión (sin CDN ni fuentes remotas), TEMA OSCURO, para proyectarse en la exposición de la tesis. Guárdala en docs/presentacion/03-anatomy/figuras/a-sistema-completo/. Todo en español.

[PEGAR AQUÍ «MI MONTAJE REAL»]
```

---

## (b) El recorrido en serpentina, plano por plano

**Figura:** `figuras/b-serpentina/`

```
/anatomy Explica cómo una mesa XYZ recorre una malla de medición en serpentina, plano por plano, con el eje Z subiendo desde una bobina, interactive.

El mecanismo es el de mi mesa real: un sensor magnético montado en el eje Z de una mesa cartesiana (recorridos 205 × 281 × 44 mm), por encima de una bobina fija.

Regla exacta del recorrido (es el contrato del firmware y del servidor):
- La malla tiene nx puntos en un eje, ny en el otro y varios planos en Z, todos con el mismo paso.
- Índice k del punto: iz = k // (nx·ny); r = k % (nx·ny); fila = r // nx; iy = fila si iz es par, ny − 1 − fila si es impar; g = iz·ny + fila; ix = r % nx si g es par, nx − 1 − (r % nx) si es impar.
- Entre dos puntos seguidos solo cambia un índice en ±1: la mesa nunca regresa en vacío. Z empieza en el plano más bajo (junto a la bobina) y SUBE un paso por plano; el plano siguiente empieza donde quedó la mesa.

Lo que se mueve:
- El sensor visita los puntos en orden; cada punto medido se queda marcado (un punto encendido) y se ve el número k y el seq (= k + 1).
- Controles: nx, ny, número de planos y paso (empezar con nx = 3, ny = 2, 2 planos: el vector de prueba k0…k11 = (0,0,0) (1,0,0) (2,0,0) (2,1,0) (1,1,0) (0,1,0) (0,1,1) (1,1,1) (2,1,1) (2,0,1) (1,0,1) (0,0,1)); un ejemplo real grande: 6 × 6 × 4 planos con paso 5 mm (144 puntos, sesión 93).
- En cada punto, la mesa espera 300 ms y mide; ~0,97 s por punto en promedio.
- Un indicador muestra que, si la Pico se reinicia, el barrido sigue en el punto ultimo_seq + 1.

Dónde vive: página HTML independiente, autocontenida y sin conexión, TEMA OSCURO, para la exposición. Guárdala en docs/presentacion/03-anatomy/figuras/b-serpentina/. Todo en español.

[PEGAR AQUÍ «MI MONTAJE REAL»]
```

---

## (c) El viaje de una lectura

**Figura:** `figuras/c-viaje-lectura/`

```
/anatomy Explica el viaje de una lectura magnética desde el chip del sensor hasta la gráfica en el navegador, como una máquina de tubos y estaciones por la que viaja una cápsula de datos, interactive.

Estaciones, en orden, con sus números reales:
1. Chip QMC5883P: registros 0x01–0x06 con X, Y, Z de 16 bits con signo (byte bajo primero). Rango ±30 G: 1000 cuentas por gauss (1 cuenta = 0,1 µT). Bit DRDY (dato listo) y bit OVFL (saturación) en el registro 0x09. 200 Hz.
2. Raspberry Pi Pico 2 W: promedia 10 lecturas, le pone número de secuencia (seq), posición y hora; la guarda en un búfer de 1000 lecturas.
3. Lote: sale cuando hay 25 lecturas o cuando la más vieja lleva 3 s. Viaja por Wi-Fi como HTTP POST con un token Bearer. Si no hay respuesta en 5 s, se reenvía EL MISMO lote con espera creciente de 0,25 a 8 s.
4. Servidor Node.js/Express: valida el formato (400) y los valores (422) y que la posición esté en la malla.
5. Conversión: µT = cuentas ÷ 1000 × 100 − offset; módulo |B| = √(Bx² + By² + Bz²).
6. Base de datos MariaDB: se guarda en una transacción; la restricción UNIQUE(sesión, seq) descarta los duplicados (por eso reenviar no duplica nada).
7. Difusión en vivo (Server-Sent Events) con un id por evento: si un navegador se desconecta, al volver recupera lo que se perdió (búfer de 2000 eventos).
8. Navegador: divide los mm entre 2 (corrección de escala de la mesa) y dibuja la gráfica de líneas, el mapa 3D y la sábana 3D.

Lo que se mueve: una cápsula con los números visibles (cuentas crudas → µT) recorre las estaciones; botón para «cortar el Wi-Fi» y ver el reintento y el descarte del duplicado; botón para una lectura saturada (OVFL), que llega marcada y sin valor.

Dónde vive: página HTML independiente, autocontenida y sin conexión, TEMA OSCURO, para la exposición. Guárdala en docs/presentacion/03-anatomy/figuras/c-viaje-lectura/. Todo en español.

[PEGAR AQUÍ «MI MONTAJE REAL» si la máquina debe parecerse al montaje]
```

---

## (d) El previsualizador de la bobina

**Figura:** `figuras/d-previsualizador/`

```
/anatomy Explica cómo funciona un previsualizador para calibrar la corriente de una bobina TMS antes de medir: un control deslizante mueve una mesa XYZ real a un punto, y un medidor muestra qué parte del rango del sensor se está usando, interactive.

El mecanismo real:
- En la página web hay tres controles deslizantes (X, Y, Z en mm reales: 0–281, 0–205 y 0–44 mm). La orden sale al SOLTAR el control.
- El servidor guarda el objetivo; la Raspberry Pi Pico 2 W lo recibe en su siguiente petición, lleva la mesa al punto (si Z tiene que bajar, primero los ejes horizontales; si sube, primero Z), espera 300 ms y mide con el magnetómetro QMC5883P (promedio de 10 lecturas a 200 Hz).
- La Pico manda como mucho UNA lectura por segundo (con 150 ms se apagaba: el radio Wi-Fi casi no descansaba). Tras un fallo de red espera 5 s.
- Nada se guarda en la base de datos: es solo para ver.
- El medidor compara la componente mayor con el fondo de escala nominal del rango (±30 G = ±3000 µT). Avisos: «saturado» si el chip levanta el bit OVFL; «cerca del tope» desde el 80 % del rango; «señal baja» si |B| es menor que el 2 %. Lecturas en µT de Bx, By, Bz y |B|.
- Al terminar, la mesa vuelve al descanso (0, 0, 0): ejes horizontales primero, Z baja al final.

Lo que se mueve: el usuario arrastra un control, la mesa (dibujada) va al punto con su rampa (30 mm/s de crucero), el sensor se acerca o aleja de la bobina y la aguja del medidor sube o baja; un control de «corriente de la bobina» permite ver los tres avisos.

Dónde vive: página HTML independiente, autocontenida y sin conexión, TEMA OSCURO, para la exposición. Guárdala en docs/presentacion/03-anatomy/figuras/d-previsualizador/. Todo en español.

[PEGAR AQUÍ «MI MONTAJE REAL»]
```

---

## Qué hacer cuando lleguen las fotos

1. Describir cada foto (qué piezas se ven, materiales, disposición, cableado).
2. Compararla con lo documentado: ejes y recorridos, pines, TB6600, *shield*, bobina, posición del sensor.
3. Preguntar al usuario, en un solo mensaje, todo lo que no cuadre.
4. Llenar «Mi montaje real» y ajustar los cuatro prompts.
5. **No ejecutar `/anatomy` hasta que el usuario lo pida.**
