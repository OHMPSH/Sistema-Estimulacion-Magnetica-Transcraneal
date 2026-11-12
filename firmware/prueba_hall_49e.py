# ═══════════════════════════════════════════════════════════════
# prueba_hall_49e.py — ¿mide el sensor Hall lineal 49E? (Thonny)
#
# Programa independiente: no usa config.py ni el resto del firmware.
# Ábrelo en Thonny con la Pico W conectada y pulsa F5 (Ejecutar).
#
# El 49E (SS49E, OH49E…) es un sensor Hall LINEAL de UN eje: da una
# tensión analógica proporcional al campo perpendicular a su cara
# rotulada. Sin campo, la salida queda a la mitad de la alimentación
# (≈ 1,65 V con 3,3 V); un polo del imán la sube y el otro la baja.
# Como mide un solo eje, aquí ese eje es Bz y Bx = By = 0 (nominales).
#
# Qué hace:
#   1. Calibra el cero: promedia la salida durante 2 s. NO acerques
#      imanes mientras dice "Calibrando".
#   2. Lee sin parar y muestra la tensión, Bz en mT y en µT, y |B|.
#      Al pulsar el botón BOOTSEL de la Pico vuelve a calibrar el cero.
#      Ctrl+C (o el botón rojo de Thonny) lo detiene.
#
# Qué esperar:
#   - Con 3,3 V la sensibilidad típica es de unos 9 mV/mT y el ADC de la
#     Pico resuelve 0,8 mV, así que el paso mínimo es de ≈ 0,1 mT (100 µT).
#     El campo de la Tierra (≈ 0,05 mT) NO se ve; un imán sí, y mucho
#     (decenas de mT a pocos centímetros).
#   - Cerca de 0 V o de 3,3 V el sensor está saturado (más de ≈ ±150 mT).
#
# CONEXIONES (sensor suelto, cápsula TO-92 con la cara rotulada hacia ti
# y las patas hacia abajo; de izquierda a derecha):
#   pata 1  VCC  → 3V3(OUT)      pin físico 36
#   pata 2  GND  → AGND          pin físico 33 (o cualquier GND)
#   pata 3  OUT  → GP26 / ADC0   pin físico 31
# Opcional: un capacitor de 100 nF entre VCC y GND, junto al sensor.
# ¡Aliméntalo con 3,3 V, NO con 5 V (VBUS/VSYS)! Con 5 V la salida puede
# pasar de 3,3 V y dañar la entrada analógica de la Pico.
# ═══════════════════════════════════════════════════════════════
import time
from machine import ADC

try:
    from rp2 import bootsel_button
except ImportError:
    bootsel_button = None

# ── Ajustes ─────────────────────────────────────────────────────
CANAL_ADC = 0              # ADC0 = GP26 (pin físico 31)
V_REF = 3.3                # referencia del ADC de la Pico (V)
V_ALIMENTACION = 3.3       # tensión con la que alimentas el sensor (V)

# Sensibilidad típica del SS49E: 1,4 mV/G = 14 mV/mT con 5 V. Es
# radiométrica (proporcional a la alimentación), así que se escala a la
# alimentación real. Cuando la calibres con un campo conocido, cambia esto.
SENSIBILIDAD_MV_POR_MT_5V = 14.0
SENSIBILIDAD_MV_POR_MT = SENSIBILIDAD_MV_POR_MT_5V * V_ALIMENTACION / 5.0

MUESTRAS = 64              # lecturas promediadas por medición (baja el ruido)
CALIBRACION_MS = 2000      # tiempo para calibrar el cero
PERIODO_MS = 250           # cada cuánto se imprime una lectura
MARGEN_SATURACION_V = 0.2  # a menos de esto de 0 V o de V_ALIMENTACION = saturado

adc = ADC(CANAL_ADC)


def leer_voltios():
    """Promedio de MUESTRAS lecturas del ADC, en voltios."""
    total = 0
    for _ in range(MUESTRAS):
        total += adc.read_u16()
    return total / MUESTRAS / 65535 * V_REF


def calibrar_cero():
    print("Calibrando el cero durante %.1f s: no acerques imanes..." % (CALIBRACION_MS / 1000))
    t0 = time.ticks_ms()
    suma, n = 0.0, 0
    minimo, maximo = V_REF, 0.0
    while time.ticks_diff(time.ticks_ms(), t0) < CALIBRACION_MS:
        v = leer_voltios()
        suma += v
        n += 1
        minimo, maximo = min(minimo, v), max(maximo, v)
        time.sleep_ms(10)
    cero = suma / n
    print("Cero: %.4f V (ruido pico a pico %.1f mV, %d mediciones)" % (cero, (maximo - minimo) * 1000, n))

    # Sin campo, el 49E da la mitad de la alimentación (1,49 a 1,82 V con 3,3 V)
    mitad = V_ALIMENTACION / 2
    if cero < 0.1:
        print("AVISO: la salida está en 0 V. Revisa OUT → GP26 (pin 31) y que VCC tenga 3,3 V.")
    elif cero > V_ALIMENTACION - 0.1:
        print("AVISO: la salida está pegada a 3,3 V. ¿Están VCC y OUT intercambiados, o falta GND?")
    elif abs(cero - mitad) > 0.35:
        print("AVISO: se esperaba ≈ %.2f V sin campo. ¿Hay un imán cerca, o el sensor no es un 49E?" % mitad)
    else:
        print("OK: la salida está a la mitad de la alimentación, como debe.")
    return cero


def principal():
    print("Prueba del sensor Hall 49E — OUT en GP26/ADC0, sensibilidad %.2f mV/mT" % SENSIBILIDAD_MV_POR_MT)
    cero = calibrar_cero()
    print("Ctrl+C para detener; BOOTSEL para volver a calibrar el cero.\n")
    print("   n |  salida V |   Bz mT |      Bx µT      By µT      Bz µT |     |B| µT")
    n = 0
    while True:
        if bootsel_button is not None and bootsel_button():
            print()
            cero = calibrar_cero()
            print()

        v = leer_voltios()
        bz_mt = (v - cero) * 1000 / SENSIBILIDAD_MV_POR_MT
        bz_ut = bz_mt * 1000
        bx_ut = by_ut = 0.0                        # el 49E mide un solo eje
        modulo = abs(bz_ut)

        aviso = ""
        if v < MARGEN_SATURACION_V or v > V_ALIMENTACION - MARGEN_SATURACION_V:
            aviso = "  SATURADO"
        n += 1
        print("%4d |  %8.4f | %+7.2f | %10.1f %10.1f %+10.1f | %10.1f%s"
              % (n, v, bz_mt, bx_ut, by_ut, bz_ut, modulo, aviso))
        time.sleep_ms(PERIODO_MS)


try:
    principal()
except KeyboardInterrupt:
    print("\nDetenido.")
