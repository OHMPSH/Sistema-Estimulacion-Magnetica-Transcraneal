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
#   2. mide y manda la lectura a POST /dispositivo/calibracion, como mucho
#      UNA petición cada CALIBRACION_PAUSA_MS (1 s),
#   3. la respuesta trae el objetivo vigente: si cambió, vuelve a 1; si
#      trae calibracion = null, termina y main.py devuelve la mesa al descanso.
# Nada de esto se guarda en la base de datos ni crea sesiones.
#
# Ritmo (corregido el 2026-11-24): con una petición cada 150 ms la Pico 2 W
# se desconectaba y se apagaba a los pocos segundos de calibrar (radio Wi-Fi
# transmitiendo casi sin pausa y una conexión TCP nueva cada vez). Ahora
# todas las peticiones (moviendo, lectura y error) pasan por _informar, que
# respeta una pausa mínima entre ellas y espera más tras un fallo de red.
# ═══════════════════════════════════════════════════════════════
import gc
import time

import config
import cliente
from registro import log
from motores import ErrorMovimiento

_ultima_peticion = None       # ticks_ms de la última petición (con o sin respuesta)
_espera_ms = 0                # pausa que toca antes de la siguiente


def _tupla(objetivo):
    return (float(objetivo["x_mm"]), float(objetivo["y_mm"]), float(objetivo["z_mm"]))


def _posicion(mesa):
    x, y, z = mesa.posicion_mm()
    return {"x_mm": round(x, 2), "y_mm": round(y, 2), "z_mm": round(z, 2)}


def _esperar_ms(ms):
    """Cede al menos una vez (así el bucle principal atiende el latido y el LED)."""
    t0 = time.ticks_ms()
    yield
    while time.ticks_diff(time.ticks_ms(), t0) < ms:
        yield


def _esperar_turno():
    """Generador: cede hasta que haya pasado la pausa mínima desde la última petición."""
    yield                     # siempre cede al menos una vez (latido, LED y Ctrl+C)
    while _ultima_peticion is not None and time.ticks_diff(time.ticks_ms(), _ultima_peticion) < _espera_ms:
        yield


def _turno_libre():
    return _ultima_peticion is None or time.ticks_diff(time.ticks_ms(), _ultima_peticion) >= _espera_ms


def _informar(c, cuerpo):
    """Manda el estado (y la lectura) y toma el objetivo vigente de la respuesta.
    Se llama con el turno ya esperado (_esperar_turno)."""
    global _ultima_peticion, _espera_ms
    gc.collect()
    status, datos = cliente.post("/dispositivo/calibracion", cuerpo)
    _ultima_peticion = time.ticks_ms()
    if status == 200 and datos and datos.get("ok"):
        c.cal = datos.get("calibracion")
        _espera_ms = config.CALIBRACION_PAUSA_MS
    elif status == 401:
        c.cal = None          # el latido se encarga del 401
    else:
        # Sin red, timeout o error del servidor: no insistir; el latido sigue llegando
        _espera_ms = config.CALIBRACION_ESPERA_FALLO_MS


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
            yield from _esperar_turno()
            _informar(c, {"estado": "error", "error": motivo, "posicion_mm": _posicion(c.mesa)})
            continue

        if objetivo != alcanzado:
            log("Calibración: a X=%.1f Y=%.1f Z=%.1f mm de máquina" % objetivo)
            if _turno_libre():          # «moviendo» solo si no rompe la pausa (no se espera por él)
                _informar(c, {"estado": "moviendo", "posicion_mm": _posicion(c.mesa)})
                if c.cal is None:
                    break
            try:
                yield from c.mesa.mover_a(*objetivo)
            except ErrorMovimiento as e:
                fallido, motivo, alcanzado = objetivo, str(e)[:300], None
                log("Calibración: %s" % motivo)
                continue
            alcanzado, fallido = objetivo, None
            yield from _esperar_ms(config.ASENTAMIENTO_MS)
            continue

        # Primero se espera el turno y DESPUÉS se mide: la lectura que sale es fresca
        yield from _esperar_turno()
        if c.cal is None:
            break
        crudos, saturado = yield from c.sensor.medir()
        raw, sat_envio = c.sensor.a_envio(crudos, saturado)
        cuerpo = {"estado": "en_posicion", "posicion_mm": _posicion(c.mesa),
                  "raw": {"x": raw[0], "y": raw[1], "z": raw[2]}}
        if sat_envio is not None:
            cuerpo["saturado"] = sat_envio
        _informar(c, cuerpo)
    log("Calibración terminada")
