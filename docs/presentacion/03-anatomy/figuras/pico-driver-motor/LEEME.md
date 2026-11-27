# Figura D2: un pulso, un micropaso (Anatomy)

`pico-driver-motor.html` es una página independiente: solo tema claro y **sin conexión**.

## Qué muestra

- **Las piezas:**
  - La Pico 2 W en su shield de placa perforada.
  - Un TB6600: disipador con aletas, DIP con S1 ON, S2 OFF y S3 ON, etiqueta, LED y bornera verde.
  - Un NEMA 17 en su soporte, con acople azul, husillo T8, chumacera y tuerca.
- **Los cables:**
  - Las señales del eje largo: ENA (blanco, GP16), DIR (verde, GP13) y PUL (amarillo, GP12).
  - Las cuatro fases al motor.
  - Los 12 V, que llegan de una fuente fuera de la figura.
- **La animación:**
  - Los puntos amarillos viajan por PUL; cada uno representa unos 25 pulsos y todo va 20 veces más lento.
  - El acople gira (marca blanca) y la tuerca avanza 22 mm.
  - Al final de la carrera hay una pausa, un pulso verde por DIR, y el motor gira al revés.
  - **Espacio** pausa la animación.

## Cifras y de dónde salen

| Cifra | Fuente |
|---|---|
| PUL GP12, DIR GP13, ENA GP16 (común) | `firmware/config.py` (`EJE_Y`, `PIN_ENA`) |
| 50 pulsos/mm del sistema = 100 por mm real | `config.py` (`pasos_por_mm`) y la escala ÷ 2 |
| 400 pulsos/vuelta (DIP S1 ON, S2 OFF, S3 ON) | CLAUDE.md, sección 0.8, e instructivo, tabla 3.1 |
| 4 mm reales por vuelta | Deducido (400 ÷ 100). El avance del T8 y la causa del ×2 siguen **por confirmar** |
| 30 mm/s reales → 3000 pulsos/s → 7,5 vueltas/s | `VEL_MAX_MM_S` = 60 del sistema ÷ 2 |
| Tope de 15 kHz | `FRECUENCIA_MAX_HZ` |

- **Por confirmar:**
  - La corriente: los interruptores S4–S6 se dibujan sin palanca.
  - Qué valor de DIR corresponde a cada sentido.
- Las medidas del dibujo salen de las fotos.

## Regenerarla

```
node build.mjs
node build.mjs --audit
node build.mjs --audit --pose 22   # tuerca al final de la carrera (mm)
```

## Verificación (2026-11-25)

- `audit passed` en las poses 0, 11, 20 y 22.
- `line ends: 0` y consola limpia.
- Captura en `shots/`.
