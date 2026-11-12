# ═══════════════════════════════════════════════════════════════
# sensor_hall.py — sensor Hall lineal 49E (un eje) en el ADC de la Pico
#
# El 49E da una tensión proporcional al campo perpendicular a su cara
# rotulada: sin campo, la mitad de la alimentación; un polo la sube y el
# otro la baja. Aquí ese eje es Z (la altura). X e Y se mandan como 0.
#
# El servidor solo entiende las "cuentas" del HMC5883L (−4096 a 2047) y
# las convierte con  valor = cuentas / lsb_por_ga × 100 − offset_ut.z.
# medir() hace la cuenta al revés con la configuración de la sesión
# (latido → sesion_activa.sensor), así que el dashboard muestra el campo
# del Hall en mT (UNIDAD_ENVIO = "mT") o en µT ("uT"). Si se sale del
# rango que caben en las cuentas, o el sensor está en el riel, se manda
# −4096 y el servidor la guarda como saturada.
# ═══════════════════════════════════════════════════════════════
import time
from machine import ADC

import config
from registro import log

DESBORDE = -4096
CUENTA_MAX, CUENTA_MIN = 2047, -2048


class ErrorSensor(Exception):
    pass


class Hall49E:
    def __init__(self):
        self.adc = ADC(config.CANAL_ADC)
        self.sensibilidad = config.SENSIBILIDAD_MV_POR_MT_5V * config.V_ALIMENTACION / 5.0   # mV/mT
        self.cero_v = None
        self.lsb_por_ga = 820          # se reemplaza con la configuración de la sesión
        self.offset = 0.0
        self.ultima = None             # (voltios, Bz en mT, cuentas) de la última medición

    # ── Lecturas del ADC ───────────────────────────────────────
    def leer_voltios(self):
        total = 0
        for _ in range(config.MUESTRAS_ADC):
            total += self.adc.read_u16()
        return total / config.MUESTRAS_ADC / 65535 * config.V_REF

    def calibrar_cero(self):
        """Promedia la salida sin campo. Lanza ErrorSensor si está pegada a un riel."""
        if config.CERO_FIJO_V is not None:
            self.cero_v = config.CERO_FIJO_V
            log("Hall: cero fijo %.4f V (CERO_FIJO_V)" % self.cero_v)
            return self.cero_v
        log("Hall: calibrando el cero %.1f s; no acerques imanes ni enciendas la bobina"
            % (config.CALIBRACION_CERO_MS / 1000))
        t0 = time.ticks_ms()
        suma, n = 0.0, 0
        minimo, maximo = config.V_REF, 0.0
        while time.ticks_diff(time.ticks_ms(), t0) < config.CALIBRACION_CERO_MS:
            v = self.leer_voltios()
            suma += v
            n += 1
            minimo, maximo = min(minimo, v), max(maximo, v)
            time.sleep_ms(10)
        cero = suma / n
        if cero < 0.1:
            raise ErrorSensor("la salida del Hall está en 0 V: revisa OUT → GP26 (pin 31) y VCC → 3V3 (pin 36)")
        if cero > config.V_ALIMENTACION - 0.1:
            raise ErrorSensor("la salida del Hall está pegada a 3,3 V: ¿VCC y OUT intercambiados, o falta GND?")
        self.cero_v = cero
        log("Hall: cero %.4f V (ruido pico a pico %.1f mV, %d mediciones)" % (cero, (maximo - minimo) * 1000, n))
        if abs(cero - config.V_ALIMENTACION / 2) > 0.35:
            log("AVISO Hall: sin campo se esperaba ≈ %.2f V; ¿hay un imán cerca?" % (config.V_ALIMENTACION / 2))
        return cero

    def verificar(self):
        """Lo llama el arranque. Devuelve un texto para el log."""
        self.calibrar_cero()
        return "Hall 49E en ADC%d, cero %.4f V, %.2f mV/mT, envío en %s" % (
            config.CANAL_ADC, self.cero_v, self.sensibilidad, config.UNIDAD_ENVIO)

    # ── Medición ───────────────────────────────────────────────
    def configurar(self, sensor_cfg):
        """Toma lsb_por_ga y offset_ut.z de la configuración de la sesión."""
        try:
            self.lsb_por_ga = float(sensor_cfg["lsb_por_ga"])
            self.offset = float((sensor_cfg.get("offset_ut") or {}).get("z", 0) or 0)
        except (KeyError, TypeError, ValueError):
            log("AVISO Hall: la sesión no trae lsb_por_ga; se usa 820 (1,9 Ga)")
            self.lsb_por_ga, self.offset = 820, 0.0
        if self.cero_v is None:
            raise ErrorSensor("el cero del Hall no está calibrado")
        rango = CUENTA_MAX / self.lsb_por_ga * 100
        log("Hall: %s LSB/Ga en el servidor → rango ±%.1f %s" % (self.lsb_por_ga, rango, config.UNIDAD_ENVIO))

    def a_cuentas(self, bz_mt):
        """Campo en mT → cuentas para el servidor (o DESBORDE si no caben)."""
        valor = bz_mt if config.UNIDAD_ENVIO == "mT" else bz_mt * 1000
        cuentas = int(round((valor + self.offset) * self.lsb_por_ga / 100))
        if cuentas > CUENTA_MAX or cuentas < CUENTA_MIN:
            return DESBORDE
        return cuentas

    def medir(self):
        """Generador (como el del HMC5883L): devuelve las cuentas crudas (x, y, z)."""
        yield                          # cede una vuelta al bucle principal
        v = self.leer_voltios()
        bz_mt = (v - self.cero_v) * 1000 / self.sensibilidad
        if v < config.MARGEN_SATURACION_V or v > config.V_ALIMENTACION - config.MARGEN_SATURACION_V:
            cuentas = DESBORDE
        else:
            cuentas = self.a_cuentas(bz_mt)
        self.ultima = (v, bz_mt, cuentas)
        return 0, 0, cuentas

    def medir_bloqueando(self):
        gen = self.medir()
        try:
            while True:
                next(gen)
        except StopIteration as fin:
            return fin.value
