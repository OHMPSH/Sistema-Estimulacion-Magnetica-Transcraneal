# ═══════════════════════════════════════════════════════════════
# calibracion.py — previsualizador de la bobina (pico-tms-2.4, 2026-11-24)
#
# Antes de un barrido, el operador elige en la página un punto de la mesa
# (Previsualizar bobina) y mira en vivo cuánto campo mide el sensor, para
# saber si la corriente de la bobina es poca o demasiada.
#
# El latido trae calibracion = {activa, objetivo: {x_mm, y_mm, z_mm},
# sensor} (mm de MÁQUINA). Mientras está activa, este generador:
#   1. lleva la mesa al objetivo (mesa.mover_a: límites y orden de los ejes),
#   2. mide en bucle (sensor.medir) y manda cada lectura a
#      POST /dispositivo/calibracion,
#   3. la respuesta trae el objetivo vigente: si cambió, vuelve a 1; si
#      trae calibracion = null, termina y main.py devuelve la mesa al descanso.
# Nada de esto se guarda en la base de datos ni crea sesiones.
# ═══════════════════════════════════════════════════════════════
import time

import config
import cliente
from registro import log
from motores import ErrorMovimiento


def _tupla(objetivo):
    return (float(objetivo["x_mm"]), float(objetivo["y_mm"]), float(objetivo["z_mm"]))


def _posicion(mesa):
    x, y, z = mesa.posicion_mm()
    return {"x_mm": round(x, 2), "y_mm": round(y, 2), "z_mm": round(z, 2)}


def _informar(c, cuerpo):
    """Manda el estado (y la lectura) y toma el objetivo vigente de la respuesta."""
    status, datos = cliente.post("/dispositivo/calibracion", cuerpo)
    if status == 200 and datos and datos.get("ok"):
        c.cal = datos.get("calibracion")
    elif status == 401:
        c.cal = None          # el latido se encarga del 401


def _esperar_ms(ms):
    """Cede al menos una vez (así el bucle principal atiende el latido y el LED)."""
    t0 = time.ticks_ms()
    yield
    while time.ticks_diff(time.ticks_ms(), t0) < ms:
        yield


def ejecutar(c):
    """Generador. `c` es el Controlador de main.py: usa c.mesa, c.sensor y c.cal
    (la calibración vigente, que también actualiza el latido). Termina cuando
    c.cal es None. Lanza ErrorSensor si el sensor falla."""
    sensor_cfg = None
    alcanzado = None          # objetivo en el que está la mesa
    fallido = None            # objetivo que no se pudo alcanzar (fuera del recorrido)
    motivo = None
    while c.cal is not None:
        cfg = c.cal.get("sensor")
        if cfg and cfg != sensor_cfg:
            c.sensor.configurar(cfg)
            sensor_cfg = cfg
        objetivo = _tupla(c.cal["objetivo"])

        if objetivo == fallido:
            _informar(c, {"estado": "error", "error": motivo, "posicion_mm": _posicion(c.mesa)})
            yield from _esperar_ms(500)
            continue

        if objetivo != alcanzado:
            log("Calibración: a X=%.1f Y=%.1f Z=%.1f mm de máquina" % objetivo)
            _informar(c, {"estado": "moviendo", "posicion_mm": _posicion(c.mesa)})
            try:
                yield from c.mesa.mover_a(*objetivo)
            except ErrorMovimiento as e:
                fallido, motivo, alcanzado = objetivo, str(e)[:300], None
                log("Calibración: %s" % motivo)
                continue
            alcanzado, fallido = objetivo, None
            yield from _esperar_ms(config.ASENTAMIENTO_MS)
            continue

        crudos, saturado = yield from c.sensor.medir()
        raw, sat_envio = c.sensor.a_envio(crudos, saturado)
        cuerpo = {"estado": "en_posicion", "posicion_mm": _posicion(c.mesa),
                  "raw": {"x": raw[0], "y": raw[1], "z": raw[2]}}
        if sat_envio is not None:
            cuerpo["saturado"] = sat_envio
        _informar(c, cuerpo)
        yield from _esperar_ms(config.CALIBRACION_PAUSA_MS)
    log("Calibración terminada")
