# Firmware de la Raspberry Pi Pico W (MicroPython)

Firmware cliente final de la Pico W para el sistema TMS. Mueve la mesa (NEMA 17 con drivers TB6600), lee el magnetómetro **QMC5883P** de 3 ejes, recorre la malla de cada sesión **en serpentina** y habla con el servidor con el protocolo de [docs/firmware-pico-w.md](../docs/firmware-pico-w.md): latido, sesión activa y lotes de lecturas.

Se comporta como el firmware de prueba del Hall 49E ([`../firmware_hall_1d/`](../firmware_hall_1d/README.md)): sin finales de carrera, con límites de software y regreso a la posición de arranque al terminar, detener, fallar o con Ctrl+C. **Desde el 2026-11-13** (sección 3): X e Y están intercambiados, la mesa arranca en **X = 0, Y = 410, Z = 88 mm** y la zona de cada sesión empieza en el **punto de inicio de la medición** que manda el servidor.

> **Estado (2026-11-12):** probado en el PC contra el servidor real, con motores, sensor y Wi-Fi simulados (sección 10). **Todavía no se ha probado en la Pico con la mesa y el QMC5883P.** Haz la prueba de banco (sección 7) antes de conectarlo al servidor.

---

## 1. Archivos

| Archivo | Qué hace |
|---|---|
| `config.py` | **Lo que se ajusta:** límites, pines, factores de los motores, holgura, sensor, tiempos. |
| `secretos.py` | Wi-Fi, token y URL del servidor. **No se sube a git** (está en `.gitignore`). Se crea a partir de `secretos_ejemplo.py`. |
| `main.py` | Bucle principal: latido, sesiones, envío de lotes, LED y regreso a la posición de arranque. Arranca solo al encender. |
| `sensor.py` | QMC5883P: escaneo I2C, Chip ID, rango, lectura con DRDY y OVFL, promedio, fondo y los dos formatos de envío (sección 5). |
| `barrido.py` | Malla de la sesión en **serpentina**, coordenadas de zona → máquina, límites y reanudación. |
| `motores.py` | Ejes con PIO + DMA (los pulsos los genera el hardware), rampa trapezoidal, holgura por eje y homing (con finales de carrera, para cuando se instalen). |
| `red.py` | Wi-Fi (reconecta sin detener el barrido) y hora por NTP. |
| `cliente.py` | Latido, búfer circular de lecturas en RAM y envío por lotes con reintentos. |
| `led.py` | Patrones del LED de la placa. |
| `registro.py` | Log por la consola USB con la hora UTC. |
| `banco.py` | Prueba de banco y calibración **sin servidor**. |
| `prueba_qmc5883p.py` | Prueba mínima del QMC5883P para Thonny: escaneo I2C (debe salir `0x2c`) y cuentas crudas. Independiente. |
| `medicion_campo_qmc5883p.py` | Medición con el QMC5883P para Thonny: rango, promedio, fondo, µT, SATURADO y reconexión. Independiente. Ver [docs/sensor-qmc5883p.md](../docs/sensor-qmc5883p.md). |
| `prueba_hall_49e.py` | Prueba de un Hall 49E en el ADC para Thonny. Independiente. |
| `prueba_calibracion.py` | Programa independiente para Thonny: pide X, Y, Z en mm, mueve la mesa y regresa al origen. **Usa los nombres viejos:** su X es la Y del firmware y su Y es la X. Sirve para calibrar los pulsos por mm ([docs/instructivo-calibracion-y-conexiones.md](../docs/instructivo-calibracion-y-conexiones.md)). |
| `pruebas_pc/` | Pruebas en el PC (no se copian a la Pico). |
| `pico_w_cliente_ejemplo.py` | El ejemplo anterior, solo de referencia (no se copia a la Pico). |

## 2. Conexiones

> El instructivo detallado, con cada borne de los tres TB6600 y su pin físico de la Pico, está en [docs/instructivo-calibracion-y-conexiones.md](../docs/instructivo-calibracion-y-conexiones.md).

### 2.1 Pines (cámbialos en `config.py`)

| Señal | GPIO | Pin físico | Notas |
|---|---|---|---|
| QMC5883P SDA | GP0 (I2C0) | 1 | 100 kHz, dirección 0x2C |
| QMC5883P SCL | GP1 (I2C0) | 2 | |
| QMC5883P VCC / GND | 3V3(OUT) / GND | 36 / 38 | **3,3 V, nunca 5 V** |
| X PUL+ / DIR+ (eje corto, 410 mm) | GP10 / GP11 | 14 / 15 | Igual que en `prueba_calibracion.py` |
| Y PUL+ / DIR+ (eje largo, 562 mm) | GP12 / GP13 | 16 / 17 | Igual que en `prueba_calibracion.py` |
| Z PUL+ / DIR+ | GP14 / GP15 | 19 / 20 | Con `MODO_Z = "motor"` |
| ENA+ (los tres TB6600) | GP16 | 21 | `ENA_HABILITADO = 0` |
| LED de estado | el de la placa | | |

Los pines, los nombres y los factores son los de `prueba_calibracion.py` (50 pulsos/mm, sin inversiones): su `PASOS_POR_MM_X` va en `EJE_X` y su `PASOS_POR_MM_Y` en `EJE_Y`. (El 2026-11-13 se habían intercambiado X e Y; el 2026-11-14 se deshizo a pedido del usuario.)

### 2.2 TB6600

- **Cátodo común:** `PUL−`, `DIR−` y `ENA−` de los tres drivers a un GND de la Pico; `PUL+`, `DIR+` y `ENA+` a los GPIO. Con este cableado, `ENA+` en alto **deshabilita** el driver (`ENA_HABILITADO = 0`).
- Los optoacopladores del TB6600 están pensados para 5 V. Con los 3,3 V de la Pico suelen funcionar (el firmware pone los pines de PUL y DIR en 12 mA). Si un motor pierde pasos, pon un búfer 74HCT245 alimentado a 5 V entre la Pico y los drivers.
- La fuente de los motores (12–24 V) va solo a `VCC`/`GND` de los TB6600. La Pico se alimenta por USB o por VSYS.

### 2.3 Sin finales de carrera

Hoy la mesa no tiene interruptores: todos los ejes llevan `"final": None` y `recorrido_mm` = el límite. El código de homing con finales sigue en `motores.py`; cuando se instalen, basta con poner el GPIO en `"final"` y `"final_nc": True` (interruptor NC entre el GPIO y GND).

## 3. Posición de arranque, punto de inicio y límites

**Coordenadas de máquina** (mm): X de 0 a 410 (eje corto), Y de 0 a 562 (eje largo), Z de 0 a 88 (`LIMITE_*_MM`). La mesa nunca sale de ahí: un movimiento fuera se rechaza antes de dar un pulso, y una sesión cuya zona no cabe se rechaza entera (el error se ve en el dashboard).

- **Posición de arranque** (`POSICION_ARRANQUE_*_MM`): dónde está la mesa cuando arranca el programa. Es la posición de **descanso**: **X = 0, Y = 562, Z = 88** (Y en su máximo y Z arriba). Sin finales de carrera, el firmware no tiene otra forma de saberlo: **deja la mesa ahí antes de ejecutar**.
- **Punto de inicio de la medición:** dónde está el punto (0, 0, 0) de cada sesión, en coordenadas de máquina. Lo elige un admin en la página (Configuración › General) y el servidor lo manda en el latido como `sesion_activa.inicio_medicion = {x_mm, y_mm, z_mm}`. Si no lo manda (servidor anterior a esa función), se usa `INICIO_MEDICION_MM`, que por defecto es el **origen (0, 0, 0)**, igual que en la página.
- **Sentido de la zona** (`SENTIDO_X/Y/Z` = +1, +1, +1): desde el punto de inicio, la zona crece hacia dentro de la mesa:

  ```
  x_máquina = inicio.x + xMM
  y_máquina = inicio.y + yMM
  z_máquina = inicio.z + zMM      (el plano z = 0 es el más bajo)
  ```

  Ejemplo: con el inicio en (0, 0, 0) y una zona de 60 × 60 × 20 mm, la mesa va de (0, 562, 88) a (0, 0, 0), recorre X 0–60, Y 0–60 y Z 0–20, y vuelve a (0, 562, 88).
- **Orden de los ejes:** para bajar Z, la mesa mueve primero X e Y (con Z donde está) y después baja; para subir, sube Z primero. Así nunca cruza la mesa con el sensor abajo.
- Los drivers quedan **habilitados** todo el tiempo que corre el programa, para que nadie mueva la mesa a mano y se pierda la posición.
- La mesa **vuelve a la posición de arranque** al completar una sesión, al detenerla en el dashboard, ante un error, ante un 401 y al detener el programa (**Ctrl+C o el botón rojo de Thonny**). El regreso sube Z primero y luego mueve X e Y. Un segundo Ctrl+C interrumpe ese regreso; en ese caso, lleva la mesa a mano a la posición de arranque antes de volver a ejecutar.
- **Nunca se reinicia sola:** ni `machine.reset()` ni watchdog, porque un reinicio tomaría como arranque la posición en que quedó la mesa.

## 4. Recorrido en serpentina

La malla se recorre de forma continua (en coordenadas de la zona): X avanza hasta el máximo, Y sube un paso y X regresa midiendo punto por punto, y así hasta terminar el plano. Z sube un paso y el plano siguiente se recorre **desde donde quedó la mesa** (Y también va y viene). Entre dos puntos seguidos solo cambia un índice en ±1. La mesa solo vuelve a la posición de arranque al terminar la sesión. En la mesa, «Y sube» y «Z sube» son movimientos hacia 0 (sección 3).

El orden es un contrato con el servidor (`barrido.indices`). Con `nx = grid_nx`, `ny = grid_ny` y `k` el índice del punto:

```
iz   = k // (nx·ny)
r    = k %  (nx·ny)
fila = r // nx
iy   = fila            si iz es par;  ny − 1 − fila     si iz es impar
g    = iz·ny + fila                   (número global de fila)
ix   = r % nx          si g es par;   nx − 1 − (r % nx) si g es impar
punto = (ix·paso, iy·paso, z_levels_mm[iz])   (redondeado a décimas)
```

Con `nx = 3`, `ny = 2` y dos planos, los índices (ix, iy, iz) son: (0,0,0) (1,0,0) (2,0,0) (2,1,0) (1,1,0) (0,1,0) (0,1,1) (1,1,1) (2,1,1) (2,0,1) (1,0,1) (0,0,1).

La reanudación no cambia: con `lecturas_por_punto = N`, el seq `s` es la lectura `(s − 1) % N` del punto `(s − 1) // N` de la serpentina. Tras un reinicio, el latido trae `ultimo_seq` y el barrido sigue en `ultimo_seq + 1`. El servidor acepta cualquier orden: valida cada posición contra la malla y el `seq`.

## 5. Sensor QMC5883P y formato de las lecturas

### 5.1 Medición

- `verificar()` escanea el bus y comprueba el Chip ID (`0x00` = `0x80`). Si en su lugar aparece un HMC5883L (0x1E), un QMC5883L (0x0D) o nada, el mensaje lo dice.
- Inicialización: `0x29 ← 0x06`, `0x0B ← bits << 2` (30 G → 0, 12 G → 1, 8 G → 2, 2 G → 3), `0x0A ← 0xCD` y 20 ms.
- Cada medición promedia `PROMEDIO_QMC` lecturas (10, unos 50 ms a 200 Hz). Para cada una cede el control mientras espera DRDY (máximo `TIMEOUT_DRDY_MS`, 100 ms) y lee `'<hhh'` (X, Y, Z). Si cualquiera trae OVFL, la medición es **saturada**.
- Ante un `OSError` del bus, reinicia el chip una vez; si vuelve a fallar, la sesión falla con un error de sensor, se manda lo ya medido y la mesa vuelve a la posición de arranque.

### 5.2 Fondo

Al arrancar, con la mesa en la posición de arranque y **la bobina apagada**, se promedian `LECTURAS_FONDO` (100) lecturas en 30 G y el log imprime el fondo por eje:

```
Fondo (100 lecturas, 30 G): Bx +20.00  By -5.00  Bz +40.10  |B| 45.09 µT
Fondo: cópialo en Configuración › Sensor › offset (x 20.00, y -5.00, z 40.10) si quieres que el servidor lo reste
```

En espera (sin sesión), el botón **BOOTSEL** lo vuelve a medir. Con `RESTAR_FONDO_EN_PICO = False` (por defecto) las cuentas se mandan **crudas**, para no perder trazabilidad; el servidor resta `offset_ut` al convertir. Con `True`, la Pico resta su fondo antes de mandar (deja entonces `offset_ut` en 0).

### 5.3 Dos formatos de envío

El firmware funciona con el servidor de hoy y con el servidor adaptado al QMC5883P, según `sesion_activa.sensor.modelo` del latido:

| Servidor | `sensor.modelo` | Rango | `raw` | `saturado` |
|---|---|---|---|---|
| Adaptado al QMC5883P | `"QMC5883P"` | `sensor.rango_g` (2, 8, 12 o 30 G) | cuentas crudas del QMC, −32768..32767 | `true`/`false` en cada lectura (OVFL) |
| De hoy (espera un HMC5883L) | otro | 30 G | «cuentas HMC»: µT × `lsb_por_ga` / 100, −2048..2047 | no se manda; −4096 en los tres ejes si hubo OVFL o si no cabe |

Con el servidor de hoy el rango queda limitado a **±(2047 / `lsb_por_ga` × 100) µT**: ±249,6 µT con 1,9 Ga y ±890 µT con 8,1 Ga (el log lo avisa al empezar cada sesión). Lo que pase de ahí se guarda como saturado. A diferencia de `firmware_hall_1d/sensor_hall.py`, aquí la Pico **no** suma `offset_ut` a las cuentas: el Hall calibra su cero en la Pico, pero el fondo del QMC5883P se deja al servidor, y sumarlo anularía la resta que hace el servidor.

## 6. Holgura del husillo y tiempos

Cada eje lleva `holgura_mm` (0,5 mm por defecto, `HOLGURA_MM`): si un movimiento de ese eje va en sentido −, se pasa ese tanto y vuelve en sentido +, así cada punto se alcanza siempre desde el mismo lado (el requisito es un error menor que ±1 mm).

Con la serpentina, **la mitad de las filas van en X−**, así que cada punto de esas filas hace ese vaivén. Con los tiempos por defecto (60 mm/s, 300 mm/s², arranque a 6 mm/s, 50 pulsos/mm) agrega unos **0,06–0,07 s por punto** de esas filas: para un barrido de 845 puntos con paso de 5 mm, unos 27 s más sobre unos 8 minutos (cerca de un 5 %). En Y solo pasa una vez por fila en los planos impares, y en Z nunca. Para quitarla en un eje, pon `"holgura_mm": 0` en ese eje (antes conviene medir el juego, sección 8.3).

## 7. Prueba de banco (sin servidor)

Con `main.py` detenido (botón rojo de Thonny) y la mesa en la posición de arranque, en la consola (coordenadas de máquina):

```python
>>> import banco
>>> banco.sensor()                   # Chip ID, fondo y 10 lecturas: cuentas, µT, |B| y SATURADO
>>> banco.sensor(rango=2)            # lo mismo en 2 G (2, 8, 12 o 30)
>>> banco.fondo()                    # vuelve a medir el fondo
>>> banco.ir(100, 300, 60)           # mm de máquina, con los mismos límites (sin z, Z no se mueve)
>>> banco.mover("x", 10)             # relativo
>>> banco.prueba(nx=3, ny=3, paso=10, planos=(0, 10))   # malla pequeña desde INICIO_MEDICION_MM
>>> banco.arranque()                 # vuelve a la posición de arranque
>>> banco.apagar()                   # vuelve a la posición de arranque y deshabilita los drivers
```

`banco.prueba` recorre la malla desde `INICIO_MEDICION_MM`, con los mismos sentidos y el mismo orden que una sesión, imprime cada lectura y vuelve a la posición de arranque.

## 8. Instalar y calibrar

### 8.1 MicroPython

1. Descarga de micropython.org el firmware de **tu placa**, **versión 1.22 o posterior** (hace falta `rp2.DMA`; con una versión anterior los movimientos bloquean el programa y el firmware lo avisa): **Raspberry Pi Pico W** (RP2040) o **Raspberry Pi Pico 2 W** (RP2350). Las dos funcionan desde `pico-tms-2.3`: `motores.py` detecta el chip y usa la dirección de CHAN_ABORT del DMA de cada uno (0x50000444 en el RP2040, 0x50000464 en el RP2350). Antes, en la Pico 2 W, detener a mitad de un movimiento colgaba el programa: no volvía al arranque, Thonny no mostraba nada, el LED seguía parpadeando y el servidor la marcaba desconectada.
2. Conecta la Pico con **BOOTSEL** pulsado, suelta el botón y arrastra el `.uf2` a la unidad `RPI-RP2`.

### 8.2 Cargar los archivos

1. Crea `secretos.py` a partir de `secretos_ejemplo.py` (sección 9).
2. En Thonny (*Herramientas › Opciones › Intérprete*: «MicroPython (Raspberry Pi Pico)»), *Ver › Archivos*, selecciona `config.py secretos.py registro.py red.py cliente.py sensor.py motores.py barrido.py led.py banco.py main.py` y *Subir a /*. Sobrescriben los de `firmware_hall_1d/` si la Pico los tenía (allí el sensor era `sensor_hall.py`).
3. O con mpremote:

```bash
cd firmware && mpremote connect auto cp config.py secretos.py registro.py red.py cliente.py sensor.py motores.py barrido.py led.py banco.py main.py :
```

Para que el firmware no arranque al encender (por ejemplo, para editar), pulsa **BOOTSEL** durante los 3 primeros segundos.

### 8.3 Calibración

1. **Sensor:** primero `prueba_qmc5883p.py` (debe decir `I2C: ['0x2c']`); después `banco.sensor()`. Comprueba los ejes con un imán como dice [docs/sensor-qmc5883p.md](../docs/sensor-qmc5883p.md), sección 5.
2. **Pulsos por mm:** con `prueba_calibracion.py` (instructivo en `docs/`). Copia los factores finales a `config.py`.
3. **Juego del husillo:** `banco.ir(50, 350)`, `banco.ir(60, 360)`, `banco.ir(50, 350)` varias veces, midiendo con un calibrador. Si ida y vuelta difieren más de 0,1 mm, sube `holgura_mm` de ese eje.
4. **Velocidad:** `VEL_MAX_MM_S = 60` y `ACEL_MM_S2 = 300`. Sin finales de carrera, un paso perdido corre la posición: si un motor vibra o se salta pasos, bájalos.

## 9. Conexión con el servidor (la laptop)

La Pico manda los datos por **Wi-Fi** con HTTP (`POST /api/dispositivo/latido` cada 5 s y `POST /api/dispositivo/mediciones` con lotes de hasta 25 lecturas), con el token del dispositivo. `secretos.py` necesita:

1. `WIFI_SSID` y `WIFI_PASSWORD` de la **misma red que la laptop** (2,4 GHz; con el hotspot del iPhone, «Maximizar compatibilidad»).
2. `SERVIDOR = "http://<IP de la laptop>:4000"` (la IP sale de `hostname -I`; cambia si cambias de red).
3. `TOKEN`: en el dashboard, como admin, Configuración › Dispositivo › Generar token (se muestra una sola vez).

El backend por defecto solo escucha en `127.0.0.1`. **Sin cambiar ningún archivo**, arráncalo así para que la Pico lo alcance:

```bash
cd server && HOST=0.0.0.0 npm run dev
```

Si el servidor está en **modo simulación**, el log de la Pico lo avisa: un admin debe pasarlo a **Real** (menú lateral) para que la Pico reciba sesiones.

### Primera prueba

1. Deja la mesa en la posición de descanso (X = 0, Y = 562, Z = 88), la bobina apagada, y ejecuta `main.py` (F5). Deben salir el fondo, `Sensor: QMC5883P en 0x2C`, `Wi-Fi: conectado` y `Latido: servidor en línea (modo real)`. El LED queda fijo.
2. Inicia una sesión pequeña: zona 20 × 10 × 10 mm con paso 10 mm (3 × 2 × 2 = 12 puntos). La consola imprime cada lectura (Bx, By, Bz, |B| en µT) y los lotes aceptados; el dashboard dibuja los puntos.
3. La mesa va al punto de inicio, recorre la serpentina, dice «malla completa» y vuelve a la posición de arranque. El servidor cierra la sesión al completar la malla; si no, ciérrala en el dashboard.
4. Prueba también **Detener** a mitad de una sesión: la mesa se detiene con el siguiente latido y vuelve a la posición de arranque.

## 10. LED y comportamiento ante fallas

| LED | Estado |
|---|---|
| Parpadeo rápido (5 Hz) | Desde que se alimenta hasta que el servidor responde; también si se pierde el Wi-Fi o el servidor |
| **Fijo** | Conectada al servidor (en espera, volviendo a la posición de arranque o midiendo) |
| Tres destellos y pausa | Error: zona fuera de los límites (desde el punto de inicio), inicio inválido, sensor o movimiento (el motivo está en la consola y en el dashboard) |
| Parpadeo lento (1 Hz) | 401: token inválido o dispositivo desactivado |

| Situación | Qué hace el firmware |
|---|---|
| Se cae el Wi-Fi | Sigue midiendo; guarda hasta `MAX_BUFER` (1000) lecturas en RAM. Si se llena, pausa el barrido. Al volver la red, reenvía los mismos `seq`. |
| 5xx o timeout | Reintenta el mismo lote a los 0,25, 0,5, 1, 2, 4 y 8 s. |
| `sesion_activa = null` o 404/409 en un lote | Para los motores, descarta lo pendiente y vuelve a la posición de arranque. |
| Malla completa | Vuelve a la posición de arranque; los drivers siguen habilitados. |
| Error de sensor o de movimiento | Para, manda lo ya medido y vuelve a la posición de arranque. No reintenta esa sesión; la siguiente vuelve a verificar el sensor. |
| La zona no cabe | No mueve nada; aviso en el dashboard. |
| 401 | Para todo, vuelve a la posición de arranque y prueba el latido cada 30 s. |
| Ctrl+C / botón rojo | Vuelve a la posición de arranque (bloqueando) y deshabilita los drivers. |
| Corte de luz | Al volver, el firmware supone que la mesa está en la posición de arranque: **llévala ahí antes de encender**. El latido trae `ultimo_seq` y el barrido sigue en `ultimo_seq + 1`. |

## 11. Pruebas en el PC

`pruebas_pc/` corre el firmware en CPython con `machine` (incluido un QMC5883P falso en el I2C), `rp2`, `network` y `ntptime` simulados:

```bash
cd firmware/pruebas_pc && python3 -m unittest prueba_logica -v
```

Prueba la rampa y el PIO; la malla (el mismo **conjunto** de puntos que `server/services/geometria.js`, que todavía recorre en raster), el orden de la serpentina con el vector del contrato y que entre puntos seguidos solo cambie un índice en ±1; la reanudación; los límites de la mesa y de la zona; la holgura por eje; el sensor (Chip ID, otros chips, rangos, promedio, DRDY, OVFL, `OSError`, fondo) y los dos formatos de envío; y el búfer con el bit de saturado. Las pruebas de `firmware_hall_1d/` usan los mismos stubs y siguen pasando (`python3 firmware_hall_1d/pruebas_pc/prueba_logica.py`).

```bash
cd firmware/pruebas_pc && PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4100 --segundos 120 --hasta-vacio
```

Corre `main.Controlador` contra un servidor de verdad (modo real y una sesión abierta), con un imán simulado en `--iman X Y Z` (mm de máquina), y al final simula un Ctrl+C. Imprime el rango de destinos de máquina que recorrió la mesa. Opciones: `--sin-wifi DESDE HASTA`, `--saturar P` (OVFL), `--hasta-vacio` e `--inicio X Y Z` (agrega `inicio_medicion` al latido, como lo hará el servidor).

Verificado el 2026-11-12 contra una MariaDB temporal y el servidor de hoy (modo «cuentas HMC»): 12 puntos (3 × 2 × 2) en el orden exacto del contrato; 147 puntos (7 × 7 × 3) con Ctrl+C a mitad de un movimiento (la mesa volvió al origen), caída de Wi-Fi, reanudación en `ultimo_seq + 1` y 3 % de OVFL (147 `seq` sin huecos ni duplicados, posiciones idénticas al contrato, saturadas con −4096); y un 401 a mitad del barrido (regreso al origen).

Verificado el 2026-11-13 con la posición de arranque y el punto de inicio (servidor actual con QMC5883P): sin `inicio_medicion`, la mesa recorrió X 0–20, Y 410→400, Z 88→78 desde (0, 410, 88); con `--inicio 100 300 50` (simula el servidor), 147 puntos en X 100–160, Y 300→240, Z 50→30, con Ctrl+C a mitad de un movimiento, reanudación y 2 % de OVFL (147 `seq` en el orden del contrato); una zona que no cabe desde (540, 410, 88) se rechazó sin mover nada y con el error en el dashboard. Siempre volvió a (0, 410, 88).

Verificado el 2026-11-14 con el descanso en (0, 562, 88), el inicio en (0, 0, 0) del servidor y X+, Y+, Z+: 147 puntos (60 × 60 × 20, paso 10) con destinos X 0–60, Y 0–60, Z 0–20 y regreso a (0, 562, 88); una zona que no cabe desde X = 380 se rechazó sin mover nada. 27 pruebas en `prueba_logica.py` (incluido el orden de los ejes).

## 12. Límites conocidos

- La hora viene de NTP con resolución de 1 s, así que `ts_ms` puede llevar hasta 1 s de error (el servidor guarda también su hora de recepción).
- La parada por el operador llega con el siguiente latido (como máximo `intervalo_latido_s`).
- La parada inmediata corta los pulsos sin rampa: la posición se estima por tiempo. Sin finales de carrera, esa estimación es la única referencia.
- Ya no hay `MODO_Z = "manual"` (botón por plano): `MODO_Z` es `"motor"` o `"ninguno"`.
- A 200 Hz de muestreo, una bobina de 50/60 Hz da lecturas falsas por aliasing: usa corriente continua.
