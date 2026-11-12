# ═══════════════════════════════════════════════════════════════
# banco.py — prueba de banco SIN servidor ni Wi-Fi (versión Hall 1D)
#
# Desde la consola de Thonny, con main.py detenido (botón rojo) y la mesa
# en el origen (la posición al importar banco es el 0, 0, 0):
#
#   >>> import banco
#   >>> banco.hall()                    # calibra el cero y muestra 10 lecturas
#   >>> banco.cero()                    # vuelve a calibrar el cero del Hall
#   >>> banco.ir(100, 50, 10)           # coordenadas de máquina en mm (con límites)
#   >>> banco.posicion()
#   >>> banco.prueba(nx=3, ny=3, paso=10, planos=(0,))   # malla pequeña desde el origen
#   >>> banco.origen()                  # vuelve a 0, 0, 0
#   >>> banco.apagar()                  # vuelve al origen y deshabilita los drivers
# ═══════════════════════════════════════════════════════════════
import time

import config
from motores import Mesa
from sensor_hall import Hall49E

_mesa = None
_sensor = None


def _m():
    global _mesa
    if _mesa is None:
        _mesa = Mesa()
        _mesa.habilitar(True)
        print("Origen (0, 0, 0) = posición actual. Límites X 0–%.0f, Y 0–%.0f, Z 0–%.0f mm"
              % (config.LIMITE_X_MM, config.LIMITE_Y_MM, config.LIMITE_Z_MM))
    return _mesa


def _s():
    global _sensor
    if _sensor is None:
        _sensor = Hall49E()
        _sensor.calibrar_cero()
    return _sensor


def _correr(gen):
    try:
        while True:
            next(gen)
            time.sleep_ms(1)
    except StopIteration as fin:
        return fin.value


def _leer():
    s = _s()
    v = s.leer_voltios()
    return v, (v - s.cero_v) * 1000 / s.sensibilidad


def hall(n=10, cada_ms=300):
    for _ in range(n):
        v, bz = _leer()
        print("%.4f V   Bz %+8.2f mT" % (v, bz))
        time.sleep_ms(cada_ms)


def cero():
    _s().calibrar_cero()


def ir(x, y, z=0.0):
    _correr(_m().mover_a(x, y, z if config.MODO_Z == "motor" else None))
    posicion()


def posicion():
    print("X=%.2f  Y=%.2f  Z=%.2f mm" % _m().posicion_mm())


def origen():
    _correr(_m().homing())
    posicion()


def prueba(nx=3, ny=3, paso=10.0, planos=(0,)):
    """Recorre una malla pequeña desde ORIGEN_ZONA_* e imprime Bz en cada punto."""
    for z in planos:
        for iy in range(ny):
            for ix in range(nx):
                x, y = ix * paso, iy * paso
                _correr(_m().mover_a(config.ORIGEN_ZONA_X_MM + x, config.ORIGEN_ZONA_Y_MM + y,
                                     config.ORIGEN_ZONA_Z_MM + z if config.MODO_Z == "motor" else None))
                time.sleep_ms(config.ASENTAMIENTO_MS)
                v, bz = _leer()
                print("(%6.1f, %6.1f, %5.1f) mm   %.4f V   Bz %+8.2f mT" % (x, y, z, v, bz))
    origen()


def apagar():
    origen()
    _m().habilitar(False)
    print("Drivers deshabilitados")
