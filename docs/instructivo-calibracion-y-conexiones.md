# Instructivo: conexiones de los drivers TB6600 y calibración de los ejes

Este instructivo explica, paso a paso:

1. cómo conectar los tres drivers **TB6600**, los motores **NEMA 17**, el sensor **HMC5883L** y los finales de carrera a la **Raspberry Pi Pico W**;
2. cómo usar el programa [`firmware/prueba_calibracion.py`](../firmware/prueba_calibracion.py) en Thonny para medir cuánto se mueve cada eje y corregir su factor de conversión (pasos por milímetro);
3. cómo pasar esos factores al firmware final (`firmware/config.py`).

Los pines son los mismos en el programa de calibración y en el firmware. Si cambias alguno, cámbialo en los dos archivos.

> ⚠ **Seguridad:** conecta y desconecta cables siempre con **la fuente de los motores apagada y la Pico desconectada del USB**. Nunca desconectes un motor del TB6600 con la fuente encendida: el driver se puede dañar.

---

## 1. Material

| Pieza | Cantidad | Nota |
|---|---|---|
| Raspberry Pi Pico W | 1 | Con MicroPython 1.22 o posterior |
| Driver TB6600 | 3 | Uno por eje (X, Y, Z). Sin motor en Z, bastan 2 |
| Motor NEMA 17 (200 pasos/vuelta) | 3 | Con husillo T8 |
| Fuente de 12–24 V de CC | 1 | Para los motores. Al menos 1,5 A por motor (por ejemplo, 24 V y 5 A para tres) |
| Módulo HMC5883L (GY-271) | 1 | |
| Finales de carrera | 3 | Opcionales para la calibración; el firmware final los usa |
| Cable USB de datos | 1 | Para Thonny y para alimentar la Pico |
| Cables dupont o de calibre 22–24 | — | Señales |
| Cable de calibre 18–20 | — | Fuente y motores |
| Calibrador vernier o reloj comparador | 1 | Para medir el desplazamiento |

---

## 2. Pines de la Raspberry Pi Pico W

La serigrafía de la placa numera los **pines físicos** del 1 al 40 (1 arriba a la izquierda con el USB hacia arriba, 40 arriba a la derecha). El código usa los nombres **GPxx**. Esta tabla relaciona ambos:

| Uso | GPIO | Pin físico |
|---|---|---|
| Sensor SDA | GP4 | 6 |
| Sensor SCL | GP5 | 7 |
| **X – PUL+** | GP10 | 14 |
| **X – DIR+** | GP11 | 15 |
| **Y – PUL+** | GP12 | 16 |
| **Y – DIR+** | GP13 | 17 |
| **Z – PUL+** | GP14 | 19 |
| **Z – DIR+** | GP15 | 20 |
| **ENA+ (los tres drivers)** | GP16 | 21 |
| Final de carrera X− | GP18 | 24 |
| Final de carrera Y− | GP19 | 25 |
| Final de carrera Z− | GP20 | 26 |
| Botón Z (solo con Z manual) | GP21 | 27 |
| 3,3 V para el sensor | 3V3(OUT) | 36 |
| **GND** | — | 3, 8, 13, 18, 23, 28, 33 o 38 (son todos iguales) |

```
                         USB
                  ┌──────┴┴──────┐
     GP0       1 ─┤●            ●├─ 40  VBUS
     GP1       2 ─┤●            ●├─ 39  VSYS
     GND       3 ─┤■            ●├─ 38  GND
     GP2       4 ─┤●            ●├─ 37  3V3_EN
     GP3       5 ─┤●            ●├─ 36  3V3(OUT) ── VCC sensor
 SDA GP4       6 ─┤●            ●├─ 35  ADC_VREF
 SCL GP5       7 ─┤●            ●├─ 34  GP28
     GND       8 ─┤■            ■├─ 33  GND
     GP6       9 ─┤●            ●├─ 32  GP27
     GP7      10 ─┤●            ●├─ 31  GP26
     GP8      11 ─┤●            ●├─ 30  RUN
     GP9      12 ─┤●            ●├─ 29  GP22
     GND      13 ─┤■            ■├─ 28  GND
X PUL GP10    14 ─┤●            ●├─ 27  GP21  Botón Z
X DIR GP11    15 ─┤●            ●├─ 26  GP20  Final Z−
Y PUL GP12    16 ─┤●            ●├─ 25  GP19  Final Y−
Y DIR GP13    17 ─┤●            ●├─ 24  GP18  Final X−
     GND      18 ─┤■            ■├─ 23  GND
Z PUL GP14    19 ─┤●            ●├─ 22  GP17
Z DIR GP15    20 ─┤●            ●├─ 21  GP16  ENA (3 drivers)
                  └──────────────┘
```

---

## 3. El driver TB6600

Cada TB6600 tiene dos regletas:

**Señales (lado de control):**

| Borne | Función |
|---|---|
| `ENA−` / `ENA+` | Habilitación. Con corriente en esta entrada, el driver **se apaga** (el motor queda libre) |
| `DIR−` / `DIR+` | Sentido de giro |
| `PUL−` / `PUL+` | Pulsos de paso: cada pulso avanza un micropaso |

**Potencia (lado de alta corriente):**

| Borne | Función |
|---|---|
| `VCC` / `GND` | Fuente de los motores, de 9 a 42 V de CC (usa 12–24 V) |
| `A+` / `A−` | Bobina A del motor |
| `B+` / `B−` | Bobina B del motor |

Las entradas de señal tienen **optoacopladores**: la Pico y la fuente de los motores quedan aisladas. **No unas el GND de la Pico con el GND de la fuente de los motores.**

### 3.1 Interruptores (DIP) de cada TB6600

**Micropasos (SW1, SW2, SW3).** Pon los **tres drivers en 1/8**, que es el valor que usan el programa y el firmware:

| Micropasos | Pulsos por vuelta | SW1 | SW2 | SW3 |
|---|---|---|---|---|
| 1 (paso completo) | 200 | ON | ON | OFF |
| 2 | 400 | ON | OFF | ON |
| 4 | 800 | ON | OFF | OFF |
| **8 (recomendado)** | **1600** | **OFF** | **ON** | **OFF** |
| 16 | 3200 | OFF | OFF | ON |
| 32 | 6400 | OFF | OFF | OFF |

**Corriente (SW4, SW5, SW6).** Elige la nominal del motor o un poco menos. Para un NEMA 17 de 1,5–1,7 A (por ejemplo, el 17HS4401):

| Corriente pico | SW4 | SW5 | SW6 |
|---|---|---|---|
| 1,0 A | ON | OFF | ON |
| **1,5 A (recomendado)** | **ON** | **ON** | **OFF** |
| 2,0 A | ON | OFF | OFF |

> Los TB6600 genéricos no siempre traen la misma tabla. **Si la tabla impresa en tu driver es distinta, manda la de tu driver.** Lo importante es que los tres queden en 1/8 y con la corriente del motor.

Si cambias los micropasos, el factor teórico cambia (sección 6.1).

---

## 4. Conexiones

### 4.1 Señales: Pico W → TB6600 (cátodo común)

Se usa el cableado de **cátodo común**: todos los bornes `−` de señal van a GND de la Pico, y los `+`, a los GPIO. Así, un GPIO en alto (3,3 V) enciende el optoacoplador.

**Driver del eje X**

| Borne del TB6600 X | Va a | Pin físico |
|---|---|---|
| `PUL+` | GP10 | 14 |
| `PUL−` | GND | 13 |
| `DIR+` | GP11 | 15 |
| `DIR−` | GND | 13 (el mismo) |
| `ENA+` | GP16 | 21 |
| `ENA−` | GND | 18 |

**Driver del eje Y**

| Borne del TB6600 Y | Va a | Pin físico |
|---|---|---|
| `PUL+` | GP12 | 16 |
| `PUL−` | GND | 18 |
| `DIR+` | GP13 | 17 |
| `DIR−` | GND | 18 (el mismo) |
| `ENA+` | GP16 | 21 (el mismo que X) |
| `ENA−` | GND | 18 |

**Driver del eje Z**

| Borne del TB6600 Z | Va a | Pin físico |
|---|---|---|
| `PUL+` | GP14 | 19 |
| `PUL−` | GND | 23 |
| `DIR+` | GP15 | 20 |
| `DIR−` | GND | 23 (el mismo) |
| `ENA+` | GP16 | 21 (el mismo que X e Y) |
| `ENA−` | GND | 23 |

Un pin GND puede llevar varios cables (o haz una barra de GND en la protoboard). Lo importante es que **todos** los `PUL−`, `DIR−` y `ENA−` lleguen a un GND de la Pico.

```
   Pico W                         TB6600 (X)
  GP10 (14) ───────────────────── PUL+
  GP11 (15) ───────────────────── DIR+
  GP16 (21) ──────────┬────────── ENA+      (también a ENA+ de Y y de Z)
  GND  (13) ──────────┼──┬──┬──── PUL−, DIR−, ENA−
                      │  │  │
                      │  │  └──── ENA−, PUL−, DIR− de Y y de Z
                      └──┴─────── ENA+ de Y y de Z
```

### 4.2 Sobre los 3,3 V y la entrada ENA

- Los optoacopladores del TB6600 están pensados para 5 V. Con los 3,3 V de la Pico **suelen funcionar** en PUL y DIR: cada entrada pide unos 7–10 mA, y el programa pone esos pines en su corriente máxima (12 mA).
- La entrada **ENA de los tres drivers en paralelo** pediría unos 25–30 mA a un solo pin, más de lo que un GPIO debe dar. Tienes tres opciones:
  1. **Para calibrar (lo más simple): no conectes ENA.** Deja `ENA+` y `ENA−` sueltos en los tres drivers. Los drivers quedan siempre habilitados (los motores tienen fuerza mientras haya fuente). En `prueba_calibracion.py` pon `PIN_ENA = None`, y en `config.py`, `PIN_ENA = None`.
  2. Usar un pin distinto para el ENA de cada driver (por ejemplo GP16, GP17 y GP22). Esto requiere ajustar el firmware: pídelo y se cambia.
  3. **Recomendado para el montaje final:** un búfer **74HCT245** (o 74AHCT125) alimentado a 5 V desde **VBUS (pin 40)**, entre la Pico y los drivers. Le da a cada entrada 5 V y toda la corriente que necesita, y sirve también para PUL y DIR si algún motor pierde pasos.
- Si un motor no se mueve o vibra sin avanzar con 3,3 V, la solución es la opción 3.

### 4.3 Motores → TB6600

Un NEMA 17 tiene 4 cables, dos por bobina:

1. Con un multímetro en ohmios, busca los pares que marcan continuidad (unos 1,5–3 Ω): cada par es una bobina.
2. Un par va a `A+` / `A−`, y el otro, a `B+` / `B−`.
3. Colores típicos del 17HS4401: negro → `A+`, verde → `A−`, rojo → `B+`, azul → `B−`. **Compruébalo con el multímetro**: cambian según el fabricante.

Si el motor gira al revés, no hace falta recablear: se corrige en el programa (`INVERTIR_X = True`, sección 5.3). También sirve invertir los dos cables de una sola bobina (`A+` ↔ `A−`).

### 4.4 Fuente de los motores → TB6600

| Fuente | TB6600 X | TB6600 Y | TB6600 Z |
|---|---|---|---|
| `+V` (12–24 V) | `VCC` | `VCC` | `VCC` |
| `−V` / `GND` | `GND` | `GND` | `GND` |

Lleva un cable de la fuente a cada driver (en estrella), de calibre 18–20. **Respeta la polaridad**: invertida, daña el driver.

### 4.5 Sensor HMC5883L (GY-271) → Pico W

| Módulo | Pico W | Pin físico |
|---|---|---|
| `VCC` | 3V3(OUT) | 36 |
| `GND` | GND | 38 |
| `SDA` | GP4 | 6 |
| `SCL` | GP5 | 7 |
| `DRDY` | sin conectar | — |

El programa de calibración no usa el sensor; se prueba después con `banco.sensor()` (ver [`firmware/README.md`](../firmware/README.md), sección 5.1).

### 4.6 Finales de carrera (para el firmware final)

Con interruptores **normalmente cerrados (NC)**: un terminal al GPIO y el otro a GND.

| Final | GPIO | Pin físico | Otro terminal |
|---|---|---|---|
| X− | GP18 | 24 | GND (28) |
| Y− | GP19 | 25 | GND (28) |
| Z− | GP20 | 26 | GND (28) |

El programa de calibración **no** los usa.

### 4.7 Alimentación de la Pico

Por el USB de la computadora (es como se usa con Thonny). La fuente de los motores alimenta solo a los TB6600.

### 4.8 Revisión antes de encender

- [ ] Los tres TB6600 en 1/8 de micropaso y con la corriente del motor.
- [ ] `PUL−`, `DIR−` (y `ENA−`, si se usa) de los tres drivers a GND de la Pico.
- [ ] `PUL+` y `DIR+` de cada driver a su GPIO (tablas de la sección 4.1).
- [ ] Bobinas del motor identificadas con el multímetro.
- [ ] Polaridad de la fuente correcta en los tres drivers.
- [ ] GND de la Pico **sin** unir al GND de la fuente de los motores.
- [ ] La mesa lejos de los extremos, con espacio para moverse en los dos sentidos.

Orden de encendido: primero la Pico (USB) y luego la fuente de los motores. Para apagar: primero la fuente y luego el USB.

---

## 5. Programa de calibración en Thonny

### 5.1 Preparar Thonny

1. Instala Thonny (thonny.org) y conecta la Pico por USB.
2. *Herramientas › Opciones › Intérprete*: «MicroPython (Raspberry Pi Pico)» y el puerto de la Pico.
3. Si la Pico tiene cargado el firmware (`main.py`), pulsa el botón rojo **Detener**. La consola debe mostrar `>>>`.
4. Abre `firmware/prueba_calibracion.py` desde tu computadora (*Archivo › Abrir › Este equipo*). **No hace falta copiarlo a la Pico**: Thonny lo ejecuta directamente.

### 5.2 Ajustar el encabezado del programa

Al principio del archivo están todos los valores que se cambian:

```python
# ┌──────────────────────────────────────────┐
# │ FACTORES DE CONVERSIÓN (micropasos por mm) │
# └──────────────────────────────────────────┘
PASOS_POR_MM_X = 200.0
PASOS_POR_MM_Y = 200.0
PASOS_POR_MM_Z = 200.0

INVERTIR_X = False          # True si el eje se mueve al revés
INVERTIR_Y = False
INVERTIR_Z = False

PIN_ENA = 16                # None si no conectaste ENA (sección 4.2)
USAR_Z = True               # False si todavía no hay motor en Z

MEDIO_PERIODO_US = 1000     # µs en alto y otros tantos en bajo; MÁS GRANDE = MÁS LENTO
RAMPA_PASOS = 0             # pulsos para acelerar y frenar (0 = sin rampa)
```

- **`PASOS_POR_MM_*`**: el **factor de conversión** de cada eje. Es lo que vas a corregir.
- **`INVERTIR_*`**: cámbialo a `True` si el eje se mueve en sentido contrario al que pides.
- **`PIN_ENA`**: pon `None` si dejaste ENA sin conectar.
- **`USAR_Z`**: `False` si todavía no hay motor en Z. Entonces el programa solo pide X e Y.
- **`MEDIO_PERIODO_US`**: cada pulso pasa este tiempo en alto y otro igual en bajo (pulso simétrico). Con 1000 µs son 500 pulsos/s: 10 mm/s con 50 pulsos/mm. Si el motor vibra o se salta pasos, súbelo (1500, 2000). Con 1/8 de micropaso (200 pulsos/mm), unos 250 µs dan la misma velocidad.

> Los pulsos deben ser largos y simétricos: con los 3,3 V de la Pico, el optoacoplador del TB6600 no responde bien a pulsos cortos (de 10 µs), y el motor solo vibra.

### 5.3 Cómo funciona

1. Antes de ejecutar, coloca la mesa en una posición que puedas medir. **Ese punto es el origen (0, 0, 0)**: el programa no tiene finales de carrera y toma como origen la posición en que está la mesa al arrancar.
2. Pulsa **F5** (o el botón verde *Ejecutar*). La consola muestra:

   ```
   Prueba de calibración. Origen = posición actual de la mesa.
   Factores: X=200.0  Y=200.0  Z=200.0 pasos/mm

   Ingresa posición en mm X: 40
   Ingresa posición en mm Y: 0
   Ingresa posición en mm Z: 0
   ```

3. Al escribir el tercer valor, la mesa se mueve a esa posición: primero X, luego Y y luego Z. Las posiciones son **absolutas, medidas desde el origen**: si estás en X = 40 y escribes 40 otra vez, no se mueve. Acepta decimales con punto o coma (`12.5` o `12,5`).
4. Al llegar, imprime los pasos que dio cada eje:

   ```
     X: 8000 pasos → 40.000 mm (si mediste d mm: factor nuevo = 8000 / d)
   Llegó a X=40.000  Y=0.000  Z=0.000 mm
   Ingresa 1 para regresar al punto de origen:
   ```

5. Mide el desplazamiento real (sección 6). Después escribe **1** y Enter: la mesa vuelve al origen (primero Z, luego Y y luego X) y el programa vuelve a pedir X, Y y Z para repetir el experimento.
6. Para terminar, pulsa **Detener** (o Ctrl+C). Al salir, el programa deshabilita los drivers (si ENA está conectado).

> ⚠ Sin finales de carrera, el programa no sabe dónde terminan los ejes. **No pidas posiciones negativas** (irían hacia atrás del origen) **ni mayores que el recorrido libre de la mesa.** Si algo suena mal, apaga la fuente de los motores.

---

## 6. Procedimiento de calibración

### 6.1 Factor teórico

```
pasos por mm = 200 pasos/vuelta × micropasos ÷ avance del husillo (mm/vuelta)
```

| Husillo T8 | Micropasos 1/8 | Factor teórico |
|---|---|---|
| 4 hilos, 8 mm/vuelta (el más común) | 1600 pasos/vuelta | **200** |
| 2 hilos, 4 mm/vuelta | 1600 | 400 |
| 1 hilo, 2 mm/vuelta | 1600 | 800 |

Para saber cuál es el tuyo: marca el husillo, dale una vuelta completa a mano y mide cuánto avanza la tuerca. Escribe el teórico en los tres factores antes de empezar.

### 6.2 Sentido de cada eje

1. Ejecuta el programa y pide un movimiento chico en un solo eje, por ejemplo X = 5, Y = 0, Z = 0.
2. Decide qué sentido es «positivo» para cada eje y que coincida con el montaje (en Z, + es **alejarse** de la bobina).
3. Si se movió al revés, regresa al origen (1), detén el programa, pon `INVERTIR_X = True` y repite.
4. Haz lo mismo con Y y Z.

### 6.3 Medir y corregir el factor (un eje a la vez)

1. **Pon a cero la medición**: apoya el calibrador o el reloj comparador en la mesa (o marca la posición de la tuerca o del carro con una línea fina).
2. **Pide un movimiento largo en un solo eje**, por ejemplo **X = 40, Y = 0, Z = 0**. Cuanto más largo, más preciso sale el factor; usa al menos 30–50 mm (en Z, lo que permita su recorrido, por ejemplo 15–20 mm).
3. **Mide** cuánto se movió de verdad: los **mm medidos**.
4. **Calcula el factor nuevo**:

   ```
   factor nuevo = factor actual × mm pedidos ÷ mm medidos
   ```

   o, con los pasos que imprimió el programa:

   ```
   factor nuevo = pasos dados ÷ mm medidos
   ```

   **Ejemplo:** factor 200; pediste 40 mm y midió 39,6 mm.
   200 × 40 ÷ 39,6 = **202,02** (o 8000 ÷ 39,6 = 202,02).
   - Si midió **menos** de lo pedido, el factor **sube**.
   - Si midió **más**, el factor **baja**.
5. Escribe **1** para regresar al origen. Comprueba que vuelve exactamente a la marca o al cero: si no, hay pasos perdidos o juego (sección 7).
6. Detén el programa, cambia `PASOS_POR_MM_X = 202.02`, ejecuta otra vez con **F5** y repite el mismo movimiento.
7. Repite hasta que **lo medido sea igual a lo pedido** (con un buen calibrador, diferencias de 0,05 mm o menos). Normalmente bastan 2 o 3 vueltas.
8. Haz lo mismo con **Y** y con **Z**, **cada uno por separado**: cada eje tiene su propio factor.

### 6.4 Comprobar

Con los tres factores corregidos:

1. Prueba varias distancias en cada eje (por ejemplo 10, 25 y 50 mm): todas deben dar lo pedido.
2. Ida y vuelta: X = 50 → 1 (origen) → X = 50 → 1, tres o cuatro veces. La mesa debe volver siempre al mismo punto.
3. Un movimiento combinado: X = 30, Y = 20, Z = 10, y mide los tres ejes.

El requisito de la tesis es un error menor que ±1 mm. Con una buena calibración, el T8 da errores de centésimas o décimas de mm.

### 6.5 Hoja de registro

| Eje | Intento | Factor usado | mm pedidos | mm medidos | Factor nuevo = factor × pedidos ÷ medidos |
|---|---|---|---|---|---|
| X | 1 | 200 | 40 | | |
| X | 2 | | 40 | | |
| X | 3 | | 40 | | |
| Y | 1 | 200 | 40 | | |
| Y | 2 | | 40 | | |
| Y | 3 | | 40 | | |
| Z | 1 | 200 | 15 | | |
| Z | 2 | | 15 | | |
| Z | 3 | | 15 | | |

---

## 7. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El motor no se mueve ni hace fuerza | Fuente apagada o mal conectada; ENA activo | Revisa `VCC`/`GND`. Prueba con `PIN_ENA = None` y ENA desconectado |
| El motor hace fuerza pero no gira | Los 3,3 V no alcanzan para el optoacoplador de PUL, o PUL−/DIR− no van a GND | Revisa las conexiones de la sección 4.1; si siguen bien, usa el 74HCT245 (4.2) |
| El motor vibra o zumba sin avanzar | Bobinas mal emparejadas | Identifica los pares con el multímetro (4.3) |
| Se mueve al revés | Sentido del eje | `INVERTIR_X = True` (o el eje que sea) |
| Vibra con el programa de calibración pero se movía con otro programa | Pulsos demasiado cortos o rápidos | Sube `MEDIO_PERIODO_US` (por ejemplo, 1500 o 2000) |
| Avanza la mitad, el doble, etc. | Los micropasos del DIP no coinciden con el factor | Revisa SW1–SW3 (1/8) o recalcula el factor teórico (6.1) |
| No vuelve exactamente al origen | Pasos perdidos (velocidad alta) o juego en la tuerca | Sube `MEDIO_PERIODO_US` (más lento) o usa una rampa (`RAMPA_PASOS = 100`). Si la diferencia es siempre la misma y solo al cambiar de sentido, es juego: el firmware final lo compensa con `HOLGURA_MM` |
| El motor se calienta mucho | Corriente demasiado alta | Baja la corriente con SW4–SW6 |
| Error `ImportError: no module named 'machine'` | Thonny ejecuta en la computadora | Selecciona el intérprete «MicroPython (Raspberry Pi Pico)» (5.1) |
| Thonny no responde al ejecutar | El firmware `main.py` sigue corriendo | Pulsa Detener antes de F5 |

---

## 8. Pasar los factores al firmware final

Cuando los tres ejes midan exactamente lo pedido, copia los valores a [`firmware/config.py`](../firmware/config.py):

```python
EJE_X = {
    "paso": 10, "dir": 11, "invertir": False,      # ← el mismo INVERTIR_X del programa de prueba
    "pasos_por_mm": 202.02,                        # ← PASOS_POR_MM_X calibrado
    ...
}
EJE_Y = {
    "paso": 12, "dir": 13, "invertir": False,      # ← INVERTIR_Y
    "pasos_por_mm": 199.47,                        # ← PASOS_POR_MM_Y calibrado
    ...
}
EJE_Z = {
    "paso": 14, "dir": 15, "invertir": False,      # ← INVERTIR_Z
    "pasos_por_mm": 200.85,                        # ← PASOS_POR_MM_Z calibrado
    ...
}
```

(Los números del ejemplo son ilustrativos: usa los tuyos.)

Revisa también:

- `MICROPASOS` y `AVANCE_HUSILLO_MM`: solo sirven para el valor teórico. Si escribes el factor calibrado directamente en `pasos_por_mm`, mandan los calibrados.
- `PIN_ENA = None` si dejaste ENA sin conectar.
- Si en la calibración usaste una velocidad más baja porque el motor perdía pasos, baja también `VEL_MAX_MM_S` en `config.py`.

Después sigue con la calibración de la posición de la bobina, del plano z = 0 y del recorrido útil en [`firmware/README.md`](../firmware/README.md), secciones 5.4 y 5.5, y con la prueba de banco (sección 6).
