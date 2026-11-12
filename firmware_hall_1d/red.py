# ═══════════════════════════════════════════════════════════════
# red.py — Wi-Fi (sin bloquear) y hora por NTP
#
# conectar_inicial() bloquea hasta que hay Wi-Fi (alimentando el watchdog).
# Después, mantener() se llama en cada vuelta del bucle principal: si el
# Wi-Fi se cayó, vuelve a pedir la conexión cada WIFI_REINTENTO_S sin
# detener el barrido, y resincroniza el reloj cada NTP_RESINCRONIZAR_S.
# ═══════════════════════════════════════════════════════════════
import time
import network
import ntptime

import config
import registro
from registro import log
from secretos import WIFI_SSID, WIFI_PASSWORD

wlan = network.WLAN(network.STA_IF)

# Reloj: epoch (ms) en el momento de sincronizar y ticks_ms de ese momento
_epoch_ms_sync = 0
_ticks_sync = 0
_ultimo_ntp = None          # ticks del último intento de NTP
_ultimo_intento_wifi = None
_estaba_conectado = False

DESFASE_EPOCH = 0 if time.gmtime(0)[0] == 1970 else 946684800


def conectado():
    return wlan.isconnected()


def rssi():
    try:
        valor = int(wlan.status("rssi"))
        return valor if -127 <= valor <= 0 else None
    except Exception:
        return None


def _pedir_conexion():
    global _ultimo_intento_wifi
    _ultimo_intento_wifi = time.ticks_ms()
    try:
        wlan.active(True)
        try:
            wlan.config(pm=0xA11140)   # sin ahorro de energía: menos latencia
        except Exception:
            pass
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    except Exception as e:
        log("Wi-Fi: error al conectar:", e)


def conectar_inicial(alimentar):
    """Bloquea hasta tener Wi-Fi. `alimentar` alimenta el watchdog."""
    global _estaba_conectado
    log("Wi-Fi: conectando a", WIFI_SSID)
    while not wlan.isconnected():
        _pedir_conexion()
        for _ in range(config.WIFI_REINTENTO_S * 10):
            alimentar()
            if wlan.isconnected():
                break
            time.sleep_ms(100)
        else:
            log("Wi-Fi: sin conexión (estado %s); reintento" % wlan.status())
    _estaba_conectado = True
    log("Wi-Fi: conectado, IP", wlan.ifconfig()[0], "RSSI", rssi())
    sincronizar_reloj()


def mantener():
    """Reconecta sin bloquear y resincroniza el reloj cuando toca.
    Devuelve True en la vuelta en que el Wi-Fi regresa."""
    global _estaba_conectado
    if wlan.isconnected():
        regreso = not _estaba_conectado
        if regreso:
            log("Wi-Fi: reconectado, IP", wlan.ifconfig()[0])
            _estaba_conectado = True
        if _ultimo_ntp is None or time.ticks_diff(time.ticks_ms(), _ultimo_ntp) > config.NTP_RESINCRONIZAR_S * 1000 \
                or (not _epoch_ms_sync and time.ticks_diff(time.ticks_ms(), _ultimo_ntp) > 60_000):
            sincronizar_reloj()
        return regreso
    if _estaba_conectado:
        log("Wi-Fi: se perdió la conexión; las lecturas se guardan en RAM")
        _estaba_conectado = False
    if _ultimo_intento_wifi is None or time.ticks_diff(time.ticks_ms(), _ultimo_intento_wifi) > config.WIFI_REINTENTO_S * 1000:
        _pedir_conexion()
    return False


def sincronizar_reloj():
    """NTP en UTC. Si falla, ahora_ms() sigue con la última sincronización (o 0)."""
    global _epoch_ms_sync, _ticks_sync, _ultimo_ntp
    _ultimo_ntp = time.ticks_ms()
    try:
        ntptime.host = config.NTP_HOST
        ntptime.settime()
        _ticks_sync = time.ticks_ms()
        _epoch_ms_sync = int(time.time() + DESFASE_EPOCH) * 1000
        log("NTP: reloj sincronizado")
    except Exception as e:
        log("NTP: falló (%s); se reintenta en 1 min" % e)


def ahora_ms():
    """Epoch en ms (UTC), o 0 si nunca se sincronizó."""
    if not _epoch_ms_sync:
        return 0
    return _epoch_ms_sync + time.ticks_diff(time.ticks_ms(), _ticks_sync)


registro.usar_reloj(ahora_ms)
