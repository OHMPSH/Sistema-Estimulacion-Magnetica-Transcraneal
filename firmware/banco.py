# ═══════════════════════════════════════════════════════════════
# banco.py — prueba de banco y calibración, SIN servidor ni Wi-Fi
#
# Desde la consola de Thonny, con main.py detenido (botón rojo) y la mesa
# en el origen (la posición al importar banco es el 0, 0, 0):
#
#   >>> import banco
#   >>> banco.sensor()                  # Chip ID, fondo y 10 lecturas (cuentas, µT, |B|)
#   >>> banco.sensor(rango=2)           # lo mismo en el rango de 2 G (2, 8, 12 o 30)
#   >>> banco.fondo()                   # vuelve a medir el fondo (bobina apagada)
#   >>> banco.ir(100, 50, 10)           # coordenadas de máquina en mm (con límites)
#   >>> banco.mover("x", 10)            # 10 mm relativos (negativo = hacia el origen)
#   >>> banco.pasos("x", 2000)          # pulsos crudos (para calibrar los pulsos/mm)
#   >>> banco.posicion()
#   >>> banco.prueba(nx=3, ny=3, paso=10, planos=(0, 10))   # malla pequeña en serpentina
#   >>> banco.origen()                  # vuelve a 0, 0, 0
#   >>> banco.apagar()                  # vuelve al origen y deshabilita los drivers
# ═══════════════════════════════════════════════════════════════
import time

import config
import barrido
from motores import Mesa
from sensor import QMC5883P, RANGOS

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
        _sensor = QMC5883P()
        print(_sensor.verificar())          # escaneo, Chip ID y fondo
    return _sensor


def _correr(gen):
    try:
        while True:
            next(gen)
            time.sleep_ms(1)
    except StopIteration as fin:
        return fin.value


def _texto(s, crudos, saturado):
    bx, by, bz = s.a_ut(crudos)
    return "cuentas %6d %6d %6d | µT %+9.2f %+9.2f %+9.2f | |B| %8.2f%s" % (
        crudos[0], crudos[1], crudos[2], bx, by, bz, (bx * bx + by * by + bz * bz) ** 0.5,
        "  SATURADO" if saturado else "")


def sensor(n=10, rango=None, cada_ms=200):
    """n mediciones (cada una promedia PROMEDIO_QMC lecturas) en el rango pedido."""
    s = _s()
    if rango is not None:
        if rango not in RANGOS:
            print("Rangos del QMC5883P: 2, 8, 12 o 30 G")
            return
        s.iniciar(rango)
    print("Rango %d G (%d cuentas/G). µT sin restar el fondo." % (s.rango_g, s.cuentas_por_g))
    for _ in range(n):
        crudos, saturado = s.medir_bloqueando()
        print(_texto(s, crudos, saturado))
        time.sleep_ms(cada_ms)


def fondo():
    """Vuelve a medir el fondo (mesa en el origen, bobina apagada)."""
    return _s().medir_fondo()


def ir(x, y, z=0.0):
    _correr(_m().mover_a(x, y, z if config.MODO_Z == "motor" else None))
    posicion()


def mover(eje, mm):
    """Movimiento relativo de un eje, con los mismos límites que ir()."""
    x, y, z = _m().posicion_mm()
    ir(*{"x": (x + mm, y, z), "y": (x, y + mm, z), "z": (x, y, z + mm)}[eje])


def pasos(eje, n, vel_mm_s=5):
    """Pulsos crudos sin rampa larga, para medir cuánto avanza el eje. Sin límites:
    úsalo solo cerca del origen y vuelve con banco.origen()."""
    m = _m()
    e = {"x": m.x, "y": m.y, "z": m.z}[eje]
    e.mover_pasos(n, vel_mm_s)
    _correr(e.esperar())
    print("%d pulsos (%.3f mm según la configuración actual)" % (n, n / e.ppmm))


def posicion():
    print("X=%.2f  Y=%.2f  Z=%.2f mm" % _m().posicion_mm())


def origen():
    _correr(_m().homing())
    posicion()


def prueba(nx=3, ny=3, paso=10.0, planos=(0,), lecturas=1):
    """Recorre una malla pequeña en serpentina desde ORIGEN_ZONA_* e imprime cada lectura."""
    sesion = {
        "id": 0, "paso_mm": paso, "grid_nx": nx, "grid_ny": ny, "z_levels_mm": list(planos),
        "zona_mm": {"x": (nx - 1) * paso, "y": (ny - 1) * paso, "z": max(planos)}, "ultimo_seq": 0,
    }
    total = barrido.total_puntos(sesion)
    errores = barrido.errores_de_zona(sesion)
    if errores:
        print("La malla no cabe:", errores)
        return
    m, s = _m(), _s()
    seq = 1
    for i in range(total):
        x, y, z = barrido.punto(sesion, i)
        xm, ym, zm = barrido.a_maquina(x, y, z)
        _correr(m.mover_a(xm, ym, zm if config.MODO_Z == "motor" else None))
        time.sleep_ms(config.ASENTAMIENTO_MS)
        for _ in range(lecturas):
            crudos, saturado = s.medir_bloqueando()
            print("%4d (%6.1f, %6.1f, %5.1f) mm  %s" % (seq, x, y, z, _texto(s, crudos, saturado)))
            seq += 1
    origen()
    print("Prueba terminada: %d lecturas" % (seq - 1))


def apagar():
    origen()
    _m().habilitar(False)
    print("Drivers deshabilitados")
