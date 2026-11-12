# ═══════════════════════════════════════════════════════════════
# prueba_qmc5883p.py — prueba mínima del magnetómetro QMC5883P (Thonny)
#
# Programa independiente (no usa config.py ni el resto del firmware).
# Ábrelo en Thonny con la Pico W conectada y pulsa F5. Debe imprimir
# "I2C: ['0x2c']" y luego las cuentas crudas X, Y, Z cada medio segundo.
# En el rango de ±30 G, 1000 cuentas = 1 G = 100 µT.
#
# El módulo es un QMC5883P (dirección 0x2C), NO un HMC5883L (0x1E) ni un
# QMC5883L (0x0D). Detalles en docs/sensor-qmc5883p.md.
#
# Conexión: VCC → 3V3(OUT) pin 36 · GND → GND pin 38
#           SDA → GP0 pin 1        · SCL → GP1 pin 2
# ═══════════════════════════════════════════════════════════════
from machine import I2C, Pin
import struct, math, time

i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=100000)
print("I2C:", [hex(d) for d in i2c.scan()])  # debe salir 0x2c

A = 0x2C
i2c.writeto_mem(A, 0x29, b'\x06')  # signo de los ejes
i2c.writeto_mem(A, 0x0B, b'\x00')  # set/reset, rango +-30 G
i2c.writeto_mem(A, 0x0A, b'\xCD')  # modo normal, 200 Hz (sin esto todo vale 0)

while True:
    x, y, z = struct.unpack('<hhh', i2c.readfrom_mem(A, 0x01, 6))   # X, Y, Z; byte bajo primero
    print("X", x, "Y", y, "Z", z, "Rumbo", round(math.degrees(math.atan2(y, x)) % 360, 1))
    time.sleep(0.5)
