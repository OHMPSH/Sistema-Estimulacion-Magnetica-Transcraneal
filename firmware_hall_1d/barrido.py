# ═══════════════════════════════════════════════════════════════
# barrido.py — recorrido de la malla de una sesión (versión Hall 1D)
#
# La malla la manda el servidor en el latido (sesion_activa): grid_nx ×
# grid_ny puntos en X–Y con paso paso_mm, en cada plano de z_levels_mm,
# en orden x → y → z. Las coordenadas que se envían son de la ZONA
# (0..zona_mm.x, 0..zona_mm.y). En esta versión la zona empieza en
# ORIGEN_ZONA_*_MM (por defecto el origen, la posición al arrancar):
#
#   x_máquina = ORIGEN_ZONA_X_MM + xMM      (igual en Y y en Z)
#
# Antes de mover nada se comprueba que la zona entera cabe entre 0 y
# LIMITE_*_MM; si no, la sesión se rechaza con un error en el dashboard.
#
# Con lecturas_por_punto = N, cada punto lleva N lecturas con seq propios:
# la lectura con seq s es la (s − 1) % N del punto (s − 1) // N. Así, tras
# un reinicio, el barrido sigue en ultimo_seq + 1 exactamente donde quedó.
# ═══════════════════════════════════════════════════════════════
import math
import time

import config
from registro import log


class ErrorZona(Exception):
    pass


def _decimas(v):
    """Igual que el servidor: Math.round(v × 10) / 10."""
    return math.floor(v * 10 + 0.5) / 10


def lecturas_por_punto(sesion):
    try:
        return max(1, int(sesion["sensor"].get("lecturas_por_punto", 1)))
    except (KeyError, TypeError, AttributeError, ValueError):
        return 1


def total_puntos(sesion):
    return sesion["grid_nx"] * sesion["grid_ny"] * len(sesion["z_levels_mm"])


def punto(sesion, indice):
    """(xMM, yMM, zMM) del punto número `indice` en el orden x → y → z."""
    nx, ny = sesion["grid_nx"], sesion["grid_ny"]
    por_plano = nx * ny
    iz, resto = divmod(indice, por_plano)
    iy, ix = divmod(resto, nx)
    paso = sesion["paso_mm"]
    return _decimas(ix * paso), _decimas(iy * paso), sesion["z_levels_mm"][iz]


def a_maquina(x_mm, y_mm, z_mm):
    return (config.ORIGEN_ZONA_X_MM + x_mm,
            config.ORIGEN_ZONA_Y_MM + y_mm,
            config.ORIGEN_ZONA_Z_MM + z_mm)


def reanudar_en(sesion):
    """(seq, índice del punto, lectura dentro del punto) desde donde seguir."""
    seq = int(sesion.get("ultimo_seq") or 0) + 1
    n = lecturas_por_punto(sesion)
    indice, k = divmod(seq - 1, n)
    return seq, indice, k


def errores_de_zona(sesion):
    """Lista de motivos por los que la zona no cabe entre 0 y los límites (vacía si cabe)."""
    errores = []
    zona = sesion["zona_mm"]
    planos = sesion["z_levels_mm"]
    z_max = max(planos) if planos else 0
    ejes = [("X", config.ORIGEN_ZONA_X_MM, zona["x"], config.LIMITE_X_MM),
            ("Y", config.ORIGEN_ZONA_Y_MM, zona["y"], config.LIMITE_Y_MM)]
    if config.MODO_Z == "motor":
        ejes.append(("Z", config.ORIGEN_ZONA_Z_MM, z_max, config.LIMITE_Z_MM))
    elif len(planos) > 1 or z_max > 0:
        errores.append("Z: la mesa no tiene eje Z y la sesión pide los planos %s mm" % planos)
    for nombre, desde, ancho, limite in ejes:
        hasta = desde + ancho
        if desde < -1e-6 or hasta > limite + 1e-6:
            errores.append("%s: la zona va de %.1f a %.1f mm y el límite de la mesa es 0–%.1f mm"
                           % (nombre, desde, hasta, limite))
    total = total_puntos(sesion)
    if sesion.get("puntos_esperados") not in (None, total):
        errores.append("la malla (%d puntos) no coincide con puntos_esperados (%s)" % (total, sesion.get("puntos_esperados")))
    return errores


class Progreso:
    """Lo que el bucle principal necesita saber del barrido en curso."""
    def __init__(self):
        self.indice = 0
        self.total = 0
        self.esperando_boton_z = False
        self.pausado_por_bufer = False


def ejecutar(sesion, mesa, sensor, bufer, reloj, progreso, boton_z=None):
    """Generador: recorre la malla de la sesión y deja cada lectura en el búfer.
    Termina (StopIteration) al completar la malla. No vacía el búfer."""
    errores = errores_de_zona(sesion)
    if errores:
        raise ErrorZona("; ".join(errores))
    total = total_puntos(sesion)
    n = lecturas_por_punto(sesion)
    seq, indice, k = reanudar_en(sesion)
    progreso.total = total
    progreso.indice = indice
    if indice >= total:
        log("Sesión %d: la malla ya está completa en el servidor (último seq %d)" % (sesion["id"], seq - 1))
        return

    sensor.configurar(sesion["sensor"])
    if seq > 1:
        log("Sesión %d: se retoma en seq %d (punto %d de %d)" % (sesion["id"], seq, indice + 1, total))

    ultimo_aviso = -1
    while indice < total:
        x, y, z = punto(sesion, indice)
        xm, ym, zm = a_maquina(x, y, z)
        yield from mesa.mover_a(xm, ym, zm if config.MODO_Z == "motor" else None)
        t0 = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), t0) < config.ASENTAMIENTO_MS:
            yield
        while k < n:
            if bufer.lleno():
                progreso.pausado_por_bufer = True
                log("Búfer lleno (%d lecturas): barrido en pausa hasta poder enviar" % len(bufer))
                while bufer.lleno():
                    yield
                progreso.pausado_por_bufer = False
            raw = yield from sensor.medir()
            bufer.agregar(seq, x, y, z, raw, reloj())
            if config.MOSTRAR_LECTURAS and sensor.ultima:
                v, bz_mt, cuentas = sensor.ultima
                log("seq %d  zona (%.1f, %.1f, %.1f) mm  %.4f V  Bz %+.2f mT%s" % (
                    seq, x, y, z, v, bz_mt, "  SATURADO" if cuentas == -4096 else ""))
            seq += 1
            k += 1
        k = 0
        indice += 1
        progreso.indice = indice
        decena = indice * 10 // total
        if decena != ultimo_aviso:
            ultimo_aviso = decena
            log("Sesión %d: %d/%d puntos (%d %%), último seq %d" % (sesion["id"], indice, total, indice * 100 // total, seq - 1))
    log("Sesión %d: malla completa (%d puntos, %d lecturas)" % (sesion["id"], total, seq - 1))
