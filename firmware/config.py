# ═══════════════════════════════════════════════════════════════
# config.py — pines, mecánica, sensor y tiempos del firmware TMS
#
# Firmware cliente final de la Pico W: magnetómetro QMC5883P de 3 ejes,
# mesa XYZ con NEMA 17 y TB6600, recorrido de la malla en serpentina.
# Se comporta igual que el firmware de prueba del Hall (firmware_hall_1d/):
#   - No hay finales de carrera: la posición en que está la mesa al
#     arrancar el programa es el origen (0, 0, 0), y los límites de
#     software no dejan salir de 0–LIMITE en ningún eje.
#   - La zona de la sesión empieza en ORIGEN_ZONA_*_MM (por defecto, el
#     propio origen), no centrada bajo la bobina.
#
# Las credenciales (Wi-Fi, token y URL del servidor) NO van aquí: van en
# secretos.py (ver secretos_ejemplo.py), que no se sube a git.
#
# Unidades: mm, mm/s, mm/s², ms, µT.
# ═══════════════════════════════════════════════════════════════

FIRMWARE = "pico-tms-2.0"          # se manda en cada latido (máx. 40 caracteres)

# ── Límites de la mesa (medidos con prueba_calibracion.py) ─────
# Desde el origen (la posición al arrancar) hasta estos valores. La mesa
# nunca va a menos de 0 ni a más del límite: un movimiento fuera se
# rechaza ANTES de dar un solo pulso.
LIMITE_X_MM = 410.0
LIMITE_Y_MM = 562.0
LIMITE_Z_MM = 88.0

# ── Magnetómetro QMC5883P (I2C) ────────────────────────────────
# SDA → GP0 (pin 1) · SCL → GP1 (pin 2) · VCC → 3V3(OUT) (pin 36) · GND → pin 38
# Ficha completa: docs/sensor-qmc5883p.md
I2C_ID = 0
PIN_SDA = 0
PIN_SCL = 1
I2C_FRECUENCIA = 100_000
DIR_SENSOR = 0x2C                  # QMC5883P (0x1E sería un HMC5883L y 0x0D un QMC5883L)
PROMEDIO_QMC = 10                  # lecturas promediadas por medición (200 Hz: unos 50 ms)
TIMEOUT_DRDY_MS = 100              # máximo de espera de cada dato nuevo (DRDY)
# Rango con el que se mide el fondo y con el que se mide si el servidor
# todavía espera un HMC5883L (ver «Formato de las lecturas» en README.md).
# 30 G es el único que no satura nunca dentro de lo que caben las cuentas HMC.
RANGO_G_PREDETERMINADO = 30
# Fondo (Tierra + entorno) con la mesa en el origen y la bobina apagada:
# se mide al arrancar y, en espera, con el botón BOOTSEL.
LECTURAS_FONDO = 100
# False (recomendado): las cuentas se mandan crudas y el fondo se resta en
# el servidor si se copia en Configuración › Sensor › offset_ut. Así el
# dato crudo queda guardado tal cual lo midió el chip.
# True: la Pico resta su fondo antes de mandar (deja offset_ut en 0).
RESTAR_FONDO_EN_PICO = False
ASENTAMIENTO_MS = 300              # espera tras cada movimiento antes de leer
MOSTRAR_LECTURAS = True            # imprime cada lectura en la consola de Thonny

# ── Motores: NEMA 17 + TB6600 (los de prueba_calibracion.py) ───
# Factores de prueba_calibracion.py: si allí los corregiste, copia aquí
# los valores finales (PASOS_POR_MM_X, _Y, _Z) y las inversiones.
#   paso, dir      GPIO de PUL+ y DIR+
#   invertir       True si el eje se mueve al revés de lo esperado
#   pasos_por_mm   pulsos por milímetro
#   recorrido_mm   límite de software (no tocar: sale de LIMITE_*)
#   final          None: sin final de carrera (el origen es la posición al
#                  arrancar). Con interruptores: GPIO del lado − y
#                  "final_nc": True (motores.py ya sabe hacer el homing).
#   holgura_mm     compensación del juego del husillo (ver HOLGURA_MM)
#
# Aproximación unidireccional contra el juego del husillo: si un movimiento
# de ese eje va en sentido −, se pasa holgura_mm y vuelve en sentido +, así
# cada punto se alcanza siempre desde el mismo lado. Con la serpentina, la
# mitad de las filas van en X−: cada punto de esas filas hace ese vaivén
# (unos 0,06 s más por punto; README.md, sección 6). 0 la desactiva en ese eje.
HOLGURA_MM = 0.5
EJE_X = {
    "paso": 10, "dir": 11, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_X_MM,
    "final": None,
    "holgura_mm": HOLGURA_MM,
}
EJE_Y = {
    "paso": 12, "dir": 13, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_Y_MM,
    "final": None,
    "holgura_mm": HOLGURA_MM,
}
EJE_Z = {
    "paso": 14, "dir": 15, "invertir": False,
    "pasos_por_mm": 50.0,
    "recorrido_mm": LIMITE_Z_MM,
    "final": None,
    "holgura_mm": HOLGURA_MM,
}
MODO_Z = "motor"                   # "motor", o "ninguno" si solo se mide el plano z = 0

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
FRECUENCIA_MAX_HZ = 15_000         # el TB6600 admite unos 20 kHz; se deja margen
MARGEN_ORIGEN_MM = 0.0

# Solo los usa motores.py con finales de carrera (hoy no hay)
HOMING_VEL_RAPIDA_MM_S = 8.0
HOMING_VEL_LENTA_MM_S = 1.0
HOMING_RETROCESO_MM = 3.0
HOMING_SEPARACION_MM = 1.0         # distancia entre el disparo del final y el origen (0, 0, 0)
HOMING_MAX_MM = 600.0              # si no toca el final en este recorrido, es un error

# ── Envío al servidor ──────────────────────────────────────────
TAMANO_LOTE = 25                   # 20 a 50 (máximo del servidor: 200)
MAX_ESPERA_LOTE_MS = 3000          # manda un lote incompleto si la lectura más vieja lleva tanto esperando
MAX_BUFER = 1000                   # lecturas en RAM (~32 kB); lleno = el barrido se pausa
ESPERA_REINTENTO_MIN_MS = 250
ESPERA_REINTENTO_MAX_MS = 8000
TIMEOUT_HTTP_S = 5
LATIDO_401_REINTENTO_S = 30        # tras un 401 se vuelve a probar cada tanto

# ── Red ────────────────────────────────────────────────────────
# Sin internet, el NTP falla (se reintenta cada minuto) y las lecturas se
# mandan sin hora del dispositivo: el servidor les pone la suya.
NTP_HOST = "pool.ntp.org"
NTP_RESINCRONIZAR_S = 3600
WIFI_REINTENTO_S = 10

# ── Sistema ────────────────────────────────────────────────────
# Sin watchdog ni machine.reset(): un reinicio tomaría como origen la
# posición en que haya quedado la mesa.
USAR_WATCHDOG = False
WATCHDOG_MS = 8000
