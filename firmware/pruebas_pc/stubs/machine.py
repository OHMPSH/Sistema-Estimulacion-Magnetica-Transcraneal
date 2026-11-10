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
    """Un HMC5883L falso: identificación H43, siempre listo, cuentas con ruido."""
    def __init__(self, *a, **k):
        self.saturar = 0.0

    def scan(self):
        return [0x1E]

    def readfrom_mem(self, direccion, registro, n):
        if registro == 0x0A:
            return b"H43"
        if registro == 0x09:
            return b"\x01"
        if registro == 0x03:
            x, y, z = (random.randint(-300, 300) for _ in range(3))
            if random.random() < self.saturar:
                y = -4096
            return struct.pack(">hhh", x, z, y)
        return bytes(n)

    def writeto_mem(self, direccion, registro, datos):
        pass


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
