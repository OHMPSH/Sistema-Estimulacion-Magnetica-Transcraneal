# ═══════════════════════════════════════════════════════════════
# main.py — firmware de la Raspberry Pi Pico W para el sistema TMS
#
# Bucle cooperativo, sin hilos: en cada vuelta
#   1. alimenta el watchdog y mantiene el Wi-Fi (red.py),
#   2. manda el latido cuando toca y reacciona a sesion_activa,
#   3. avanza un poco la tarea en curso (homing o barrido, que son
#      generadores: ceden el control mientras los motores se mueven),
#   4. manda un lote si hay suficientes lecturas.
# Los motores se mueven por PIO + DMA, así que un lote puede salir
# mientras la mesa va al siguiente punto.
#
# Al terminar o detener una sesión, la mesa vuelve al origen (0, 0, 0) y
# se apagan los drivers. El estado ('espera', 'homing', 'midiendo' o
# 'error') y el motivo de un error se mandan en cada latido y se ven en
# el dashboard. LED: parpadea desde que se alimenta y queda fijo en
# cuanto el servidor responde.
#
# Para no arrancar (por ejemplo, para editar archivos con Thonny), pulsa
# el botón BOOTSEL durante los 3 primeros segundos después de encender.
# ═══════════════════════════════════════════════════════════════
import led      # primero: el LED empieza a parpadear en cuanto la Pico se alimenta
import gc
import sys
import time
import machine
from machine import Pin

import config
import red
import cliente
import barrido
from registro import log
from motores import Mesa, ErrorMovimiento
from sensor import HMC5883L, ErrorSensor
from barrido import ErrorZona

ERRORES_DE_TAREA = (ErrorZona, ErrorMovimiento, ErrorSensor)


class Controlador:
    def __init__(self, wdt=None):
        self.wdt = wdt
        self.bufer = cliente.Bufer()
        self.envio = cliente.Enviador(self.bufer)
        self.mesa = Mesa()
        self.sensor = HMC5883L()
        self.sensor_ok = False
        self.boton_z = Pin(config.PIN_BOTON_Z, Pin.IN, Pin.PULL_UP) if config.MODO_Z == "manual" else None
        self.progreso = barrido.Progreso()
        self.sesion = None          # sesión que se está midiendo
        self.fase = None            # None, "homing", "barrido", "vaciando" o "cierre"
        self.tarea = None           # generador en curso
        self.homing_al_vaciar = True
        self.pendiente = None       # sesión nueva que espera a que termine la tarea actual
        self.no_medir = None        # id de la sesión ya completada o rechazada
        self.error = None
        self.sin_token = False
        self.servidor_ok = False
        self.intervalo_ms = 5000
        self.proximo_latido = time.ticks_ms()

    def alimentar(self):
        if self.wdt:
            self.wdt.feed()

    # ── Arranque ───────────────────────────────────────────────
    def verificar_sensor(self):
        try:
            bus = self.sensor.verificar()
            self.sensor_ok = True
            log("Sensor: HMC5883L en 0x%02X (bus: %s)" % (config.DIR_SENSOR, bus))
        except Exception as e:
            self.sensor_ok = False
            self.error = "sensor: %s" % e
            log("ERROR sensor:", e)
        return self.sensor_ok

    def homing_inicial(self):
        self.fase = "homing"
        self.tarea = self.mesa.homing()

    # ── Bucle ──────────────────────────────────────────────────
    def vuelta(self):
        self.alimentar()
        if red.mantener():                  # el Wi-Fi acaba de volver: no esperar la espera creciente
            self.envio.reiniciar()
            self.proximo_latido = time.ticks_ms()
        if time.ticks_diff(time.ticks_ms(), self.proximo_latido) >= 0:
            self.latir()
        self.avanzar_tarea()
        if self.sesion and self.fase in ("barrido", "vaciando") and self.envio.toca(forzar=self.fase == "vaciando"):
            self.alimentar()
            self.resultado_envio(self.envio.enviar(self.sesion["id"]))
        if self.fase == "vaciando" and not len(self.bufer):
            self.terminar_vaciado()
        self.actualizar_led()
        if self.tarea is None:
            time.sleep_ms(20)

    def latir(self):
        status, datos = cliente.latido(self.estado_pico(), self.error)
        if status == 401:
            self.no_autorizado()
            self.proximo_latido = time.ticks_add(time.ticks_ms(), config.LATIDO_401_REINTENTO_S * 1000)
            return
        self.proximo_latido = time.ticks_add(time.ticks_ms(), self.intervalo_ms)
        if status != 200 or not datos or not datos.get("ok"):
            if self.servidor_ok or status is not None:
                log("Latido: %s %s" % (status or "sin red", (datos or {}).get("error", "")))
            self.servidor_ok = False
            return
        if not self.servidor_ok:
            log("Latido: servidor en línea (modo %s)" % datos.get("modo_operacion"))
        self.servidor_ok = True
        if self.sin_token:
            log("El token vuelve a ser válido")
            self.sin_token = False
        intervalo = datos.get("intervalo_latido_s")
        if isinstance(intervalo, int) and intervalo > 0:
            self.intervalo_ms = intervalo * 1000
        self.revisar_sesion(datos.get("sesion_activa"))

    def revisar_sesion(self, s):
        id_nuevo = s["id"] if s else None
        if self.sesion and self.sesion["id"] != id_nuevo:
            self.abortar_sesion("el operador detuvo la sesión %d" % self.sesion["id"] if s is None
                                else "llegó la sesión %d" % id_nuevo)
        if s is None:
            self.pendiente = None
            if self.no_medir is not None:
                self.no_medir = None
                self.error = None if self.sensor_ok else self.error
            return
        if (self.sesion and self.sesion["id"] == id_nuevo) or id_nuevo == self.no_medir:
            return
        if not self.pendiente or self.pendiente["id"] != id_nuevo:
            log("Sesión %d: %s, paso %s mm, zona %s × %s × %s mm, %d puntos, último seq %d" % (
                id_nuevo, s["modo"], s["paso_mm"], s["zona_mm"]["x"], s["zona_mm"]["y"], s["zona_mm"]["z"],
                s["puntos_esperados"], s.get("ultimo_seq") or 0))
        self.pendiente = s

    def avanzar_tarea(self):
        if self.tarea is None:
            if self.pendiente and not self.sin_token:
                self.iniciar(self.pendiente)
                self.pendiente = None
            return
        try:
            next(self.tarea)
        except StopIteration:
            self.tarea = None
            if self.fase == "barrido":
                self.fase = "vaciando"
                self.homing_al_vaciar = True
            elif self.fase in ("homing", "cierre"):
                self.fase = None
                if not self.pendiente:
                    self.mesa.habilitar(False)     # sin sesión: drivers apagados
        except ERRORES_DE_TAREA as e:
            self.fallar(e)

    def iniciar(self, s):
        if not self.sensor_ok and not self.verificar_sensor():
            self.no_medir = s["id"]
            return
        self.error = None
        self.sesion = s
        self.bufer.vaciar()
        self.envio.reiniciar()
        self.progreso = barrido.Progreso()
        self.fase = "barrido"
        self.tarea = barrido.ejecutar(s, self.mesa, self.sensor, self.bufer, red.ahora_ms, self.progreso, self.boton_z)

    def terminar_vaciado(self):
        log("Sesión %d: todas las lecturas confirmadas. Falta que el operador la cierre en el dashboard." % self.sesion["id"])
        self.no_medir = self.sesion["id"]
        self.sesion = None
        if self.homing_al_vaciar:
            self.fase = "cierre"
            self.tarea = self.mesa.homing()
        else:
            self.fase = None

    def resultado_envio(self, resultado):
        if resultado == cliente.SESION_CERRADA:
            self.abortar_sesion("el servidor ya no acepta lecturas de la sesión %d" % self.sesion["id"])
        elif resultado == cliente.NO_AUTORIZADO:
            self.no_autorizado()

    # ── Paradas ────────────────────────────────────────────────
    def _cerrar_tarea(self):
        if self.tarea is not None:
            try:
                self.tarea.close()
            except Exception:
                pass
            self.tarea = None
        self.mesa.detener()

    def abortar_sesion(self, motivo):
        """Sesión cerrada desde el servidor: para los motores, vacía el búfer y hace homing."""
        log("Parada: %s. Se descartan %d lecturas sin enviar; homing." % (motivo, len(self.bufer)))
        self._cerrar_tarea()
        self.bufer.vaciar()
        self.no_medir = self.sesion["id"] if self.sesion else self.no_medir
        self.sesion = None
        self.fase = "cierre"
        self.tarea = self.mesa.homing()

    def fallar(self, e):
        """Error de hardware o de zona: para y no reintenta esta sesión. Si la mesa se
        había movido, vuelve al origen (0, 0, 0); si falló el propio homing, apaga los drivers."""
        self.error = str(e)
        log("ERROR:", e)
        volver = self.fase == "barrido" and not isinstance(e, ErrorZona)
        self._cerrar_tarea()
        if not volver:
            self.mesa.habilitar(False)
        if self.sesion:
            self.no_medir = self.sesion["id"]
            if len(self.bufer):
                log("Se envían las %d lecturas ya tomadas" % len(self.bufer))
                self.fase = "vaciando"
                self.homing_al_vaciar = volver
                return
            self.sesion = None
        if volver:
            self.fase = "cierre"
            self.tarea = self.mesa.homing()
        else:
            self.fase = None

    def no_autorizado(self):
        if not self.sin_token:
            log("401: token inválido o dispositivo desactivado. Se detiene todo; "
                "genera un token nuevo (Configuración › Dispositivo) y cópialo en secretos.py.")
        self.sin_token = True
        self._cerrar_tarea()
        self.mesa.habilitar(False)
        self.bufer.vaciar()
        self.sesion = None
        self.pendiente = None
        self.fase = None

    def estado_pico(self):
        """Lo que se informa al servidor en el latido."""
        if self.error:
            return "error"
        if self.fase in ("homing", "cierre"):
            return "homing"
        if self.fase in ("barrido", "vaciando"):
            return "midiendo"
        return "espera"

    def actualizar_led(self):
        if self.sin_token:
            led.poner("sin_token")
        elif self.error:
            led.poner("error")
        elif not red.conectado() or not self.servidor_ok:
            led.poner("conectando")
        else:
            led.poner("conectado")             # fijo: hay conexión con el servidor


def _bootsel_pulsado(segundos=3):
    try:
        import rp2
    except ImportError:
        return False
    fin = time.ticks_add(time.ticks_ms(), segundos * 1000)
    while time.ticks_diff(fin, time.ticks_ms()) > 0:
        if rp2.bootsel_button():
            return True
        time.sleep_ms(50)
    return False


def principal():
    log("Firmware %s — MicroPython %s" % (config.FIRMWARE, sys.version))
    led.poner("conectando")
    if _bootsel_pulsado():
        led.poner("apagado")
        log("BOOTSEL pulsado: el firmware no arranca (modo de edición)")
        return
    wdt = machine.WDT(timeout=config.WATCHDOG_MS) if config.USAR_WATCHDOG else None
    c = Controlador(wdt)
    c.verificar_sensor()
    red.conectar_inicial(c.alimentar)
    c.homing_inicial()
    try:
        while True:
            c.vuelta()
    except Exception as e:
        log("Fallo inesperado; se reinicia la Pico:")
        sys.print_exception(e)
        try:
            c.mesa.detener()
            c.mesa.habilitar(False)
        except Exception:
            pass
        led.poner("error")
        time.sleep_ms(3000)
        machine.reset()


if __name__ == "__main__":
    gc.collect()
    principal()
