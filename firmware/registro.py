# registro.py — log por la consola USB con la hora UTC (o el uptime si no hay NTP)
import time

_inicio = time.ticks_ms()
_reloj = None   # función que devuelve el epoch en ms, o 0 sin NTP (la pone red.py)


def usar_reloj(funcion):
    global _reloj
    _reloj = funcion


def _hora():
    ms = _reloj() if _reloj else 0
    if ms:
        t = time.gmtime(ms // 1000 - _desfase_epoch())
        return "%02d:%02d:%02d.%03dZ" % (t[3], t[4], t[5], ms % 1000)
    s = time.ticks_diff(time.ticks_ms(), _inicio) / 1000
    return "+%.3fs" % s


def _desfase_epoch():
    # MicroPython puede contar desde 2000-01-01 en lugar de 1970-01-01
    return 0 if time.gmtime(0)[0] == 1970 else 946684800


def log(*partes):
    print("[%s]" % _hora(), *partes)
