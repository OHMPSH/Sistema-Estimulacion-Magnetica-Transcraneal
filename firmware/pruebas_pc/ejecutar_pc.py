"""Corre el firmware (main.Controlador) en CPython contra un servidor real.

Los motores, el Wi-Fi y el QMC5883P están simulados (stubs/), pero el
protocolo, el búfer, los lotes, los tiempos de cada movimiento y el
recorrido en serpentina son los del firmware. Como en la mesa real, no hay
finales de carrera: al arrancar, la mesa está en POSICION_ARRANQUE_* de
config.py (0, 410, 88).

El QMC5883P falso mide el campo de la Tierra más el de un imán simulado en
(--iman X Y Z) de la mesa (mm de máquina), que baja con la distancia. Al
final simula un Ctrl+C para comprobar que la mesa vuelve a la posición de
arranque.

    PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4100 --segundos 60
    opciones: --sin-wifi DESDE HASTA   (segundos: simula la caída del Wi-Fi)
              --saturar P              (probabilidad de OVFL en cada lectura)
              --hasta-vacio            (termina cuando no hay sesión ni tarea)
              --inicio X Y Z           (agrega sesion_activa.inicio_medicion al latido,
                                        como lo hará el servidor; sin él, el del firmware)
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
op.add_argument("--iman", type=float, nargs=3, default=(20.0, 390.0, 70.0), help="posición del imán (mm de máquina)")
op.add_argument("--inicio", type=float, nargs=3, default=None, help="inicio_medicion que simula mandar el servidor")
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
        dx, dy, h = x - args.iman[0], y - args.iman[1], z - args.iman[2] + 5
        r2 = dx * dx + dy * dy + h * h
        f = 150.0 * 125 / (r2 ** 1.5 / 25 + 125)
        bz += f
        bx += f * dx / 40
        by += f * dy / 40
    return tuple(v + random.gauss(0, 0.3) for v in (bx, by, bz))


c.sensor.i2c.campo_ut = campo_ut

if args.inicio:
    _latido_original = main.cliente.latido

    def _latido_con_inicio(*a, **k):
        status, datos = _latido_original(*a, **k)
        if datos and datos.get("sesion_activa"):
            x, y, z = args.inicio
            datos["sesion_activa"]["inicio_medicion"] = {"x_mm": x, "y_mm": y, "z_mm": z}
        return status, datos

    main.cliente.latido = _latido_con_inicio

# Registro de los destinos de máquina (para comprobar el recorrido real de la mesa)
_destinos = []
_mover_a_original = c.mesa.mover_a


def _mover_a(x, y, z=None):
    _destinos.append((x, y, z))
    return _mover_a_original(x, y, z)


c.mesa.mover_a = _mover_a
c.sensor.i2c.saturar = args.saturar
c.verificar_sensor()          # mide el fondo con la mesa en el arranque (sin el imán todavía)
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
if _destinos:
    ejes = list(zip(*_destinos))
    log("  (simulación) %d movimientos; destinos de máquina: X %.1f–%.1f, Y %.1f–%.1f, Z %.1f–%.1f mm; primero %s" % (
        (len(_destinos), min(ejes[0]), max(ejes[0]), min(ejes[1]), max(ejes[1]),
         min(z for z in ejes[2] if z is not None), max(z for z in ejes[2] if z is not None), _destinos[0])))
main.apagar(c)
log("  (simulación) posición final %s; en arranque: %s" % (c.mesa.posicion_mm(), c.mesa.en_arranque()))
