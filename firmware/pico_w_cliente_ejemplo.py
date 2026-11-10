# ═══════════════════════════════════════════════════════════════
# pico_w_cliente_ejemplo.py — EJEMPLO DE REFERENCIA (MicroPython)
#
# Cliente de la Raspberry Pi Pico W para el servidor TMS. Implementa el
# protocolo de docs/firmware-pico-w.md:
#   - Wi-Fi + NTP al arrancar
#   - latido cada intervalo_latido_s (POST /api/dispositivo/latido)
#   - lectura del HMC5883L por I2C (orden de registros X, Z, Y; −4096 = desborde)
#   - búfer en RAM y envío por lotes con reintento de los MISMOS seq
#     (POST /api/dispositivo/mediciones)
#
# Es un ejemplo: NO se ha probado en hardware. Antes de usarlo, ajusta:
#   - secretos.py: WIFI_SSID, WIFI_PASSWORD, TOKEN y SERVIDOR (ver abajo)
#   - PIN_SDA, PIN_SCL e I2C_ID según el cableado
#   - mover_a(x, y, z): aquí va el control real de la mesa XY y del eje Z
#     (quién mueve los motores todavía está por definir)
#   - TAMANO_LOTE y MS_ENTRE_LECTURAS según el ritmo de la mesa
#
# secretos.py (no se sube a git):
#   WIFI_SSID = "iPhone de ..."
#   WIFI_PASSWORD = "..."
#   TOKEN = "el token que generó el admin (se muestra una sola vez)"
#   SERVIDOR = "https://172.20.10.2"     # IP de la Raspberry Pi 5 en el hotspot
# ═══════════════════════════════════════════════════════════════

import time
import struct
import network
import ntptime
import urequests
from machine import I2C, Pin

from secretos import WIFI_SSID, WIFI_PASSWORD, TOKEN, SERVIDOR

FIRMWARE = "pico-tms-ejemplo-1.0"
API = SERVIDOR.rstrip("/") + "/api"

# ── Hardware ───────────────────────────────────────────────────
I2C_ID = 0
PIN_SDA = 4
PIN_SCL = 5
DIR_HMC5883L = 0x1E          # 0x0D sería un QMC5883L: otro chip, otro driver
DESBORDE = -4096

# Registro B del HMC5883L según el rango en gauss (docs/firmware-pico-w.md 4.2)
REGISTRO_B = {0.88: 0x00, 1.3: 0x20, 1.9: 0x40, 2.5: 0x60, 4.0: 0x80, 4.7: 0xA0, 5.6: 0xC0, 8.1: 0xE0}

# ── Envío ──────────────────────────────────────────────────────
TAMANO_LOTE = 20             # recomendado 20 a 50 (máximo 200)
MAX_BUFER = 1000             # lecturas pendientes en RAM
MS_ENTRE_LECTURAS = 20

# MicroPython en algunas versiones cuenta el tiempo desde 2000-01-01
DESFASE_EPOCH = 0 if time.gmtime(0)[0] == 1970 else 946684800

i2c = I2C(I2C_ID, sda=Pin(PIN_SDA), scl=Pin(PIN_SCL), freq=400_000)
wlan = network.WLAN(network.STA_IF)
led = Pin("LED", Pin.OUT)
inicio_ms = time.ticks_ms()
reloj_ok = False


def conectar_wifi():
    wlan.active(True)
    if wlan.isconnected():
        return True
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    for _ in range(40):
        if wlan.isconnected():
            print("Wi-Fi:", wlan.ifconfig()[0])
            return True
        time.sleep(0.5)
    return False


def sincronizar_reloj():
    global reloj_ok
    try:
        ntptime.settime()          # UTC
        reloj_ok = True
        print("NTP ok:", time.gmtime())
    except Exception as e:
        print("NTP falló:", e)


def ahora_ms():
    """Epoch en ms (UTC), o 0 si el reloj no está sincronizado."""
    if not reloj_ok:
        return 0
    return (time.time() + DESFASE_EPOCH) * 1000 + (time.ticks_ms() % 1000)


def post(ruta, cuerpo):
    """POST con el token. Devuelve (status, json) o (None, None) si no hubo red."""
    try:
        r = urequests.post(API + ruta, json=cuerpo, headers={"Authorization": "Bearer " + TOKEN})
        try:
            datos = r.json()
        except Exception:
            datos = None
        status = r.status_code
        r.close()
        return status, datos
    except Exception as e:
        print("Sin red:", e)
        return None, None


# ── Sensor ─────────────────────────────────────────────────────
def verificar_sensor():
    dispositivos = i2c.scan()
    if DIR_HMC5883L not in dispositivos:
        raise RuntimeError("No hay HMC5883L en 0x1E. Encontrados: %s (0x0D = QMC5883L)" % [hex(d) for d in dispositivos])
    ident = i2c.readfrom_mem(DIR_HMC5883L, 10, 3)
    if ident != b"H43":
        raise RuntimeError("Identificación inesperada: %s" % ident)


def configurar_sensor(rango_ga):
    i2c.writeto_mem(DIR_HMC5883L, 0x00, bytes([0x78]))                  # 8 promedios, 75 Hz
    i2c.writeto_mem(DIR_HMC5883L, 0x01, bytes([REGISTRO_B[rango_ga]]))  # ganancia
    i2c.writeto_mem(DIR_HMC5883L, 0x02, bytes([0x00]))                  # continuo
    time.sleep_ms(10)
    leer_crudo()   # la primera lectura tras cambiar la ganancia usa la anterior: se descarta


def leer_crudo():
    datos = i2c.readfrom_mem(DIR_HMC5883L, 0x03, 6)
    x, z, y = struct.unpack(">hhh", datos)      # ¡el orden es X, Z, Y!
    return {"x": x, "y": y, "z": z}             # −4096 se manda tal cual


# ── Mesa (por definir) ─────────────────────────────────────────
def mover_a(x_mm, y_mm, z_mm):
    """Aquí va el movimiento real de la mesa XY y del eje Z."""
    time.sleep_ms(MS_ENTRE_LECTURAS)


def malla(sesion):
    """Puntos de la sesión en orden x → y → z, en coordenadas de la zona
    (0..zona_mm.x, 0..zona_mm.y). La zona va centrada bajo la bobina."""
    paso = sesion["paso_mm"]
    for z in sesion["z_levels_mm"]:
        for iy in range(sesion["grid_ny"]):
            for ix in range(sesion["grid_nx"]):
                yield round(ix * paso, 1), round(iy * paso, 1), z


# ── Bucle principal ────────────────────────────────────────────
def latido():
    status, datos = post("/dispositivo/latido", {
        "firmware": FIRMWARE,
        "rssi": wlan.status("rssi"),
        "uptime_s": time.ticks_diff(time.ticks_ms(), inicio_ms) // 1000,
        "ts_dispositivo_ms": ahora_ms(),
    })
    if status == 401:
        print("401: token inválido o dispositivo desactivado")
        led.on()
        return None, None
    if status != 200 or not datos:
        return None, None
    return datos.get("sesion_activa"), datos.get("intervalo_latido_s", 5)


def enviar_lote(sesion_id, bufer):
    """Envía hasta TAMANO_LOTE lecturas. Devuelve True si el servidor las confirmó (o las descartó a propósito)."""
    lote = bufer[:TAMANO_LOTE]
    status, datos = post("/dispositivo/mediciones", {"sesionId": sesion_id, "lecturas": lote})
    if status == 200:
        if datos.get("rechazadas"):
            print("Rechazadas:", datos["rechazadas"])
        del bufer[:len(lote)]
        return True
    if status in (404, 409):      # sesión cerrada o modo simulación: no tiene sentido reintentar
        print("Lote descartado:", status, datos and datos.get("error"))
        bufer.clear()
        return True
    return False                  # sin red o 5xx: se reintenta el MISMO lote


def medir_sesion(sesion):
    configurar_sensor(sesion["sensor"]["rango_ga"])
    seq = sesion["ultimo_seq"] + 1
    bufer = []
    espera = 250
    puntos = list(malla(sesion))
    ultimo_latido = time.ticks_ms()
    intervalo_ms = 5000

    for i in range(seq - 1, len(puntos)):
        x, y, z = puntos[i]
        mover_a(x, y, z)
        while len(bufer) >= MAX_BUFER:          # búfer lleno: pausa el barrido hasta poder enviar
            if not enviar_lote(sesion["id"], bufer):
                time.sleep_ms(espera)
                espera = min(espera * 2, 4000)
        bufer.append({"seq": seq, "xMM": x, "yMM": y, "zMM": z, "raw": leer_crudo(), "ts_ms": ahora_ms()})
        seq += 1

        if len(bufer) >= TAMANO_LOTE:
            if enviar_lote(sesion["id"], bufer):
                espera = 250
            else:
                time.sleep_ms(espera)
                espera = min(espera * 2, 4000)

        if time.ticks_diff(time.ticks_ms(), ultimo_latido) >= intervalo_ms:
            ultimo_latido = time.ticks_ms()
            activa, intervalo = latido()
            if intervalo:
                intervalo_ms = intervalo * 1000
            if not activa or activa["id"] != sesion["id"]:
                print("La sesión", sesion["id"], "ya no está activa")
                return

    while bufer:                                 # vaciar lo pendiente
        if not enviar_lote(sesion["id"], bufer):
            time.sleep_ms(espera)
            espera = min(espera * 2, 4000)
    print("Malla completa:", len(puntos), "puntos. Esperando a que el operador cierre la sesión.")


def principal():
    verificar_sensor()
    while not conectar_wifi():
        time.sleep(5)
    sincronizar_reloj()
    sesion_medida = None
    while True:
        if not wlan.isconnected():
            conectar_wifi()
        activa, intervalo = latido()
        if activa and activa["id"] != sesion_medida:
            print("Sesión", activa["id"], "paso", activa["paso_mm"], "mm,", activa["puntos_esperados"], "puntos")
            medir_sesion(activa)
            sesion_medida = activa["id"]
        time.sleep(intervalo or 5)


principal()
