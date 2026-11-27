# Figura 1 — el sistema físico del SAVD (Anatomy)

`savd-sistema.html` es una página independiente (**solo tema claro**, a pedido del usuario el 2026-11-25; **sin conexión**: no carga nada de internet). Se abre con doble clic en Chrome o Edge. Pesa unos 440 KB.

## Cómo se usa

| Control | Qué hace |
|---|---|
| **1 Movimiento** (tecla 1) | Recorre la serpentina real de la **sesión 126**, que cubrió toda la bobina: zona de 125 × 200 × 15 mm reales, paso de 15 mm, 9 × 14 puntos por plano y 2 planos (252 puntos), en el orden y con los tiempos que registró la Pico. Va a ×8. Cada eje usa la rampa del firmware (arranque 3 mm/s, 150 mm/s², crucero 30 mm/s) y el orden de `mover_a`: si Z sube, primero Z; si baja, primero el plano. Después espera 300 ms de asentamiento y mide. Cada punto medido deja una gota sobre la placa de la bobina; parpadea el LED del driver del eje que se mueve. Al final regresa al descanso (0, 0, 0). |
| **2 Adquisición** (2) | La mesa va al último punto de la etapa 1 y la cámara se acerca al módulo. Se ve la medición: el módulo marca 10 DRDY (200 Hz, mostrados 80 veces más lento), con un bit I2C que sube por el cable en cada lectura. Después aparecen las flechas de Bx, By y Bz con los µT medidos y un recuadro con las cuentas reales, su conversión (1 cuenta = 0,1 µT a 30 G), \|B\| y OVFL. Las líneas de campo son un dibujo explicativo. La dirección de las flechas supone que los ejes del sensor coinciden con los del sistema (por confirmar). |
| **3 Envío de datos** (3) | Los **lotes reales** de la sesión 126 (86 lotes de 1 a 4 lecturas, reconstruidos de la hora que el servidor pone a cada lote) viajan de la antena de la Pico a la laptop. De ahí van por SSE al teléfono, y las dos gráficas crecen. Cada 5 s sale un latido (anillo verde). Va a ×10. |
| **4 Previsualizador** (4) | Sin sliders: la pantalla de la laptop sale de su plano y queda de frente. Muestra las **sábanas 3D** de A) Bx, B) By y C) Bz (mapa de color «jet» simétrico en 0, como las figuras de la tesis) de las últimas mediciones de la bobina en doble D (2026-11-24). Rotan cada 7 s: sesión 127 en sus planos Z = 0 y 15 mm, sesión 128 y sesión 130. La 129 se dejó fuera porque se cortó en 28 puntos. Los valores son los que guardó el servidor, **sin restar el fondo** (offset 0); entre las lecturas solo se interpola para suavizar el dibujo. El teléfono muestra el mapa de Bz. |
| **E Separar capas** (E; Esc las junta) | Las capas se separan con resortes escalonados: electrónica, arco con el carro y el cabezal, bobina y tapa. Debajo aparecen botones (01–09) para resaltar cada capa. |

## Qué es dato y qué es dibujo

- **Datos** (cada uno con su fuente en el pie de la figura y en `../../../01-cifras-reales.md`): los recorridos (205, 281 y 44 mm reales), la rampa y el asentamiento, el sensor, los lotes, el latido y las lecturas. `datos.json` es la exportación de `tms_db` (solo `SELECT`, el 2026-11-25), en mm del sistema y cuentas crudas. La clave `sabanas` guarda Bx, By y Bz en µT de las sesiones 127, 128 y 130 por plano.
- **Dibujo aproximado, sacado de las fotos:** las medidas de la caja de MDF, del arco, del soporte de la bobina, de la fuente, de la laptop y del teléfono. No se rotulan como datos. Las piezas llevan el color de las fotos: MDF, PLA rojo, acoples azules, borneras verdes y módulo azul.
- **Mecanismo** (confirmado por el usuario el 2026-11-25): la tabla de MDF con la bobina no se mueve. La cama de metal de la 3018 oculta se mueve en el eje corto y arrastra el arco; el carro corre por el riel del arco (eje largo) y el eje Z va sobre el carro.
- **Supuestos de dibujo** (no comprobados): la unión cama–arco son listones de MDF con escuadras que salen por un hueco lateral de la caja; la fuente de 12 V está sobre la tapa, atrás a la derecha; los cables se dibujan por donde es razonable que vayan.

## Regenerarla

```
node build.mjs            # escribe savd-sistema.html (necesita la skill Anatomy en ~/.claude/skills/anatomy, u otra ruta en ANATOMY_KIT)
node build.mjs --audit    # además audita la geometría
node build.mjs --audit --pose 205,281,44   # audita con la mesa en otra posición (no reescribe la página)
```

En Windows hace falta Node 22 y la skill instalada (ver `../../INSTALAR.md`). Para solo ver la página no hace falta nada.

## Sin espuma (2026-11-25)

A pedido del usuario no se dibuja la espuma negra que en el montaje real va sobre la bobina: así se ven bien las dos D. Las gotas de los puntos medidos quedan sobre la placa de la bobina, y la separación real entre el sensor y la bobina sigue por confirmar.

## Verificación (2026-11-25, después de las mejoras de la noche)

- `audit passed` en reposo y en las poses 0,281,0 · 205,281,44 · 60,200,10 · 205,0,44 · 100,140,22; `line ends: 0`; consola limpia. Capturas nuevas en `shots/`: las cuatro etapas, las capas separadas, el teléfono y `etapa4-sabanas.png`.

## Verificación anterior (2026-11-25, tarde)

- Auditoría de la skill (`--audit`): **audit passed** en reposo y en 10 posiciones de la mesa (esquinas del recorrido, Z arriba y abajo, y puntos intermedios), incluido cada cuadro de la separación de capas. Revisa holguras de cables, apoyos, piezas incrustadas y orden de dibujo.
- Revisión de líneas (`scripts/lines.mjs`): **line ends: 0** en reposo, en una pose extrema y con las capas separadas.
- Consola del navegador limpia. Capturas en `shots/`.
- Los cuatro cables que cruzan una articulación (fuente → driver, driver → motor Z y los dos tramos del cable del sensor) se recalculan en cada cuadro. La auditoría no los revisa; se revisaron en las capturas.
