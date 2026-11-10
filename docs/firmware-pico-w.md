# Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS

Este documento describe cómo la **Raspberry Pi Pico W** (RP2040) envía las lecturas del magnetómetro **HMC5883L** al servidor de la Raspberry Pi 5. El firmware completo (motores TB6600, homing, barrido y calibración) está en [`firmware/`](../firmware/README.md); el ejemplo anterior, en [`firmware/pico_w_cliente_ejemplo.py`](../firmware/pico_w_cliente_ejemplo.py), y el emulador que habla el mismo protocolo, en [`server/scripts/emular-pico.js`](../server/scripts/emular-pico.js).

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
- Cuando aparece una sesión con un `id` nuevo, la Pico empieza a recorrer la malla de esa sesión: `grid_nx × grid_ny` puntos en X–Y con paso `paso_mm`, en cada plano de `z_levels_mm`, en orden x → y → z.
- **Zona de muestreo** (`zona_mm`, desde la migración 007): el operador elige en cada sesión el tamaño X × Y × Z, sin pasar de los límites de la base (`barrido.limite_*_mm`). Las coordenadas que manda la Pico son **de la zona**: `xMM` de 0 a `zona_mm.x`, `yMM` de 0 a `zona_mm.y`, `zMM` uno de `z_levels_mm` (0 = el standoff). La zona va **centrada bajo la bobina**: el eje de la bobina está en (`zona_mm.x / 2`, `zona_mm.y / 2`). Para mover la mesa, el firmware convierte a coordenadas de máquina: `x_máquina = x_bobina − zona_mm.x / 2 + xMM` (igual en Y), donde `x_bobina` es la posición de máquina del centro de la bobina (constante de calibración del firmware).
- `paso_mm` es **libre** (desde la migración 006): cualquier valor de 1 mm en adelante con un decimal, por ejemplo `7.5`. Las posiciones son `i × paso_mm` redondeadas a décimas (`0, 7.5, 15 … 60`); si el paso no divide la placa, el último punto queda antes del borde. Manda `zMM` exactamente como aparece en `z_levels_mm`.
- `ultimo_seq` es el mayor `seq` que el servidor ya tiene de esa sesión. Si la Pico se reinicia a mitad de una sesión, **continúa en `ultimo_seq + 1`** (no vuelve a 1).
- `sensor.rango_ga` indica la ganancia que el firmware debe programar en el registro B del HMC5883L (ver 4.2).
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
| `raw.x`, `raw.y`, `raw.z` | **cuentas crudas** del HMC5883L: enteros entre −4096 y 2047 (−4096 = desborde) |
| `ts_ms` | opcional: epoch en ms (UTC) de cuando se leyó; `0` u omitido si la Pico no tiene hora |

- Máximo **200 lecturas por lote** (422 si son más). Recomendado: **20 a 50**, unos 2 a 6 kB de JSON, que caben bien en la RAM de la Pico y en una sola petición.
- La Pico manda **cuentas, no µT**: el servidor convierte con la ganancia y el offset vigentes: `µT = cuentas / lsb_por_ga × 100 − offset_ut`. Así el dato crudo queda guardado y la calibración puede cambiar sin tocar el firmware.

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

## 4. El sensor HMC5883L

### 4.1 Verificar el chip con un escaneo I2C

Muchos módulos **GY-271** traen un **QMC5883L** en lugar del HMC5883L. Tienen otra dirección y otros registros, así que el código de este documento **no** sirve para el QMC5883L.

```python
from machine import I2C, Pin
i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)
print([hex(d) for d in i2c.scan()])
# ['0x1e']  → HMC5883L  (registros de identificación 10–12 = b'H43')
# ['0xd']   → QMC5883L  (otro chip: hay que cambiar el driver)
print(i2c.readfrom_mem(0x1E, 10, 3))   # debe imprimir b'H43'
```

### 4.2 Configuración

| Registro | Valor | Significado |
|---|---|---|
| A (0x00) | `0x78` | 8 muestras promediadas, 75 Hz, medición normal |
| B (0x01) | ganancia según `rango_ga` (tabla) | bits 7–5 |
| Modo (0x02) | `0x00` continuo, o `0x01` medición única | en medición única cada lectura tarda unos 6 ms (160 Hz máx.) |

| `rango_ga` | Registro B | LSB/Ga |
|---|---|---|
| 0,88 | `0x00` | 1370 |
| 1,3 | `0x20` | 1090 |
| 1,9 | `0x40` | 820 (valor por defecto del sistema) |
| 2,5 | `0x60` | 660 |
| 4,0 | `0x80` | 440 |
| 4,7 | `0xA0` | 390 |
| 5,6 | `0xC0` | 330 |
| 8,1 | `0xE0` | 230 |

La ganancia la elige el admin en la configuración del sensor; la Pico la recibe en cada latido (`sesion_activa.sensor.rango_ga`) y debe programar el registro B **antes** de la primera lectura de la sesión. El servidor convierte con esa misma ganancia.

### 4.3 Lectura: el orden es X, Z, Y

Los 6 bytes de datos empiezan en el registro **0x03** y vienen en el orden **X, Z, Y** (no X, Y, Z), cada uno como entero de 16 bits con signo, *big-endian*:

```python
import struct
datos = i2c.readfrom_mem(0x1E, 0x03, 6)
x, z, y = struct.unpack('>hhh', datos)     # ¡X, Z, Y!
raw = {"x": x, "y": y, "z": z}
```

- Si un eje se sale de rango, ese registro vale **−4096**. **No lo descartes ni lo conviertas**: mándalo tal cual. El servidor marca la lectura como `saturado`, guarda el crudo y deja ese eje en NULL.
- Un valor fijo de −4096 en todas las lecturas suele indicar que la ganancia es demasiado baja para el campo: sube `rango_ga`.

### 4.4 Validar los ejes con un imán

1. Con el sensor quieto y sin imanes cerca, toma 50 lecturas: es el campo de fondo (el de la Tierra, unos 25 a 65 µT en total). Anótalo como `offset_ut` si se quiere restar.
2. Acerca un imán **por el lado +X del módulo** (la flecha serigrafiada): `raw.x` debe crecer mucho en valor absoluto mientras Y y Z cambian poco. Repite con Y y con Z (Z es perpendicular a la placa).
3. Si un eje responde al imán puesto en otro eje, el orden de lectura está mal (lo típico es haber leído X, Y, Z en lugar de X, Z, Y).
4. Invierte el imán: el signo del eje correspondiente debe invertirse.

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

## 7. Orden del barrido

El servidor y el emulador recorren la malla en el orden **x → y → z**: primero toda una fila en X, luego la siguiente Y, y al terminar el plano, el siguiente Z. Con una lectura por punto, `seq − 1` es el índice del punto en la malla. Si la mesa recorre la malla en otro orden (por ejemplo en zigzag), no pasa nada: el servidor usa `xMM`, `yMM` y `zMM` de cada lectura, no el `seq`.

Si `lecturas_por_punto` es mayor que 1, la Pico puede mandar varias lecturas con la misma posición y `seq` distintos (pendiente de decidir si se promedian en la Pico o en el servidor).

---

## 8. Probar sin hardware

```bash
cd server
npm run emular-pico -- --token <TOKEN> --url http://127.0.0.1:4000/api --perdida 0.3 --duplicar 0.2 --saturar 0.02
```

Opciones: `--lote`, `--ms-por-lectura`, `--perdida`, `--duplicar`, `--saturar`, `--sin-latido-a-los N`, `--semilla` e `--insecure` (para el certificado autofirmado). Detalles en el encabezado del script.
