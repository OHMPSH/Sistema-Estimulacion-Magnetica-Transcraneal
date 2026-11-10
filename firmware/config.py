# ═══════════════════════════════════════════════════════════════
# config.py — pines, mecánica, calibración y tiempos del firmware TMS
#
# Todo lo que dice PENDIENTE depende del montaje real: revísalo antes de
# conectar los motores. Las credenciales (Wi-Fi, token y URL del servidor)
# NO van aquí: van en secretos.py, que no se sube a git (ver
# secretos_ejemplo.py).
#
# Unidades: mm, mm/s, mm/s², ms. Las coordenadas de MÁQUINA cuentan desde
# el origen que deja el homing: (0, 0, 0) queda HOMING_SEPARACION_MM por
# delante del punto en que salta cada final de carrera, así la mesa puede
# volver a 0, 0, 0 sin pisar los interruptores.
# ═══════════════════════════════════════════════════════════════

FIRMWARE = "pico-tms-1.0"          # se manda en cada latido (máx. 40 caracteres)

# ── Sensor HMC5883L (I2C) ──────────────────────────────────────
I2C_ID = 0
PIN_SDA = 4                        # PENDIENTE: GP del cableado real
PIN_SCL = 5                        # PENDIENTE
I2C_FRECUENCIA = 400_000
DIR_SENSOR = 0x1E                  # HMC5883L (0x0D sería un QMC5883L: otro chip)
ASENTAMIENTO_MS = 300              # PENDIENTE: espera tras cada movimiento antes de leer
TIMEOUT_LECTURA_MS = 150           # máximo para que el sensor termine una medición (8 muestras promediadas)

# ── Motores: NEMA 17 + TB6600 ──────────────────────────────────
# TB6600: PUL (STEP), DIR y ENA. Cableado de cátodo común recomendado:
# PUL−, DIR− y ENA− a GND; PUL+, DIR+ y ENA+ a los GPIO (ver README.md).
# pasos_por_mm = 200 pasos/vuelta × micropasos / avance del husillo (mm/vuelta)
#   T8 de 8 mm/vuelta con 1/8 → 200 × 8 / 8 = 200 micropasos por mm
MICROPASOS = 8                     # PENDIENTE: el mismo que los interruptores SW1–SW3 del TB6600
AVANCE_HUSILLO_MM = 8              # PENDIENTE: T8 de 4 hilos = 8 mm/vuelta; de 1 hilo = 2 mm
PASOS_POR_VUELTA = 200             # NEMA 17 de 1,8°

_PASOS_MM = PASOS_POR_VUELTA * MICROPASOS / AVANCE_HUSILLO_MM

# Un diccionario por eje. Pon EJE_Z = None si no hay motor en Z (ver MODO_Z).
#   paso, dir      GPIO de PUL+ y DIR+
#   invertir       True si el eje se mueve al revés de lo esperado
#   pasos_por_mm   se ajusta con la calibración (README.md, sección 5)
#   recorrido_mm   recorrido útil desde el origen del homing
#   final          GPIO del final de carrera en el lado − (None si no hay)
#   final_nc       True si el interruptor es normalmente cerrado (NC)
EJE_X = {
    "paso": 10, "dir": 11, "invertir": False,           # PENDIENTE: pines
    "pasos_por_mm": _PASOS_MM,
    "recorrido_mm": 100.0,                               # PENDIENTE: recorrido útil real
    "final": 18, "final_nc": True,                       # PENDIENTE
}
EJE_Y = {
    "paso": 12, "dir": 13, "invertir": False,
    "pasos_por_mm": _PASOS_MM,
    "recorrido_mm": 100.0,
    "final": 19, "final_nc": True,
}
EJE_Z = {
    "paso": 14, "dir": 15, "invertir": False,
    "pasos_por_mm": _PASOS_MM,
    "recorrido_mm": 25.0,
    "final": 20, "final_nc": True,
}

# Cómo se mueve Z (PENDIENTE):
#   "motor"   otro NEMA 17 con TB6600 (EJE_Z)
#   "manual"  el operador sube el sensor a mano y pulsa PIN_BOTON_Z en cada plano
#   "ninguno" solo se puede medir el plano z = 0
MODO_Z = "motor"
PIN_BOTON_Z = 21                   # botón a GND (pull-up interno); solo con MODO_Z = "manual"

# Habilitación (ENA) común a los tres TB6600. Con cátodo común, ENA+ en alto
# DESHABILITA el driver, así que habilitado = 0. None si ENA no está conectado.
PIN_ENA = 16                       # PENDIENTE
ENA_HABILITADO = 0

# ── Calibración: centro de la bobina en coordenadas de máquina ─
# x_máquina = X_BOBINA_MM − zona_mm.x / 2 + xMM   (igual en Y)
X_BOBINA_MM = 50.0                 # PENDIENTE: medir después del homing (README.md, 5.3)
Y_BOBINA_MM = 50.0                 # PENDIENTE
# Posición de máquina de Z en la que el sensor queda en el plano z = 0 (el standoff).
# z_máquina = Z_CERO_MM + zMM. Con 0, el plano z = 0 es el origen de Z tras el homing.
Z_CERO_MM = 0.0                    # PENDIENTE: medir (README.md, 5.4)
# Margen que la mesa no usa junto al origen (0 = puede llegar al mismo origen)
MARGEN_ORIGEN_MM = 0.0

# ── Movimiento ─────────────────────────────────────────────────
VEL_MAX_MM_S = 20.0                # velocidad de crucero
ACEL_MM_S2 = 100.0                 # rampa trapezoidal
VEL_INICIO_MM_S = 2.0              # velocidad con la que arranca y termina cada rampa
FRECUENCIA_MAX_HZ = 15_000         # el TB6600 admite unos 20 kHz; se deja margen
# Aproximación unidireccional contra el juego del husillo: si un movimiento va
# en sentido −, se pasa este tanto y vuelve en sentido +. 0 la desactiva.
HOLGURA_MM = 0.5

# Homing: rápido hasta tocar el final, retrocede, se acerca lento y se separa.
HOMING_VEL_RAPIDA_MM_S = 8.0
HOMING_VEL_LENTA_MM_S = 1.0
HOMING_RETROCESO_MM = 3.0
HOMING_SEPARACION_MM = 1.0         # distancia entre el disparo del final y el origen (0, 0, 0)
HOMING_MAX_MM = 150.0              # si no toca el final en este recorrido, es un error

# ── Envío al servidor ──────────────────────────────────────────
TAMANO_LOTE = 25                   # 20 a 50 (máximo del servidor: 200)
MAX_ESPERA_LOTE_MS = 3000          # manda un lote incompleto si la lectura más vieja lleva tanto esperando
MAX_BUFER = 1000                   # lecturas en RAM (~32 kB); lleno = el barrido se pausa
ESPERA_REINTENTO_MIN_MS = 250
ESPERA_REINTENTO_MAX_MS = 8000
TIMEOUT_HTTP_S = 5                 # debe ser menor que el watchdog
LATIDO_401_REINTENTO_S = 30        # tras un 401 se vuelve a probar cada tanto

# ── Red ────────────────────────────────────────────────────────
NTP_HOST = "pool.ntp.org"
NTP_RESINCRONIZAR_S = 3600
WIFI_REINTENTO_S = 10

# ── Sistema ────────────────────────────────────────────────────
# Watchdog del RP2040 (tope de 8,3 s). Una vez activo NO se puede apagar: si se
# detiene el programa (Ctrl+C, botón Detener de Thonny), la Pico se reinicia a
# los 8 s. Por eso viene apagado. Actívalo solo cuando el firmware ya esté
# calibrado y desatendido: a cambio, la Pico se reinicia sola si se cuelga.
USAR_WATCHDOG = False
WATCHDOG_MS = 8000
