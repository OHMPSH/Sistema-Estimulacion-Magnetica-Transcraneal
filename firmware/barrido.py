# ═══════════════════════════════════════════════════════════════
# barrido.py — recorrido de la malla de una sesión
#
# La malla la manda el servidor en el latido (sesion_activa): grid_nx ×
# grid_ny puntos en X–Y con paso paso_mm, en cada plano de z_levels_mm,
# en orden x → y → z. Las coordenadas que se envían son de la ZONA
# (0..zona_mm.x, 0..zona_mm.y); la zona va centrada bajo la bobina:
#
#   x_máquina = X_BOBINA_MM − zona_mm.x / 2 + xMM      (igual en Y)
#   z_máquina = Z_CERO_MM + zMM
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


def a_maquina(sesion, x_mm, y_mm, z_mm):
    zona = sesion["zona_mm"]
    return (config.X_BOBINA_MM - zona["x"] / 2 + x_mm,
            config.Y_BOBINA_MM - zona["y"] / 2 + y_mm,
            config.Z_CERO_MM + z_mm)


def reanudar_en(sesion):
    """(seq, índice del punto, lectura dentro del punto) desde donde seguir."""
    seq = int(sesion.get("ultimo_seq") or 0) + 1
    n = lecturas_por_punto(sesion)
    indice, k = divmod(seq - 1, n)
    return seq, indice, k


def errores_de_zona(sesion):
    """Lista de motivos por los que la zona no cabe en el recorrido (vacía si cabe)."""
    errores = []
    zona = sesion["zona_mm"]
    planos = sesion["z_levels_mm"]
    minimo = config.MARGEN_ORIGEN_MM      # la aproximación por + nunca baja de 0 (mover_a la limita)
    for nombre, centro, ancho, eje in (("X", config.X_BOBINA_MM, zona["x"], config.EJE_X),
                                       ("Y", config.Y_BOBINA_MM, zona["y"], config.EJE_Y)):
        desde, hasta = centro - ancho / 2, centro + ancho / 2
        if desde < minimo - 1e-6 or hasta > eje["recorrido_mm"] + 1e-6:
            errores.append("%s: la zona va de %.1f a %.1f mm de máquina y el recorrido útil es %.1f–%.1f mm"
                           % (nombre, desde, hasta, minimo, eje["recorrido_mm"]))
    z_max = max(planos) if planos else 0
    if config.MODO_Z == "ninguno":
        if len(planos) > 1 or z_max > 0:
            errores.append("Z: la mesa no tiene eje Z y la sesión pide los planos %s mm" % planos)
    elif config.MODO_Z == "motor":
        if not config.EJE_Z:
            errores.append("Z: MODO_Z = 'motor' pero EJE_Z no está configurado")
        else:
            desde, hasta = config.Z_CERO_MM, config.Z_CERO_MM + z_max
            if desde < config.MARGEN_ORIGEN_MM - 1e-6 or hasta > config.EJE_Z["recorrido_mm"] + 1e-6:
                errores.append("Z: los planos van de %.1f a %.1f mm de máquina y el recorrido útil es %.1f–%.1f mm"
                               % (desde, hasta, config.MARGEN_ORIGEN_MM, config.EJE_Z["recorrido_mm"]))
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

    sensor.configurar(sesion["sensor"]["rango_ga"])
    if seq > 1:
        log("Sesión %d: se retoma en seq %d (punto %d de %d)" % (sesion["id"], seq, indice + 1, total))
    if not mesa.referenciada:
        yield from mesa.homing()

    z_actual = None
    ultimo_aviso = -1
    while indice < total:
        x, y, z = punto(sesion, indice)
        if config.MODO_Z == "manual" and z != z_actual and (z_actual is not None or z != 0):
            log("Pon el sensor en el plano z = %s mm y pulsa el botón Z" % z)
            progreso.esperando_boton_z = True
            while not (boton_z and boton_z.value() == 0):
                yield
            while boton_z.value() == 0:      # espera a que lo suelten
                yield
            progreso.esperando_boton_z = False
        z_actual = z
        xm, ym, zm = a_maquina(sesion, x, y, z)
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
