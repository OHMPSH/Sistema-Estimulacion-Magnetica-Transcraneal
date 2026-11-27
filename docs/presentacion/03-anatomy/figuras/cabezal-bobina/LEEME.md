# Figura D1: el sensor sobre la bobina en doble D (Anatomy)

`cabezal-bobina.html` es una página independiente: solo tema claro y **sin conexión**. Se abre con doble clic en Chrome o Edge.

## Qué muestra

- **Las piezas:**
  - La pieza roja de PLA del cabezal: cilindro, abrazadera, columna y plato.
  - El módulo azul del QMC5883P, con sus pines, el conector y el cable.
  - La bobina en doble D, con sus dos espirales de cobre y el lado plano al centro.
- Sin la espuma negra del montaje real, para que se vea bien la bobina (pedido del usuario, 2026-11-25). **Espacio** pausa el recorrido.
- **El recorrido:** el cabezal sigue la fila central de la **sesión real 127** (2026-11-24, firmware 2.4).
  - Eje corto en 60 mm reales (120 del sistema); eje largo de 0 a 195 mm reales con paso de 15 mm; plano Z = 0.
  - En cada punto se ve primero el movimiento con la rampa del firmware, luego los 300 ms de asentamiento y las 10 DRDY.
  - Después aparecen las cuentas reales y su conversión a µT, con las flechas de Bx, By y Bz.

## Qué es dato y qué es dibujo

- **Datos** (`datos.json`, exportado de `tms_db` solo con `SELECT`): posiciones, cuentas crudas, µT tal como los guardó el servidor (sin restar el fondo, offset 0) y OVFL. Además: la rampa (`firmware/config.py` ÷ 2) y la conversión de 1 cuenta = 0,1 µT a 30 G.
- **Dibujo:**
  - Las medidas del tablero, el soporte y el cabezal, estimadas de las fotos.
  - Las líneas de campo, que son explicativas.
  - La pausa en cada punto, alargada para poder leer.
- **Por confirmar:**
  - La separación entre el sensor y la bobina en mm.
  - La dirección de los ejes del sensor respecto de la mesa: se supone Bx sobre el eje corto, By sobre el largo y Bz hacia arriba.

## Regenerarla

```
node build.mjs                    # escribe cabezal-bobina.html
node build.mjs --audit            # audita la geometría
node build.mjs --audit --pose 195 # con el cabezal en otra posición del eje largo (mm reales)
```

Usa `../comun/taller.mjs` (las piezas), `../comun/medida.js` (las flechas y las líneas de campo) y los tintes de `../sistema/savd.css`.

## Verificación (2026-11-25)

- `audit passed` en las poses 0, 97,5 y 195.
- `line ends: 0` y consola limpia.
- Capturas en `shots/`.
