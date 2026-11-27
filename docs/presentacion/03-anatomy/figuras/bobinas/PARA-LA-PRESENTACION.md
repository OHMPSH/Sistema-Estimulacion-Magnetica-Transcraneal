# Cómo integrar la Fig. D3 (bobinas y su campo) en la presentación HTML

Nota para la sesión que integra `presentacion/` (raíz del repositorio). Esta figura la hizo otra sesión; no modifiques sus fuentes.

## Archivo

- **La página:** `docs/presentacion/03-anatomy/figuras/bobinas/bobinas.html`, de unos 240 KB.
- **Es autónoma:** el kit, el CSS, los datos y el JS van dentro del archivo. No carga nada de internet y no depende de otros archivos, así que se puede **copiar tal cual** a la carpeta de la presentación, por ejemplo `presentacion/figuras/bobinas.html`.
- **Imágenes de respaldo** en `docs/presentacion/03-anatomy/figuras/bobinas/shots/`, de 1728 × 750 px cada una:
  - `d3-solo-3d.png`: solo el dibujo; es la más adecuada para el PDF;
  - `d3-respaldo.png`: con la barra de botones y la lectura.

## Cómo se incrusta

Va en la segunda diapositiva de la introducción, en el área de contenido (unos 864 × 375 px CSS de un lienzo de 960 × 540):

```html
<iframe src="figuras/bobinas.html?diapo=1&solo=1" title="Bobinas y su campo magnético"
        style="width:100%;height:100%;border:0" loading="eager"></iframe>
```

- `?diapo=1` quita la tarjeta, el título, el pie, la leyenda y la barra de figuras.
- `&solo=1` quita también la barra de botones y la línea de lectura: queda **únicamente el dibujo 3D**, con sus etiquetas A) Anular, B) En 8 y C) Doble D y las barras de color.
- Sin `&solo=1` se ven los botones, que son útiles para manejarla con el ratón.
- Si en algún momento falla el iframe, se puede usar en su lugar `<img src="…/d3-solo-3d.png">`.

## Teclas

- **Teclas propias de la figura** (funcionan con el foco dentro del iframe):

| Tecla | Qué hace |
|---|---|
| 0 | Las tres bobinas |
| 1, 2, 3 | Enfoca la anular, la del 8 o la doble D |
| M | \|B\| |
| X, Y, Z | Bx, By, Bz |
| S | Muestra u oculta la sábana |
| G | Baja la sábana hasta la bobina y la vuelve a subir |

- **Teclas de la presentación** (flechas, espacio, Intro, Re Pág, Av Pág, Inicio, Fin, Retroceso, F, N, B, H, «.» y «?»): la figura no las usa ni las consume. Se las reenvía al padre así:

  ```js
  window.parent.postMessage({ tipo: "tecla", key: e.key }, "*")
  ```

  La presentación tiene que escuchar ese mensaje y tratarlo como si fuera su propio `keydown`:

  ```js
  window.addEventListener("message", (e) => {
    if (e.data && e.data.tipo === "tecla") manejarTecla(e.data.key);
  });
  ```

- El iframe se lleva el foco si el presentador hace clic en él. Si no se quiere eso, se le puede poner `tabindex="-1"` o devolver el foco a la presentación después del clic.

## Contenido (para el orador, no va en la diapositiva)

- **A) Anular:** forma teórica (Biot–Savart), con la escala de la Fig. 2.10 de la tesis.
- **B) En 8:** medición real, sesión 117 (2026-11-19), con el fondo restado. Falta confirmar que la 117 es esa bobina.
- **C) Doble D:** forma teórica (Biot–Savart), con la escala de la Fig. 2.15.
- **La idea:** cada topología de bobina produce un patrón de campo distinto. La sábana es el campo sobre un plano paralelo a la bobina; altura y color = magnitud.
