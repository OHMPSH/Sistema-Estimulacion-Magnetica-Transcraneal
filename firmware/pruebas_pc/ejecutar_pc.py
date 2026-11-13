"""Corre el firmware (main.Controlador) en CPython contra un servidor real.

Los motores, el Wi-Fi y el QMC5883P están simulados (stubs/), pero el
protocolo, el búfer, los lotes, los tiempos de cada movimiento y el
recorrido en serpentina son los del firmware. Como en la mesa real, no hay
finales de carrera: la posición al arrancar es el origen (0, 0, 0).

El QMC5883P falso mide el campo de la Tierra más el de un imán simulado en
(--iman X Y) de la mesa, que baja con la distancia y con la altura. Al final
simula un Ctrl+C para comprobar que la mesa vuelve al origen.

    PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4100 --segundos 60
    opciones: --sin-wifi DESDE HASTA   (segundos: simula la caída del Wi-Fi)
              --saturar P              (probabilidad de OVFL en cada lectura)
              --hasta-vacio            (termina cuando no hay sesión ni tarea)
"""
import argparse
import os
import random
import sys
import types

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(AQUI, "stubs"), os.path.dirname(AQUI)]
import _compat  # noqa: E402,F401
import time     # noqa: E402

op = argparse.ArgumentParser()
op.add_argument("--url", default="http://127.0.0.1:4100")
op.add_argument("--segundos", type=float, default=60)
op.add_argument("--sin-wifi", type=float, nargs=2, default=None)
op.add_argument("--saturar", type=float, default=0)
op.add_argument("--hasta-vacio", action="store_true", help="termina cuando no hay sesión ni tarea")
op.add_argument("--iman", type=float, nargs=2, default=(20.0, 20.0), help="posición del imán (mm de máquina)")
args = op.parse_args()

secretos = types.ModuleType("secretos")
secretos.WIFI_SSID, secretos.WIFI_PASSWORD = "simulado", "simulado"
secretos.TOKEN, secretos.SERVIDOR = os.environ["PICO_TOKEN"], args.url
sys.modules["secretos"] = secretos

import network   # noqa: E402
import main      # noqa: E402
from registro import log  # noqa: E402

c = main.Controlador()
_mesa = None


def campo_ut():
    """Tierra (20, −5, 40 µT) + un imán: Bz ≈ 150 µT justo encima, más una parte radial."""
    bx, by, bz = 20.0, -5.0, 40.0
    if _mesa is not None:
        x, y, z = _mesa.posicion_mm()
        dx, dy, h = x - args.iman[0], y - args.iman[1], z + 5
        r2 = dx * dx + dy * dy + h * h
        f = 150.0 * 125 / (r2 ** 1.5 / 25 + 125)
        bz += f
        bx += f * dx / 40
        by += f * dy / 40
    return tuple(v + random.gauss(0, 0.3) for v in (bx, by, bz))


c.sensor.i2c.campo_ut = campo_ut
c.sensor.i2c.saturar = args.saturar
c.verificar_sensor()          # mide el fondo con la mesa en el origen (sin el imán todavía)
_mesa = c.mesa
main.red.conectar_inicial(c.alimentar)
c.homing_inicial()
t0 = time.monotonic()
wifi_caido = False
led_anterior = None
while time.monotonic() - t0 < args.segundos:
    t = time.monotonic() - t0
    if args.sin_wifi:
        caer = args.sin_wifi[0] <= t < args.sin_wifi[1]
        if caer != wifi_caido:
            wifi_caido = caer
            network.WLAN.conectado = not caer
            log("  (simulación) Wi-Fi %s" % ("CAÍDO" if caer else "de vuelta"))
    c.vuelta()
    if main.led.estado() != led_anterior:
        led_anterior = main.led.estado()
        log("  (simulación) LED: %s" % led_anterior)
    if args.hasta_vacio and t > 3 and c.tarea is None and c.sesion is None and not c.pendiente:
        break
log("  (simulación) Ctrl+C: fase=%s sesión=%s búfer=%d error=%s posición=(%.2f, %.2f, %.2f)" % (
    (c.fase, c.sesion and c.sesion["id"], len(c.bufer), c.error) + c.mesa.posicion_mm()))
main.apagar(c)
