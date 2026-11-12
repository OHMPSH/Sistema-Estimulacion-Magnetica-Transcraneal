"""Pruebas de la lógica del firmware Hall 1D en CPython (sin servidor).

    python3 firmware_hall_1d/pruebas_pc/prueba_logica.py
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(AQUI, "..", "..", "firmware", "pruebas_pc", "stubs"), os.path.dirname(AQUI)]
import _compat  # noqa: E402,F401
import machine  # noqa: E402


class ADC:
    voltios = 1.65

    def __init__(self, canal):
        pass

    def read_u16(self):
        return int(ADC.voltios / 3.3 * 65535)


machine.ADC = ADC

import config     # noqa: E402
import barrido    # noqa: E402
import motores    # noqa: E402
from sensor_hall import Hall49E, ErrorSensor, DESBORDE  # noqa: E402

fallos = 0


def comprobar(nombre, condicion):
    global fallos
    print(("ok    " if condicion else "FALLA ") + nombre)
    if not condicion:
        fallos += 1


def sesion(zx, zy, zz, paso):
    nx, ny = int(zx // paso) + 1, int(zy // paso) + 1
    planos = [round(k * paso, 1) for k in range(int(zz // paso) + 1)]
    return {"id": 1, "zona_mm": {"x": zx, "y": zy, "z": zz}, "grid_nx": nx, "grid_ny": ny,
            "z_levels_mm": planos, "paso_mm": paso, "puntos_esperados": nx * ny * len(planos),
            "sensor": {"lsb_por_ga": 820, "offset_ut": {"x": 0, "y": 0, "z": 0}, "lecturas_por_punto": 1}}


# ── Zona contra los límites ────────────────────────────────────
comprobar("zona 410 × 562 × 88 cabe", barrido.errores_de_zona(sesion(410, 562, 88, 20)) == [])
comprobar("zona 60 × 60 × 20 cabe", barrido.errores_de_zona(sesion(60, 60, 20, 5)) == [])
comprobar("X de 420 mm no cabe", any(e.startswith("X") for e in barrido.errores_de_zona(sesion(420, 60, 20, 5))))
comprobar("Y de 600 mm no cabe", any(e.startswith("Y") for e in barrido.errores_de_zona(sesion(60, 600, 20, 5))))
comprobar("Z de 90 mm no cabe", any(e.startswith("Z") for e in barrido.errores_de_zona(sesion(60, 60, 90, 10))))
config.ORIGEN_ZONA_X_MM = 400.0
comprobar("con ORIGEN_ZONA_X 400, una zona de 20 mm se pasa", any(e.startswith("X") for e in barrido.errores_de_zona(sesion(20, 20, 0, 5))))
config.ORIGEN_ZONA_X_MM = 0.0

# ── Conversión a cuentas ───────────────────────────────────────
s = Hall49E()
s.calibrar_cero()
comprobar("cero calibrado en 1,65 V", abs(s.cero_v - 1.65) < 0.001)
s.configurar({"lsb_por_ga": 820, "offset_ut": {"z": 0}})
comprobar("10 mT → 82 cuentas (el servidor muestra 10,0)", s.a_cuentas(10.0) == 82)
comprobar("−10 mT → −82 cuentas", s.a_cuentas(-10.0) == -82)
comprobar("300 mT no cabe → −4096", s.a_cuentas(300.0) == DESBORDE)
config.UNIDAD_ENVIO = "uT"
comprobar("en µT, 0,01 mT (10 µT) → 82 cuentas", s.a_cuentas(0.01) == 82)
comprobar("en µT, 1 mT no cabe → −4096", s.a_cuentas(1.0) == DESBORDE)
config.UNIDAD_ENVIO = "mT"
ADC.voltios = 1.65 + 20 * 9.24e-3
x, y, z = s.medir_bloqueando()
comprobar("20 mT en el ADC → (0, 0, ≈164)", x == 0 and y == 0 and abs(z - 164) <= 1)
ADC.voltios = 3.25
comprobar("salida en el riel → saturado", s.medir_bloqueando()[2] == DESBORDE)
ADC.voltios = 0.0
try:
    s.calibrar_cero()
    comprobar("OUT desconectado → ErrorSensor", False)
except ErrorSensor:
    comprobar("OUT desconectado → ErrorSensor", True)

# ── Límites de software de la mesa ─────────────────────────────
mesa = motores.Mesa()


def mover(x, y, z):
    gen = mesa.mover_a(x, y, z)
    try:
        while True:
            next(gen)
    except StopIteration:
        return True
    except motores.ErrorMovimiento:
        return False


comprobar("ir a 410, 562, 88 se permite", mover(410, 562, 88))
comprobar("ir a 410,5 en X se rechaza", not mover(410.5, 0, 0))
comprobar("ir a −1 en Y se rechaza", not mover(0, -1, 0))
comprobar("ir a 89 en Z se rechaza", not mover(0, 0, 89))
comprobar("la posición no cambió con los rechazos", mesa.posicion_mm() == (410, 562, 88))
gen = mesa.homing()
for _ in gen:
    pass
comprobar("homing sin finales vuelve a 0, 0, 0", mesa.posicion_mm() == (0, 0, 0))

print("\n%s" % ("TODO BIEN" if not fallos else "%d FALLOS" % fallos))
sys.exit(1 if fallos else 0)
