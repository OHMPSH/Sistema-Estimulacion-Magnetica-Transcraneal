# ═══════════════════════════════════════════════════════════════
# prueba_sensor.py — ¿funciona el HMC5883L? (Thonny)
#
# Programa independiente: no usa config.py ni el resto del firmware.
# Ábrelo en Thonny con la Pico W conectada y pulsa F5 (Ejecutar).
#
# Qué hace, en orden:
#   1. Escanea el bus I2C y dice qué direcciones encontró.
#   2. Comprueba que en 0x1E hay un HMC5883L (registros de identificación
#      "H43"). Si en su lugar aparece 0x0D, el módulo trae un QMC5883L,
#      que es otro chip con otros registros, y el programa se detiene.
#   3. Configura el sensor (8 muestras promediadas, ganancia de 1,9 Ga).
#   4. Lee sin parar y muestra cuentas crudas, µT y |B| cada medio segundo.
#      Ctrl+C (o el botón rojo de Thonny) lo detiene.
#
# Cómo saber que funciona:
#   - Sin imanes cerca, |B| debe quedar entre unos 25 y 65 µT (el campo
#     de la Tierra más lo que haya en la mesa) y moverse poco.
#   - Al girar el módulo, cambian Bx, By y Bz, pero |B| casi no.
#   - Al acercar un imán, los valores suben mucho; si un eje se pasa del
#     fondo de escala, el chip devuelve −4096 y se muestra SATURADO.
#
# Conexiones (docs/instructivo-calibracion-y-conexiones.md, sección 4.5):
#   VCC → 3V3(OUT) (pin 36)   GND → GND (pin 38)
#   SDA → GP4      (pin 6)    SCL → GP5 (pin 7)    DRDY sin conectar
#
# Si la Pico tiene cargado main.py, detenlo antes con el botón rojo de Thonny.
# ═══════════════════════════════════════════════════════════════
import struct
import time
from machine import I2C, Pin

# ── Ajustes ─────────────────────────────────────────────────────
I2C_ID = 0                 # GP4/GP5 pertenecen al I2C0
PIN_SDA = 4
PIN_SCL = 5
FRECUENCIA = 100_000       # 100 kHz: lo más tolerante con cables largos
PERIODO_MS = 500           # cada cuánto se imprime una lectura

DIR_HMC = 0x1E
DIR_QMC = 0x0D             # dirección del QMC5883L (chip distinto)

# Registros del HMC5883L
REG_A, REG_B, REG_MODO = 0x00, 0x01, 0x02
REG_DATOS, REG_ESTADO, REG_ID = 0x03, 0x09, 0x0A

# Ganancia: registro B = 0x40 → ±1,9 Ga, 820 LSB/Ga (la del proyecto)
REG_B_VALOR = 0x40
LSB_POR_GA = 820
DESBORDE = -4096


def a_ut(cuentas):
    """Cuentas → µT (1 Ga = 100 µT). None si el eje se desbordó."""
    if cuentas == DESBORDE:
        return None
    return cuentas / LSB_POR_GA * 100


def leer(i2c):
    """Pide una medición única, espera a que esté lista y devuelve (x, y, z) crudos."""
    i2c.writeto_mem(DIR_HMC, REG_MODO, b"\x01")          # modo de medición única
    t0 = time.ticks_ms()
    time.sleep_ms(7)                                     # una conversión tarda unos 6 ms
    while not (i2c.readfrom_mem(DIR_HMC, REG_ESTADO, 1)[0] & 0x01):
        if time.ticks_diff(time.ticks_ms(), t0) > 200:
            raise OSError("el sensor no terminó la medición en 200 ms")
        time.sleep_ms(1)
    # ¡Ojo! Los registros vienen en el orden X, Z, Y
    x, z, y = struct.unpack(">hhh", i2c.readfrom_mem(DIR_HMC, REG_DATOS, 6))
    return x, y, z


def texto(ut):
    return "  SATURADO" if ut is None else "%+9.2f" % ut


def principal():
    print("Prueba del HMC5883L — SDA GP%d, SCL GP%d, I2C%d a %d kHz"
          % (PIN_SDA, PIN_SCL, I2C_ID, FRECUENCIA // 1000))
    i2c = I2C(I2C_ID, sda=Pin(PIN_SDA), scl=Pin(PIN_SCL), freq=FRECUENCIA)

    # 1. Escaneo del bus
    encontrados = i2c.scan()
    print("Dispositivos en el bus:", ", ".join("0x%02X" % d for d in encontrados) or "ninguno")

    # 2. ¿Es un HMC5883L?
    if DIR_HMC not in encontrados:
        if DIR_QMC in encontrados:
            print("ERROR: hay un QMC5883L en 0x0D, no un HMC5883L.")
            print("       Es otro chip con otros registros; este programa no sirve para él.")
        elif not encontrados:
            print("ERROR: no respondió nada. Revisa SDA (GP4), SCL (GP5), 3V3 y GND.")
        else:
            print("ERROR: no hay nada en 0x1E. Revisa el cableado y el módulo.")
        return
    ident = bytes(i2c.readfrom_mem(DIR_HMC, REG_ID, 3))
    if ident != b"H43":
        print("ERROR: en 0x1E responde algo, pero su identificación es %r (se esperaba b'H43')." % ident)
        return
    print("OK: HMC5883L en 0x1E (identificación H43).")

    # 3. Configuración: 8 muestras promediadas, 15 Hz, medición normal; ganancia 1,9 Ga
    i2c.writeto_mem(DIR_HMC, REG_A, b"\x70")
    i2c.writeto_mem(DIR_HMC, REG_B, bytes([REG_B_VALOR]))
    leer(i2c)   # la primera lectura tras cambiar la ganancia usa la anterior: se descarta
    print("Configurado: ±1,9 Ga (%d LSB/Ga, fondo de escala %.1f µT)." % (LSB_POR_GA, 2047 / LSB_POR_GA * 100))
    print("Ctrl+C para detener.\n")

    # 4. Lecturas continuas
    print("   n |  crudo x  crudo y  crudo z |    Bx µT    By µT    Bz µT |    |B| µT")
    n = 0
    while True:
        x, y, z = leer(i2c)
        bx, by, bz = a_ut(x), a_ut(y), a_ut(z)
        if None in (bx, by, bz):
            modulo = "        —"
        else:
            modulo = "%9.2f" % (bx * bx + by * by + bz * bz) ** 0.5
        n += 1
        print("%4d | %8d %8d %8d |%s%s%s | %s" % (n, x, y, z, texto(bx), texto(by), texto(bz), modulo))
        time.sleep_ms(PERIODO_MS)


try:
    principal()
except KeyboardInterrupt:
    print("\nDetenido.")
except OSError as e:
    print("\nERROR de I2C:", e)
    print("Si es [Errno 5] EIO o ETIMEDOUT, el sensor dejó de responder: revisa los cables.")
