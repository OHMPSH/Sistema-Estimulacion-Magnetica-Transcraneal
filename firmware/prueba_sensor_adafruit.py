# ═══════════════════════════════════════════════════════════════
# prueba_sensor_adafruit.py — diagnóstico del HMC5883L + ejemplo de
# Adafruit traducido a MicroPython (Thonny)
#
# Programa independiente: no usa config.py ni el resto del firmware.
# Ábrelo en Thonny con la Pico W conectada y pulsa F5 (Ejecutar).
#
# Hace lo mismo que el ejemplo de Arduino que viene con el módulo
# (biblioteca Adafruit_HMC5883_Unified 1.2.3, en
# firmware/AR3832-Modulo-HMC5883L-librerias/), pero ANTES revisa el
# cableado, porque la biblioteca no lo hace: su begin() siempre
# devuelve true, aunque no haya ningún sensor conectado.
#
#   1. Niveles de SDA y SCL: el módulo GY-271 trae resistencias pull-up.
#      Con el pull-down interno de la Pico activado, un pin que lee 1
#      demuestra que el cable llega y que el módulo está alimentado.
#   2. Escaneo del bus de tres maneras: I2C0 por hardware a 100 kHz,
#      I2C por software a 10 kHz (más tolerante) y por software con SDA y
#      SCL intercambiados (por si la serigrafía del módulo engaña).
#   3. Si encuentra el chip en 0x1E: lo configura como la biblioteca
#      (modo continuo, ganancia ±1,3 Ga) y muestra X, Y, Z en µT y el
#      rumbo en grados, como el ejemplo de Arduino.
#
# Conexiones (docs/instructivo-calibracion-y-conexiones.md, sección 4.5):
#   VCC → 3V3(OUT) (pin 36)   GND → GND (pin 3 o 38)
#   SDA → GP4      (pin 6)    SCL → GP5 (pin 7)    DRDY sin conectar
#
# Si la Pico tiene cargado main.py, detenlo antes con el botón rojo de Thonny.
# ═══════════════════════════════════════════════════════════════
import math
import struct
import time
from machine import I2C, SoftI2C, Pin

PIN_SDA = 4                # GP4 = pin físico 6
PIN_SCL = 5                # GP5 = pin físico 7

DIR_HMC = 0x1E             # 0x3C >> 1, la misma que usa la biblioteca
DIR_QMC = 0x0D             # QMC5883L: otro chip que muchos GY-271 traen

# Registros (Adafruit_HMC5883_U.h)
REG_CRA, REG_CRB, REG_MR, REG_DATOS, REG_ID = 0x00, 0x01, 0x02, 0x03, 0x0A

# Ganancia ±1,3 Ga, como begin() de la biblioteca. La biblioteca usa
# 1100 LSB/Ga en X e Y y 980 en Z; la hoja de datos dice 1090 en los tres.
REG_CRB_1_3 = 0x20
LSB_GA_XY = 1100.0
LSB_GA_Z = 980.0
DESBORDE = -4096

DECLINACION_RAD = 0.06     # la misma del ejemplo de Arduino
PERIODO_MS = 500


def revisar_niveles():
    """Lee SDA y SCL con el pull-down interno. 1 = el pull-up del módulo llega."""
    sda = Pin(PIN_SDA, Pin.IN, Pin.PULL_DOWN).value()
    scl = Pin(PIN_SCL, Pin.IN, Pin.PULL_DOWN).value()
    print("1) Niveles con pull-down interno: SDA (GP%d) = %d, SCL (GP%d) = %d"
          % (PIN_SDA, sda, PIN_SCL, scl))
    if sda and scl:
        print("   OK: los dos cables llegan y el módulo está alimentado.")
    else:
        if not sda:
            print("   MAL: SDA lee 0. El cable de SDA (pin 6) no llega al módulo, o el módulo no tiene 3,3 V.")
        if not scl:
            print("   MAL: SCL lee 0. El cable de SCL (pin 7) no llega al módulo, o el módulo no tiene 3,3 V.")
        print("   Si los dos leen 0, lo más probable es la alimentación: mide VCC–GND en el módulo.")
    return sda and scl


def escanear():
    """Escanea el bus de tres maneras. Devuelve (bus, descripción) del primero que vea algo."""
    print("2) Escaneo del bus I2C")
    intentos = (
        ("I2C0 por hardware, 100 kHz, SDA=GP%d SCL=GP%d" % (PIN_SDA, PIN_SCL),
         lambda: I2C(0, sda=Pin(PIN_SDA), scl=Pin(PIN_SCL), freq=100_000)),
        ("I2C por software, 10 kHz, SDA=GP%d SCL=GP%d" % (PIN_SDA, PIN_SCL),
         lambda: SoftI2C(sda=Pin(PIN_SDA), scl=Pin(PIN_SCL), freq=10_000)),
        ("I2C por software, 10 kHz, INTERCAMBIADOS: SDA=GP%d SCL=GP%d" % (PIN_SCL, PIN_SDA),
         lambda: SoftI2C(sda=Pin(PIN_SCL), scl=Pin(PIN_SDA), freq=10_000)),
    )
    elegido = None
    for descripcion, crear in intentos:
        try:
            bus = crear()
            encontrados = bus.scan()
        except Exception as e:
            print("   %s → error: %s" % (descripcion, e))
            continue
        lista = ", ".join("0x%02X" % d for d in encontrados) or "ninguno"
        print("   %s → %s" % (descripcion, lista))
        if elegido is None and (DIR_HMC in encontrados or DIR_QMC in encontrados):
            elegido = (crear, descripcion, encontrados)
    if elegido is None:
        return None
    # Los intentos siguientes reconfiguraron GP4 y GP5: se vuelve a crear el bus elegido
    crear, descripcion, encontrados = elegido
    return crear(), descripcion, encontrados


def leer_xyz(bus):
    """Igual que read() de la biblioteca: 6 bytes desde 0x03, en el orden X, Z, Y."""
    x, z, y = struct.unpack(">hhh", bus.readfrom_mem(DIR_HMC, REG_DATOS, 6))
    return x, y, z


def a_ut(cuentas, lsb_por_ga):
    if cuentas == DESBORDE:
        return None
    return cuentas / lsb_por_ga * 100       # SENSORS_GAUSS_TO_MICROTESLA = 100


def principal():
    print("Diagnóstico del HMC5883L (ejemplo de Adafruit en MicroPython)\n")
    niveles_ok = revisar_niveles()
    print()
    resultado = escanear()
    print()

    if resultado is None:
        print("RESULTADO: ningún sensor respondió.")
        if niveles_ok:
            print("  Los cables llegan pero el chip no contesta. Revisa que los pines del")
            print("  módulo estén soldados y prueba con otro módulo si tienes.")
        else:
            print("  Corrige primero lo que marcó el paso 1 (cables, soldaduras, 3,3 V).")
        return

    bus, descripcion, encontrados = resultado
    if DIR_HMC not in encontrados:
        print("RESULTADO: hay un QMC5883L en 0x0D, no un HMC5883L.")
        print("  Es otro chip con otros registros: ni la biblioteca de Adafruit ni el")
        print("  firmware del proyecto sirven tal cual para él.")
        return

    print("RESULTADO: HMC5883L encontrado en 0x1E con «%s»." % descripcion)
    if "INTERCAMBIADOS" in descripcion:
        print("  ¡OJO! SDA y SCL están al revés: intercambia los cables de los pines 6 y 7.")
    ident = bytes(bus.readfrom_mem(DIR_HMC, REG_ID, 3))
    print("  Registros de identificación: %r %s" % (ident, "(correcto)" if ident == b"H43" else "(se esperaba b'H43')"))

    # 3. Igual que begin() de la biblioteca: modo continuo y ganancia ±1,3 Ga
    bus.writeto_mem(DIR_HMC, REG_MR, b"\x00")
    bus.writeto_mem(DIR_HMC, REG_CRB, bytes([REG_CRB_1_3]))
    time.sleep_ms(100)                       # deja pasar unas mediciones con la ganancia nueva
    print("\n3) Lecturas (modo continuo, ±1,3 Ga). Ctrl+C para detener.")
    print("      X µT      Y µT      Z µT   |   |B| µT   rumbo °")

    while True:
        x, y, z = leer_xyz(bus)
        bx, by, bz = a_ut(x, LSB_GA_XY), a_ut(y, LSB_GA_XY), a_ut(z, LSB_GA_Z)
        if None in (bx, by, bz):
            print("  SATURADO (algún eje leyó −4096): aleja el imán. Crudos: %d %d %d" % (x, y, z))
        else:
            modulo = math.sqrt(bx * bx + by * by + bz * bz)
            # Rumbo como el ejemplo: módulo horizontal con Z hacia arriba
            rumbo = math.atan2(by, bx) + DECLINACION_RAD
            if rumbo < 0:
                rumbo += 2 * math.pi
            if rumbo > 2 * math.pi:
                rumbo -= 2 * math.pi
            print("  %+8.2f  %+8.2f  %+8.2f   | %8.2f   %6.1f" % (bx, by, bz, modulo, math.degrees(rumbo)))
        time.sleep_ms(PERIODO_MS)


try:
    principal()
except KeyboardInterrupt:
    print("\nDetenido.")
except OSError as e:
    print("\nERROR de I2C:", e)
    print("El sensor dejó de responder a media lectura: revisa los cables y las soldaduras.")
