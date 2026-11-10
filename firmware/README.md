# Firmware de la Raspberry Pi Pico W (MicroPython)

Firmware de la Pico W para el sistema TMS. Mueve la mesa (NEMA 17 con drivers TB6600), lee el HMC5883L y habla con el servidor con el protocolo de [docs/firmware-pico-w.md](../docs/firmware-pico-w.md): latido, sesión activa y lotes de lecturas crudas.

> **Estado:** probado en el PC contra el servidor real (con motores, sensor y Wi-Fi simulados, ver la sección 9). **Todavía no se ha probado en la Pico ni con la mesa.** Haz la prueba de banco (sección 6) antes de conectarlo al servidor.

---

## 1. Archivos

| Archivo | Qué hace |
|---|---|
| `config.py` | Pines, mecánica, calibración, velocidades y tiempos. Los valores marcados **PENDIENTE** dependen del montaje. |
| `secretos.py` | Wi-Fi, token y URL del servidor. **No se sube a git** (está en `.gitignore`). Se crea a partir de `secretos_ejemplo.py`. |
| `main.py` | Bucle principal: watchdog, latido, sesiones, envío de lotes y LED. Arranca solo al encender. |
| `red.py` | Wi-Fi (reconecta sin detener el barrido) y hora por NTP. |
| `cliente.py` | Latido, búfer circular de lecturas en RAM y envío por lotes con reintentos. |
| `sensor.py` | HMC5883L: escaneo I2C, identificación, ganancia y lectura (orden X, Z, Y). |
| `motores.py` | Ejes con PIO + DMA (los pulsos los genera el hardware), rampa trapezoidal, finales de carrera y homing. |
| `barrido.py` | Malla de la sesión, coordenadas de zona → máquina, verificación del recorrido y reanudación. |
| `led.py` | Patrones del LED de la placa. |
| `registro.py` | Log por la consola USB con la hora UTC. |
| `banco.py` | Prueba de banco y calibración **sin servidor**. |
| `prueba_calibracion.py` | Programa independiente para Thonny: pide X, Y, Z en mm, mueve la mesa y regresa al origen con «1». Sirve para calibrar los pasos por mm de cada eje. Instructivo completo (con las conexiones de los TB6600) en [docs/instructivo-calibracion-y-conexiones.md](../docs/instructivo-calibracion-y-conexiones.md). |
| `pruebas_pc/` | Pruebas en el PC (no se copian a la Pico). |
| `pico_w_cliente_ejemplo.py` | El ejemplo anterior, solo de referencia (no se copia a la Pico). |

## 2. Cableado

> El instructivo detallado, con cada borne de los tres TB6600 y su pin físico de la Pico, está en [docs/instructivo-calibracion-y-conexiones.md](../docs/instructivo-calibracion-y-conexiones.md).

### 2.1 Pines por defecto (cámbialos en `config.py`)

| Señal | GPIO | Notas |
|---|---|---|
| HMC5883L SDA / SCL | GP4 / GP5 (I2C0) | VCC a 3V3 (pin 36), GND común. El GY-271 ya trae resistencias de pull-up. |
| X PUL+ / DIR+ | GP10 / GP11 | |
| Y PUL+ / DIR+ | GP12 / GP13 | |
| Z PUL+ / DIR+ | GP14 / GP15 | Solo con `MODO_Z = "motor"` |
| ENA+ (los tres TB6600) | GP16 | Un solo pin para los tres drivers |
| Final X− / Y− / Z− | GP18 / GP19 / GP20 | Interruptor entre el GPIO y GND (pull-up interno) |
| Botón Z | GP21 | Solo con `MODO_Z = "manual"`; a GND |
| LED de estado | el de la placa | |

### 2.2 TB6600

- **Cátodo común:** `PUL−`, `DIR−` y `ENA−` de los tres drivers a un **GND de la Pico**; `PUL+`, `DIR+` y `ENA+` a los GPIO. Así, un GPIO en alto enciende el optoacoplador. Con este cableado, `ENA+` en alto **deshabilita** el driver (`ENA_HABILITADO = 0` en `config.py`).
- Los optoacopladores del TB6600 están pensados para 5 V. Con los 3,3 V de la Pico suelen funcionar (el firmware pone los pines de PUL y DIR en 12 mA). Si un motor pierde pasos o no se mueve, pon un búfer 74HCT245 alimentado a 5 V entre la Pico y los drivers.
- **Micropasos** (interruptores SW1–SW3): el mismo valor que `MICROPASOS` en `config.py` (1/8 por defecto). Con un T8 de 8 mm por vuelta, 1/8 da 200 micropasos por mm (0,005 mm por micropaso).
- **Corriente** (SW4–SW6): la nominal del motor o un poco menos (por ejemplo, 1,5 A para un NEMA 17 de 1,7 A).
- La fuente de los motores (12–24 V) va solo a `VCC`/`GND` de los TB6600. La Pico se alimenta por USB o por VSYS.

### 2.3 Finales de carrera

Recomendado: **normalmente cerrados (NC)** entre el GPIO y GND, con `final_nc = True`. En reposo el pin lee 0; al pulsarlo (o si se corta un cable) lee 1, y el firmware lo toma como tocado. Esa es la opción segura. Si no hay final en un eje, pon `"final": None`: el homing de ese eje vuelve a la posición en que estaba al encender, así que **hay que encender la Pico con la mesa en el origen**.

## 3. Instalar MicroPython

1. Descarga el firmware **Raspberry Pi Pico W** (no Pico 2 W) de micropython.org, **versión 1.22 o posterior** (hace falta `rp2.DMA`; con una versión anterior los movimientos bloquean el programa y el firmware lo avisa en la consola).
2. Conecta la Pico con **BOOTSEL** pulsado, suelta el botón y arrastra el `.uf2` a la unidad `RPI-RP2`.

## 4. Cargar los archivos

Primero crea `secretos.py` a partir de `secretos_ejemplo.py`, con el SSID y la contraseña del hotspot, el token (Configuración › Dispositivo › Generar token, se muestra una sola vez) y la URL del servidor, por ejemplo `https://172.20.10.2`.

### Con mpremote

```bash
pip install --user mpremote
```

```bash
cd firmware && mpremote connect auto cp config.py secretos.py registro.py red.py cliente.py sensor.py motores.py barrido.py led.py banco.py main.py :
```

```bash
mpremote connect auto reset
```

```bash
mpremote connect auto repl
```

### Con Thonny

1. *Herramientas › Opciones › Intérprete:* «MicroPython (Raspberry Pi Pico)».
2. *Ver › Archivos.* En el panel del equipo, abre la carpeta `firmware/`, selecciona los 11 archivos de la lista de arriba y elige *Subir a /*.
3. Pulsa *Detener/Reiniciar* para que arranque `main.py`.

### Detener el firmware para editar

El **watchdog viene apagado** (`USAR_WATCHDOG = False`): puedes detener el programa con Ctrl+C o con el botón de Thonny y la Pico se queda quieta, sin reiniciarse. Si algún día lo activas (`True`), ten en cuenta que el del RP2040 no se puede apagar: al detener el programa, la Pico se reinicia a los 8 s. A cambio, si el firmware se cuelga sin nadie cerca, se reinicia solo y retoma la sesión.

Para que el firmware no arranque al encender, pulsa **BOOTSEL** durante los 3 primeros segundos: el log dice «BOOTSEL pulsado».

## 5. Calibración

Todo se hace desde la consola (Thonny o `mpremote repl`) con el firmware detenido (ver arriba) y `import banco`.

### 5.1 Sensor

```python
>>> import banco
>>> banco.sensor()
```

Debe decir `I2C: 0x1E` y dar lecturas de unas decenas de µT (el campo de la Tierra). Si encuentra `0x0D`, el módulo trae un **QMC5883L** y este firmware no sirve tal cual. Comprueba los ejes con un imán como dice [docs/firmware-pico-w.md](../docs/firmware-pico-w.md), sección 4.4.

### 5.2 Sentido de los ejes y homing

1. `banco.mover("x", 5)`: la mesa debe alejarse del final X−. Si va hacia él, pon `"invertir": True` en `EJE_X`. Repite con Y y Z.
2. Pulsa a mano cada final de carrera y comprueba que el eje correspondiente lo detecta: `banco._m().x.final_activo()` debe pasar de `False` a `True`.
3. `banco.homing()`: cada eje va rápido al final, retrocede, se acerca lento y se separa `HOMING_SEPARACION_MM` (1 mm). Ese punto es el **origen (0, 0, 0)**: `banco.posicion()` debe dar `X=0.000 Y=0.000 Z=0.000`.

### 5.3 Pasos por milímetro

1. `banco.homing()` y marca la posición de la mesa (o pon a cero un calibrador o un reloj comparador).
2. `banco.pasos("x", 8000)`: con 200 micropasos/mm, son 40 mm teóricos.
3. Mide lo que avanzó de verdad, `d` en mm. Entonces `pasos_por_mm = 8000 / d`. Escríbelo en `EJE_X["pasos_por_mm"]` (por ejemplo `"pasos_por_mm": 199.2`).
4. Repite en sentido contrario (`banco.pasos("x", -8000)`) y en Y y Z. Si la ida y la vuelta difieren más de 0,1 mm, hay juego en la tuerca: sube `HOLGURA_MM` (el firmware llega siempre a cada punto en sentido +).
5. Comprueba la repetibilidad: `banco.ir(10, 10)`, `banco.ir(60, 60)`, `banco.ir(10, 10)` varias veces; la diferencia debe quedar muy por debajo de ±1 mm.

### 5.4 Posición de la bobina y del plano z = 0

1. Marca el centro de la bobina sobre la base (o usa el hotspot del phantom).
2. Después de `banco.homing()`, lleva el sensor justo debajo con `banco.ir(x, y)` hasta que el elemento sensor (el chip, no el borde del módulo) quede sobre la marca. `banco.posicion()` da las coordenadas de máquina: escríbelas como `X_BOBINA_MM` y `Y_BOBINA_MM`.
3. Si se puede alimentar la bobina con corriente continua, afina con el campo: `banco.prueba(nx=5, ny=5, paso=2)` y busca el punto donde Bx y By cambian de signo (en el eje de la bobina las componentes horizontales valen cero).
4. Con Z, mueve con `banco.mover("z", …)` hasta que la separación entre bobina y sensor sea el standoff (5 mm, con una galga). Esa posición es `Z_CERO_MM` (0 si el origen de Z ya está en el standoff).
5. `banco.centro()` vuelve a ese punto para comprobarlo.

### 5.5 Recorrido útil

`recorrido_mm` de cada eje es la mayor posición de máquina que se puede alcanzar sin chocar, con 1 o 2 mm de margen. Antes de cada sesión el firmware comprueba que la zona entera cabe:

- X: de `X_BOBINA_MM − zona.x/2` a `X_BOBINA_MM + zona.x/2`, dentro de `MARGEN_ORIGEN_MM` (0) … `recorrido_mm` (igual en Y);
- Z: de `Z_CERO_MM` a `Z_CERO_MM + z máximo`, dentro de `EJE_Z["recorrido_mm"]`.

Para que cualquier zona que acepte el dashboard quepa, los **límites de la base** (Configuración › Barrido: `limite_x_mm`, `limite_y_mm`, `limite_z_mm`) deben cumplir lo mismo. Si no cabe, el firmware no mueve nada, escribe el motivo en la consola, pone el LED en error y lo informa al servidor: el dashboard muestra un aviso amarillo con el motivo.

### 5.6 Velocidad

`VEL_MAX_MM_S = 20` y `ACEL_MM_S2 = 100` son conservadores. Si un motor vibra o pierde pasos, bájalos; si todo va bien, se pueden subir poco a poco. El firmware nunca pasa de `FRECUENCIA_MAX_HZ` (15 kHz; el TB6600 admite unos 20 kHz).

## 6. Prueba de banco (sin servidor)

```python
>>> import banco
>>> banco.prueba(nx=3, ny=3, paso=5, planos=(0,))
```

Hace homing, recorre una malla de 3 × 3 puntos (10 × 10 mm) centrada bajo la bobina, espera `ASENTAMIENTO_MS` en cada punto, imprime cada lectura (posición de la zona, cuentas crudas y µT con 1,9 Ga) y vuelve al origen. Con `planos=(0, 5)` prueba también el eje Z, y con `lecturas=3` varias lecturas por punto. Al terminar, `banco.apagar()` deshabilita los drivers.

## 7. Primera prueba con el servidor: 2 × 2 × 1 puntos

1. En el dashboard, como admin: modo de operación **Real** y token generado (cópialo en `secretos.py`).
2. Enciende la Pico conectada por USB y abre la consola. El LED parpadea desde que se alimenta. La consola debe decir «Wi-Fi: conectado» y «Latido: servidor en línea»; en ese momento **el LED queda fijo** y en la barra del dashboard aparece «Pico W en línea · volviendo al origen» (el homing del arranque) y luego «en espera». La Pico aparece en línea en los dos modos, simulación y real.
3. Inicia una sesión con **paso 10 mm** y **zona 10 × 10 × 0 mm**: son 2 × 2 × 1 = 4 puntos.
4. La consola muestra la sesión, el avance y «Lote 1–4: aceptadas 4». El dashboard dibuja los 4 puntos.
5. El firmware dice «malla completa», vuelve al origen (0, 0, 0) y apaga los drivers. **Cierra la sesión** en el dashboard (las sesiones reales no se cierran solas).
6. Prueba también **Detener** a mitad de una sesión más grande: la mesa se detiene en cuanto llega el siguiente latido (como máximo `intervalo_latido_s`, 5 s por defecto) y vuelve al origen (0, 0, 0).
7. Si todo va bien, un barrido completo: paso 5 mm, toda la base (845 puntos; entre 10 y 20 minutos con los tiempos por defecto).

## 8. LED y comportamiento ante fallas

| LED | Estado |
|---|---|
| Parpadeo rápido (5 Hz) | Desde que se alimenta hasta que el servidor responde; también si se pierde el Wi-Fi o el servidor |
| **Fijo** | Conectada al servidor (en espera, volviendo al origen o midiendo) |
| Tres destellos y pausa | Error: zona fuera del recorrido, sensor, final de carrera inesperado o homing fallido (el motivo está en la consola y en el dashboard) |
| Parpadeo lento (1 Hz) | 401: token inválido o dispositivo desactivado |

En el dashboard, la barra superior muestra «Pico W en línea · en espera / volviendo al origen / midiendo / con error» (punto verde, o amarillo con error) o «sin señal hace N s» (punto rojo). Si la Pico informa un error, aparece además un aviso con el motivo, y Configuración › Dispositivo lo muestra en «Error informado».

| Situación | Qué hace el firmware |
|---|---|
| Se cae el Wi-Fi | Sigue midiendo; guarda hasta `MAX_BUFER` (1000) lecturas en RAM. Si se llena, pausa el barrido. Al volver la red, reenvía los mismos `seq`. |
| 5xx o timeout | Reintenta el mismo lote a los 0,25, 0,5, 1, 2, 4 y 8 s. |
| `sesion_activa = null` o 404/409 en un lote | Para los motores al instante, descarta lo pendiente y vuelve al origen (0, 0, 0). |
| Malla completa | Vuelve al origen (0, 0, 0) y apaga los drivers. |
| 401 | Para todo, apaga los drivers y deja el LED fijo. Vuelve a probar el latido cada 30 s (por si el admin reactiva el dispositivo). |
| Reinicio (corte de luz, o el watchdog si se activó) | Al volver, el latido trae `ultimo_seq`: homing y sigue en `ultimo_seq + 1`, en el punto y la lectura exactos. |
| Final de carrera o sensor durante el barrido | Parada inmediata, vuelve al origen, LED de error y aviso en el dashboard. No reintenta esa sesión. |
| La zona no cabe | No mueve nada; LED de error hasta que se cierra la sesión. |

## 9. Pruebas en el PC

`pruebas_pc/` corre el firmware en CPython con `machine`, `rp2`, `network` y `ntptime` simulados:

```bash
cd firmware/pruebas_pc && python3 -m unittest prueba_logica -v
```

Prueba la rampa, la codificación de las palabras del PIO, la malla (comparada punto por punto con `server/services/geometria.js`), la reanudación, la verificación de la zona y el búfer circular.

```bash
cd firmware/pruebas_pc && PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4000 --segundos 120 --sin-wifi 20 30
```

Corre `main.Controlador` contra un servidor de verdad (modo real y una sesión abierta). Opciones: `--sin-wifi DESDE HASTA`, `--saturar P`, `--recorrido-x MM` y `--hasta-vacio`.

## 10. Límites conocidos

- La hora viene de NTP con resolución de 1 s, así que `ts_ms` puede llevar hasta 1 s de error (el servidor guarda también su propia hora de recepción).
- La parada por el operador llega con el siguiente latido. Para que sea más rápida, baja `intervalo_latido_s` en Configuración › Dispositivo (por ejemplo, a 2 s).
- La parada inmediata corta los pulsos sin rampa: la posición se estima por tiempo y después se hace homing. Sin finales de carrera, esa estimación es la única referencia.
- Con `MODO_Z = "manual"`, el barrido espera el botón en cada cambio de plano (y al empezar, si el primer plano no es z = 0).
