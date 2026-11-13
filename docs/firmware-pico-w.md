# Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS

Este documento describe cómo la **Raspberry Pi Pico W** (RP2040) envía las lecturas del magnetómetro **QMC5883P** (el módulo real; el protocolo nació para un HMC5883L) al servidor de la Raspberry Pi 5. El firmware completo (motores TB6600, homing, barrido y calibración) está en [`firmware/`](../firmware/README.md); el ejemplo anterior, en [`firmware/pico_w_cliente_ejemplo.py`](../firmware/pico_w_cliente_ejemplo.py), y el emulador que habla el mismo protocolo, en [`server/scripts/emular-pico.js`](../server/scripts/emular-pico.js).

Supuesto vigente (pendiente de confirmar): **la Pico W conoce la posición** del sensor y manda `xMM`, `yMM` y `zMM` con cada lectura.

---

## 1. Resumen del protocolo

La Pico solo hace dos peticiones HTTP, siempre con su token:

| Petición | Cuándo | Para qué |
|---|---|---|
| `POST /api/dispositivo/latido` | cada `intervalo_latido_s` (5 s por defecto) | Avisar que está viva y preguntar si hay una sesión que medir |
| `POST /api/dispositivo/mediciones` | cuando junta un lote de lecturas | Enviar las lecturas crudas |

- La URL base es `https://<servidor>/api` detrás de Nginx (producción) o `http://<ip>:4000/api` en desarrollo.
- Cabeceras: `Content-Type: application/json` y `Authorization: Bearer <TOKEN>`.
- El servidor **nunca** llama a la Pico: la Pico pregunta en cada latido. No hace falta abrir puertos en la Pico.
- Cada latido se difunde a los navegadores (evento SSE `dispositivo`), así que el dashboard muestra «Pico W en línea» mientras lleguen, en modo real y en simulación. Si el latido deja de llegar durante `umbral_desconexion_s` (15 s por defecto), muestra «Pico W sin señal hace N s».
- `estado` y `error` se guardan solo en memoria (no en la base) y se pierden al reiniciar el servidor hasta el siguiente latido.

### 1.1 Latido

```http
POST /api/dispositivo/latido
Authorization: Bearer 3rLx…Q
Content-Type: application/json

{ "firmware": "pico-tms-1.0", "rssi": -58, "uptime_s": 1234, "ts_dispositivo_ms": 1794294867727, "estado": "espera", "error": null }
```

Todos los campos son opcionales, pero si vienen deben tener el tipo correcto (422 si no):

| Campo | Tipo | Notas |
|---|---|---|
| `firmware` | texto ≤ 40 | versión del firmware; se guarda con cada sesión real (Fase 5) |
| `rssi` | entero −127..0 | intensidad de la señal Wi-Fi en dBm (`wlan.status('rssi')`) |
| `uptime_s` | entero ≥ 0 | segundos desde que arrancó la Pico |
| `ts_dispositivo_ms` | epoch en ms (UTC) | hora de la Pico ya sincronizada por NTP; `0` si todavía no sincroniza |
| `estado` | `espera`, `homing`, `midiendo` o `error` | lo que está haciendo; el dashboard lo muestra junto a «Pico W en línea» |
| `error` | texto ≤ 300 o `null` | motivo del error (zona fuera del recorrido, sensor, final de carrera…); el dashboard lo muestra como aviso |

Respuesta:

```json
{
  "ok": true,
  "modo_operacion": "real",
  "sesion_activa": {
    "id": 46, "modo": "AC", "paso_mm": 10, "medio": "solucion_salina",
    "zona_mm": { "x": 60, "y": 60, "z": 20 },
    "grid_nx": 7, "grid_ny": 7, "z_levels_mm": [0, 10, 20], "puntos_esperados": 147,
    "ultimo_seq": 0,
    "barrido": { "limite_x_mm": 60, "limite_y_mm": 60, "limite_z_mm": 20, "standoff_mm": 5, "paso_predeterminado_mm": 5 },
    "sensor":  { "modelo": "HMC5883L", "rango_ga": 1.9, "lsb_por_ga": 820, "lecturas_por_punto": 1, "offset_ut": { "x": 0, "y": 0, "z": 0 } }
  },
  "intervalo_latido_s": 5,
  "servidor_ts_ms": 1794294889858
}
```

- `sesion_activa` es `null` si no hay ninguna sesión abierta, si el sistema está en **modo simulación**, o si la sesión abierta es simulada. Mientras sea `null`, la Pico no debe enviar lecturas.
- Cuando aparece una sesión con un `id` nuevo, la Pico empieza a recorrer la malla de esa sesión: `grid_nx × grid_ny` puntos en X–Y con paso `paso_mm`, en cada plano de `z_levels_mm`, **en serpentina** (sección 7).
- **Zona de muestreo** (`zona_mm`, desde la migración 007): el operador elige en cada sesión el tamaño X × Y × Z, sin pasar de los límites de la base (`barrido.limite_*_mm`). Las coordenadas que manda la Pico son **de la zona**: `xMM` de 0 a `zona_mm.x`, `yMM` de 0 a `zona_mm.y`, `zMM` uno de `z_levels_mm` (0 = el standoff). En el simulador la zona va centrada bajo la bobina (el eje en `zona_mm.x / 2`, `zona_mm.y / 2`). En la mesa real, el firmware de `firmware/` pone la zona a partir de `ORIGEN_ZONA_*_MM` (por defecto, el origen de la mesa): `x_máquina = ORIGEN_ZONA_X_MM + xMM` (igual en Y y Z), y rechaza la sesión si no cabe en los límites de la mesa.
- `paso_mm` es **libre** (desde la migración 006): cualquier valor de 1 mm en adelante con un decimal, por ejemplo `7.5`. Las posiciones son `i × paso_mm` redondeadas a décimas (`0, 7.5, 15 … 60`); si el paso no divide la placa, el último punto queda antes del borde. Manda `zMM` exactamente como aparece en `z_levels_mm`.
- `ultimo_seq` es el mayor `seq` que el servidor ya tiene de esa sesión. Si la Pico se reinicia a mitad de una sesión, **continúa en `ultimo_seq + 1`** (no vuelve a 1).
- `sensor` es la configuración del sensor. Si `sensor.modelo` es `"QMC5883P"` (servidor adaptado), el firmware programa `sensor.rango_g` y manda cuentas crudas del QMC; si no, mide en 30 G y manda «cuentas HMC» con `sensor.lsb_por_ga` (sección 4.4).
- `servidor_ts_ms` sirve para estimar el desfase de reloj. El servidor también lo calcula y lo registra en su log (`[dispositivo] Desfase de reloj…`).

### 1.2 Lote de mediciones

```http
POST /api/dispositivo/mediciones
Authorization: Bearer 3rLx…Q
Content-Type: application/json

{
  "sesionId": 46,
  "lecturas": [
    { "seq": 1, "xMM": 0,  "yMM": 0, "zMM": 0, "raw": { "x": 12,  "y": -4,    "z": 103 }, "ts_ms": 1794294890001 },
    { "seq": 2, "xMM": 10, "yMM": 0, "zMM": 0, "raw": { "x": 25,  "y": -4096, "z": 160 }, "ts_ms": 1794294890021 }
  ]
}
```

Reglas de cada lectura:

| Campo | Regla |
|---|---|
| `seq` | entero positivo, **único dentro de la sesión**, consecutivo desde 1 (o desde `ultimo_seq + 1`) |
| `xMM`, `yMM` | número entre 0 y `zona_mm.x` / `zona_mm.y` de la sesión |
| `zMM` | uno de los `z_levels_mm` de la sesión (dependen del paso: 0, 5, 10, 15, 20 con 5 mm; 0, 10, 20 con 10 mm; 0, 20 con 20 mm) |
| `raw.x`, `raw.y`, `raw.z` | **cuentas**, según `sesion_activa.sensor.modelo`: con `QMC5883P`, cuentas crudas del QMC (enteros de −32768 a 32767; −4096 es una cuenta más); con `HMC5883L`, «cuentas HMC» de −4096 a 2047 (−4096 = desborde) |
| `saturado` | opcional (`false` por defecto), booleano: `true` si la lectura trajo OVFL (sección 4.4). Lo manda el firmware con `QMC5883P`. Con `true` (en los dos modelos) el servidor guarda bx, by, bz y \|B\| en NULL, conserva los crudos y marca `saturado = 1`. Si no es booleano, se rechaza **esa** lectura (en `rechazadas`), no el lote |
| `ts_ms` | opcional: epoch en ms (UTC) de cuando se leyó; `0` u omitido si la Pico no tiene hora |

- Máximo **200 lecturas por lote** (422 si son más). Recomendado: **20 a 50**, unos 2 a 6 kB de JSON, que caben bien en la RAM de la Pico y en una sola petición.
- La Pico manda **cuentas, no µT**: el servidor convierte con la copia del sensor de la sesión: `µT = cuentas / cuentas_por_g × 100 − offset_ut` (QMC5883P) o `µT = cuentas / lsb_por_ga × 100 − offset_ut` (HMC5883L). Así el dato crudo queda guardado y la calibración puede cambiar sin tocar el firmware.

Respuesta (200):

```json
{ "ok": true, "aceptadas": 19, "duplicadas": 1, "rechazadas": [ { "seq": 7, "error": "zMM debe ser uno de los planos de la sesión: 0, 10, 20 mm (recibido: 5)" } ] }
```

- `duplicadas`: lecturas cuyo `seq` ya estaba guardado (o repetido en el mismo lote). No es un error: es lo que pasa al reintentar.
- `rechazadas`: lecturas inválidas, con el motivo. El resto del lote sí se guarda. No tiene sentido reintentar una rechazada.

### 1.3 Códigos de error

| Código | Significado | Qué hace la Pico |
|---|---|---|
| 400 | el cuerpo no es JSON o faltan `sesionId` / `lecturas` | corregir el firmware |
| 401 | token ausente, inválido o dispositivo desactivado | dejar de enviar y avisar (LED); hay que generar otro token |
| 404 | la sesión no existe | descartar el lote |
| 409 | modo simulación, sesión cerrada o sesión simulada | descartar el lote y esperar el siguiente latido |
| 422 | más de 200 lecturas, lote vacío o `sesionId` inválido | partir el lote / corregir |
| 5xx o sin red | error del servidor o de la red | **reintentar el mismo lote** (mismos `seq`) con espera creciente |

---

## 2. Idempotencia, búfer y reintentos

El servidor guarda cada lectura una sola vez por `(sesion_id, seq)` (índice `UNIQUE`). Por eso la Pico puede reenviar un lote cuantas veces haga falta sin duplicar filas:

1. Lee el sensor y guarda la lectura en un **búfer circular en RAM** con su `seq` ya asignado.
2. Cuando el búfer tiene un lote (por ejemplo 20 lecturas), lo envía.
3. Si la respuesta es 200, quita esas lecturas del búfer.
4. Si no hay red, hay timeout o un 5xx, **no** las quita: vuelve a enviar **las mismas** (mismos `seq`) tras 0,25 s, 0,5 s, 1 s, 2 s, 4 s… (tope de 4 a 10 s).
5. Mientras tanto sigue midiendo y llenando el búfer. Si se llena, conviene **pausar el barrido** (no mover la mesa) en vez de descartar lecturas.

Con un búfer de 1000 lecturas (unos 40 kB) la Pico aguanta varios segundos sin red. El emulador prueba exactamente esto con `--perdida 0.3 --duplicar 0.2`, y el servidor termina con todos los `seq` una sola vez.

---

## 3. El token del dispositivo

1. Un **admin** entra al dashboard, pone el sistema en modo **Real** y, en el panel **Pico W — token del dispositivo** (en la Fase 6 pasa a *Configuración › Dispositivo*), pulsa **Generar token**. También se puede con la API:

   ```bash
   curl -k -b cookies.txt -X POST https://<servidor>/api/dispositivo/token
   ```

2. El token se muestra **una sola vez**. En la base solo queda su SHA-256. Si se pierde, se genera otro (el anterior deja de funcionar al instante).
3. En la Pico, el token va en un archivo aparte que **no se sube a git**, por ejemplo `secretos.py`:

   ```python
   WIFI_SSID = "iPhone de …"
   WIFI_PASSWORD = "…"
   TOKEN = "3rLx…Q"
   SERVIDOR = "https://192.168.1.50"    # ver la sección 6
   ```

4. Para revocarlo: `DELETE /api/dispositivo/token` (admin), o desactivar el dispositivo con `PATCH /api/dispositivo {"activo": false}`. En los dos casos la Pico recibe 401.

---

## 4. El sensor: QMC5883P

El módulo real es un **QMC5883P** (I2C 0x2C), no el HMC5883L con el que se escribió este protocolo. La ficha completa (conexión, registros, rangos, medición y problemas comunes) está en [docs/sensor-qmc5883p.md](sensor-qmc5883p.md); el firmware que lo usa, en [`firmware/sensor.py`](../firmware/sensor.py).

### 4.1 Verificar el chip

Conexión: SDA → GP0 (pin 1), SCL → GP1 (pin 2), VCC → 3V3(OUT) (pin 36), GND → pin 38; I2C0 a 100 kHz.

```python
from machine import I2C, Pin
i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=100_000)
print([hex(d) for d in i2c.scan()])          # ['0x2c'] → QMC5883P
print(hex(i2c.readfrom_mem(0x2C, 0x00, 1)[0]))   # Chip ID: 0x80
# 0x1e sería un HMC5883L y 0xd un QMC5883L: otros chips y otros registros
```

### 4.2 Configuración y rangos

`0x29 ← 0x06` (signo de los ejes), `0x0B ← bits << 2` (rango), `0x0A ← 0xCD` (modo normal, 200 Hz) y 20 ms. Sin escribir `0x0A`, todo vale 0.

| Rango | Bits (0x0B, 3–2) | Cuentas por gauss | Máximo |
|---|---|---|---|
| 30 G | 0 | 1000 | ±3000 µT |
| 12 G | 1 | 2500 | ±1200 µT |
| 8 G | 2 | 3750 | ±800 µT |
| 2 G | 3 | 15000 | ±200 µT |

### 4.3 Lectura: X, Y, Z, byte bajo primero

```python
import struct
while not i2c.readfrom_mem(0x2C, 0x09, 1)[0] & 0x01:     # DRDY (límite de 100 ms)
    pass
estado = i2c.readfrom_mem(0x2C, 0x09, 1)[0]
x, y, z = struct.unpack('<hhh', i2c.readfrom_mem(0x2C, 0x01, 6))
saturado = bool(estado & 0x02)                            # OVFL
```

El firmware promedia `PROMEDIO_QMC` lecturas (10); si alguna trae OVFL, la medición entera es saturada. Ante un `OSError` reinicia el chip una vez.

### 4.4 Cómo llegan las lecturas al servidor

El firmware elige el formato con `sesion_activa.sensor.modelo`:

- **`"QMC5883P"`** (el modelo por defecto desde la migración 008): rango `sensor.rango_g`; `raw` = cuentas crudas del QMC (−32768..32767) y `"saturado": true|false` en cada lectura. El servidor convierte con `µT = cuentas / cuentas_por_g × 100 − offset_ut`.
- **Otro valor** (`"HMC5883L"`, el que espera el firmware del Hall 49E): rango 30 G; la Pico pasa a µT y de ahí a «cuentas HMC» = `round(µT × lsb_por_ga / 100)`. Si hubo OVFL o no cabe en −2048..2047, manda −4096 en los tres ejes y el servidor la guarda como saturada. El rango queda limitado a ±(2047 / `lsb_por_ga` × 100) µT: ±249,6 µT con 1,9 Ga.

En los dos casos el servidor resta `offset_ut`. El fondo (Tierra + entorno) lo mide la Pico al arrancar, con la bobina apagada, y lo imprime para copiarlo en Configuración › Sensor › offset; la Pico solo lo resta ella misma si `RESTAR_FONDO_EN_PICO = True`.

### 4.5 Validar los ejes con un imán

1. Con el sensor quieto y sin imanes cerca, el fondo debe dar unos 25 a 65 µT de |B|.
2. Acerca un imán por el lado +X del módulo (serigrafiado): Bx debe crecer mucho mientras By y Bz cambian poco. Repite con Y y con Z (Z es perpendicular a la placa).
3. Invierte el imán: el signo del eje correspondiente debe invertirse.
4. **El imán no debe tocar el módulo** (su níquel provoca cortos en el bus).

---

## 5. Hora: NTP al arrancar

- Al conectarse al Wi-Fi, la Pico sincroniza su reloj con `ntptime.settime()` (UTC). El hotspot del iPhone tiene salida a internet, así que `pool.ntp.org` funciona.
- Con la hora sincronizada, `ts_ms = (time.time() + DESFASE_EPOCH) * 1000`, donde en MicroPython `time.time()` cuenta desde el 1 de enero de 2000 (`DESFASE_EPOCH = 946684800`) en las versiones que no usan la época de Unix. El ejemplo lo resuelve con `time.gmtime(0)`.
- Si NTP falla, se manda `ts_ms: 0`: el servidor usa su propia hora de recepción (`timestamp`) y deja `ts_dispositivo` vacío. Conviene reintentar NTP cada pocos minutos.
- Resincronizar una vez por hora mantiene el desfase bajo; el servidor registra el desfase en su log en cada latido que cambie más de 1 s.

---

## 6. Encontrar el servidor en el hotspot del iPhone

El hotspot del iPhone reparte direcciones 172.20.10.x y **puede cambiar la IP de la Raspberry Pi 5** de una sesión a otra. Opciones, de la más simple a la más cómoda:

1. **IP fija en `secretos.py`** y revisarla antes de cada sesión (`hostname -I` en la Raspberry). Es lo más simple y lo que usa el ejemplo.
2. **mDNS:** la Raspberry anuncia su nombre de host con Avahi como `<nombre-de-host>.local` (por ejemplo `raspberrypi.local`). MicroPython en la Pico W **no resuelve `.local`** de forma nativa en todas las versiones; si la versión instalada no lo resuelve, se usa la opción 1.
3. **Probar varias IP**: el firmware puede guardar una lista y usar la primera que responda al latido.

Con HTTPS y el certificado autofirmado de Nginx, `urequests` no verifica el certificado por defecto (no valida la cadena), así que funciona; la autenticación la da el token. En una red de confianza también se puede usar `http://<ip>:4000/api` directamente, pero **solo si** el backend escucha en esa interfaz (por defecto escucha solo en 127.0.0.1, detrás de Nginx).

---

## 7. Orden del barrido: serpentina

El firmware de `firmware/` recorre la malla en **serpentina** continua: X avanza hasta el máximo, Y sube un paso y X regresa midiendo, y así hasta terminar el plano; Z sube un paso y el plano siguiente se recorre desde donde quedó la mesa (Y también va y viene). Entre dos puntos seguidos solo cambia un índice en ±1, y la mesa solo vuelve al origen al terminar la sesión.

**Contrato del orden** (el mismo que usan el servidor, el simulador, el emulador y la gráfica de líneas desde el 2026-11-12). Con `nx = grid_nx`, `ny = grid_ny` y `k` = índice del punto (0..total − 1):

```
iz   = k // (nx·ny)
r    = k %  (nx·ny)
fila = r // nx
iy   = fila            si iz es par;  ny − 1 − fila     si iz es impar
g    = iz·ny + fila                   (número global de fila)
ix   = r % nx          si g es par;   nx − 1 − (r % nx) si g es impar
punto = (ix·paso, iy·paso, z_levels_mm[iz])   (redondeado a décimas)
```

Vector de prueba con `nx = 3`, `ny = 2` y dos planos (k = 0..11), en índices (ix, iy, iz):
(0,0,0) (1,0,0) (2,0,0) (2,1,0) (1,1,0) (0,1,0) (0,1,1) (1,1,1) (2,1,1) (2,0,1) (1,0,1) (0,0,1).

Con una lectura por punto, `seq − 1` es el índice del punto en la serpentina; con `lecturas_por_punto = N`, el `seq` s es la lectura `(s − 1) % N` del punto `(s − 1) // N`. Así, tras un reinicio, la Pico sigue en `ultimo_seq + 1` en el punto exacto.

El servidor (`services/geometria.js`: `puntoDeMalla`, `indiceDeMalla`), el simulador, `emular-pico.js` y la gráfica de líneas del dashboard (`indiceEnMalla`) usan este mismo orden. La ingesta y los huecos no dependen del orden: el servidor valida cada lectura con su `xMM`, `yMM`, `zMM` y su `seq`, y calcula los huecos por posición (los lista en el orden de la serpentina).

Si `lecturas_por_punto` es mayor que 1, la Pico manda varias lecturas con la misma posición y `seq` distintos (pendiente de decidir si se promedian en la Pico o en el servidor).

---

## 8. Probar sin hardware

```bash
cd server
npm run emular-pico -- --token <TOKEN> --url http://127.0.0.1:4000/api --perdida 0.3 --duplicar 0.2 --saturar 0.02
```

Opciones: `--lote`, `--ms-por-lectura`, `--perdida`, `--duplicar`, `--saturar`, `--sin-latido-a-los N`, `--semilla` e `--insecure` (para el certificado autofirmado). Detalles en el encabezado del script.
