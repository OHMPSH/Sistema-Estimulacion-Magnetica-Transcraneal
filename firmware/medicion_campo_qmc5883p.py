# ═══════════════════════════════════════════════════════════════
# medicion_campo_qmc5883p.py — campo en 3 ejes con el QMC5883P (Thonny)
#
# Programa independiente (no usa config.py ni el resto del firmware).
# Mide el fondo (Tierra + entorno) con la bobina apagada y el imán lejos,
# y después imprime Bx, By, Bz y |B| en µT ya sin ese fondo, en un
# formato que dibuja el Plotter de Thonny (Ver → Plotter). Marca
# SATURADO con el bit OVFL y se reconecta solo si el bus falla.
#
# Ajustes: RANGO (30, 12, 8 o 2 G), PROMEDIO y PERIODO_MS.
# Usa el rango más pequeño que no dé SATURADO. Detalles en
# docs/sensor-qmc5883p.md.
#
# Conexión: VCC → 3V3(OUT) pin 36 · GND → GND pin 38
#           SDA → GP0 pin 1        · SCL → GP1 pin 2
# ═══════════════════════════════════════════════════════════════
from machine import I2C, Pin
import struct, math, time

# ---------------- Ajustes ----------------
RANGO = 30        # 30, 12, 8 o 2 gauss. 30 para imanes; 2 u 8 para bobinas debiles
PROMEDIO = 10     # lecturas que se promedian por cada dato (menos ruido)
PERIODO_MS = 200  # cada cuanto se imprime un dato

DIR = 0x2C        # direccion I2C del QMC5883P
# rango -> (bits RNG del registro 0x0B, cuentas por gauss)
RANGOS = {30: (0, 1000), 12: (1, 2500), 8: (2, 3750), 2: (3, 15000)}

i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=100000)


def iniciar():
    if i2c.readfrom_mem(DIR, 0x00, 1)[0] != 0x80:       # Chip ID
        raise OSError("el dispositivo en 0x2C no es un QMC5883P")
    i2c.writeto_mem(DIR, 0x29, b'\x06')                   # signo de los ejes
    i2c.writeto_mem(DIR, 0x0B, bytes([RANGOS[RANGO][0] << 2]))  # set/reset + rango
    i2c.writeto_mem(DIR, 0x0A, b'\xCD')                   # modo normal, 200 Hz
    time.sleep_ms(20)


def leer_cuentas():
    """Una lectura cruda: (x, y, z, saturado)."""
    limite = time.ticks_add(time.ticks_ms(), 100)
    while True:                                           # esperar dato nuevo (DRDY)
        estado = i2c.readfrom_mem(DIR, 0x09, 1)[0]
        if estado & 0x01:
            break
        if time.ticks_diff(limite, time.ticks_ms()) < 0:
            raise OSError("el sensor no entrega datos")
    x, y, z = struct.unpack('<hhh', i2c.readfrom_mem(DIR, 0x01, 6))
    return x, y, z, bool(estado & 0x02)


def leer_uT(n=PROMEDIO):
    """Promedio de n lecturas en microteslas: (bx, by, bz, saturado)."""
    sx = sy = sz = 0
    sat = False
    for _ in range(n):
        x, y, z, s = leer_cuentas()
        sx += x; sy += y; sz += z; sat = sat or s
    k = 100 / (RANGOS[RANGO][1] * n)                      # cuentas -> uT (1 G = 100 uT)
    return sx * k, sy * k, sz * k, sat


def medir_fondo():
    """Campo de fondo (Tierra + entorno) con la bobina apagada / el iman lejos."""
    print("Apaga la bobina y aleja el iman. Midiendo fondo en 3 s...")
    time.sleep(3)
    fx, fy, fz, _ = leer_uT(100)
    print("Fondo (uT): X=%.1f Y=%.1f Z=%.1f" % (fx, fy, fz))
    return fx, fy, fz


print("I2C:", [hex(d) for d in i2c.scan()])               # debe salir 0x2c
iniciar()
fondo = medir_fondo()
print("Bx_uT  By_uT  Bz_uT  |B|_uT")

while True:
    try:
        bx, by, bz, sat = leer_uT()
        bx -= fondo[0]; by -= fondo[1]; bz -= fondo[2]   # solo el campo de bobina/iman
        modulo = math.sqrt(bx * bx + by * by + bz * bz)
        print("%.1f %.1f %.1f %.1f%s" % (bx, by, bz, modulo,
                                          "  SATURADO: aleja o sube RANGO" if sat else ""))
    except OSError as e:                                  # cable flojo, sensor reiniciado...
        print("Error I2C:", e, "-> reintentando")
        time.sleep(1)
        try:
            iniciar()
        except OSError:
            pass
    time.sleep_ms(PERIODO_MS)
