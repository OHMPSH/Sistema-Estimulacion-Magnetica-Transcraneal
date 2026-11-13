# Simulación mínima de `machine` (MicroPython) para correr el firmware en CPython.
import random
import struct
import sys


class _Mem32:
    def __getitem__(self, direccion):
        return 0

    def __setitem__(self, direccion, valor):
        pass


mem32 = _Mem32()


class Pin:
    IN, OUT = 0, 1
    PULL_UP, PULL_DOWN = 1, 2
    IRQ_RISING, IRQ_FALLING = 1, 2
    DRIVE_0, DRIVE_1, DRIVE_2, DRIVE_3 = 0, 1, 2, 3
    valores = {}          # número → valor forzado (por ejemplo, el botón Z)

    def __init__(self, n, modo=None, pull=None, value=None, drive=None):
        self.n = n
        if value is not None:
            Pin.valores[n] = value

    def value(self, v=None):
        if v is None:
            return Pin.valores.get(self.n, 1 if self.n != "LED" else 0)
        Pin.valores[self.n] = int(bool(v))

    def on(self):
        self.value(1)

    def off(self):
        self.value(0)

    def irq(self, handler=None, trigger=None, hard=False):
        pass


class I2C:
    """Un QMC5883P falso (0x2C, Chip ID 0x80): DRDY, OVFL, datos '<hhh' en X, Y, Z.

    Atributos que las pruebas pueden cambiar:
      direcciones   lo que devuelve scan()
      chip_id       valor del registro 0x00
      campo_ut      función () → (bx, by, bz) en µT; por defecto, la Tierra con ruido
      saturar       probabilidad de OVFL en cada lectura
      no_listo      cuántas lecturas del estado salen sin DRDY antes de estar listo
      nunca_listo   True: DRDY no llega nunca
      fallos_os     cuántas operaciones siguientes lanzan OSError(5)
    """
    def __init__(self, *a, **k):
        self.direcciones = [0x2C]
        self.chip_id = 0x80
        self.campo_ut = lambda: (20 + random.gauss(0, 0.3), -5 + random.gauss(0, 0.3), 40 + random.gauss(0, 0.3))
        self.saturar = 0.0
        self.no_listo = 0
        self.nunca_listo = False
        self.fallos_os = 0
        self.registros = {}
        self.escrituras = []
        self._ovfl = False

    def _quizas_fallar(self):
        if self.fallos_os > 0:
            self.fallos_os -= 1
            raise OSError(5)

    def _cuentas_por_g(self):
        if self.registros.get(0x0A) != 0xCD:
            return None                        # en reposo: todo vale 0
        return (1000, 2500, 3750, 15000)[(self.registros.get(0x0B, 0) >> 2) & 3]

    def scan(self):
        return list(self.direcciones)

    def readfrom_mem(self, direccion, registro, n):
        self._quizas_fallar()
        if registro == 0x00:
            return bytes([self.chip_id])
        if registro == 0x09:
            if self.nunca_listo:
                return b"\x00"
            if self.no_listo > 0:
                self.no_listo -= 1
                return b"\x00"
            self._ovfl = random.random() < self.saturar
            return bytes([0x01 | (0x02 if self._ovfl else 0)])
        if registro == 0x01:
            cpg = self._cuentas_por_g()
            if cpg is None:
                return bytes(6)
            valores = []
            for b in self.campo_ut():
                c = int(round(b / 100 * cpg))
                valores.append(max(-32768, min(32767, c)))
            if self._ovfl:
                valores[1] = 32767
            return struct.pack("<hhh", *valores)
        return bytes(n)

    def writeto_mem(self, direccion, registro, datos):
        self._quizas_fallar()
        self.registros[registro] = datos[0]
        self.escrituras.append((registro, datos[0]))


class Timer:
    PERIODIC, ONE_SHOT = 1, 0

    def __init__(self, *a, **k):
        pass


class WDT:
    def __init__(self, timeout=8000):
        pass

    def feed(self):
        pass


def reset():
    print("[machine.reset()]")
    sys.exit(3)


def unique_id():
    return b"\x00" * 8
