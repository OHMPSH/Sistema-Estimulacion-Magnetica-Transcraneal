# ═══════════════════════════════════════════════════════════════
# banco.py — prueba de banco y calibración, SIN servidor ni Wi-Fi
#
# Desde la consola de Thonny o `mpremote repl` (con el firmware detenido:
# BOOTSEL al encender, o USAR_WATCHDOG = False):
#
#   >>> import banco
#   >>> banco.sensor()                 # escaneo I2C + 10 lecturas en µT
#   >>> banco.homing()                 # referencia los ejes
#   >>> banco.mover("x", 10)           # 10 mm relativos (negativo = hacia el origen)
#   >>> banco.pasos("x", 1600)         # micropasos crudos (para calibrar pasos/mm)
#   >>> banco.ir(50, 50)               # coordenadas de MÁQUINA (mm)
#   >>> banco.posicion()
#   >>> banco.centro()                 # va a (X_BOBINA_MM, Y_BOBINA_MM)
#   >>> banco.prueba(nx=3, ny=3, paso=5, planos=(0,))   # malla pequeña centrada bajo la bobina
#   >>> banco.apagar()                 # deshabilita los drivers
#
# La prueba imprime cada lectura: posición de la zona, cuentas crudas y µT.
# ═══════════════════════════════════════════════════════════════
import time

import config
import barrido
from motores import Mesa
from sensor import HMC5883L

_mesa = None
_sensor = None
RANGO_GA = 1.9
LSB_POR_GA = {0.88: 1370, 1.3: 1090, 1.9: 820, 2.5: 660, 4.0: 440, 4.7: 390, 5.6: 330, 8.1: 230}


def _m():
    global _mesa
    if _mesa is None:
        _mesa = Mesa()
    return _mesa


def _s():
    global _sensor
    if _sensor is None:
        _sensor = HMC5883L()
        print("I2C:", _sensor.verificar())
        _sensor.configurar(RANGO_GA)
    return _sensor


def _correr(gen):
    try:
        while True:
            next(gen)
            time.sleep_ms(1)
    except StopIteration as fin:
        return fin.value


def _ut(cuentas):
    return "  SAT  " if cuentas == -4096 else "%7.2f" % (cuentas / LSB_POR_GA[RANGO_GA] * 100)


def sensor(n=10):
    s = _s()
    for _ in range(n):
        x, y, z = s.medir_bloqueando()
        print("raw x=%6d y=%6d z=%6d   µT x=%s y=%s z=%s" % (x, y, z, _ut(x), _ut(y), _ut(z)))
        time.sleep_ms(100)


def homing():
    _correr(_m().homing())
    posicion()


def posicion():
    x, y, z = _m().posicion_mm()
    print("Máquina: X=%.3f  Y=%.3f  Z=%.3f mm" % (x, y, z))


def ir(x, y, z=None):
    m = _m()
    m.habilitar(True)
    _correr(m.mover_a(x, y, z))
    posicion()


def mover(eje, mm):
    m = _m()
    e = {"x": m.x, "y": m.y, "z": m.z}[eje]
    m.habilitar(True)
    e.mover_pasos(int(round(mm * e.ppmm)))
    _correr(e.esperar())
    posicion()


def pasos(eje, n, vel_mm_s=5):
    """Micropasos crudos, sin rampa larga: para medir cuánto avanza el eje."""
    m = _m()
    e = {"x": m.x, "y": m.y, "z": m.z}[eje]
    m.habilitar(True)
    e.mover_pasos(n, vel_mm_s)
    _correr(e.esperar())
    print("%d micropasos (%.3f mm según la configuración actual)" % (n, n / e.ppmm))


def centro():
    ir(config.X_BOBINA_MM, config.Y_BOBINA_MM, config.Z_CERO_MM if _m().z else None)


def apagar():
    _m().habilitar(False)
    print("Drivers deshabilitados")


def prueba(nx=3, ny=3, paso=5.0, planos=(0,), lecturas=1):
    """Recorre una malla pequeña centrada bajo la bobina e imprime las lecturas."""
    sesion = {
        "id": 0, "paso_mm": paso, "grid_nx": nx, "grid_ny": ny, "z_levels_mm": list(planos),
        "zona_mm": {"x": (nx - 1) * paso, "y": (ny - 1) * paso, "z": max(planos)},
        "sensor": {"rango_ga": RANGO_GA, "lecturas_por_punto": lecturas}, "ultimo_seq": 0,
    }
    sesion["puntos_esperados"] = barrido.total_puntos(sesion)
    errores = barrido.errores_de_zona(sesion)
    if errores:
        print("La malla no cabe:", errores)
        return
    m, s = _m(), _s()
    _correr(m.homing())
    print("  seq   xMM   yMM   zMM |  raw x  raw y  raw z |   Bx µT   By µT   Bz µT")
    seq = 1
    for i in range(sesion["puntos_esperados"]):
        x, y, z = barrido.punto(sesion, i)
        xm, ym, zm = barrido.a_maquina(sesion, x, y, z)
        _correr(m.mover_a(xm, ym, zm if m.z else None))
        time.sleep_ms(config.ASENTAMIENTO_MS)
        for _ in range(lecturas):
            rx, ry, rz = s.medir_bloqueando()
            print("%5d %5.1f %5.1f %5.1f | %6d %6d %6d | %s %s %s" % (seq, x, y, z, rx, ry, rz, _ut(rx), _ut(ry), _ut(rz)))
            seq += 1
    _correr(m.homing())
    m.habilitar(False)
    print("Prueba terminada: %d lecturas" % (seq - 1))
