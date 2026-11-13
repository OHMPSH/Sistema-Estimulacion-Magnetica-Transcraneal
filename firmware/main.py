# ═══════════════════════════════════════════════════════════════
# main.py — firmware de la Raspberry Pi Pico W para el sistema TMS
#
# Bucle cooperativo, sin hilos: en cada vuelta
#   1. mantiene el Wi-Fi (red.py),
#   2. manda el latido cuando toca y reacciona a sesion_activa,
#   3. avanza un poco la tarea en curso (barrido o regreso al origen,
#      que son generadores: ceden el control mientras los motores se mueven
#      o el sensor convierte),
#   4. manda un lote si hay suficientes lecturas.
# Los motores se mueven por PIO + DMA, así que un lote puede salir
# mientras la mesa va al siguiente punto.
#
# Comportamiento (el mismo que firmware_hall_1d/):
#   - Sensor: magnetómetro QMC5883P de 3 ejes (sensor.py).
#   - Sin finales de carrera: el ORIGEN (0, 0, 0) es la posición de la mesa
#     al arrancar. Antes de ejecutar, deja la mesa ahí.
#   - La malla se recorre en serpentina en X, Y y Z (barrido.py).
#   - Los drivers quedan habilitados todo el tiempo (sostienen la posición).
#   - Al terminar o detener una sesión, ante un error, ante un 401 y al
#     detener el programa con Ctrl+C o el botón rojo de Thonny, la mesa
#     vuelve al origen.
#   - Nunca se reinicia sola: un reinicio tomaría como origen la posición
#     en que haya quedado la mesa.
#   - Al arrancar se mide el fondo del sensor (bobina apagada). En espera
#     (sin sesión), el botón BOOTSEL lo vuelve a medir.
#
# El estado ('espera', 'homing', 'midiendo' o 'error') y el motivo de un
# error se mandan en cada latido y se ven en el dashboard. LED: parpadea
# desde que se alimenta y queda fijo en cuanto el servidor responde.
#
# Para no arrancar (por ejemplo, para editar archivos con Thonny), pulsa
# el botón BOOTSEL durante los 3 primeros segundos después de encender.
# ═══════════════════════════════════════════════════════════════
import led      # primero: el LED empieza a parpadear en cuanto la Pico se alimenta
import gc
import sys
import time

import config
import red
import cliente
import barrido
from registro import log
from motores import Mesa, ErrorMovimiento
from sensor import QMC5883P, ErrorSensor
from barrido import ErrorZona

ERRORES_DE_TAREA = (ErrorZona, ErrorMovimiento, ErrorSensor)

try:
    from rp2 import bootsel_button
except ImportError:
    bootsel_button = None


class Controlador:
    def __init__(self, wdt=None):
        self.wdt = wdt
        self.bufer = cliente.Bufer()
        self.envio = cliente.Enviador(self.bufer)
        self.mesa = Mesa()
        self.sensor = QMC5883P()
        self.sensor_ok = False
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
            log("Sensor:", self.sensor.verificar())
            self.sensor_ok = True
            if self.error and self.error.startswith("sensor:"):
                self.error = None
        except Exception as e:
            self.sensor_ok = False
            self.error = "sensor: %s" % e
            log("ERROR sensor:", e)
        return self.sensor_ok

    def homing_inicial(self):
        """Sin finales de carrera: fija el origen en la posición actual."""
        self.mesa.habilitar(True)
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
        self.revisar_bootsel()
        self.actualizar_led()
        if self.tarea is None:
            time.sleep_ms(20)

    def revisar_bootsel(self):
        """En espera, BOOTSEL vuelve a verificar el sensor y a medir el fondo."""
        if bootsel_button is None or self.tarea is not None or self.sesion or self.pendiente:
            return
        if bootsel_button():
            while bootsel_button():
                time.sleep_ms(20)
            self.verificar_sensor()

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
            if datos.get("modo_operacion") != "real":
                log("AVISO: el servidor está en modo simulación; para medir con la Pico, un admin "
                    "debe cambiarlo a Real (menú lateral)")
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
                log("Mesa en el origen X=%.2f Y=%.2f Z=%.2f mm" % self.mesa.posicion_mm())
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
        self.tarea = barrido.ejecutar(s, self.mesa, self.sensor, self.bufer, red.ahora_ms, self.progreso)

    def terminar_vaciado(self):
        log("Sesión %d: todas las lecturas confirmadas. Falta que el operador la cierre en el dashboard." % self.sesion["id"])
        self.no_medir = self.sesion["id"]
        self.sesion = None
        if self.homing_al_vaciar:
            self.volver_al_origen()
        else:
            self.fase = None

    def resultado_envio(self, resultado):
        if resultado == cliente.SESION_CERRADA:
            self.abortar_sesion("el servidor ya no acepta lecturas de la sesión %d" % self.sesion["id"])
        elif resultado == cliente.NO_AUTORIZADO:
            self.no_autorizado()

    # ── Paradas ────────────────────────────────────────────────
    def volver_al_origen(self):
        self.fase = "cierre"
        self.tarea = self.mesa.homing()

    def _cerrar_tarea(self):
        if self.tarea is not None:
            try:
                self.tarea.close()
            except Exception:
                pass
            self.tarea = None
        self.mesa.detener()

    def abortar_sesion(self, motivo):
        """Sesión cerrada desde el servidor: para los motores, vacía el búfer y vuelve al origen."""
        log("Parada: %s. Se descartan %d lecturas sin enviar; vuelve al origen." % (motivo, len(self.bufer)))
        self._cerrar_tarea()
        self.bufer.vaciar()
        self.no_medir = self.sesion["id"] if self.sesion else self.no_medir
        self.sesion = None
        self.volver_al_origen()

    def fallar(self, e):
        """Error de zona, de movimiento o del sensor: para, manda lo ya medido y vuelve al origen."""
        self.error = str(e)
        log("ERROR:", e)
        if isinstance(e, ErrorSensor):
            self.sensor_ok = False      # la siguiente sesión vuelve a verificarlo
        self._cerrar_tarea()
        if self.sesion:
            self.no_medir = self.sesion["id"]
            if len(self.bufer):
                log("Se envían las %d lecturas ya tomadas" % len(self.bufer))
                self.fase = "vaciando"
                self.homing_al_vaciar = True
                return
            self.sesion = None
        self.volver_al_origen()

    def no_autorizado(self):
        if not self.sin_token:
            log("401: token inválido o dispositivo desactivado. Se detiene todo; "
                "genera un token nuevo (Configuración › Dispositivo) y cópialo en secretos.py.")
        self.sin_token = True
        self._cerrar_tarea()
        self.bufer.vaciar()
        self.sesion = None
        self.pendiente = None
        self.volver_al_origen()

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


def _correr(gen):
    """Ejecuta un generador de movimiento hasta el final (bloqueando)."""
    while True:
        try:
            next(gen)
        except StopIteration:
            return
        time.sleep_ms(1)


def apagar(c):
    """Para todo, vuelve al origen (bloqueando) y deshabilita los drivers."""
    try:
        c._cerrar_tarea()
        if any(abs(v) > 1e-6 for v in c.mesa.posicion_mm()):
            log("Volviendo al origen antes de salir (X=%.2f Y=%.2f Z=%.2f mm); "
                "otro Ctrl+C lo interrumpe" % c.mesa.posicion_mm())
            _correr(c.mesa.homing())
        log("Mesa en X=%.2f Y=%.2f Z=%.2f mm" % c.mesa.posicion_mm())
    finally:
        c.mesa.habilitar(False)
        log("Drivers deshabilitados")


def _bootsel_pulsado(segundos=3):
    if bootsel_button is None:
        return False
    fin = time.ticks_add(time.ticks_ms(), segundos * 1000)
    while time.ticks_diff(fin, time.ticks_ms()) > 0:
        if bootsel_button():
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
    log("Origen (0, 0, 0) = posición actual de la mesa. Límites: X 0–%.0f, Y 0–%.0f, Z 0–%.0f mm"
        % (config.LIMITE_X_MM, config.LIMITE_Y_MM, config.LIMITE_Z_MM))
    c = Controlador()
    try:
        c.verificar_sensor()
        red.conectar_inicial(c.alimentar)
        c.homing_inicial()
        while True:
            c.vuelta()
    except KeyboardInterrupt:
        log("Detenido por el usuario")
        led.poner("apagado")
        apagar(c)
    except Exception as e:
        log("Fallo inesperado; el programa se detiene (sin reiniciar, para no perder el origen):")
        sys.print_exception(e)
        led.poner("error")
        try:
            apagar(c)
        except Exception as e2:
            log("No se pudo volver al origen:", e2)


if __name__ == "__main__":
    gc.collect()
    principal()
