"""Corre el firmware (main.Controlador) en CPython contra un servidor real.

Los motores, el sensor y el Wi-Fi están simulados (stubs/), pero el
protocolo, el búfer, los lotes, los tiempos de cada movimiento y el
homing son los del firmware. Los finales de carrera se simulan con la
posición que el firmware calcula para cada eje.

    PICO_TOKEN=<token> python3 ejecutar_pc.py --url http://127.0.0.1:4100 --segundos 60
    opciones: --sin-wifi DESDE HASTA   (segundos: simula la caída del Wi-Fi)
              --saturar P              (probabilidad de −4096 en el eje Y)
"""
import argparse
import os
import sys
import time
import types

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(AQUI, "stubs"), os.path.dirname(AQUI)]
import _compat  # noqa: E402,F401

op = argparse.ArgumentParser()
op.add_argument("--url", default="http://127.0.0.1:4100")
op.add_argument("--segundos", type=float, default=60)
op.add_argument("--sin-wifi", type=float, nargs=2, default=None)
op.add_argument("--saturar", type=float, default=0)
op.add_argument("--recorrido-x", type=float, default=None, help="cambia EJE_X['recorrido_mm']")
op.add_argument("--hasta-vacio", action="store_true", help="termina cuando no hay sesión ni tarea")
args = op.parse_args()

secretos = types.ModuleType("secretos")
secretos.WIFI_SSID, secretos.WIFI_PASSWORD = "simulado", "simulado"
secretos.TOKEN, secretos.SERVIDOR = os.environ["PICO_TOKEN"], args.url
sys.modules["secretos"] = secretos

import config    # noqa: E402
import network   # noqa: E402
if args.recorrido_x is not None:
    config.EJE_X["recorrido_mm"] = args.recorrido_x
import main      # noqa: E402
import motores   # noqa: E402
from registro import log  # noqa: E402

c = main.Controlador()
c.sensor.i2c.saturar = args.saturar

# Finales de carrera simulados: la mesa arranca a 12 mm (X), 7 mm (Y) y 4 mm (Z) del interruptor
for eje, inicio_mm in ((c.mesa.x, 12), (c.mesa.y, 7), (c.mesa.z, 4)):
    if eje is None:
        continue
    eje.final = object()
    eje._fisica = int(inicio_mm * eje.ppmm)       # posición real − posición del firmware

    def activo(e=eje):
        pos = e.pos
        if e._dir_actual:
            hechos = motores.pasos_hechos(e._segmentos, time.ticks_diff(time.ticks_us(), e._t0))
            pos += e._dir_actual * min(hechos, abs(e._objetivo - e.pos))
        return pos + e._fisica <= 0

    eje.final_activo = activo

# El homing pone pos = 0 en el punto de disparo: la diferencia física pasa a ser 0
_original_homing = motores.Mesa._homing_eje


def _homing_eje(self, eje):
    yield from _original_homing(self, eje)
    eje._fisica = int(main.config.HOMING_SEPARACION_MM * eje.ppmm)   # el final queda 1 mm detrás del origen
    log("  (simulación) eje %s referenciado" % eje.nombre)


motores.Mesa._homing_eje = _homing_eje

c.verificar_sensor()
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
log("  (simulación) fin: fase=%s sesión=%s búfer=%d LED=%s error=%s" % (
    c.fase, c.sesion and c.sesion["id"], len(c.bufer), main.led.estado(), c.error))
