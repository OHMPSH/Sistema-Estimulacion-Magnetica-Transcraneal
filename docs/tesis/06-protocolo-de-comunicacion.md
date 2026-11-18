# 06 — Protocolo de comunicación

Este documento describe los protocolos con que se comunican las partes del SAVD: la autenticación de la Raspberry Pi Pico W con un token, el latido periódico y su respuesta, el envío de lecturas por lotes con idempotencia y la publicación de eventos en tiempo real hacia los navegadores con Server-Sent Events (SSE). Incluye diagramas de secuencia del arranque de la Pico, de una sesión real completa, de una pérdida de conexión con reanudación y de varios navegadores observando a la vez. Todos los mensajes son JSON sobre HTTP (HTTPS en producción).

---

## 1. Principios del protocolo con la Pico W

- La Pico solo hace **dos peticiones**, siempre con su token: `POST /api/dispositivo/latido` y `POST /api/dispositivo/mediciones`.
- El servidor **nunca** llama a la Pico: la Pico pregunta en cada latido si hay algo que hacer. No hace falta abrir puertos en la Pico ni conocer su dirección.
- La Pico envía **cuentas crudas**, no unidades físicas: la conversión la hace el servidor con la configuración del sensor copiada en la sesión, así el dato crudo queda guardado y la calibración puede cambiar sin tocar el firmware.
- Cada lectura lleva un número de secuencia (`seq`) que hace **idempotente** la ingesta: reenviar un lote no duplica filas.
- Cabeceras: `Content-Type: application/json` y `Authorization: Bearer <token>`.
- URL base: `https://<servidor>/api` detrás de Nginx (producción) o `http://<ip>:4000/api` (desarrollo).

---

## 2. Autenticación de la Pico con token

| Paso | Descripción |
|---|---|
| Generación | Un administrador pulsa «Generar token» en Configuración › Dispositivo (`POST /api/dispositivo/token`). El servidor crea 32 bytes aleatorios con `crypto.randomBytes` y los codifica en base64url (43 caracteres). |
| Entrega | El token se muestra **una sola vez** en la interfaz, con un botón para copiarlo. Si se pierde, se genera otro y el anterior deja de funcionar al instante. |
| Almacenamiento | En la base de datos solo se guarda su **SHA-256** (`dispositivos.token_hash`, 64 caracteres hexadecimales, único). Quien lea la tabla no obtiene un token utilizable. |
| Uso | La Pico lo guarda en `secretos.py` (excluido de git) y lo envía en la cabecera `Authorization: Bearer <token>`. El middleware `requiereDispositivo` acepta solo tokens de 20 a 128 caracteres base64url, calcula su SHA-256 y busca un dispositivo **activo** con ese hash. |
| Revocación | `DELETE /api/dispositivo/token` borra el hash; `PATCH /api/dispositivo {activo: false}` desactiva el dispositivo. En ambos casos la Pico recibe 401, detiene todo, vuelve a la posición de descanso y reintenta el latido cada 30 s. |

---

## 3. Latido

### 3.1 Petición

`POST /api/dispositivo/latido`, cada `intervalo_latido_s` segundos (5 s por defecto). Todos los campos son opcionales, pero si vienen deben tener el tipo correcto (si no, 422):

| Campo | Tipo y rango | Significado |
|---|---|---|
| `firmware` | Texto de hasta 40 caracteres | Versión del firmware (por ejemplo, `pico-tms-2.2`); se guarda con cada sesión real |
| `rssi` | Entero de −127 a 0 | Intensidad de la señal Wi-Fi en dBm |
| `uptime_s` | Entero no negativo | Segundos desde que arrancó la Pico |
| `ts_dispositivo_ms` | *Epoch* en ms (UTC) entre 2020 y 2100, o 0 | Hora de la Pico sincronizada por NTP; 0 si todavía no sincroniza |
| `estado` | `espera`, `homing`, `midiendo` o `error` | Lo que está haciendo la Pico |
| `error` | Texto de hasta 300 caracteres, o nulo | Motivo de un error (zona fuera de la mesa, sensor…) |

### 3.2 Respuesta

| Campo | Contenido |
|---|---|
| `ok` | `true` |
| `modo_operacion` | `simulacion` o `real` |
| `sesion_activa` | Nulo si no hay sesión abierta, si el sistema está en modo simulación o si la sesión abierta es simulada. Si no, un objeto con: `id`, `modo`, `paso_mm`, `medio`, `zona_mm` ({x, y, z}), `grid_nx`, `grid_ny`, `z_levels_mm`, `puntos_esperados`, `ultimo_seq` (el mayor `seq` ya guardado), `barrido` (configuración de la base), `sensor` (la **copia de la sesión**: modelo, rango, cuentas por gauss, lecturas por punto y *offset*) y, si la sesión tiene copia del punto de inicio, `inicio_medicion` ({x_mm, y_mm, z_mm}, en mm de máquina) |
| `intervalo_latido_s` | Intervalo de latido vigente (la Pico lo adopta) |
| `servidor_ts_ms` | Hora del servidor en ms, para estimar el desfase de reloj |

Mientras `sesion_activa` sea nula, la Pico no debe enviar lecturas. Cuando aparece un `id` nuevo, la Pico empieza a recorrer la malla de esa sesión desde `ultimo_seq + 1`.

### 3.3 Sincronización de reloj

El servidor calcula el desfase entre los relojes como:

$$\Delta t = t_{servidor} - t_{Pico}$$

en ms, sin descontar la latencia de la red (que en un hotspot es de decenas de milisegundos). Lo guarda en memoria (`desfase_ms` en el estado del dispositivo) y lo escribe en su registro cada vez que cambia más de 1 s. La Pico resincroniza por NTP cada hora.

### 3.4 Detección de «en línea» y «sin señal»

- El servidor guarda el último latido **en memoria** en cada petición, y en la base de datos como máximo una vez cada 30 s si no cambió nada importante (firmware, IP o volver a estar en línea).
- Difunde el estado del dispositivo por SSE (evento `dispositivo`) **en cada latido**, para que los navegadores conozcan siempre la hora del último.
- Un temporizador de 1 s compara la hora del último latido con `umbral_desconexion_s` (15 s por defecto; debe ser mayor que el intervalo de latido) y difunde el paso a «sin señal».
- En el navegador, el texto se recalcula cada segundo sin pedir nada al servidor: «Pico W en línea · midiendo», «Pico W sin señal hace 40 s» o «Pico W nunca conectada». Si el latido trae un error, aparece un aviso en la parte superior del dashboard.
- El estado y el error que informa la Pico viven solo en memoria y se pierden al reiniciar el servidor, hasta el siguiente latido.

---

## 4. Envío de lotes de lecturas

### 4.1 Petición

`POST /api/dispositivo/mediciones` con el cuerpo `{sesionId, lecturas: [...]}`. Reglas de cada lectura:

| Campo | Regla |
|---|---|
| `seq` | Entero positivo, único dentro de la sesión, consecutivo desde 1 (o desde `ultimo_seq + 1`) |
| `xMM`, `yMM` | Número entre 0 y la anchura (`zona_mm.x`) o la profundidad (`zona_mm.y`) de la zona de la sesión |
| `zMM` | Uno de los planos `z_levels_mm` de la sesión (con tolerancia de coma flotante de $10^{-6}$ mm) |
| `raw.x`, `raw.y`, `raw.z` | Enteros: con el modelo QMC5883P, de −32 768 a 32 767; con el modelo HMC5883L, de −4096 a 2047 (−4096 = desbordamiento) |
| `saturado` | Opcional, booleano (falso por defecto): verdadero si la lectura trajo OVFL. Si no es booleano, se rechaza esa lectura, no el lote |
| `ts_ms` | Opcional: *epoch* en ms (UTC) de la lectura; 0 u omitido si la Pico no tiene hora |

- Máximo **200 lecturas por lote** (422 si son más, si el lote está vacío o si `sesionId` no es un entero positivo); 400 si el cuerpo no es JSON o faltan `sesionId` o `lecturas`. El tamaño recomendado es de 20 a 50 lecturas (unos 2 a 6 kB); el firmware usa 25. El servidor limita el cuerpo JSON a 100 kB.

### 4.2 Procesamiento en el servidor

1. Si el sistema está en modo simulación: 409. Si la sesión no existe: 404. Si no es la sesión abierta o es simulada: 409.
2. Cada lectura se valida y se convierte con la copia del sensor de la sesión (documento 04). Las inválidas van a la lista de rechazadas con su motivo; el resto del lote sí se procesa.
3. En una **transacción**, el servidor bloquea la fila de la sesión (`SELECT … FOR UPDATE`), comprueba que siga abierta, lee los `seq` ya guardados, clasifica cada lectura como nueva, duplicada (su `seq` ya existe o se repite dentro del lote) o rechazada, e inserta solo las nuevas. El índice único `(sesion_id, seq)` es la garantía final contra duplicados.
4. Difunde un evento `medicion` por cada lectura nueva.
5. **Cierre automático:** si el número de `seq` guardados alcanza `puntos_esperados × lecturas_por_punto`, el servidor cierra la sesión con el motivo `completa` antes de responder (desde el 13 de noviembre de 2026). Si hubo lecturas rechazadas y no se completa, la cierra el operador.

### 4.3 Respuesta

`{ok: true, aceptadas, duplicadas, rechazadas: [{seq, error}]}`. Las duplicadas no son un error: es lo que ocurre al reintentar. No tiene sentido reintentar una rechazada.

### 4.4 Códigos de error y reacción de la Pico

| Código | Significado | Reacción de la Pico |
|---|---|---|
| 200 | Lote procesado | Quita del búfer las lecturas enviadas |
| 400 | Cuerpo no JSON o faltan campos | Error del firmware: registra y descarta el lote |
| 401 | Token ausente, inválido o dispositivo desactivado | Detiene todo y vuelve al descanso; reintenta el latido cada 30 s |
| 404 | La sesión no existe | Aborta la sesión y vuelve al descanso |
| 409 | Modo simulación, sesión cerrada o sesión simulada | Aborta la sesión y vuelve al descanso |
| 422 | Lote vacío, más de 200 lecturas o `sesionId` inválido | Error del firmware: registra y descarta el lote |
| 5xx o sin red | Error del servidor o de la red | Reintenta **el mismo lote** con espera creciente (0,25 a 8 s) |

---

## 5. Eventos en tiempo real hacia los navegadores (SSE)

### 5.1 Canal

`GET /api/stream` (requiere sesión de usuario) deja abierta una respuesta `text/event-stream`. Cada evento lleva tres campos: `id` (número creciente), `event` (tipo) y `data` (JSON). Cabeceras: sin caché, conexión persistente y `X-Accel-Buffering: no` para que Nginx no almacene el flujo; en Nginx, el bloque `/api/` desactiva el *buffering* y alarga los tiempos de espera a 24 h.

### 5.2 Tipos de evento

| Evento | Origen | Datos |
|---|---|---|
| `medicion` | Servicio de ingesta (simulador o Pico) | `{sesionId, seq, xMM, yMM, zMM, zIdx, bx, by, bz, magnitud, saturado, raw, timestamp, tsDispositivo}` |
| `sesion` | Servicio de sesiones y controlador | `{tipo: 'iniciada', sesion}`, `{tipo: 'finalizada', motivo: 'completa' \| 'manual', sesion}`, `{tipo: 'notas', sesionId, notas}`, `{tipo: 'eliminada', sesionId}`, `{tipo: 'restaurada', sesionId}` |
| `configuracion` | Servicio de configuración | `{clave, valor}` cada vez que un administrador cambia una clave |
| `dispositivo` | Servicio del dispositivo | Estado público de la Pico (en línea, último latido, firmware, RSSI, IP, estado y error informados) |
| `resincronizar` | Canal SSE, solo al cliente que se reconecta | `{motivo, ultimoId}`: ya no se puede reenviar lo perdido; el navegador debe recargar la sesión activa |

### 5.3 Recuperación de eventos perdidos

- **Identificadores:** el primer `id` de cada proceso del servidor es la hora de arranque en milisegundos, y luego aumenta de uno en uno. Así, los identificadores de un proceso nuevo siempre son mayores que los del anterior.
- **Búfer circular** de los últimos **2 000 eventos** en memoria.
- **`retry: 3000`**: el navegador espera 3 s antes de reconectarse.
- Al reconectarse, el navegador envía automáticamente la cabecera `Last-Event-ID`. Si ese identificador está en el búfer, el servidor reenvía todo lo posterior; si salió del búfer o pertenece a otro proceso, envía `resincronizar`.
- **Contrapresión:** si un cliente es lento y la escritura en su conexión no se completa, los eventos se encolan hasta el evento `drain`; si acumula más de 1 000 pendientes, se cierra su conexión (se reconectará y resincronizará).
- Un comentario `: ping` cada 25 s mantiene viva la conexión a través de Nginx y de los navegadores.

### 5.4 Lado del navegador

La interfaz abre un **único** `EventSource` compartido por toda la aplicación. Al conectarse (y en cada reconexión o con `resincronizar`) pide `GET /api/sesiones/activa`, que devuelve la sesión abierta con todas sus lecturas en el mismo formato que los eventos `medicion`. Las lecturas se **deduplican por `seq`** (lo que llega dos veces, por el reenvío del SSE y por la recarga, se dibuja una vez), se descartan las de otras sesiones y las actualizaciones se agrupan en un solo renderizado por cuadro de pantalla.

---

## 6. Diagramas de secuencia

### 6.1 Arranque de la Pico

**Figura 6.1. Arranque de la Pico W hasta quedar en espera.**

```mermaid
sequenceDiagram
    autonumber
    participant P as Pico W
    participant SEN as QMC5883P
    participant AP as Red Wi-Fi
    participant NTP as pool.ntp.org
    participant S as Servidor
    P->>P: LED en parpadeo rápido; 3 s para BOOTSEL (modo de edición)
    P->>SEN: escaneo I²C, Chip ID (0x80), inicialización en 30 G
    P->>SEN: 100 lecturas → fondo; se imprime para copiarlo en el offset
    P->>AP: conexión Wi-Fi (bloqueante, reintento cada 10 s)
    P->>NTP: sincronización del reloj (UTC)
    P->>P: homing sin finales: la posición actual es la de descanso
    P->>S: POST /dispositivo/latido {firmware, rssi, uptime_s, ts, estado: homing}
    S-->>P: {modo_operacion, sesion_activa: null, intervalo_latido_s: 5}
    S--)S: difunde event: dispositivo (en línea)
    P->>P: LED fijo; estado espera
    loop cada 5 s
        P->>S: POST /dispositivo/latido {estado: espera}
        S-->>P: {sesion_activa: null}
    end
```

### 6.2 Una sesión real completa

**Figura 6.2. Sesión real completa con cierre automático.**

```mermaid
sequenceDiagram
    autonumber
    actor OP as Operador
    participant S as Servidor
    participant BD as MariaDB
    participant P as Pico W
    OP->>S: POST /sesiones {modo, paso_mm: 10, medio, zona_mm: {50, 50, 20}}
    S->>BD: INSERT sesión hw + copias (barrido, sensor, general)
    S--)OP: event: sesion (iniciada) — 6 × 6 × 3 = 108 puntos
    P->>S: POST /dispositivo/latido
    S-->>P: sesion_activa {id, malla, sensor QMC5883P 30 G, inicio_medicion (0,0,0), ultimo_seq 0}
    P->>P: valida la zona desde el inicio; estado midiendo
    loop 108 puntos en serpentina
        P->>P: mover (PIO + DMA) → 300 ms → 10 lecturas → búfer (seq)
        opt cada 25 lecturas o 3 s
            P->>S: POST /dispositivo/mediciones {sesionId, lecturas}
            S->>BD: transacción FOR UPDATE + INSERT de las nuevas
            S-->>P: {aceptadas: 25, duplicadas: 0, rechazadas: []}
            S--)OP: event: medicion × 25
        end
    end
    P->>S: último lote (vaciado)
    S->>BD: seq guardados = 108 → cierre, huecos = 0, puntos_recibidos = 108
    S-->>P: {aceptadas: 8, ...}
    S--)OP: event: sesion (finalizada, completa)
    P->>S: POST /dispositivo/latido
    S-->>P: {sesion_activa: null}
    P->>P: regreso a la posición de descanso; estado espera
```

### 6.3 Pérdida de conexión y reanudación

**Figura 6.3. Caída del Wi-Fi a mitad del barrido y reinicio de la Pico con reanudación.**

```mermaid
sequenceDiagram
    autonumber
    participant P as Pico W
    participant S as Servidor
    participant BD as MariaDB
    Note over P: midiendo; último lote confirmado: seq 1–50
    P-xS: POST /mediciones seq 51–75 (sin red)
    P->>P: sigue midiendo; búfer guarda seq 51–120
    P-xS: reintentos a 0,25 s, 0,5 s, 1 s, 2 s…
    Note over S: sin latidos durante 15 s → event: dispositivo (sin señal)
    P->>P: vuelve el Wi-Fi: se reinicia la espera y se adelanta el latido
    P->>S: POST /mediciones seq 51–75 (mismo lote)
    S->>BD: seq 51–75 nuevos
    S-->>P: {aceptadas: 25, duplicadas: 0}
    P->>S: POST /mediciones seq 76–100 (respuesta perdida)
    S->>BD: seq 76–100 guardados
    P->>S: reenvío seq 76–100
    S-->>P: {aceptadas: 0, duplicadas: 25}
    Note over P: corte de luz; el operador regresa la mesa al descanso
    P->>S: POST /dispositivo/latido (tras reiniciar)
    S-->>P: sesion_activa {…, ultimo_seq: 100}
    P->>P: reanuda en seq 101 = punto (101 − 1) / N
```

### 6.4 Varios navegadores observando a la vez

**Figura 6.4. Tres navegadores, uno de los cuales se conecta tarde y otro pierde la conexión.**

```mermaid
sequenceDiagram
    autonumber
    participant A as Navegador A (operador)
    participant B as Navegador B (observador)
    participant C as Navegador C (llega tarde)
    participant S as Servidor
    A->>S: GET /stream
    B->>S: GET /stream
    S--)A: id 1000 event: sesion (iniciada)
    S--)B: id 1000 event: sesion (iniciada)
    S--)A: id 1001…1300 event: medicion
    S--)B: id 1001…1150 event: medicion
    Note over B: B pierde la red en el id 1150
    C->>S: GET /stream (sin Last-Event-ID)
    C->>S: GET /sesiones/activa
    S-->>C: sesión + 300 lecturas ya medidas
    S--)C: id 1301… event: medicion
    B->>S: GET /stream con Last-Event-ID: 1150 (tras retry de 3 s)
    S--)B: reenvío de los id 1151…1301 desde el búfer de 2000
    B->>S: GET /sesiones/activa (recarga al reconectar)
    Note over A,C: los tres ven la misma sesión; duplicados descartados por seq
```

---

## Fuentes en el proyecto

- `docs/firmware-pico-w.md` (secciones 1 a 6)
- `server/routes/dispositivo.routes.js`, `server/controllers/dispositivo.controller.js`, `server/middleware/auth.js`, `server/middleware/validar.js`
- `server/services/dispositivo.js`, `server/services/ingesta.js`, `server/services/conversionSensor.js`, `server/models/Medicion.js`
- `server/services/tiempoReal.js`, `server/services/bufferEventos.js`, `server/controllers/mediciones.controller.js`
- `nginx/tms.conf` (bloque `/api/`, solo lectura)
- `firmware/cliente.py`, `firmware/main.py`, `firmware/red.py`
- `frontend/src/hooks/useStream.js`, `frontend/src/hooks/useSesionActiva.js`, `frontend/src/hooks/useDispositivo.js`
