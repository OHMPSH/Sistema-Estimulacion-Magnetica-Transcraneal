# ═══════════════════════════════════════════════════════════════
# sensor.py — magnetómetro HMC5883L por I2C
#
#   - verificar(): escaneo del bus y registros de identificación ("H43").
#     Si encuentra 0x0D en lugar de 0x1E, el módulo trae un QMC5883L.
#   - configurar(rango_ga): ganancia del registro B según el latido.
#   - medir(): generador que pide una medición única, cede el control
#     mientras el chip convierte y devuelve las cuentas crudas (x, y, z).
#
# Los registros de datos vienen en el orden X, Z, Y (no X, Y, Z).
# −4096 = desborde: se manda tal cual; el servidor lo marca como saturado.
# ═══════════════════════════════════════════════════════════════
import struct
import time
from machine import I2C, Pin

import config

DIR_QMC5883L = 0x0D
REG_A, REG_B, REG_MODO, REG_DATOS, REG_ESTADO, REG_ID = 0x00, 0x01, 0x02, 0x03, 0x09, 0x0A

# Registro B (bits 7–5) según el rango en gauss y sus LSB/Ga (docs/firmware-pico-w.md 4.2)
GANANCIAS = ((0.88, 0x00), (1.3, 0x20), (1.9, 0x40), (2.5, 0x60),
             (4.0, 0x80), (4.7, 0xA0), (5.6, 0xC0), (8.1, 0xE0))

DESBORDE = -4096


class ErrorSensor(Exception):
    pass


class HMC5883L:
    def __init__(self):
        self.i2c = I2C(config.I2C_ID, sda=Pin(config.PIN_SDA), scl=Pin(config.PIN_SCL), freq=config.I2C_FRECUENCIA)
        self.dir = config.DIR_SENSOR
        self.rango_ga = None

    def verificar(self):
        """Escanea el bus y comprueba que el chip es un HMC5883L. Lanza ErrorSensor si no."""
        encontrados = self.i2c.scan()
        texto = ", ".join("0x%02X" % d for d in encontrados) or "ninguno"
        if self.dir not in encontrados:
            if DIR_QMC5883L in encontrados:
                raise ErrorSensor("Hay un QMC5883L en 0x0D, no un HMC5883L (otro chip y otros registros). Bus: " + texto)
            raise ErrorSensor("No hay HMC5883L en 0x%02X. Dispositivos en el bus: %s. Revisa SDA/SCL y la alimentación." % (self.dir, texto))
        ident = bytes(self.i2c.readfrom_mem(self.dir, REG_ID, 3))
        if ident != b"H43":
            raise ErrorSensor("Identificación inesperada en 0x%02X: %r (se esperaba b'H43')" % (self.dir, ident))
        return texto

    def configurar(self, rango_ga):
        """8 muestras promediadas, 15 Hz de referencia y la ganancia pedida."""
        reg_b = None
        for rango, valor in GANANCIAS:
            if abs(rango - rango_ga) < 0.01:
                reg_b = valor
        if reg_b is None:
            raise ErrorSensor("rango_ga %s no es una ganancia del HMC5883L" % rango_ga)
        self.i2c.writeto_mem(self.dir, REG_A, bytes([0x70]))      # MA=11 (8 muestras), DO=100, medición normal
        self.i2c.writeto_mem(self.dir, REG_B, bytes([reg_b]))
        self.rango_ga = rango_ga
        # La primera medición después de cambiar la ganancia todavía usa la anterior: se descarta
        for _ in self.medir():
            time.sleep_ms(1)

    def _pedir(self):
        self.i2c.writeto_mem(self.dir, REG_MODO, bytes([0x01]))   # medición única

    def _lista(self):
        return self.i2c.readfrom_mem(self.dir, REG_ESTADO, 1)[0] & 0x01

    def _leer(self):
        x, z, y = struct.unpack(">hhh", self.i2c.readfrom_mem(self.dir, REG_DATOS, 6))   # ¡X, Z, Y!
        return x, y, z

    def medir(self):
        """Generador: pide una medición, cede mientras convierte y devuelve (x, y, z) crudos."""
        self._pedir()
        t0 = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), t0) < 6:     # una conversión tarda unos 6 ms
            yield
        while not self._lista():
            if time.ticks_diff(time.ticks_ms(), t0) > config.TIMEOUT_LECTURA_MS:
                raise ErrorSensor("el HMC5883L no terminó la medición en %d ms" % config.TIMEOUT_LECTURA_MS)
            yield
        return self._leer()

    def medir_bloqueando(self):
        gen = self.medir()
        try:
            while True:
                next(gen)
                time.sleep_ms(1)
        except StopIteration as fin:
            return fin.value
