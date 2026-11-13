# ═══════════════════════════════════════════════════════════════
# sensor.py — magnetómetro QMC5883P (3 ejes) por I2C
#
# Ficha completa: docs/sensor-qmc5883p.md. Resumen:
#   - Dirección 0x2C; Chip ID (registro 0x00) = 0x80.
#   - Inicialización: 0x29 ← 0x06 (signo de los ejes), 0x0B ← bits << 2
#     (Set/Reset y rango), 0x0A ← 0xCD (modo normal, 200 Hz) y 20 ms.
#     Sin escribir 0x0A el chip sigue en reposo y todo vale 0.
#   - Lectura: esperar DRDY (0x09 bit 0), leer 6 bytes desde 0x01 en el
#     orden X, Y, Z, byte bajo primero ('<hhh'). La saturación es el bit
#     OVFL (0x09 bit 1), no un valor especial.
#
# Interfaz que usan main.py, barrido.py y banco.py:
#   verificar()            escaneo del bus, Chip ID y fondo; texto para el log
#   configurar(sensor)     con sesion_activa.sensor del latido
#   medir()                generador: ((x, y, z) en cuentas, saturado)
#   a_envio(crudos, sat)   (raw, saturado) en el formato que espera el servidor
#
# Dos formatos de envío, según sesion_activa.sensor.modelo:
#   "QMC5883P"   (servidor adaptado al QMC5883P): raw = cuentas crudas del
#                QMC (−32768..32767) con el rango sensor.rango_g, más
#                "saturado": true|false por lectura (bit OVFL).
#   otro valor   (servidor de hoy, que espera un HMC5883L): se mide en
#                RANGO_G_PREDETERMINADO (30 G), se pasa a µT y de ahí a
#                «cuentas HMC» con sensor.lsb_por_ga, como hace
#                firmware_hall_1d/sensor_hall.py (a_cuentas): −4096 si hay
#                OVFL o si no cabe en −2048..2047. El servidor resta
#                offset_ut al convertir, así que el fondo copiado ahí se
#                descuenta en el servidor.
# ═══════════════════════════════════════════════════════════════
import struct
import time
from machine import I2C, Pin

import config
from registro import log

DIR_HMC5883L, DIR_QMC5883L = 0x1E, 0x0D
REG_ID, REG_DATOS, REG_ESTADO, REG_CONTROL1, REG_CONTROL2, REG_SIGNO = 0x00, 0x01, 0x09, 0x0A, 0x0B, 0x29
CHIP_ID = 0x80
DRDY, OVFL = 0x01, 0x02
CONTROL1_NORMAL_200HZ = 0xCD
SIGNO_EJES = 0x06

# Rango (G) → (bits 3–2 del registro 0x0B, cuentas por gauss)
RANGOS = {30: (0, 1000), 12: (1, 2500), 8: (2, 3750), 2: (3, 15000)}

MODELO_QMC = "QMC5883P"
# Formato del servidor de hoy (HMC5883L)
DESBORDE = -4096
CUENTA_MAX, CUENTA_MIN = 2047, -2048


class ErrorSensor(Exception):
    pass


def _rango_valido(rango):
    try:
        r = int(round(float(rango)))
    except (TypeError, ValueError):
        return None
    return r if (r in RANGOS and abs(float(rango) - r) < 1e-6) else None


class QMC5883P:
    def __init__(self):
        self.i2c = I2C(config.I2C_ID, sda=Pin(config.PIN_SDA), scl=Pin(config.PIN_SCL), freq=config.I2C_FRECUENCIA)
        self.dir = config.DIR_SENSOR
        self.rango_g = None
        self.cuentas_por_g = None
        self.modo_qmc = False          # True: se mandan cuentas QMC crudas (servidor nuevo)
        self.lsb_por_ga = 820          # servidor de hoy: se reemplaza con la configuración de la sesión
        self.fondo_ut = None           # (x, y, z) en µT, medido al arrancar
        self.ultima = None             # ((x, y, z) cuentas, (x, y, z) µT, saturado) de la última medición

    # ── Bus y chip ─────────────────────────────────────────────
    def verificar(self):
        """Escanea el bus, comprueba el Chip ID, inicializa y mide el fondo.
        Devuelve un texto para el log; lanza ErrorSensor si algo falla."""
        try:
            encontrados = self.i2c.scan()
        except OSError as e:
            raise ErrorSensor("el bus I2C no responde (%s): revisa SDA → GP%d y SCL → GP%d" % (e, config.PIN_SDA, config.PIN_SCL))
        texto = ", ".join("0x%02X" % d for d in encontrados) or "ninguno"
        if self.dir not in encontrados:
            if DIR_HMC5883L in encontrados:
                raise ErrorSensor("hay un HMC5883L en 0x1E, no un QMC5883P (otros registros). Bus: " + texto)
            if DIR_QMC5883L in encontrados:
                raise ErrorSensor("hay un QMC5883L en 0x0D, no un QMC5883P (otros registros). Bus: " + texto)
            if not encontrados:
                raise ErrorSensor("no hay nada en el bus I2C: revisa SDA → GP%d (pin 1), SCL → GP%d (pin 2), "
                                  "VCC → 3V3 (pin 36) y GND" % (config.PIN_SDA, config.PIN_SCL))
            raise ErrorSensor("no hay QMC5883P en 0x%02X. Bus: %s" % (self.dir, texto))
        try:
            ident = self.i2c.readfrom_mem(self.dir, REG_ID, 1)[0]
        except OSError as e:
            raise ErrorSensor("no se pudo leer el Chip ID (%s)" % e)
        if ident != CHIP_ID:
            raise ErrorSensor("Chip ID 0x%02X en 0x%02X; un QMC5883P da 0x80" % (ident, self.dir))
        self._reiniciar(config.RANGO_G_PREDETERMINADO)     # el fondo, siempre en el rango que no satura
        self.medir_fondo()
        return "QMC5883P en 0x%02X (bus: %s), %d G" % (self.dir, texto, self.rango_g)

    def iniciar(self, rango_g):
        """Pone el chip en modo normal a 200 Hz con el rango pedido."""
        bits, cpg = RANGOS[rango_g]
        self.i2c.writeto_mem(self.dir, REG_SIGNO, bytes([SIGNO_EJES]))
        self.i2c.writeto_mem(self.dir, REG_CONTROL2, bytes([bits << 2]))
        self.i2c.writeto_mem(self.dir, REG_CONTROL1, bytes([CONTROL1_NORMAL_200HZ]))
        time.sleep_ms(20)
        self.rango_g, self.cuentas_por_g = rango_g, cpg

    # ── Configuración de la sesión ─────────────────────────────
    def configurar(self, sensor_cfg):
        """Elige el formato de envío y el rango según sesion_activa.sensor."""
        sensor_cfg = sensor_cfg or {}
        if sensor_cfg.get("modelo") == MODELO_QMC:
            rango = _rango_valido(sensor_cfg.get("rango_g"))
            if rango is None:
                raise ErrorSensor("rango_g %r no es un rango del QMC5883P (2, 8, 12 o 30 G)" % sensor_cfg.get("rango_g"))
            self.modo_qmc = True
            self._reiniciar(rango)
            log("Sensor: servidor con QMC5883P; rango %d G (±%d µT), se mandan cuentas crudas"
                % (rango, rango * 100))
        else:
            try:
                self.lsb_por_ga = float(sensor_cfg["lsb_por_ga"])
            except (KeyError, TypeError, ValueError):
                log("AVISO sensor: la sesión no trae lsb_por_ga; se usa 820 (1,9 Ga)")
                self.lsb_por_ga = 820.0
            self.modo_qmc = False
            self._reiniciar(config.RANGO_G_PREDETERMINADO)
            log("AVISO sensor: el servidor espera un %s; se mandan «cuentas HMC» con %s LSB/Ga. "
                "Rango limitado a ±%.1f µT (más = saturado)"
                % (sensor_cfg.get("modelo") or "HMC5883L", self.lsb_por_ga, CUENTA_MAX / self.lsb_por_ga * 100))
        if config.RESTAR_FONDO_EN_PICO:
            log("Sensor: se resta el fondo en la Pico (%s µT); deja offset_ut en 0 en el servidor" % self._fondo_texto())

    def _reiniciar(self, rango):
        try:
            self.iniciar(rango)
        except OSError:
            time.sleep_ms(100)
            try:
                self.iniciar(rango)
            except OSError as e:
                raise ErrorSensor("el QMC5883P no responde al configurarlo (%s)" % e)

    # ── Lectura ────────────────────────────────────────────────
    def _leer_una(self):
        """Generador: espera DRDY cediendo el control y devuelve ((x, y, z), ovfl)."""
        t0 = time.ticks_ms()
        while True:
            estado = self.i2c.readfrom_mem(self.dir, REG_ESTADO, 1)[0]
            if estado & DRDY:
                break
            if time.ticks_diff(time.ticks_ms(), t0) > config.TIMEOUT_DRDY_MS:
                raise ErrorSensor("el QMC5883P no dio un dato nuevo en %d ms (DRDY)" % config.TIMEOUT_DRDY_MS)
            yield
        xyz = struct.unpack("<hhh", bytes(self.i2c.readfrom_mem(self.dir, REG_DATOS, 6)))   # X, Y, Z
        return xyz, bool(estado & OVFL)

    def medir(self, n=None):
        """Generador: promedia n lecturas (PROMEDIO_QMC). Devuelve ((x, y, z), saturado),
        con las cuentas como enteros (promedio redondeado). Saturado si alguna trajo OVFL.
        Ante un OSError del bus reinicia el chip una vez; si vuelve a fallar, ErrorSensor."""
        n = n or config.PROMEDIO_QMC
        sx = sy = sz = 0
        saturado = False
        reintento = True
        k = 0
        while k < n:
            try:
                (x, y, z), ovfl = yield from self._leer_una()
            except OSError as e:
                if not reintento:
                    raise ErrorSensor("error del bus I2C con el QMC5883P (%s), también tras reiniciarlo" % e)
                reintento = False
                log("AVISO sensor: %s; se reinicia el QMC5883P" % e)
                t0 = time.ticks_ms()
                while time.ticks_diff(time.ticks_ms(), t0) < 100:
                    yield
                try:
                    self.iniciar(self.rango_g or config.RANGO_G_PREDETERMINADO)
                except OSError as e2:
                    raise ErrorSensor("el QMC5883P no responde (%s)" % e2)
                continue
            sx += x
            sy += y
            sz += z
            saturado = saturado or ovfl
            k += 1
        crudos = (int(round(sx / n)), int(round(sy / n)), int(round(sz / n)))
        self.ultima = (crudos, self.a_ut(crudos), saturado)
        return crudos, saturado

    def medir_bloqueando(self, n=None):
        gen = self.medir(n)
        try:
            while True:
                next(gen)
                time.sleep_ms(1)
        except StopIteration as fin:
            return fin.value

    # ── Conversión ─────────────────────────────────────────────
    def a_ut(self, crudos):
        """Cuentas del rango actual → µT (sin restar el fondo)."""
        return tuple(c / self.cuentas_por_g * 100 for c in crudos)

    def medir_fondo(self, n=None):
        """Promedia LECTURAS_FONDO lecturas (mesa en el origen, bobina apagada)."""
        n = n or config.LECTURAS_FONDO
        crudos, saturado = self.medir_bloqueando(n)
        self.fondo_ut = self.a_ut(crudos)
        fx, fy, fz = self.fondo_ut
        log("Fondo (%d lecturas, %d G): Bx %+.2f  By %+.2f  Bz %+.2f  |B| %.2f µT%s" % (
            n, self.rango_g, fx, fy, fz, (fx * fx + fy * fy + fz * fz) ** 0.5, "  ¡SATURADO!" if saturado else ""))
        if config.RESTAR_FONDO_EN_PICO:
            log("Fondo: se restará en la Pico (RESTAR_FONDO_EN_PICO = True)")
        else:
            log("Fondo: cópialo en Configuración › Sensor › offset (x %.2f, y %.2f, z %.2f) "
                "si quieres que el servidor lo reste" % (fx, fy, fz))
        return self.fondo_ut

    def _fondo_texto(self):
        if not self.fondo_ut:
            return "sin medir"
        return "x %.2f, y %.2f, z %.2f" % self.fondo_ut

    def _sin_fondo_ut(self, ut):
        if config.RESTAR_FONDO_EN_PICO and self.fondo_ut:
            return tuple(v - f for v, f in zip(ut, self.fondo_ut))
        return ut

    def a_cuentas_hmc(self, ut):
        """µT → «cuentas HMC» para el servidor de hoy (DESBORDE si no caben)."""
        cuentas = int(round(ut * self.lsb_por_ga / 100))
        if cuentas > CUENTA_MAX or cuentas < CUENTA_MIN:
            return DESBORDE
        return cuentas

    def a_envio(self, crudos, saturado):
        """(raw, saturado) para el lote: saturado es None si el servidor no lo usa."""
        if self.modo_qmc:
            if config.RESTAR_FONDO_EN_PICO and self.fondo_ut:
                raw = tuple(max(-32768, min(32767, c - int(round(f * self.cuentas_por_g / 100))))
                            for c, f in zip(crudos, self.fondo_ut))
            else:
                raw = tuple(crudos)
            return raw, bool(saturado)
        if saturado:
            return (DESBORDE, DESBORDE, DESBORDE), None
        return tuple(self.a_cuentas_hmc(v) for v in self._sin_fondo_ut(self.a_ut(crudos))), None
