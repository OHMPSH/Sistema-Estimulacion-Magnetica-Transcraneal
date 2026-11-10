# Simulación de `rp2`: el PIO y el DMA no hacen nada; el firmware calcula la
# duración de cada movimiento, así que los tiempos son los reales.
class PIO:
    OUT_LOW, OUT_HIGH, IN_LOW, IN_HIGH = 0, 1, 2, 3
    SHIFT_LEFT, SHIFT_RIGHT = 0, 1
    JOIN_NONE, JOIN_TX, JOIN_RX = 0, 1, 2


def asm_pio(**k):
    return lambda funcion: funcion


class StateMachine:
    def __init__(self, *a, **k):
        pass

    def active(self, v=None):
        return 0

    def put(self, palabra):
        pass

    def exec(self, instruccion):
        pass


class DMA:
    _siguiente = 0

    def __init__(self):
        self.channel = DMA._siguiente
        DMA._siguiente += 1

    def pack_ctrl(self, **k):
        return 0

    def config(self, **k):
        pass

    def active(self, v=None):
        return False


def bootsel_button():
    return 0
