"""Corre el firmware Hall 1D (main.Controlador) en CPython contra un servidor real.

Usa los stubs de firmware/pruebas_pc/stubs (motores, Wi-Fi y PIO simulados)
y agrega un ADC falso: un imán simulado en (IMAN_X, IMAN_Y) de la mesa da
un Bz que baja con la distancia y con la altura. Al final simula un Ctrl+C
para comprobar que la mesa vuelve al origen.

    PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4100 --segundos 60
"""
import argparse
import math
import os
import random
import sys
import types

AQUI = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(AQUI, "..", "..", "firmware", "pruebas_pc", "stubs")
sys.path[:0] = [STUBS, os.path.dirname(AQUI)]
import _compat  # noqa: E402,F401
import time     # noqa: E402

op = argparse.ArgumentParser()
op.add_argument("--url", default="http://127.0.0.1:4100")
op.add_argument("--segundos", type=float, default=60)
op.add_argument("--hasta-vacio", action="store_true", help="termina cuando no hay sesión ni tarea")
op.add_argument("--iman", type=float, nargs=2, default=(20.0, 20.0), help="posición del imán (mm de máquina)")
args = op.parse_args()

secretos = types.ModuleType("secretos")
secretos.WIFI_SSID, secretos.WIFI_PASSWORD = "simulado", "simulado"
secretos.TOKEN, secretos.SERVIDOR = os.environ["PICO_TOKEN"], args.url
sys.modules["secretos"] = secretos

import machine  # noqa: E402

_mesa = None


class ADC:
    """Hall simulado: 1,65 V + 9,24 mV/mT × Bz, con Bz de un imán en args.iman."""
    def __init__(self, canal):
        pass

    def read_u16(self):
        bz = 0.0
        if _mesa is not None:
            x, y, z = _mesa.posicion_mm()
            r2 = (x - args.iman[0]) ** 2 + (y - args.iman[1]) ** 2 + (z + 5) ** 2
            bz = 40.0 * 125 / (r2 ** 1.5 / 25 + 125)          # ≈ 40 mT encima del imán
        v = 1.65 + bz * 9.24e-3 + random.gauss(0, 0.002)
        return int(min(max(v, 0), 3.3) / 3.3 * 65535)


machine.ADC = ADC

import main      # noqa: E402
from registro import log  # noqa: E402

c = main.Controlador()
c.verificar_sensor()          # calibra el cero con la mesa en el origen, lejos del imán
_mesa = c.mesa
main.red.conectar_inicial(c.alimentar)
c.homing_inicial()
t0 = time.monotonic()
led_anterior = None
while time.monotonic() - t0 < args.segundos:
    c.vuelta()
    if main.led.estado() != led_anterior:
        led_anterior = main.led.estado()
        log("  (simulación) LED: %s" % led_anterior)
    if args.hasta_vacio and time.monotonic() - t0 > 3 and c.tarea is None and c.sesion is None and not c.pendiente:
        break
log("  (simulación) Ctrl+C: fase=%s sesión=%s búfer=%d error=%s posición=%s" % (
    c.fase, c.sesion and c.sesion["id"], len(c.bufer), c.error, c.mesa.posicion_mm()))
main.apagar(c)
