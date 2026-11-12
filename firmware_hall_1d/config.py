# ═══════════════════════════════════════════════════════════════
# config.py — firmware de PRUEBA con el sensor Hall 49E (un eje)
#
# Es una copia del firmware de firmware/ con tres cambios:
#   - El sensor es un Hall lineal 49E en GP26/ADC0 que mide un solo eje
#     (la altura, Z). Bx y By se mandan como 0.
#   - No hay finales de carrera: la posición en que está la mesa al
#     arrancar el programa es el origen (0, 0, 0), y los límites de
#     software no dejan salir de 0–LIMITE en ningún eje.
#   - La zona de la sesión empieza en ORIGEN_ZONA_MM (por defecto el
#     propio origen), no centrada bajo la bobina.
#
# Las credenciales (Wi-Fi, token y URL del servidor) van en secretos.py
# (ver secretos_ejemplo.py), que no se sube a git.
#
# Unidades: mm, mm/s, mm/s², ms.
# ═══════════════════════════════════════════════════════════════

FIRMWARE = "pico-tms-hall1d-0.1"   # se manda en cada latido (máx. 40 caracteres)

# ── Límites de la mesa (medidos con prueba_calibracion.py) ─────
# Desde el origen (la posición al arrancar) hasta estos valores. La mesa
# nunca va a menos de 0 ni a más del límite: un movimiento fuera se
# rechaza ANTES de dar un solo pulso.
LIMITE_X_MM = 410.0
LIMITE_Y_MM = 562.0
LIMITE_Z_MM = 88.0

# ── Sensor Hall 49E (salida analógica) ─────────────────────────
# VCC → 3V3(OUT) pin 36 · GND → AGND pin 33 · OUT → GP26/ADC0 pin 31
CANAL_ADC = 0                      # ADC0 = GP26
V_REF = 3.3                        # referencia del ADC (V)
V_ALIMENTACION = 3.3               # alimentación del sensor (V). ¡No uses 5 V!
# Sensibilidad típica del SS49E: 1,4 mV/G = 14 mV/mT con 5 V; es
# radiométrica, así que se escala a la alimentación real.
SENSIBILIDAD_MV_POR_MT_5V = 14.0
MUESTRAS_ADC = 256                 # lecturas del ADC promediadas por medición
CALIBRACION_CERO_MS = 2000         # al arrancar: promedia la salida sin campo
# Si ya conoces la tensión sin campo (V), ponla aquí y no se calibra al arrancar.
CERO_FIJO_V = None
MARGEN_SATURACION_V = 0.2          # a menos de esto de 0 V o de V_ALIMENTACION = saturado
ASENTAMIENTO_MS = 300              # espera tras cada movimiento antes de leer

# Cómo se manda el campo al servidor. El servidor solo entiende "cuentas"
# del HMC5883L (−4096 a 2047) y las convierte a µT con la ganancia de
# Configuración › Sensor (1,9 Ga por defecto = ±249,6 µT). El Hall mide
# decenas de mT, así que en µT reales todo saturaría.
#   "mT"  el número que muestra el dashboard (rotulado µT) son mT.
#         Con 1,9 Ga: ±249,6 mT de rango y 0,12 mT de resolución,
#         parecida a la del ADC de la Pico (≈ 0,09 mT). RECOMENDADO.
#   "uT"  µT reales: solo sirve para campos de menos de ±249,6 µT
#         (±890 µT con 8,1 Ga), casi al nivel de la resolución del Hall.
UNIDAD_ENVIO = "mT"
MOSTRAR_LECTURAS = True            # imprime cada lectura en la consola de Thonny

# ── Motores: NEMA 17 + TB6600 (los de prueba_calibracion.py) ───
# Factores de prueba_calibracion.py: si allí los corregiste, copia aquí
# los valores finales (PASOS_POR_MM_X, _Y, _Z) y las inversiones.
#   paso, dir      GPIO de PUL+ y DIR+
#   invertir       True si el eje se mueve al revés de lo esperado
#   pasos_por_mm   pulsos por milímetro
#   recorrido_mm   límite de software (no tocar: sale de LIMITE_*)
#   final          None: sin final de carrera (el origen es la posición al arrancar)
EJE_X = {
    "paso": 10, "dir": 11, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_X_MM,
    "final": None,
}
EJE_Y = {
    "paso": 12, "dir": 13, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_Y_MM,
    "final": None,
}
EJE_Z = {
    "paso": 14, "dir": 15, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_Z_MM,
    "final": None,
}
MODO_Z = "motor"                   # "motor", o "ninguno" si solo se mide el plano z = 0
PIN_BOTON_Z = 21                   # no se usa en esta versión (sin modo manual)

# Habilitación (ENA) común a los tres TB6600: ENA+ en 0 = habilitado.
# Los drivers quedan habilitados TODO el tiempo que corre el programa:
# así los motores sostienen la posición y el origen no se pierde.
PIN_ENA = 16
ENA_HABILITADO = 0

# ── Dónde empieza la zona de la sesión (coordenadas de máquina) ─
# x_máquina = ORIGEN_ZONA_X_MM + xMM   (igual en Y y en Z)
# Con 0, 0, 0 el punto (0, 0, 0) de la sesión es la posición al arrancar.
ORIGEN_ZONA_X_MM = 0.0
ORIGEN_ZONA_Y_MM = 0.0
ORIGEN_ZONA_Z_MM = 0.0

# ── Movimiento ─────────────────────────────────────────────────
# prueba_calibracion.py usa un medio periodo de 100 µs (100 mm/s con 50
# pulsos/mm) y arranca a unos 6 mm/s. Si un motor vibra o se salta pasos,
# baja VEL_MAX_MM_S: sin finales de carrera, un paso perdido corre el origen.
VEL_MAX_MM_S = 60.0                # velocidad de crucero
ACEL_MM_S2 = 300.0                 # rampa trapezoidal
VEL_INICIO_MM_S = 6.0              # velocidad con la que arranca y termina cada rampa
FRECUENCIA_MAX_HZ = 15_000
# Aproximación unidireccional contra el juego del husillo: si un movimiento va
# en sentido −, se pasa este tanto y vuelve en sentido +. Nunca baja de 0.
HOLGURA_MM = 0.5
MARGEN_ORIGEN_MM = 0.0

# Solo los usa motores.py con finales de carrera (aquí no hay)
HOMING_VEL_RAPIDA_MM_S = 8.0
HOMING_VEL_LENTA_MM_S = 1.0
HOMING_RETROCESO_MM = 3.0
HOMING_SEPARACION_MM = 1.0
HOMING_MAX_MM = 600.0

# ── Envío al servidor ──────────────────────────────────────────
TAMANO_LOTE = 25                   # 20 a 50 (máximo del servidor: 200)
MAX_ESPERA_LOTE_MS = 3000          # manda un lote incompleto si la lectura más vieja lleva tanto esperando
MAX_BUFER = 1000                   # lecturas en RAM (~32 kB); lleno = el barrido se pausa
ESPERA_REINTENTO_MIN_MS = 250
ESPERA_REINTENTO_MAX_MS = 8000
TIMEOUT_HTTP_S = 5
LATIDO_401_REINTENTO_S = 30

# ── Red ────────────────────────────────────────────────────────
# Sin internet, el NTP falla (se reintenta cada minuto) y las lecturas se
# mandan sin hora del dispositivo: el servidor les pone la suya.
NTP_HOST = "pool.ntp.org"
NTP_RESINCRONIZAR_S = 3600
WIFI_REINTENTO_S = 10

# ── Sistema ────────────────────────────────────────────────────
# Sin watchdog: un reinicio tomaría como origen la posición en que haya
# quedado la mesa.
USAR_WATCHDOG = False
WATCHDOG_MS = 8000
