# Figura D3: bobinas y su campo (Anatomy)

`bobinas.html` es una página independiente: tema claro, **sin conexión**, UTF-8 y con rutas relativas. Pesa unos 240 KB. Funciona con doble clic (file://) en Chrome y Edge, y dentro de un iframe.

## Qué muestra

- **Las bobinas:** tres topologías, cada una sobre el mismo soporte que la doble D del SAVD (patas y marco rojos, placa, terminales y cables rojo y negro con pinza y banana):
  - **A) Anular**
  - **B) En 8**
  - **C) Doble D**
- **La sábana de cada bobina:** encima de cada una está la distribución del campo magnético sobre un plano paralelo a la bobina.
  - La altura y el color (mapa «jet») siguen la componente elegida.
  - Cada sábana tiene su propia barra de color, en µT.
  - Unas guías punteadas unen la zona de la placa con el plano de su sábana.
- **Interacción** (sin animaciones decorativas):

| Tecla | Qué hace |
|---|---|
| 0, 1, 2, 3 | Las tres bobinas, o enfoca una (las demás se atenúan) |
| M, X, Y, Z | Componente: \|B\| (por defecto), Bx, By, Bz |
| S | Muestra u oculta las sábanas |
| G | Baja la sábana hasta su bobina (con resorte) y la vuelve a subir |

- **Teclas de la presentación** (flechas, espacio, Intro, Re Pág, Av Pág, Inicio, Fin, Retroceso, F, N, B, H, «.» y «?»): la figura no las usa ni las consume. Si está dentro de un iframe, las reenvía con `parent.postMessage({tipo: 'tecla', key}, '*')`.

## Modo diapositiva: `bobinas.html?diapo=1`

- Se quitan la tarjeta, el título, la leyenda, el pie y la barra de figuras; la diapositiva pone el título.
- Quedan la barra de botones, la lectura de una línea y el dibujo, ocupando todo el iframe.
- A 864 × 375 px CSS, el texto más chico mide 11 px. El lienzo SVG es de 1100 × 400 (2,75:1) y en el iframe ocupa 864 × 313 debajo de los botones. En pantalla completa la diapositiva se escala ×2.

## Qué es dato y qué es dibujo

- **B) En 8: medición real, sesión 117** (2026-11-19, firmware 2.3, zona de 110 × 250 mm reales, paso de 15 mm, plano Z = 0; `datos.json`, solo `SELECT`).
  - Se recorta al eje largo de 15 a 195 mm reales para que quepa sobre la placa.
  - **Por confirmar** que la 117 es la sesión de la bobina en 8. Se eligió por su patrón: dos lóbulos de Bz de signo contrario y un máximo central en la componente del eje largo.
- **C) Doble D: simulación** (pedido del usuario: que se vea limpia, como en la teoría). Es la ley de Biot–Savart sobre las mismas espiras en D del dibujo, con corrientes opuestas en las dos D, en un plano a 22 mm (a 8 mm los lados rectos del centro dan picos que la Fig. 2.15 no tiene). Se escala con la Fig. 2.15 (Hz máximo ≈ 45 G = 4500 µT) y su signo se eligió como en esa figura: la componente del eje largo es positiva al centro y Bz es positiva en la D izquierda. Las mediciones reales de la doble D (127, 128 y 130) siguen en la etapa 4 de la Fig. 1.
- **Fondo de la medición del 8:** se guardó sin restar el fondo (offset 0). Para el dibujo se resta en cada componente el promedio del borde del plano (campo de la Tierra y del entorno): −34,3 · −27,9 · 9,8 µT.

  Luego se calcula \|B\|. Entre las lecturas solo se interpola (×3, bilineal) para suavizar la superficie.
- **A) Anular: simulación.** La forma sigue la teoría (ley de Biot–Savart para 14 espiras circulares concéntricas, de 18 a 55 mm de radio, en un plano a 8 mm). La escala se tomó de la Fig. 2.10 de la tesis: Hz máximo ≈ 45 G = 4500 µT, positivo al centro como en esa figura. No es una medición: las espiras, los radios y la altura son estimados.
- **Ejes:** Bx = eje corto y By = eje largo, con los nombres del sistema. Las posiciones están en mm reales (mm reales = mm del sistema ÷ 2; `frontend/src/utils/escalaMM.js`).
- **Dibujo estimado:** el tamaño de las tres bobinas (equivalentes a la doble D de la figura principal, sacada de las fotos), el número de vueltas, los radios de la anular (≈ 18 y 55 mm) y del 8 (≈ 47 mm; los dos anillos se enciman y se unen en la cintura, como en la foto), y la altura del plano de la sábana. El plano se dibuja más alto que la medición para que se vea; la tecla G lo baja.

## Regenerarla

```
node build.mjs           # escribe bobinas.html
node build.mjs --audit   # audita las bobinas (las sábanas son dibujo vivo, como los cables flexibles)
```

Usa `../comun/taller.mjs` sin cambios y los tintes de `../sistema/savd.css`. `datos.json` se exportó de `tms_db` solo con `SELECT`.

## Verificación (2026-11-25)

- `audit passed`.
- `line ends: 0` con la sábana arriba, abajo y en Bz.
- Consola limpia.
- Reenvío de teclas probado dentro de un iframe.
- Capturas en `shots/`:
  - `d3-respaldo.png`: 1728 × 750, respaldo para el PDF;
  - `d3-pantalla-completa.png`;
  - `d3-en8-bz-bajada.png`;
  - `d3-completa.png`: con la tarjeta.

## Solo el dibujo: `?diapo=1&solo=1`

Además de lo que quita `?diapo=1`, se ocultan los botones y la línea de lectura: queda únicamente el dibujo 3D, con sus etiquetas y barras de color. Las teclas siguen funcionando. La captura es `shots/d3-solo-3d.png`. Cómo integrarla en la presentación: `PARA-LA-PRESENTACION.md`.
