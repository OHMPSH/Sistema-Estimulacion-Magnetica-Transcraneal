# Cifras reales verificadas

**Fecha de corte:** 2026-11-25 (base consultada a las 18:49 UTC, solo `SELECT`). Commit `521c47b`.
**Regla de la escala:** el sistema trabaja en «mm del sistema»; **mm reales = mm del sistema ÷ 2** (`frontend/src/utils/escalaMM.js`, `FACTOR_MM = 2`). Que el factor también valga en Z y en todas las sesiones anteriores está **por confirmar**. Los recorridos físicos reales también están **por confirmar** (ver [PREGUNTAS.md](PREGUNTAS.md)).

## 1. Mecánica

| Magnitud | Valor en el código | En mm reales | Fuente |
|---|---|---|---|
| Pulsos por mm (X, Y, Z) | 50 pulsos/mm | **100 pulsos/mm** (derivado: 0,01 mm por pulso) | `firmware/config.py` `pasos_por_mm` |
| Recorrido eje corto (x interno; «Y» en la web) | 0–410 mm | 0–205 mm | `LIMITE_X_MM` |
| Recorrido eje largo (y interno; «X» en la web) | 0–562 mm | 0–281 mm | `LIMITE_Y_MM` |
| Recorrido Z | 0–88 mm | 0–44 mm | `LIMITE_Z_MM` |
| Límites de la base configurados en el servidor | 400 × 500 × 60 mm | 200 × 250 × 30 mm | *base*, `configuracion.barrido` |
| Paso predeterminado | 10 mm | 5 mm | *base*, `configuracion.barrido` |
| Velocidad de crucero | 60 mm/s | 30 mm/s | `VEL_MAX_MM_S` |
| Aceleración (trapezoidal) | 300 mm/s² | 150 mm/s² | `ACEL_MM_S2` |
| Velocidad al arrancar y frenar | 6 mm/s | 3 mm/s | `VEL_INICIO_MM_S` |
| Frecuencia máxima de pulsos | 15 kHz (el TB6600 admite unos 20 kHz) | — | `FRECUENCIA_MAX_HZ` |
| Reloj del PIO | 1 MHz (1 µs por ciclo) | — | `firmware/motores.py` `FREQ_SM` |
| Holgura compensada (aproximación en +) | 0,5 mm | 0,25 mm | `HOLGURA_MM` |
| Asentamiento antes de medir | 300 ms | — | `ASENTAMIENTO_MS` |
| Descanso e inicio de la medición | (0, 0, 0), Z abajo junto a la bobina | — | `POSICION_ARRANQUE_*`, `INICIO_MEDICION_MM` |
| Paso mínimo / máximo aceptado | 1 mm / 300 mm | 0,5 mm / 150 mm | `server/services/geometria.js` |
| Máximo de puntos por sesión | 25 000 | — | `MAX_PUNTOS_SESION` |
| Requisito de error posicional | < ±1 mm | **no medido** | *CLAUDE.md §1*, §0.9 |
| Drivers TB6600 | 400 pulsos/vuelta (DIP) | — | usuario, 2026-11-25 |
| Fuente de los motores | 12 V | — | usuario, 2026-11-25 |
| Bobina en doble D | ~200 × 125 mm por fuera (aproximada) | — | usuario, 2026-11-25 |
| Corriente de la bobina | constante, 0,5–1 A | — | usuario, 2026-11-25 |

## 2. Sensor QMC5883P

| Magnitud | Valor | Fuente |
|---|---|---|
| Bus y dirección | I2C0 a 100 kHz, 0x2C, Chip ID 0x80 | `firmware/config.py`, `firmware/sensor.py` |
| Frecuencia de datos | 200 Hz (`0x0A ← 0xCD`) | `sensor.py` |
| Promedio por punto | 10 lecturas (≈ 50 ms a 200 Hz) | `PROMEDIO_QMC` |
| Espera máxima de DRDY | 100 ms | `TIMEOUT_DRDY_MS` |
| Lecturas para el fondo | 100, en 30 G | `LECTURAS_FONDO` |
| Rango en uso | 30 G, 1000 cuentas/G, offset (0, 0, 0) | *base*, `configuracion.sensor` |
| Rangos y fondos de escala | 30 G: ±3000 µT nominal / 3276,7 µT real · 12 G: ±1200 / 1310,7 · 8 G: ±800 / 873,8 · 2 G: ±200 / 218,4 | `sensor.py` `RANGOS`; fondo = 32767 / (cuentas/G) × 100 |
| Resolución en 30 G | 1 cuenta = 0,1 µT | 100 / 1000 |
| Avisos del previsualizador | saturado (OVFL), cerca del tope ≥ 80 % del rango, señal baja \|B\| < 2 % | *CLAUDE.md §0.11* (`CalibracionPage.jsx`) |
| Hall 49E (firmware de prueba) | ≈ 9,24 mV/mT; ≈ 0,09 mT por cuenta del ADC; 256 muestras por medición | *CLAUDE.md §1*; `firmware_hall_1d/config.py` |

## 3. Comunicación

| Magnitud | Valor | Fuente |
|---|---|---|
| Intervalo del latido | 5 s | *base*, `configuracion.dispositivo` |
| Umbral para «sin señal» | 15 s | *base* |
| Lote | 25 lecturas, o 3 s desde la lectura más vieja | `TAMANO_LOTE`, `MAX_ESPERA_LOTE_MS` |
| Máximo por lote en el servidor | 200 lecturas | `server/services/conversionSensor.js` |
| Búfer en la Pico | 1000 lecturas (~32 kB) | `MAX_BUFER` |
| Reintentos | espera creciente de 0,25 a 8 s | `ESPERA_REINTENTO_MIN/MAX_MS` |
| Timeout HTTP | 5 s | `TIMEOUT_HTTP_S` |
| Tras un 401 | latido cada 30 s | `LATIDO_401_REINTENTO_S` |
| NTP | `pool.ntp.org`, cada hora | `NTP_RESINCRONIZAR_S` |
| Previsualizador | máximo 1 petición por segundo; 5 s tras un fallo | `CALIBRACION_PAUSA_MS`, `CALIBRACION_ESPERA_FALLO_MS` |
| SSE | búfer de 2000 eventos, `retry` 3000 ms, ping cada 25 s | `server/services/tiempoReal.js`; *CLAUDE.md §3* |
| Login | cookie de 12 h deslizante; 5 intentos por usuario e IP en 15 min | *CLAUDE.md §3* |

## 4. Simulador (configuración vigente)

| Parámetro | Valor | Fuente |
|---|---|---|
| Modelo | espira circular exacta, K(m) y E(m) por AGM | `server/services/fisicaEspira.js` |
| Radio de la espira | 25 mm | *base*, `configuracion.simulacion` |
| \|B\| en el centro (z = 0) | 120 µT | *base* |
| Standoff | 5 mm | *base*, `configuracion.barrido` |
| Ruido | gaussiano, σ = 0,25 µT | *base* |
| Semilla | 12345 (mulberry32) | *base* |
| Ritmo | 60 ms por punto (DC) / 120 ms (AC) | *base* |

## 5. Software y pruebas

| Elemento | Valor | Fuente |
|---|---|---|
| Servidor | `tms-server` 3.0.0, Node ≥ 20 (22.23.4), Express 4, mysql2 3 | `server/package.json`; `node -v` |
| Web | `tms-frontend` 2.0.0, React 18.3.1, Vite 5.4.21 | `frontend/package.json`; *CLAUDE.md §0.1* |
| App | `tms-app` 3.0.0, `versionCode` 3, Expo SDK 57 | `app/package.json`, `app/app.json` |
| Firmware | `pico-tms-2.4` | `firmware/config.py` |
| Pruebas unitarias del servidor | 71/71 | ejecutadas 2026-11-25 |
| Pruebas del firmware en el PC | 32/32 | ejecutadas 2026-11-25 |
| Firmware del Hall | «TODO BIEN» | ejecutado 2026-11-25 |
| Integración | 11/11 | 2026-11-24 (*CLAUDE.md §0.11*) |

## 6. Datos de la base (`tms_db`, 2026-11-25)

### 6.1 Totales

| Dato | Valor |
|---|---|
| Sesiones | **97**: 33 simuladas (ids 7–88) y **64 reales** (ids 59–130); ninguna abierta ni eliminada |
| Lecturas | **30 667**: 25 265 simuladas y **5 402 reales** |
| Primera y última sesión real | 2026-11-12 00:50 UTC y 2026-11-24 23:18 UTC |
| Sesiones reales completas (todos los puntos esperados) | **26** (3 862 puntos) |
| Lecturas reales saturadas | 92, todas en las sesiones 66 (85, modo HMC5883L), 67 (5) y 69 (2), con el firmware 2.0. **Ninguna desde la 70** |
| Usuarios | 3 (uno por rol) |
| Dispositivo | `pico-w-1`, activo, con token; último latido 2026-11-24 23:19 UTC con `pico-tms-2.4`, RSSI −58 dBm |

### 6.2 Sesiones reales por firmware

| Firmware | Sesiones | Ids | Lecturas |
|---|---|---|---|
| `pico-tms-hall1d-0.1` | 7 | 59–65 | 917 |
| `pico-tms-2.0` | 9 | 66–76 | 1 357 |
| `pico-tms-2.1` | 2 | 77–78 | 19 |
| `pico-tms-2.2` | 18 | 79–102 | 427 |
| `pico-tms-2.3` | 20 | 103–122 | 1 760 |
| `pico-tms-2.4` | 8 | 123–130 | 922 |

### 6.3 Barridos reales completos con el QMC5883P desde el 2026-11-17

Zona en **mm reales** (sistema ÷ 2), como «eje corto × eje largo × Z». Hora del centro de México (UTC−6). s/punto = (última − primera lectura) / (n − 1), con la hora de la Pico.

| Sesión | Firmware | Zona real (mm) | Paso real | Puntos | Duración | s/punto | Fecha |
|---|---|---|---|---|---|---|---|
| 92 | 2.2 | 25 × 25 × 10 | 5 | 108 | 2 min 9 s | 1,14 | 2026-11-17 18:58 |
| 93 | 2.2 | 25 × 25 × 15 | 5 | 144 | 2 min 25 s | 0,95 | 2026-11-17 19:03 (capturas de la tesis) |
| 94 | 2.2 | 10 × 10 × 10 | 5 | 27 | 23 s | 0,75 | 2026-11-17 19:20 |
| 108 | 2.3 | 15 × 15 × 2,5 | 5 | 16 | 16 s | 0,89 | 2026-11-18 17:43 |
| 109 | 2.3 | 30 × 30 × 2,5 | 5 | 49 | 37 s | 0,72 | 2026-11-18 17:44 |
| **113** | 2.3 | **90 × 50 × 0** | **2,5** | **777** | **9 min 26 s** | 0,73 | 2026-11-18 18:03 |
| 116 | 2.3 | 90 × 150 × 0 | 15 | 77 | 1 min 27 s | 1,08 | 2026-11-18 18:14 |
| 117 | 2.3 | 110 × 250 × 0 | 15 | 136 | 2 min 40 s | 1,15 | 2026-11-18 18:18 |
| 120 | 2.3 | 50 × 200 × 0 | 15 | 56 | 1 min 2 s | 1,09 | 2026-11-19 17:37 |
| 121 | 2.3 | 100 × 200 × 0 | 15 | 98 | 1 min 57 s | 1,20 | 2026-11-19 18:06 |
| 122 | 2.3 | 100 × 200 × 0 | 15 | 98 | 2 min 32 s | 1,53 | 2026-11-19 18:26 |
| 124 | 2.4 | 100 × 200 × 5 | 10 | 231 | 4 min 23 s | 1,09 | 2026-11-24 15:32 |
| 126 | 2.4 | 125 × 200 × 15 | 15 | 252 | 5 min 36 s | 1,34 | 2026-11-24 15:39 |
| 127 | 2.4 | 125 × 200 × 15 | 15 | 252 | 6 min 22 s | 1,50 | 2026-11-24 16:34 |
| 128 | 2.4 | 110 × 200 × 0 | 20 | 66 | 1 min 36 s | 1,43 | 2026-11-24 16:57 |
| 130 | 2.4 | 110 × 200 × 0 | 20 | 66 | 1 min 33 s | 1,30 | 2026-11-24 17:18 |

Todas con 0 huecos y 0 saturadas, QMC5883P en 30 G, inicio (0, 0, 0), y se cerraron solas al completar la malla.

### 6.4 Ritmo y huecos

| Dato | Valor | Cómo se calculó |
|---|---|---|
| **Barrido real más grande** | sesión 113: **777 puntos** en 9 min 26 s (90 × 50 mm reales, paso 2,5 mm, un plano) | `MAX(puntos_recibidos)` en `origen = 'hw'` |
| Barrido simulado más grande | sesión 88: 3 087 puntos (100 × 100 × 30 mm del sistema, paso 5) | ídem en `origen = 'sim'` |
| **Segundos por punto (real)** | **mediana 0,97 s**; de 0,72 a 1,53 s (26 sesiones completas) | (última − primera lectura) / (n − 1) |
| Puntos por minuto (real, mediana) | ≈ 62 | 60 / 0,965 |
| Ritmo con paso grande | 1,1–1,5 s por punto con pasos de 15–20 mm reales (más recorrido entre puntos) | sesiones 116–130 |
| **Tasa de huecos en barridos completos** | **92 de 3 862 puntos (2,4 %)**, todos por saturación en las sesiones 66, 67 y 69 (firmware 2.0); **0 % desde la sesión 70** (sin un solo punto perdido por la red) | `SUM(huecos.total) / SUM(puntos_esperados)` en sesiones completas |
| Sesiones reales cortadas | 27 de las 53 cerradas con lecturas no se completaron: casi todas se detuvieron a propósito (pruebas de arranque y de Detener) | *CLAUDE.md §0.3*; *base* |

> **Cuidado al presentar los huecos:** un hueco es un punto sin lectura válida. En las sesiones detenidas a propósito los «huecos» son los puntos que no se llegaron a medir; por eso la tasa se calcula solo sobre barridos completos.

### 6.5 Consultas usadas

Las consultas están en el *scratchpad* de la sesión del 2026-11-25 (fuera del proyecto). Las esenciales, para repetirlas:

```sql
SELECT origen, COUNT(*) FROM sesiones GROUP BY origen;
SELECT s.origen, COUNT(m.id), SUM(m.saturado) FROM sesiones s LEFT JOIN mediciones m ON m.sesion_id = s.id GROUP BY s.origen;
SELECT version_firmware, COUNT(*), MIN(id), MAX(id), SUM(puntos_recibidos) FROM sesiones WHERE origen = 'hw' GROUP BY version_firmware;
SELECT COUNT(*), SUM(puntos_esperados), SUM(JSON_EXTRACT(huecos, '$.total'))
  FROM sesiones WHERE origen = 'hw' AND puntos_recibidos >= puntos_esperados AND puntos_esperados > 0;
SELECT TIMESTAMPDIFF(MICROSECOND, MIN(COALESCE(ts_dispositivo, timestamp)), MAX(COALESCE(ts_dispositivo, timestamp))) / 1e6 / (COUNT(*) - 1)
  FROM mediciones WHERE sesion_id = 113;
```
