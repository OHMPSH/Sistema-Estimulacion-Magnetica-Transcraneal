# ═══════════════════════════════════════════════════════════════
# cliente.py — latido, búfer de lecturas y envío por lotes
#
# Protocolo: docs/firmware-pico-w.md.
#   POST /api/dispositivo/latido       cada intervalo_latido_s
#   POST /api/dispositivo/mediciones   lotes de TAMANO_LOTE lecturas
#
# El búfer guarda cada lectura con su seq ya asignado. Un lote solo sale del
# búfer cuando el servidor lo confirma (200); si no hay red, hay timeout o un
# 5xx, se reenvía el MISMO lote (mismos seq) con espera creciente. El
# servidor descarta los duplicados por (sesion_id, seq).
# ═══════════════════════════════════════════════════════════════
import gc
import json
import time
from array import array

try:
    import requests
except ImportError:
    import urequests as requests

import config
import red
from registro import log
from secretos import TOKEN, SERVIDOR

API = SERVIDOR.rstrip("/") + "/api"
_CABECERAS = {"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"}
_inicio = time.ticks_ms()
_ultimo_aviso = None        # para no repetir el mismo aviso de red en cada intento

# Resultados de enviar()
CONFIRMADO = 0      # el servidor guardó (o descartó como duplicadas) las lecturas
REINTENTAR = 1      # sin red, timeout o 5xx: se reenvía el mismo lote más tarde
SESION_CERRADA = 2  # 404 o 409: la sesión ya no admite lecturas
NO_AUTORIZADO = 3   # 401: token inválido o dispositivo desactivado


def post(ruta, cuerpo):
    """POST con el token. Devuelve (status, json) o (None, None) si no hubo red."""
    if not red.conectado():
        return None, None
    gc.collect()
    r = None
    try:
        r = requests.post(API + ruta, data=json.dumps(cuerpo).encode(), headers=_CABECERAS, timeout=config.TIMEOUT_HTTP_S)
        status = r.status_code
        try:
            datos = r.json()
        except Exception:
            datos = None
        return status, datos
    except Exception as e:
        global _ultimo_aviso
        if _ultimo_aviso is None or time.ticks_diff(time.ticks_ms(), _ultimo_aviso) > 30_000:
            _ultimo_aviso = time.ticks_ms()
            log("HTTP %s: sin respuesta (%s: %s)" % (ruta, type(e).__name__, e))
        return None, None
    finally:
        if r is not None:
            try:
                r.close()
            except Exception:
                pass


def latido(estado=None, error=None):
    """Devuelve (status, respuesta). status None = sin red.
    `estado` ('espera', 'homing', 'midiendo' o 'error') y `error` se ven en el dashboard."""
    cuerpo = {
        "firmware": config.FIRMWARE,
        "error": error[:300] if error else None,
        "uptime_s": time.ticks_diff(time.ticks_ms(), _inicio) // 1000,
        "ts_dispositivo_ms": red.ahora_ms(),
    }
    if estado:
        cuerpo["estado"] = estado
    valor_rssi = red.rssi()
    if valor_rssi is not None:
        cuerpo["rssi"] = valor_rssi
    return post("/dispositivo/latido", cuerpo)


# ── Búfer circular de lecturas ─────────────────────────────────
# Cada lectura ocupa 8 enteros de 32 bits: seq, x×10, y×10, z×10 (décimas
# de mm), raw x, raw y, raw z y ts relativo (ms desde base_ts). Así 1000
# lecturas caben en 32 kB en lugar de ~70 kB como diccionarios.
_CAMPOS = 8


class Bufer:
    def __init__(self, capacidad=config.MAX_BUFER):
        self.capacidad = capacidad
        self.datos = array("i", bytes(4 * _CAMPOS * capacidad))
        self.inicio = 0
        self.n = 0
        self.base_ts = 0          # epoch ms de referencia para ts relativo
        self.ticks_mas_vieja = None

    def __len__(self):
        return self.n

    def lleno(self):
        return self.n >= self.capacidad

    def vaciar(self):
        self.inicio = 0
        self.n = 0
        self.base_ts = 0
        self.ticks_mas_vieja = None

    def agregar(self, seq, x_mm, y_mm, z_mm, raw, ts_ms):
        if self.lleno():
            raise RuntimeError("búfer lleno")
        if ts_ms and not self.base_ts:
            self.base_ts = ts_ms
        i = ((self.inicio + self.n) % self.capacidad) * _CAMPOS
        d = self.datos
        d[i] = seq
        d[i + 1] = int(round(x_mm * 10))
        d[i + 2] = int(round(y_mm * 10))
        d[i + 3] = int(round(z_mm * 10))
        d[i + 4] = raw[0]
        d[i + 5] = raw[1]
        d[i + 6] = raw[2]
        # −1 = sin hora (ts 0); si no, ms desde base_ts (24 días de margen)
        d[i + 7] = (ts_ms - self.base_ts) if ts_ms else -1
        if self.n == 0:
            self.ticks_mas_vieja = time.ticks_ms()
        self.n += 1

    def lote(self, maximo):
        """Las `maximo` lecturas más viejas, en el formato del servidor (sin quitarlas)."""
        lecturas = []
        d = self.datos
        for k in range(min(maximo, self.n)):
            i = ((self.inicio + k) % self.capacidad) * _CAMPOS
            ts = d[i + 7]
            lecturas.append({
                "seq": d[i],
                "xMM": d[i + 1] / 10, "yMM": d[i + 2] / 10, "zMM": d[i + 3] / 10,
                "raw": {"x": d[i + 4], "y": d[i + 5], "z": d[i + 6]},
                "ts_ms": (self.base_ts + ts) if ts >= 0 else 0,
            })
        return lecturas

    def confirmar(self, cuantas):
        cuantas = min(cuantas, self.n)
        self.inicio = (self.inicio + cuantas) % self.capacidad
        self.n -= cuantas
        self.ticks_mas_vieja = time.ticks_ms() if self.n else None


class Enviador:
    """Decide cuándo mandar un lote y aplica la espera creciente."""

    def __init__(self, bufer):
        self.bufer = bufer
        self.espera_ms = config.ESPERA_REINTENTO_MIN_MS
        self.proximo = time.ticks_ms()

    def reiniciar(self):
        self.espera_ms = config.ESPERA_REINTENTO_MIN_MS
        self.proximo = time.ticks_ms()

    def toca(self, forzar=False):
        b = self.bufer
        if not len(b) or time.ticks_diff(time.ticks_ms(), self.proximo) < 0:
            return False
        if forzar or len(b) >= config.TAMANO_LOTE:
            return True
        return time.ticks_diff(time.ticks_ms(), b.ticks_mas_vieja) >= config.MAX_ESPERA_LOTE_MS

    def enviar(self, sesion_id):
        """Manda un lote. Devuelve CONFIRMADO, REINTENTAR, SESION_CERRADA o NO_AUTORIZADO."""
        lecturas = self.bufer.lote(config.TAMANO_LOTE)
        primero, ultimo, n = lecturas[0]["seq"], lecturas[-1]["seq"], len(lecturas)
        status, datos = post("/dispositivo/mediciones", {"sesionId": sesion_id, "lecturas": lecturas})
        del lecturas
        if status == 200 and datos and datos.get("ok"):
            rech = datos.get("rechazadas") or []
            log("Lote %d–%d: aceptadas %d, duplicadas %d%s" % (
                primero, ultimo, datos.get("aceptadas", 0), datos.get("duplicadas", 0),
                (", RECHAZADAS %d: %s" % (len(rech), rech[:3])) if rech else ""))
            self.bufer.confirmar(n)
            self.reiniciar()
            return CONFIRMADO
        if status == 401:
            log("Lote: 401, token inválido o dispositivo desactivado")
            return NO_AUTORIZADO
        if status in (404, 409):
            log("Lote: %d, %s" % (status, datos and datos.get("error")))
            return SESION_CERRADA
        if status in (400, 422):
            # Error del firmware: reintentarlo no sirve, pero tampoco se pierde en silencio
            log("Lote %d–%d: %d %s (se descarta)" % (primero, ultimo, status, datos and datos.get("errores")))
            self.bufer.confirmar(n)
            return CONFIRMADO
        log("Lote %d–%d: %s; reintento en %d ms" % (primero, ultimo, status or "sin red", self.espera_ms))
        self.proximo = time.ticks_add(time.ticks_ms(), self.espera_ms)
        self.espera_ms = min(self.espera_ms * 2, config.ESPERA_REINTENTO_MAX_MS)
        return REINTENTAR
