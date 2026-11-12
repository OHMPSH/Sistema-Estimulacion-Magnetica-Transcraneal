# Firmware de prueba: Pico W + sensor Hall 49E (un eje)

Copia del firmware de [`../firmware/`](../firmware/) para probar la conexión con el servidor, el movimiento de la mesa y la medición con un **sensor Hall 49E** de un solo eje (la altura, Z). El firmware original y las pruebas del HMC5883L siguen intactos en `firmware/`.

## 1. Archivos

| Archivo | Qué es |
|---|---|
| `main.py` | Bucle principal (latido, sesión, barrido, lotes). Adaptado: Hall, drivers siempre habilitados, regreso al origen al detener, sin reinicios. |
| `config.py` | **Lo que se ajusta**: límites, factores de los motores, sensor, unidad de envío. |
| `sensor_hall.py` | **Nuevo**: lee el 49E en GP26/ADC0, calibra el cero y convierte el campo a las «cuentas» que entiende el servidor. |
| `barrido.py` | Recorrido de la malla. Adaptado: la zona empieza en el origen y se valida contra los límites antes de mover nada. |
| `banco.py` | Prueba de banco sin servidor (Hall y motores desde la consola de Thonny). |
| `motores.py`, `red.py`, `cliente.py`, `led.py`, `registro.py` | Copias sin cambios del firmware original. |
| `secretos_ejemplo.py` | Plantilla de `secretos.py` (Wi-Fi, token y URL del servidor). |
| `pruebas_pc/` | Pruebas en el PC: `prueba_logica.py` (límites, conversión) y `ejecutar_pc.py` (firmware completo contra un servidor). |

## 2. Conexiones

**Sensor Hall 49E** (cara rotulada hacia ti, patas abajo, de izquierda a derecha):

| Pata | Pico W | Pin físico |
|---|---|---|
| 1 · VCC | 3V3(OUT) | 36 |
| 2 · GND | AGND | 33 |
| 3 · OUT | GP26 / ADC0 | 31 |

Con 3,3 V, nunca con 5 V. El campo que mide es el perpendicular a la cara rotulada: para medir la altura (Z), la cara debe quedar horizontal.

**Motores**: los mismos pines de `prueba_calibracion.py` (X: PUL GP10 / DIR GP11; Y: GP12 / GP13; Z: GP14 / GP15; ENA común GP16). No hay finales de carrera.

## 3. Origen y límites

- El **origen (0, 0, 0)** es la posición de la mesa **cuando arranca el programa**. Antes de ejecutarlo, deja la mesa en el mismo origen que usaste con `prueba_calibracion.py`.
- La mesa nunca sale de **X 0–410, Y 0–562, Z 0–88 mm** (`LIMITE_*_MM` en `config.py`). Un movimiento fuera se rechaza antes de dar un pulso, y una sesión cuya zona no cabe se rechaza entera (se ve el error en el dashboard).
- La zona de la sesión empieza en `ORIGEN_ZONA_*_MM` (por defecto, el origen): el punto (0, 0, 0) de la sesión es el origen de la mesa.
- Al terminar una sesión, al detenerla en el dashboard, ante un error y al detener el programa (**Ctrl+C o el botón rojo de Thonny**), la mesa **vuelve al origen** y luego se deshabilitan los drivers. Un segundo Ctrl+C interrumpe ese regreso; en ese caso, regresa la mesa a mano antes de volver a ejecutar.
- Los drivers quedan habilitados mientras corre el programa, para que nadie mueva la mesa a mano y se pierda el origen.
- Si cambiaste los factores (pulsos por mm) o las inversiones en `prueba_calibracion.py`, cópialos a `EJE_X`, `EJE_Y` y `EJE_Z` de `config.py`.

## 4. Cómo llega el campo al servidor (`UNIDAD_ENVIO`)

El servidor solo acepta las «cuentas» del HMC5883L (de −4096 a 2047) y las convierte a µT con la ganancia de Configuración › Sensor (1,9 Ga por defecto: ±249,6 µT). El Hall mide decenas de mT, así que en µT reales todo saldría saturado.

- `UNIDAD_ENVIO = "mT"` (por defecto): **el número que muestra el dashboard (rotulado µT) son mT**. Con 1,9 Ga cubre ±249,6 mT, con pasos de 0,12 mT, parecidos a la resolución del ADC de la Pico (≈ 0,09 mT). Bx y By valen 0.
- `UNIDAD_ENVIO = "uT"`: µT reales, solo para campos de menos de ±249,6 µT (±890 µT con 8,1 Ga).

Lo que pase del rango, o con la salida del sensor pegada a 0 V o a 3,3 V, se guarda como **saturado**. Anota en las notas de cada sesión que es del Hall y en mT.

El cero se calibra al arrancar (2 s sin imanes ni bobina encendida). En espera (sin sesión), el botón **BOOTSEL** lo vuelve a calibrar.

## 5. Conexión con el servidor (la laptop)

La Pico W **no** se conecta a la laptop por USB para mandar datos: lo hace por **Wi-Fi**, con peticiones HTTP al backend:

- cada 5 s, `POST /api/dispositivo/latido` (le dice al servidor que está en línea y recibe la sesión abierta, si la hay);
- durante un barrido, `POST /api/dispositivo/mediciones` con lotes de 25 lecturas.

Cada petición lleva el **token** del dispositivo. Por eso necesita tres cosas en `secretos.py`:

1. **Wi-Fi**: `WIFI_SSID` y `WIFI_PASSWORD` de la **misma red a la que está conectada la laptop**. La Pico W solo usa redes de 2,4 GHz. Con el hotspot del iPhone, activa «Maximizar compatibilidad».
2. **Servidor**: `SERVIDOR = "http://<IP de la laptop>:4000"`. La IP se ve con `hostname -I` (la primera). Cambia si cambias de red.
3. **Token**: en el dashboard, como admin, Configuración › Dispositivo › Generar token. Se muestra una sola vez; si lo pierdes, genera otro (el anterior deja de servir).

El backend por defecto solo escucha en `127.0.0.1` (la propia laptop), así que la Pico no lo alcanza. **Sin cambiar ningún archivo**, arráncalo así para que escuche en la red:

```bash
cd server && HOST=0.0.0.0 npm run dev
```

El frontend sigue igual (`cd frontend && npm run dev`, en `http://localhost:5173`). Para comprobar que la laptop es alcanzable desde la red, abre `http://<IP de la laptop>:4000/api/status` en el teléfono. Si no carga y tienes cortafuegos (`ufw`), permite el puerto: `sudo ufw allow 4000/tcp`.

Sin internet, el reloj NTP de la Pico falla y lo reintenta cada minuto; no pasa nada: las lecturas llevan la hora del servidor.

## 6. Primera prueba, paso a paso

1. Copia `secretos_ejemplo.py` como `secretos.py` y complétalo (sección 5).
2. Copia **todos** los `.py` de esta carpeta (menos `pruebas_pc/`) a la Pico con Thonny. Sobrescriben los del firmware original que tenga la Pico; el original sigue en `firmware/`.
3. En la laptop: `HOST=0.0.0.0 npm run dev` en `server/` y `npm run dev` en `frontend/`.
4. En el dashboard, como admin: menú lateral → modo **Real**; Configuración › Dispositivo → genera el token y pégalo en `secretos.py` de la Pico.
5. Deja la mesa en el origen y ejecuta `main.py` en Thonny (F5). En la consola debe salir `Hall: cero …`, `Wi-Fi: conectado, IP …` y `Latido: servidor en línea (modo real)`. El LED queda fijo y la barra superior del dashboard muestra la Pico «en línea».
6. Inicia una sesión pequeña, por ejemplo zona 40 × 40 × 10 mm con paso 10 mm (5 × 5 × 2 = 50 puntos). La Pico la recibe en el siguiente latido, recorre la malla, imprime cada lectura (`Bz … mT`) y las gráficas se llenan.
7. Al terminar, la mesa vuelve al origen. **Cierra la sesión** en el dashboard (las sesiones reales no se cierran solas).

Para zonas más grandes que 60 × 60 × 20 mm, un admin debe subir los límites de la base en Configuración › Barrido (hasta 410, 562 y 88 mm). Una zona de 410 × 562 × 88 con paso de 20 mm son 21 × 29 × 5 = 3045 puntos.

## 7. Prueba sin servidor (`banco.py`)

Con `main.py` detenido y la mesa en el origen, en la consola de Thonny:

```python
>>> import banco
>>> banco.hall()                 # cero + 10 lecturas
>>> banco.ir(100, 50, 10)        # mm de máquina, con los mismos límites
>>> banco.prueba(nx=3, ny=3, paso=10)
>>> banco.apagar()               # vuelve al origen y deshabilita los drivers
```

## 8. Pruebas en el PC

```bash
python3 firmware_hall_1d/pruebas_pc/prueba_logica.py
```

`ejecutar_pc.py` corre el firmware completo contra un servidor real con motores, Wi-Fi y Hall simulados (un imán falso). Se verificó el 2026-11-11 contra una MariaDB temporal: 50 puntos sin huecos, `bz` guardado igual que el medido (38,47 mT → 38,41 por el paso de las cuentas), regreso al origen al completar y con Ctrl+C a mitad del barrido. **Sin probar todavía en la Pico con la mesa.**
