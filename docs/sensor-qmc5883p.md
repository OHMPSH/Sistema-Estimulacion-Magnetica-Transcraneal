# Magnetómetro QMC5883P con la Raspberry Pi Pico W

El módulo magnético del proyecto es un **QMC5883P** (dirección I2C **0x2C**). **No** es un HMC5883L (0x1E) ni un QMC5883L (0x0D), aunque la tienda lo venda como «HMC5883L» y traiga una biblioteca de Adafruit para el HMC5883, que **no sirve** para este chip (se borró del proyecto). Lo confirmó el usuario el 2026-11-12: el módulo ya mide con los programas de este documento.

Programas de prueba (independientes, para Thonny, sin bibliotecas extra):

| Archivo | Para qué |
|---|---|
| [`firmware/prueba_qmc5883p.py`](../firmware/prueba_qmc5883p.py) | Prueba mínima: escaneo del bus y cuentas crudas X, Y, Z. |
| [`firmware/medicion_campo_qmc5883p.py`](../firmware/medicion_campo_qmc5883p.py) | Medición para el proyecto: rango ajustable, promedio, resta del fondo, \|B\|, aviso de saturación y reconexión automática. Salida apta para el Plotter de Thonny. |

El firmware cliente de `firmware/` (`sensor.py`, `config.py`, `banco.py`) **todavía es del HMC5883L** y hay que adaptarlo (sección 6).

---

## 1. Conexión

| Sensor | Pico W | Pin físico |
|---|---|---|
| VCC | 3V3(OUT) | 36 |
| GND | GND | 38 (o cualquier GND) |
| SDA | GP0 | 1 |
| SCL | GP1 | 2 |

- Con **3,3 V**, nunca 5 V.
- Cables cortos (menos de 20 cm). I2C0 a **100 kHz**.
- El módulo trae pull-ups. Si `i2c.scan()` sale vacío con los cables bien, agrega 4,7 kΩ de SDA a 3V3 y otra de SCL a 3V3.
- Se pueden usar otros pines I2C si se cambian en el código, por ejemplo `I2C(0, sda=Pin(4), scl=Pin(5))` o `I2C(1, sda=Pin(2), scl=Pin(3))`. GP0 y GP1 no chocan con los pines de los motores (GP10–GP16) ni con los finales de carrera (GP18–GP20).

## 2. Registros

| Registro | Nombre | Uso |
|---|---|---|
| `0x00` | Chip ID | Siempre `0x80`. Sirve para confirmar que el chip es el correcto. |
| `0x01`–`0x06` | Datos X, Y, Z | Tres enteros de 16 bits con signo, **byte bajo primero** (`struct.unpack('<hhh', …)`), en el orden **X, Y, Z**. |
| `0x09` | Estado | Bit 0 `DRDY`: hay un dato nuevo. Bit 1 `OVFL`: **saturado**. |
| `0x0A` | Control 1 | `0xCD`: modo normal, 200 Hz, filtro máximo. |
| `0x0B` | Control 2 | Set/Reset y **rango** (bits 3–2). |
| `0x29` | Signo de ejes | `0x06`, según el datasheet. |

**Al encenderse, el chip está en reposo.** Si no se escribe `0x0A`, todas las lecturas valen 0.

**Inicialización**, en este orden:
1. Leer `0x00` y comprobar que vale `0x80`.
2. Escribir `0x29 ← 0x06`.
3. Escribir `0x0B ← bits_rango << 2`.
4. Escribir `0x0A ← 0xCD`.
5. Esperar 20 ms.

**Lectura:**
1. Esperar a que `0x09 & 0x01` (DRDY) valga 1, con un límite de 100 ms.
2. Leer 6 bytes desde `0x01`.
3. La lectura está **saturada** si `0x09 & 0x02` (OVFL) vale 1.

### Diferencias con el HMC5883L (lo que daba por hecho el firmware viejo)

| | HMC5883L (firmware viejo) | QMC5883P (el módulo real) |
|---|---|---|
| Dirección | 0x1E | **0x2C** |
| Identificación | `0x0A–0x0C` = «H43» | **`0x00` = 0x80** |
| Orden y formato | X, Z, Y; byte alto primero | **X, Y, Z; byte bajo primero** |
| Saturación | El eje vale −4096 | **Bit OVFL** (`0x09` bit 1); el dato no vale −4096 |
| Cuentas | −2048 a 2047 | −32768 a 32767 |
| Rangos | 0,88 a 8,1 Ga | **2, 8, 12 y 30 G** |
| Medición | Única, a pedido (`0x02 ← 0x01`) | Continua a 200 Hz; se espera DRDY |

## 3. Rangos (registro `0x0B`, bits 3–2)

| Rango | `0x0B` | Cuentas por gauss | Resolución | Máximo |
|---|---|---|---|---|
| 30 G | `0x00` | 1000 | 0,1 µT | ±3000 µT (3 mT) |
| 12 G | `0x04` | 2500 | 0,04 µT | ±1200 µT |
| 8 G | `0x08` | 3750 | 0,027 µT | ±800 µT |
| 2 G | `0x0C` | 15000 | 0,007 µT | ±200 µT |

- Conversión: **µT = cuentas / (cuentas por gauss) × 100**.
- Equivalencias: 1 G = 100 µT = 0,1 mT. El campo de la Tierra mide unos 25–65 µT.
- Usa el rango más pequeño que **no** sature.

## 4. Medición

- **Promedio:** `PROMEDIO = 10` baja el ruido unas √10 veces. El ruido es de unos ±0,3 µT en el rango de 30 G.
- **Fondo:** con la bobina apagada y el imán lejos, se promedian 100 lecturas. Así se mide el campo de la Tierra más el del entorno (hierro de la mesa, cables, la propia Pico), y ese fondo se resta de cada medición. Hay que repetirlo cada vez que cambie la orientación del sensor.
- **Truco de la polaridad (bobinas):** B = (B(+I) − B(−I)) / 2 cancela el fondo y el offset.
- **|B|** no depende de cómo esté girado el sensor: es el valor más cómodo para comparar mediciones.
- **Saturación:** si cualquiera de las lecturas del promedio trae OVFL, el dato entero es saturado.
- **Errores del bus** (`OSError`, por ejemplo `EIO`): esperar 1 s y volver a inicializar.

## 5. Aplicación

**Bobinas:**
- Campo esperado:
  - en el centro de una espira: `B = μ0·N·I / (2R)`;
  - sobre su eje: `B(z) = μ0·N·I·R² / (2(R² + z²)^(3/2))`;
  - en un solenoide largo: `B = μ0·N·I / L`.
- Ejemplo: N = 100, I = 0,5 A, R = 2 cm → unos 1571 µT; necesita el rango de 30 G.
- B frente a I debe dar una recta; su pendiente es la constante de la bobina (µT/A).

**Imanes:**
- Un neodimio tiene miles de gauss en la superficie: hay que medirlo a distancia. El campo baja como 1/d³.
- **El imán no debe tocar el módulo:** su níquel provoca cortos. Eso fue lo que dejó la línea SCL pegada a GND en el Arduino.

**Ejes:**
- X e Y vienen serigrafiadas en el módulo; Z sale perpendicular a la placa.
- Fija y anota la orientación del sensor respecto a la mesa.
- Para invertir el signo de un eje, es más simple hacerlo en el código que cambiar `0x29`.

**Corriente alterna:**
- A 200 Hz de muestreo, las bobinas de 50/60 Hz dan lecturas falsas por aliasing. Usa corriente continua o variaciones de menos de ~10–20 Hz.
- Para alterna hace falta un Hall analógico en el ADC (ver `firmware/prueba_hall_49e.py` y `firmware_hall_1d/`).

**Alimentar una bobina:**
- Nunca desde un pin de la Pico.
- Usa una fuente aparte, con un MOSFET de nivel lógico o un puente H (DRV8833, TB6612).
- Pon un diodo de rueda libre en inversa sobre la bobina y trenza sus cables.

## 6. Pendiente: llevarlo al firmware cliente (`firmware/`)

Lo hará el usuario en otra sesión. Lo que debe llevar:

1. **`sensor.py` → clase `QMC5883P`** con la misma interfaz que usan `main.py`, `barrido.py` y `banco.py`:
   - **`verificar()`:** escanea el bus. Si encuentra 0x2C, comprueba el Chip ID `0x80`. Si en su lugar responde 0x1E (HMC5883L) o 0x0D (QMC5883L), da un mensaje claro.
   - **`configurar(rango)`:** escribe `0x29`, `0x0B` y `0x0A` y espera 20 ms.
   - **`medir()`:** generador que espera DRDY (cediendo con `yield`), promedia N lecturas, lee `'<hhh'` en el orden X, Y, Z y devuelve las cuentas y si saturó (OVFL).
   - Tras un `OSError`, debe volver a inicializar el chip.
2. **`config.py`:**
   - `PIN_SDA = 0` y `PIN_SCL = 1`, o los pines que el usuario elija;
   - `DIR_SENSOR = 0x2C`;
   - `I2C_FRECUENCIA = 100_000`;
   - el rango y el promedio.
3. **`banco.py`:** cambiar `sensor()` y la tabla `LSB_POR_GA`.
4. **Fondo:** medirlo con la mesa en el origen y la bobina apagada. Hay dos caminos:
   - restarlo en la Pico;
   - guardarlo en `offset_ut` (Configuración › Sensor), que el servidor ya resta.

   «Medir cero» sigue pendiente en el servidor.
5. **Compatibilidad con el servidor (decisión pendiente).** Hoy el servidor da por hecho un HMC5883L:
   - `raw` debe estar entre −4096 y 2047 (`server/services/conversionSensor.js`);
   - −4096 en un eje significa saturado;
   - `lsb_por_ga` sale de las ganancias del HMC5883L (0,88 a 8,1 Ga; `validacionConfiguracion.js`);
   - `sensor.modelo` vale `'HMC5883L'`.

   Las cuentas del QMC5883P (±32767; 1000–15000 por gauss) **no caben** tal cual. Hay dos opciones:
   - **(a) Sin tocar el servidor:** la Pico convierte a µT y de ahí a «cuentas HMC» con `lsb_por_ga` y `offset_ut` de `sesion_activa.sensor`, como hace `firmware_hall_1d/sensor_hall.py` (`a_cuentas`), y manda −4096 si hay OVFL o si no cabe. Límite: ±249,6 µT con 1,9 Ga, o ±890 µT con 8,1 Ga, y se pierde resolución. Una bobina de unos 1500 µT saturaría.
   - **(b) Adaptar el servidor al QMC5883P:**
     - modelo y rangos 2/8/12/30 G con sus cuentas por gauss;
     - `raw` de −32768 a 32767 (las columnas `raw_*` ya son SMALLINT);
     - la saturación como un campo explícito de la lectura (por ejemplo `saturado: true`, por OVFL) en lugar de −4096;
     - actualizar también `emular-pico.js`, los tests, `docs/firmware-pico-w.md` y la interfaz de Configuración › Sensor.

     Es lo correcto para los datos de la tesis, pero toca archivos del servidor y de la página: necesita la aprobación del usuario.
6. Actualizar las referencias al HMC5883L en estos documentos:
   - `docs/firmware-pico-w.md` (sección 4);
   - `docs/instructivo-calibracion-y-conexiones.md` (sección 4.5: GP4/GP5 → GP0/GP1);
   - `firmware/README.md`;
   - `firmware/pico_w_cliente_ejemplo.py` (es solo una referencia).

## 7. Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `I2C: []` | SDA y SCL invertidos, falta 3V3 o GND, o faltan pull-ups. |
| `OSError: [Errno 5] EIO` | Falso contacto o un corto (por ejemplo, el imán tocando el módulo). |
| «no es un QMC5883P» | Es otro chip (QMC5883L en 0x0D, HMC5883L en 0x1E). |
| Siempre 0, 0, 0 | No se escribió `0x0A`: el chip sigue en reposo. |
| `SATURADO` todo el tiempo | Campo demasiado fuerte o cercano: sube el rango o aleja la fuente. |
| Thonny no conecta | Puerto COM repetido u ocupado (Arduino IDE, monitor serie, Bluetooth). |
