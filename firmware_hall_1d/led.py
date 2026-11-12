# ═══════════════════════════════════════════════════════════════
# led.py — LED de la placa como indicador de estado
#
# Cada patrón es una cadena: un carácter cada 100 ms ("1" encendido,
# "0" apagado) que se repite. Lo mueve un Timer por software, así que
# sigue parpadeando mientras el programa espera una respuesta HTTP.
#
#   conectando   parpadeo rápido (5 Hz)            desde que se alimenta hasta que el servidor responde
#   conectado    FIJO                               el servidor respondió al latido (en espera, homing o midiendo)
#   error        tres destellos y pausa             zona fuera del recorrido, sensor, final de carrera
#   sin_token    parpadeo lento (1 Hz)              401: token inválido o dispositivo desactivado
# ═══════════════════════════════════════════════════════════════
from machine import Pin, Timer

PATRONES = {
    "conectando": "10",
    "conectado": "1",
    "error": "101010000000",
    "sin_token": "1111100000",
    "apagado": "0",
}

_led = Pin("LED", Pin.OUT)
_patron = PATRONES["conectando"]
_i = 0
_estado = "conectando"


def _tic(_t):
    global _i
    _i = (_i + 1) % len(_patron)
    _led.value(_patron[_i] == "1")


def poner(estado):
    global _patron, _i, _estado
    if estado != _estado:
        _estado = estado
        _patron = PATRONES[estado]
        _i = 0
        _led.value(_patron[0] == "1")


def estado():
    return _estado


try:
    _timer = Timer(period=100, mode=Timer.PERIODIC, callback=_tic, hard=False)
except TypeError:
    _timer = Timer(period=100, mode=Timer.PERIODIC, callback=_tic)
