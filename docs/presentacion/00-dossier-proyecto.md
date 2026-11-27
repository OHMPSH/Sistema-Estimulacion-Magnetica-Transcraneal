# Dossier del proyecto SAVD / TMS

**Fecha de corte:** 2026-11-25. **Commit:** `521c47b` «calibraciones» (rama `main`; el único cambio sin commit es una línea de `CLAUDE.md`).
**Para qué sirve este archivo:** reunir todo el proyecto, verificado, como materia prima de la exposición. Cada dato dice de dónde salió. Lo que no se pudo comprobar está marcado **«por confirmar»** y se repite en [PREGUNTAS.md](PREGUNTAS.md).

**Fuentes y abreviaturas**

| Abreviatura | Qué es |
|---|---|
| *código* `ruta` | El archivo del repositorio en el commit `521c47b`. Manda sobre todo lo demás |
| *base* | Consultas solo `SELECT` a `tms_db` hechas el 2026-11-25 18:49 UTC (ver [01-cifras-reales.md](01-cifras-reales.md), sección 6) |
| *pruebas* | Ejecutadas el 2026-11-25 en la laptop de desarrollo |
| *CLAUDE.md §n* | El registro del proyecto (`CLAUDE.md`, sección n). Se usa para la historia y lo que no está en el código |

> **Dos convenciones que hay que respetar en toda la exposición**
>
> 1. **Milímetros reales.** El usuario midió que los milímetros del sistema están al doble: cuando el sistema dice 400 mm, la mesa avanza 200 mm (*código* `frontend/src/utils/escalaMM.js`, `FACTOR_MM = 2`; *CLAUDE.md §0.11*). La página web ya corrige esto, pero el firmware, la base, el CSV y los logs de Thonny siguen en «mm del sistema». **En este material: mm reales = mm del sistema ÷ 2.** Cuando se cita un valor del código se dan los dos (por ejemplo, «60 mm/s del sistema = 30 mm/s reales»). Que el factor valga igual en Z y en las sesiones anteriores al 2026-11-24 está **por confirmar** (la página lo aplica a los tres ejes).
> 2. **Nombres de los ejes.** Desde el 2026-11-24, a pedido del asesor, la web llama **X al eje largo e Y al eje corto** (*código* `frontend/src/utils/geometria.js`, `NOMBRE_EJE = {x: 'Y', y: 'X', z: 'Z'}`). El firmware, la base y el CSV conservan los nombres internos: **x = eje corto, y = eje largo**. Para no confundir, aquí se dice «eje corto» y «eje largo» siempre que importa; en las diapositivas conviene usar los nombres de la web (los que ve el público), con una nota.

---

## 1. Objetivo y problema

**Problema.** La tesis (IPN, ESIME Zacatenco) trata de la **caracterización del campo magnético** en un montaje de estimulación magnética transcraneal (TMS) sobre un *phantom* de solución salina. Para caracterizar el campo hay que medir sus tres componentes en muchos puntos del espacio alrededor de la bobina, con posición conocida, de forma repetible, y poder ver y guardar los datos (*CLAUDE.md §1*).

**Objetivo del sistema (SAVD: Sistema de Adquisición y Visualización de Datos).** Automatizar ese mapeo:

- una **mesa cartesiana XYZ** lleva un **magnetómetro de 3 ejes** por una malla de puntos dentro de una zona elegida por el operador;
- en cada punto se miden **Bx, By, Bz** (µT) y se calcula **|B|**;
- las lecturas viajan por **Wi-Fi** a un **servidor**, que las valida, las convierte a unidades físicas, las guarda con su trazabilidad y las difunde en vivo;
- varias personas siguen la medición a la vez en una **web** y en una **app Android**, y después la consultan y exportan (CSV, sábana 3D en SVG o PNG).

**Requisitos explícitos que aparecen en el proyecto** (*CLAUDE.md §1 y §7*): error posicional menor que ±1 mm; paso de medición elegible por sesión (libre, en mm, igual en X, Y y Z); zona de muestreo por sesión; varias personas mirando a la vez desde el hotspot de un iPhone; datos simulados y reales nunca mezclados; ninguna lectura perdida en silencio.

**Alcance honesto.** El usuario sabe que ni el QMC5883P ni el Hall 49E miden el pulso real de la bobina TMS: **los sensores son de prueba**; el sistema está hecho para que el sensor se pueda cambiar (dos modelos de sensor ya conviven en el servidor) (*CLAUDE.md §1*). El título exacto de la tesis, el asesor, la bobina y la corriente usada están **por confirmar**.

---

## 2. Hardware

### 2.1 Componentes

| Pieza | Detalle verificado | Fuente |
|---|---|---|
| Microcontrolador | **Raspberry Pi Pico 2 W** (RP2350, MicroPython 1.29) en la mesa desde noviembre de 2026. El firmware también funciona en la Pico W (RP2040): detecta el chip con `es_rp2350()` | *código* `firmware/motores.py`; *CLAUDE.md §0.1* |
| Magnetómetro | **QMC5883P**, I2C, dirección **0x2C**, Chip ID 0x80. La tienda lo vendía como HMC5883L (0x1E), pero no lo es | *código* `firmware/sensor.py`, `firmware/config.py` |
| Sensor de prueba de 1 eje | **Hall 49E (SS49E)** lineal en GP26/ADC0 (pin 31), 3,3 V; firmware aparte `firmware_hall_1d/` (`pico-tms-hall1d-0.1`) | *código* `firmware_hall_1d/config.py` |
| Estructura | **CNC de escritorio tipo 3018 reutilizada**: arco (pórtico) de dos placas laterales negras unidas por un perfil de aluminio, sobre listones de MDF con escuadras metálicas. La tabla de MDF con la bobina **nunca se mueve**. El *spindle* se cambió por una **pieza impresa** (cilindro, columna y plato rojos) que sostiene el sensor. Dentro de la caja de MDF hay una **base de CNC 3018** cuya **cama de metal se desliza: es el eje corto**, y **el arco va fijo a esa cama**, así que se mueve con ella. El **riel largo del arco** es el eje largo, y sobre su carro va fijo el **eje Z** (usuario, 2026-11-25) | Fotos y respuestas del usuario, 2026-11-25 |
| Motores | **NEMA 17**, uno por eje (3); según el usuario, **más cortos** que un NEMA 17 estándar | *CLAUDE.md §1*; *código* `firmware/config.py`; usuario, 2026-11-25 |
| Transmisión | **Husillos T8** (0,04 mm por paso completo teórico, según *CLAUDE.md §1*). Avance real del husillo **por confirmar** (ver 2.4) | *CLAUDE.md §1* |
| Drivers | **TB6600** (uno por eje), entradas STEP/DIR/ENA con optoacoplador; ENA común; **DIP en 400 pulsos/vuelta** (usuario, 2026-11-25). Van con cinchos sobre el perfil superior del arco, junto al *shield* de la Pico | *código* `firmware/config.py`, `firmware/motores.py`; *docs* `instructivo-calibracion-y-conexiones.md` |
| Fuente de motores | **12 V** (caja negra detrás del arco; usuario, 2026-11-25). Corriente máxima: por confirmar. El instructivo pide 12–24 V CC y al menos 1,5 A por motor | `docs/instructivo-calibracion-y-conexiones.md` (desactualizado en micropasos) |
| Finales de carrera | **No hay.** La posición al arrancar se toma como el descanso (0, 0, 0); el código de homing con finales existe pero no se usa | *código* `firmware/config.py` (`"final": None`) |
| Servidor | Hoy: **laptop de desarrollo** (Node 22.23.4, MariaDB 11.8.6, Nginx 1.26.3). Previsto: **Raspberry Pi 5** (instalación pendiente, guía en `COMANDOS.md`) | *CLAUDE.md §0.1, §0.5* |
| Red | Wi-Fi del laboratorio (`TP-LINK_*`) en las pruebas; el diseño contempla el hotspot de un iPhone | *CLAUDE.md §0.5, §1* |
| Bobina | **Plana en doble D (figura de 8)**: dos espirales en D, una junto a otra, en un soporte rojo impreso con marco negro, espuma negra encima y tres patas. **~200 × 125 mm por fuera** (medida aproximada) y **corriente constante de 0,5–1 A**. Vueltas y medidas interiores: por confirmar. El simulador usa una espira de 25 mm de radio solo como modelo | Usuario, 2026-11-25; *código* `server/setup_db.sql` |
| Separación sensor–bobina | En Z = 0 el plato impreso casi toca la espuma: entre el sensor y la bobina solo queda el espesor de la pared impresa (valor en mm: por confirmar) | Usuario, 2026-11-25 |

### 2.2 Conexiones (pines de la Pico)

| Señal | GPIO | Pin físico | Fuente |
|---|---|---|---|
| SDA del QMC5883P | GP0 | 1 | *código* `firmware/config.py` |
| SCL del QMC5883P | GP1 | 2 | *código* `firmware/config.py` |
| VCC del QMC5883P | 3V3(OUT) | 36 | *código* `firmware/config.py` (comentario) |
| GND del QMC5883P | GND | 38 | *código* `firmware/config.py` (comentario) |
| PUL+ eje corto (x interno) | GP10 | 14 | *código* `firmware/config.py`; pin físico del instructivo |
| DIR+ eje corto | GP11 | 15 | ídem |
| PUL+ eje largo (y interno) | GP12 | 16 | ídem |
| DIR+ eje largo | GP13 | 17 | ídem |
| PUL+ Z | GP14 | 19 | ídem |
| DIR+ Z | GP15 | 20 | ídem |
| ENA+ de los tres TB6600 | GP16 | 21 | ídem (0 = habilitado) |
| Hall 49E OUT (solo `firmware_hall_1d/`) | GP26/ADC0 | 31 | *código* `firmware_hall_1d/config.py` |
| PUL−, DIR−, ENA− | GND de la Pico | 13, 18, 23 | `docs/instructivo-calibracion-y-conexiones.md` |

I2C0 a **100 kHz**. Los drivers quedan **habilitados todo el tiempo** que corre el programa, para sostener la posición (sin finales de carrera, un paso perdido corre el origen) (*código* `firmware/config.py`).

**Problema físico resuelto (2026-11-18):** reinicios y desconexiones USB a mitad de una medición por el cableado del *shield*; se recableó el bus de tierras y todo funcionó (*CLAUDE.md §0.5*). Ojo: el instructivo dice «No unas el GND de la Pico con el GND de la fuente de los motores» (optoacopladores); cómo quedó exactamente el recableado está **por confirmar**.

### 2.3 Magnetómetro QMC5883P

**Registros** (*código* `firmware/sensor.py`):

| Registro | Uso |
|---|---|
| `0x00` | Chip ID = `0x80` |
| `0x01`–`0x06` | Datos X, Y, Z, 16 bits con signo, **byte bajo primero** (`struct.unpack('<hhh')`) |
| `0x09` | Estado: bit 0 = **DRDY** (dato listo), bit 1 = **OVFL** (saturación) |
| `0x0A` | Control 1: `0xCD` = modo normal, **200 Hz**. Sin escribirlo, todo vale 0 |
| `0x0B` | Control 2: Set/Reset y rango (`bits << 2`) |
| `0x29` | Signo de los ejes: `0x06` |

**Inicialización:** Chip ID → `0x29 ← 0x06` → `0x0B ← bits_rango << 2` → `0x0A ← 0xCD` → esperar 20 ms.

**Rangos** (*código* `firmware/sensor.py` `RANGOS`; `server/services/validacionConfiguracion.js`):

| Rango | Bits | Cuentas/G | Nominal | Fondo de escala real (32767 cuentas) |
|---|---|---|---|---|
| 30 G | 0 | 1000 | ±3000 µT | 3276,7 µT |
| 12 G | 1 | 2500 | ±1200 µT | 1310,7 µT |
| 8 G | 2 | 3750 | ±800 µT | 873,8 µT |
| 2 G | 3 | 15000 | ±200 µT | 218,4 µT |

**Conversión:** µT = cuentas / (cuentas/G) × 100 − offset del eje (1 G = 100 µT). Se hace **en el servidor**, con la copia de la configuración del sensor guardada con la sesión (*código* `server/services/conversionSensor.js`).

**Medición en un punto:** se promedian **10 lecturas** (`PROMEDIO_QMC`), cada una esperando DRDY con un límite de 100 ms; a 200 Hz son unos 50 ms. Si alguna trae OVFL, la medición va marcada como saturada. Ante un `OSError` del bus, el chip se reinicia una vez (*código* `firmware/sensor.py`).

**Fondo** (Tierra + entorno, bobina apagada): 100 lecturas en 30 G al arrancar y con BOOTSEL en espera. Por defecto la Pico **no** lo resta (`RESTAR_FONDO_EN_PICO = False`): manda las cuentas crudas y el fondo se puede copiar en `offset_ut` del servidor (*código* `firmware/config.py`). En la base, el offset está en (0, 0, 0) (*base*).

### 2.4 Mecánica de la mesa

| Parámetro | Mm del sistema (código) | Mm reales (÷ 2) | Fuente |
|---|---|---|---|
| Recorrido eje corto (x interno) | 0–410 mm | 0–205 mm | `firmware/config.py` `LIMITE_X_MM` |
| Recorrido eje largo (y interno) | 0–562 mm | 0–281 mm | `LIMITE_Y_MM` |
| Recorrido Z | 0–88 mm | 0–44 mm | `LIMITE_Z_MM` |
| Pulsos por mm | 50 | **100 pulsos por mm real** (derivado) | `pasos_por_mm` |
| Velocidad de crucero | 60 mm/s | 30 mm/s | `VEL_MAX_MM_S` |
| Aceleración (rampa trapezoidal) | 300 mm/s² | 150 mm/s² | `ACEL_MM_S2` |
| Velocidad al arrancar y frenar | 6 mm/s | 3 mm/s | `VEL_INICIO_MM_S` |
| Frecuencia máxima de pulsos | 15 kHz | — | `FRECUENCIA_MAX_HZ` |
| Holgura (aproximación siempre en +) | 0,5 mm | 0,25 mm | `HOLGURA_MM` |
| Asentamiento antes de medir | 300 ms | — | `ASENTAMIENTO_MS` |

**Las medidas físicas reales de la mesa están por confirmar.** Los recorridos de la tabla se midieron con `prueba_calibracion.py` en mm del sistema; divididos entre 2 dan ~205 × 281 × 44 mm.

**Hipótesis sobre el factor 2 (por confirmar, no verificada):** con husillo T8 de 8 mm de avance y 400 pulsos por vuelta (1/2 micropaso) salen 50 pulsos/mm, que es lo que supone el firmware. El usuario confirmó el 2026-11-25 que los TB6600 están en **400 pulsos/vuelta**. Si la mesa avanza la mitad, en la realidad hay 100 pulsos/mm: o el husillo avanza **4 mm por vuelta**, o los motores son de **0,9° por paso** (la tabla del TB6600 supone 1,8°). Dato a favor del ×2: los recorridos reales (~205 × 281 × 44 mm) son del orden de los de una CNC 3018 (180 × 300 × 45 mm, según su fabricante). Hace falta la posición de los interruptores DIP y el avance del husillo. El instructivo recomienda 1/8 (200 pulsos/mm), que no coincide con nada de lo anterior (*CLAUDE.md §0.8*).

**Movimiento:** si Z baja, primero X e Y y después Z; si Z sube, primero Z. Así la mesa nunca cruza con el sensor más abajo de lo necesario (*código* `firmware/motores.py` `Mesa.mover_a`). Z descansa **abajo**, junto a la bobina, y mide **subiendo** (`EJE_Z["invertir"] = True` desde la 2.4).

---

## 3. Firmware (`firmware/`, versión `pico-tms-2.4`, MicroPython)

| Módulo | Qué hace |
|---|---|
| `main.py` | Bucle cooperativo y `Controlador` (fases, estados, paradas) |
| `config.py` | Pines, mecánica, sensor, tiempos |
| `red.py` | Wi-Fi y NTP |
| `cliente.py` | Latido, búfer de lecturas, envío por lotes con reintentos |
| `sensor.py` | Driver del QMC5883P |
| `motores.py` | Ejes con PIO + DMA, rampas, holgura, regreso al descanso |
| `barrido.py` | Malla en serpentina, validación de la zona, reanudación |
| `calibracion.py` | Previsualizador de la bobina |
| `led.py`, `registro.py` | LED de estado y log con marca de tiempo |
| `banco.py`, `prueba_calibracion.py`, `prueba_qmc5883p.py`, `medicion_campo_qmc5883p.py`, `prueba_hall_49e.py` | Programas de prueba independientes |
| `secretos.py` | Wi-Fi, token y URL del servidor. **Fuera de git; no se copia a ningún documento** |

### 3.1 Bucle cooperativo

Sin hilos. En cada vuelta (*código* `firmware/main.py` `Controlador.vuelta`):

1. mantiene el Wi-Fi;
2. manda el **latido** cuando toca y reacciona a la respuesta (`sesion_activa`, `calibracion`);
3. avanza un paso la **tarea en curso** (barrido, regreso al descanso o calibración), que son **generadores**: ceden el control (`yield`) mientras los motores se mueven o el sensor convierte;
4. manda un **lote** si hay suficientes lecturas;
5. revisa BOOTSEL y actualiza el LED.

Sin watchdog ni `machine.reset()`: un reinicio tomaría como origen la posición en que haya quedado la mesa (*código* `firmware/config.py`, `USAR_WATCHDOG = False`).

### 3.2 PIO + DMA

Cada eje usa una **máquina de estados del PIO** a 1 MHz (1 µs por ciclo) que genera los pulsos. El movimiento se codifica como una lista de **segmentos** (n pasos a periodo fijo) en palabras de 32 bits: bits 0–14 = pasos − 1, bit 15 = DIR, bits 16–31 = espera Y (periodo = 2·Y + 7 µs, pulso simétrico). Un **canal DMA** pasa los segmentos al PIO: una vez lanzado, el movimiento ocurre en hardware y el programa puede mandar un lote por Wi-Fi mientras la mesa se mueve. La rampa es **trapezoidal** (hasta 24 tramos) (*código* `firmware/motores.py`).

### 3.3 Recorrido en serpentina

La malla (`grid_nx × grid_ny` por plano, en cada plano de `z_levels_mm`) se recorre en **serpentina continua**: X avanza hasta el final, Y sube un paso y X regresa; al terminar el plano, Z sube un paso y el plano siguiente empieza donde quedó la mesa. Entre dos puntos seguidos solo cambia un índice en ±1. **Contrato idéntico en el firmware y el servidor** (*código* `firmware/barrido.py`, `server/services/geometria.js`):

```
iz   = k // (nx·ny)          r = k % (nx·ny)          fila = r // nx
iy   = fila si iz es par;  ny − 1 − fila si iz es impar
g    = iz·ny + fila
ix   = r % nx si g es par;  nx − 1 − (r % nx) si g es impar
punto = (ix·paso, iy·paso, z_levels[iz])  (redondeado a décimas)
```

Posición de máquina: `x_máquina = inicio.x + SENTIDO_X · xMM` (igual en Y y Z), con el punto de inicio que manda el servidor (por defecto el origen) y sentidos X+, Y+, Z+. **Antes de mover nada** se comprueba que la zona entera cabe en 0–límite; si no, la sesión se rechaza con un error visible en el dashboard.

### 3.4 Latido

`POST /api/dispositivo/latido` cada `intervalo_latido_s` (**5 s**, *base*). Manda firmware, RSSI, uptime, hora y **estado** (`espera`, `homing`, `midiendo`, `calibrando`, `error`), más el texto del error y los límites de la mesa. La respuesta trae `modo_operacion`, `sesion_activa` (malla completa, sensor, `ultimo_seq`, punto de inicio) y `calibracion`. Así la Pico sabe cuándo empezar sin otra tecnología (*código* `firmware/main.py` `latir`, `server/controllers/dispositivo.controller.js`). Tras un **401** (token inválido), se detiene todo, la mesa vuelve al descanso y el latido se reintenta cada 30 s.

### 3.5 Lotes

Cada lectura entra al **búfer** (1000 lecturas, unos 32 kB) con su **seq** ya asignado. Sale un lote de **25 lecturas** o, si hay menos, cuando la más vieja lleva **3 s** esperando. Un lote solo se borra del búfer cuando el servidor responde 200; sin red, con timeout (5 s) o con 5xx, se reenvía **el mismo lote** con espera creciente de 0,25 s a 8 s. 404/409 = la sesión ya no admite lecturas; 400/422 = error del firmware, se descarta con aviso. Si el búfer se llena, el barrido se pausa (*código* `firmware/cliente.py`, `firmware/barrido.py`).

### 3.6 Reanudación por `seq`

El servidor guarda `UNIQUE(sesion_id, seq)`: un lote repetido no duplica nada (cuenta como «duplicadas»). Tras un reinicio, el latido trae `ultimo_seq` y el barrido sigue en `ultimo_seq + 1`; con N lecturas por punto, el seq *s* es la lectura (s − 1) % N del punto (s − 1) // N (*código* `firmware/barrido.py` `reanudar_en`).

### 3.7 Previsualizador de la bobina (`calibracion.py`, desde la 2.4)

Antes de un barrido, el operador elige en la web un punto de la mesa y ve en vivo cuánto campo mide el sensor, para ajustar la corriente de la bobina. Mientras la calibración está activa, el generador: (1) lleva la mesa al objetivo con `mover_a` (límites y orden de ejes); (2) espera 300 ms; (3) mide y manda la lectura a `POST /api/dispositivo/calibracion`, **como mucho una petición por segundo** (5 s tras un fallo); (4) la respuesta trae el objetivo vigente; si es `null`, termina y la mesa vuelve al descanso. **No se guarda nada en la base ni se crean sesiones.** Una sesión de medición manda sobre la calibración (*código* `firmware/calibracion.py`, `server/services/calibracion.js`).

### 3.8 Regreso al descanso

La mesa vuelve al descanso **(0, 0, 0)** al completar, al detener, ante un error, ante un 401 y con Ctrl+C o el botón rojo de Thonny. Si Z tiene que bajar, primero X e Y a la altura actual y después baja Z (*código* `firmware/motores.py` `Mesa.homing`, `firmware/main.py`).

### 3.9 Máquina de estados

Fases internas (`main.py`): `None` (espera), `homing`, `barrido`, `vaciando` (termina de mandar el búfer), `cierre` (regreso al descanso), `calibracion`. Se informan al servidor como `espera`, `homing` (homing y cierre), `midiendo` (barrido y vaciando), `calibrando` y `error`. LED: parpadea desde que se alimenta, fijo con el servidor conectado, destellos con error, parpadeo lento sin token (*código* `firmware/main.py`, `firmware/led.py`).

---

## 4. Servidor (`server/`, `tms-server` 3.0.0)

### 4.1 Arquitectura

Node.js ≥ 20 + **Express 4** + **mysql2**, ESM, patrón **MVC**: rutas → middleware (validación, login, rol, token) → controladores → modelos (todo el SQL), más `services/` para la lógica compartida (*código* `server/`; *CLAUDE.md §3*). Sin librerías extra: contraseñas con `node:crypto` (scrypt), pruebas con `node:test`.

Detrás de **Nginx** (HTTPS, proxy inverso). El `proxy_pass` de Nginx quita el prefijo `/api`, así que Express monta el router en `/api` (desarrollo con Vite) y en `/` (producción) (*CLAUDE.md §2*).

### 4.2 API (resumen)

| Grupo | Rutas | Quién |
|---|---|---|
| Salud | `GET /api/status` | público |
| Login | `/api/auth/login`, `logout`, `yo`, `cambiar-password`, `preferencias` | sesión |
| Usuarios | `/api/usuarios` (listar, crear, cambiar rol o activo, restablecer) | admin |
| Configuración | `GET /api/configuracion`, `PUT /api/configuracion/:clave` | sesión / admin |
| Sesiones de medición | `POST/GET /api/sesiones`, `GET /activa`, `PUT/PATCH/DELETE /:id`, `/restaurar`, `/csv`, `/mediciones` | op / sesión / admin |
| Tiempo real | `GET /api/stream` (SSE) | sesión |
| Dispositivo | `GET /estado`, `POST/DELETE /token`, `PATCH`; `POST /latido`, `/mediciones`, `/calibracion` (con *Bearer*) | sesión / admin / Pico |
| Previsualizador | `GET/POST/PATCH/DELETE /api/calibracion` | sesión / op |

Respuestas siempre en JSON; 400 formato, 401 sin sesión, 403 rol, 404, 409 conflicto de estado, 422 valor inválido (*CLAUDE.md §3–4*).

### 4.3 SSE (tiempo real)

Un solo `EventSource` por navegador. Eventos `medicion`, `sesion`, `configuracion`, `dispositivo`, `calibracion` y `resincronizar`, cada uno con `id:`. Búfer circular de **2000** eventos para reenviar desde `Last-Event-ID` al reconectar; `retry: 3000`; ping cada 25 s (*código* `server/services/tiempoReal.js`; *CLAUDE.md §3*). **Nadie genera datos en el navegador:** todos dibujan lo que llega por SSE.

### 4.4 Ingesta y conversión

Todo dato (simulado o real) pasa por `services/ingesta.js`: valida contra la malla de la sesión (posición dentro de la malla, plano existente), numera o respeta `seq`, convierte, calcula |B| = √(Bx² + By² + Bz²), guarda con la hora del servidor en UTC y difunde. Los lotes de la Pico se insertan en una **transacción con `FOR UPDATE`** sobre la sesión, son **idempotentes** por `(sesion_id, seq)` y responden `{aceptadas, duplicadas, rechazadas}`; máximo 200 lecturas por lote. Las sesiones reales **se cierran solas** cuando llegan todos los seq esperados (*código* `server/services/ingesta.js`, `server/models/Medicion.js`, `server/services/conversionSensor.js`).

Conversión (dos modelos, según la copia del sensor de la sesión):

- **QMC5883P:** crudos −32768..32767; µT = cuentas / `cuentas_por_g` × 100 − offset; saturación = campo `saturado: true` (bit OVFL).
- **HMC5883L** (lo usa el firmware del Hall): crudos −4096..2047; −4096 = desborde.
- Una lectura saturada se guarda con sus crudos, Bx/By/Bz/|B| en NULL y `saturado = 1`; no cuenta para máximos ni mínimos.

### 4.5 Simulador (espira exacta)

En modo simulación, el servidor genera los datos (*código* `server/services/fisicaEspira.js`, `simulacionPura.js`, `simulador.js`):

- **Física:** espira circular de radio *a* con integrales elípticas completas **K(m)** y **E(m)** calculadas por la **media aritmético-geométrica (AGM)** (Jackson; Smythe). En el eje se usa el límite exacto Bz = μ0·I·a² / (2(a² + z²)^{3/2}). Se normaliza para que |B| en el centro, en z = 0, valga `campo_centro_ut`; la altura real es z + *standoff*.
- **Valores por defecto** (*base*): radio 25 mm, centro 120 µT, standoff 5 mm, ruido gaussiano σ = 0,25 µT (Box–Muller), semilla 12345 (mulberry32), 60 ms por punto (DC) o 120 ms (AC), probabilidades de hueco y saturación en 0.
- Recorre la misma serpentina que la Pico, a ritmo marcado con `setTimeout` encadenado, y pasa por la misma ingesta. La semilla y la configuración se copian con la sesión: una sesión simulada se puede reproducir.

### 4.6 Login, roles y token

- **Roles:** `admin` (todo), `operador` (inicia y detiene, notas propias, exporta), `observador` (mira y exporta).
- **Contraseñas** con scrypt y sal de 16 bytes; comparación en tiempo constante.
- **Cookie** `tms_sesion` HttpOnly, SameSite=Strict (Secure en producción), token de 32 bytes del que solo se guarda el SHA-256; 12 h deslizantes; 5 intentos fallidos por usuario e IP en 15 min → 429.
- **Token de la Pico:** lo genera un admin y se muestra una sola vez; se guarda como SHA-256; la Pico lo manda como `Authorization: Bearer`.
- Acceso de desarrollo `admin`/`admin` documentado a propósito (*CLAUDE.md §1*). (*código* `server/services/passwords.js`, `sesionUsuario.js`, `limiteIntentos.js`, `middleware/auth.js`.)

### 4.7 Trazabilidad

Cada sesión guarda quién la inició, copias de la configuración de barrido, sensor, simulación y punto de inicio, versión del software (+ commit) y del firmware, puntos esperados y recibidos, y la lista de **huecos** (puntos sin lectura válida) calculada al cerrar. Borrado lógico y restauración. CSV generado en el servidor con encabezado de metadatos `# clave: valor` y columnas con unidades (*código* `server/services/trazabilidad.js`; *CLAUDE.md §7.4*).

---

## 5. Base de datos (MariaDB, `tms_db`)

Seis tablas (*código* `server/setup_db.sql`; migraciones 002–009 aplicadas, la 001 no, por decisión del usuario):

| Tabla | Columnas clave |
|---|---|
| `usuarios` | id, usuario (único), nombre, rol (admin/operador/observador), hash_password, activo, debe_cambiar_password, preferencias JSON |
| `sesiones_login` | id = SHA-256 del token, usuario_id → usuarios, expira_en, ultimo_uso, ip, user_agent |
| `sesiones` | id, usuario_id → usuarios, modo (DC/AC), origen (sim/hw), paso_mm DECIMAL(4,1), medio, zona_x/y/z_mm, iniciada_en, terminada_en, notas, puntos_esperados, puntos_recibidos, huecos JSON, config_barrido/sensor/simulacion/general JSON, version_software, version_firmware, eliminada_en |
| `mediciones` | id, sesion_id → sesiones (CASCADE), seq, x_mm, y_mm, z_mm, bx, by, bz, magnitud (DOUBLE, µT), raw_x/y/z SMALLINT, saturado, timestamp DATETIME(3), ts_dispositivo; **UNIQUE(sesion_id, seq)** |
| `configuracion` | clave PK, valor JSON, actualizado_en, actualizado_por → usuarios |
| `dispositivos` | id, nombre único, token_hash (SHA-256), activo, ultimo_latido, ip, firmware, rssi, uptime_s |

Todo en **UTC**; posiciones en mm del sistema; campo en µT; nada se redondea antes de guardar.

---

## 6. Web y app móvil

**Web** (`frontend/`, React 18.3 + Vite 5.4, Bootstrap 5, Chart.js 4, Three.js, Plotly gl3d) (*código* `frontend/package.json`, `frontend/src/pages/`):

- **Login** y cambio de contraseña forzado.
- **Dashboard en vivo:** barra de configuración de la medición (velocidad DC/AC, zona, paso, medio), progreso con tiempo estimado y restante, tarjetas KPI, **gráfica de líneas** Bx/By/Bz por posición en la malla, **mapa 3D** de puntos medidos (Three.js), **sábana 3D** de |B| o de una componente (Plotly, exporta SVG y PNG) y tabla de lecturas.
- **Previsualizar bobina** (`?vista=calibracion`): sliders X, Y, Z, estado de la mesa, Bx/By/Bz/|B|, medidor del uso del rango con avisos de **saturado**, **cerca del tope** (≥ 80 %) y **señal baja** (|B| < 2 %).
- **Mediciones pasadas:** filtros (modo, paso, medio, origen, fecha), notas, huecos, CSV, sábana 3D, borrado lógico.
- **Configuración:** General (punto de inicio), Barrido, Sensor (modelo y rango), Simulación, Dispositivo (token), Visualización, Usuarios.
- Tema oscuro, claro o del sistema; navegación en la URL; menú lateral accesible; corrección de escala ×2 y nombres X ↔ Y en la frontera con la API.

**App móvil** «TMS Monitor» (`app/`, Expo SDK 57, React Native 0.86, TypeScript, `tms-app` 3.0.0, `versionCode` 3): replica las vistas de la web contra la **misma API** (HTTP directo al puerto 4000, cookie manual, SSE con `react-native-sse`), gráficas propias en SVG, simulación local sin servidor. **Pendiente:** adaptarla a los nombres X ↔ Y, al previsualizador y a la escala ×2, y probar el APK en un teléfono real (*CLAUDE.md §0.6, §0.9*).

---

## 7. Pruebas

| Conjunto | Resultado | Cuándo | Fuente |
|---|---|---|---|
| Unitarias del servidor (`cd server && npm test`, `node:test`, sin base) | **71/71** | 2026-11-25 | *pruebas* |
| Firmware en el PC (`firmware/pruebas_pc`, CPython con *stubs* de `machine`, `rp2`, I2C y un QMC5883P falso) | **32/32** | 2026-11-25 | *pruebas* |
| Firmware del Hall (`firmware_hall_1d/pruebas_pc`) | «TODO BIEN» | 2026-11-25 | *pruebas* |
| Integración (`npm run test:integracion`, contra `tms_db_test` en una MariaDB temporal) | **11/11** | 2026-11-24 (no se volvió a correr: vacía su base) | *CLAUDE.md §0.11* |
| App (`npm run typecheck`) | sin errores | 2026-11-23 | *CLAUDE.md §0.4* |
| De punta a punta: firmware real en el PC contra un servidor de prueba | barridos, Detener a mitad de un movimiento, caída de Wi-Fi, reanudación, OVFL, 401, previsualizador (23 peticiones en 26,6 s) | 2026-11-12 a 24 | *CLAUDE.md §0.11, §6* |
| Con hardware real | 64 sesiones reales (ver 01-cifras) | 2026-11-12 a 24 | *base* |

Qué cubren las unitarias: simulador contra la fórmula en el eje, conversión de los dos sensores, ingesta de lotes (duplicados, rechazos), trazabilidad y CSV, contraseñas y límite de intentos, validadores (400/422/403/404) y previsualizador. Las del firmware: malla igual a la del servidor, vector de la serpentina 3 × 2 × 2, límites, holgura, orden de ejes (Z sube desde el descanso), sensor y formatos, búfer, `test_detener_no_se_cuelga`, ciclo y ritmo del previsualizador.

---

## 8. Historia de versiones del firmware

| Versión | Fecha | Qué cambió | Sesiones reales (*base*) |
|---|---|---|---|
| `pico-tms-hall1d-0.1` | 2026-11-11 | Firmware de prueba con Hall 49E de un eje | 7 (59–65), 917 lecturas |
| `pico-tms-2.0` | 2026-11-12 | Firmware cliente con el **QMC5883P** y **serpentina**; sin finales de carrera | 9 (66–76), 1 357 |
| `pico-tms-2.1` | 2026-11-13 | Punto de inicio de la medición enviado por el servidor; posición de arranque | 2 (77–78), 19 |
| `pico-tms-2.2` | 2026-11-14 | Nombres de ejes (X corto, Y largo), inicio en el origen, orden de ejes al bajar Z | 18 (79–102), 427 |
| `pico-tms-2.3` | 2026-11-18 | **Pico 2 W:** dirección de CHAN_ABORT del DMA según el chip; descanso (0, 0, 0) | 20 (103–122), 1 760 |
| `pico-tms-2.4` | 2026-11-24 | **Z mide subiendo** (`invertir`), regreso al descanso con Z al final, **previsualizador** y su ritmo de 1 petición/s | 8 (123–130), 922 |

(Fechas de *CLAUDE.md §6 y §0.11*; las de 2.0 y 2.1 se infieren de las notas de esos días.)

---

## 9. Problemas resueltos

1. **Cuelgue del DMA en el RP2350 (2.3, 2026-11-18).** Al pulsar Detener mientras un eje se movía, la Pico 2 W se colgaba: el log terminaba en «Parada…», la mesa no regresaba y el servidor la daba por desconectada. *Causa:* `Eje.detener()` escribía en `0x50000444`, que es CHAN_ABORT del **RP2040**; en el **RP2350** CHAN_ABORT está en `0x50000464` y `0x444` es TIMER1, que guarda lo escrito, así que la espera no terminaba nunca. *Arreglo:* `es_rp2350()` elige la dirección y la espera tiene un límite de 10 ms. Prueba `test_detener_no_se_cuelga` (*código* `firmware/motores.py`; *CLAUDE.md §6*). La prueba en la mesa de Detener a mitad de un movimiento con la Pico 2 W **no quedó registrada**.
2. **Tierras del *shield* (2026-11-18).** Reinicios y desconexiones USB a mitad de la medición; se recableó el bus de tierras (*CLAUDE.md §0.5*).
3. **Ritmo del previsualizador (2026-11-24).** La Pico 2 W perdía el USB y se apagaba a los pocos segundos de calibrar: el bucle mandaba una petición HTTP por lectura cada 150 ms (≈ 6 por segundo, con una conexión TCP nueva cada vez). Se limitó a **una petición por segundo** y 5 s tras un fallo; en el PC, 23 peticiones en 26,6 s. No se pudo distinguir entre caída de voltaje y bloqueo de la pila de red: el arreglo cubre las dos (*código* `firmware/calibracion.py`; *CLAUDE.md §0.11*). **En la mesa: por confirmar.**
4. Otros, del desarrollo: sensor que no respondía (era un QMC5883P, no un HMC5883L); saturación en 1,3 Ga del simulador (rango por defecto 1,9 Ga); ejes intercambiados y descanso contra el tope; Z que bajaba al medir; escala ×2 de los rieles (corregida solo en la web) (*CLAUDE.md §6, §0.11*).

---

## 10. Limitaciones y trabajo futuro

**Limitaciones (decirlas en la exposición):**

- **Apagones esporádicos de la Pico 2 W — sin diagnóstico.** A veces la Pico se apaga sola; a veces vuelve sola y, si no, al sacarla del *shield* y volver a conectarla funciona. Pasa seguido. Sospechas, sin comprobar: alimentación o contacto del *shield*, picos de consumo del radio Wi-Fi, ruido de los TB6600 (*CLAUDE.md §0.9*, 2026-11-25).
- **Escala ×2** corregida solo en la web; el firmware, la base, el CSV y la app siguen en mm del sistema. La causa mecánica está por confirmar.
- **Sin finales de carrera:** la referencia es la posición al encender; un paso perdido corre el origen.
- **Error posicional y holgura no medidos numéricamente** (requisito ±1 mm).
- **Sensores de prueba:** el QMC5883P (200 Hz, ±30 G) no mide el pulso de una bobina TMS.
- Pausas de red de 3–4 s y una de 33 s observadas el 2026-11-24 (el bucle se bloquea durante una petición HTTP; sin pérdida de datos).
- Servidor todavía en la laptop; la Raspberry Pi 5 está pendiente.
- La app móvil no tiene los cambios del 2026-11-24.
- `lecturas_por_punto > 1` y «Medir cero» sin decidir; la solución salina se simula con la misma física.

**Trabajo futuro:** diagnosticar los apagones (medir el voltaje de la Pico con el osciloscopio durante el Wi-Fi y los movimientos, alimentación separada, desacoplo); corregir la escala en el firmware o en la mecánica; finales de carrera y homing real; medir el error posicional; sensor adecuado al pulso TMS; instalación en la Raspberry Pi 5; actualizar la app; modelo físico de la solución salina.
