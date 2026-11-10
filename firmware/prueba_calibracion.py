# ═══════════════════════════════════════════════════════════════
# prueba_calibracion.py — calibrar los milímetros de cada eje (Thonny)
#
# Programa independiente: no usa config.py ni el resto del firmware.
# Ábrelo en Thonny y pulsa F5 (Ejecutar). Te pide X, Y y Z en mm, mueve
# la mesa a esa posición, y con "1" la regresa al punto de origen (la
# posición en que estaba la mesa al arrancar el programa).
#
# Los pulsos son SIMÉTRICOS: PUL pasa la mitad del periodo en alto y la
# otra mitad en bajo (como el programa de prueba de un eje que ya movía
# bien los motores). Con los 3,3 V de la Pico, el optoacoplador del
# TB6600 necesita pulsos largos; uno de 10 µs hacía vibrar al motor.
#
# CÓMO CALIBRAR
#   1. Antes de ejecutar, deja la mesa en una posición que puedas medir
#      (ese es el origen) y pon a cero el calibrador o marca la posición.
#   2. Pide un movimiento grande en un solo eje, por ejemplo X = 40, Y = 0, Z = 0.
#   3. Mide cuánto se movió de verdad (mm medidos).
#   4. Corrige el factor de ese eje (abajo, "FACTORES DE CONVERSIÓN"):
#
#          factor nuevo = factor actual × mm pedidos / mm medidos
#
#      Ejemplo: factor 50, pediste 40 mm y midió 39,6 mm
#               → 50 × 40 / 39,6 = 50,51
#      El programa también te imprime los pulsos que dio: si mediste d mm,
#      factor nuevo = pulsos dados / d (es lo mismo).
#   5. Regresa al origen (1), detén el programa (Ctrl+C o el botón rojo),
#      cambia el factor, vuelve a ejecutar (F5) y repite hasta que lo medido
#      sea igual a lo pedido. Hazlo con cada eje por separado.
#   6. Copia los factores finales a firmware/config.py:
#          EJE_X["pasos_por_mm"], EJE_Y["pasos_por_mm"], EJE_Z["pasos_por_mm"]
#
# Conexiones y procedimiento completo: docs/instructivo-calibracion-y-conexiones.md
#
# Si la Pico tiene cargado main.py, detenlo antes con el botón rojo de
# Thonny (con USAR_WATCHDOG = False no se reinicia).
# ═══════════════════════════════════════════════════════════════
import time
from machine import Pin

# ┌─────────────────────────────────────────────────────────────┐
# │ FACTORES DE CONVERSIÓN  (pulsos por milímetro)                │
# │ Aquí se corrigen después de medir. Valor teórico:             │
# │   pulsos por vuelta del TB6600 / avance del husillo (mm/vuelta)│
# │   400 pulsos/vuelta (SW1 OFF, SW2 ON, SW3 ON) / 8 mm = 50     │
# │   1600 pulsos/vuelta (1/8: SW1 OFF, SW2 ON, SW3 OFF) / 8 = 200 │
# └─────────────────────────────────────────────────────────────┘
PASOS_POR_MM_X = 50.0
PASOS_POR_MM_Y = 50.0
PASOS_POR_MM_Z = 50.0

# Si un eje se mueve al revés de lo que pides, cambia su False por True
INVERTIR_X = False
INVERTIR_Y = False
INVERTIR_Z = False

# Pines (los mismos que firmware/config.py). PUL = STEP del TB6600.
PIN_PUL_X, PIN_DIR_X = 10, 11
PIN_PUL_Y, PIN_DIR_Y = 12, 13
PIN_PUL_Z, PIN_DIR_Z = 14, 15
PIN_ENA = 16              # ENA+ común de los tres TB6600 (None si no está conectado)
ENA_HABILITADO = 0        # ENA+ en 0 = driver habilitado (energizado); 1 = motor libre
USAR_Z = True             # False si todavía no hay motor en Z

# ┌─────────────────────────────────────────────────────────────┐
# │ VELOCIDAD                                                     │
# │ MEDIO_PERIODO_US: tiempo en alto (y otro tanto en bajo) de     │
# │ cada pulso. 1000 µs = 500 pulsos/s = 10 mm/s con 50 pulsos/mm. │
# │ Número MÁS GRANDE = MÁS LENTO. Si el motor vibra o se salta    │
# │ pasos, súbelo (1500, 2000…).                                   │
# │ Con 1/8 de micropaso (200 pulsos/mm) usa unos 250 µs para      │
# │ la misma velocidad.                                            │
# └─────────────────────────────────────────────────────────────┘
MEDIO_PERIODO_US = 100
# Rampa opcional: arranca con este medio periodo (más lento) y acelera
# hasta MEDIO_PERIODO_US en RAMPA_PASOS pulsos (y frena igual). 0 = sin rampa.
MEDIO_PERIODO_INICIO_US = 1500
RAMPA_PASOS = 300


class Eje:
    def __init__(self, nombre, pin_pul, pin_dir, pasos_por_mm, invertir):
        self.nombre = nombre
        self.pul = Pin(pin_pul, Pin.OUT)
        self.dir = Pin(pin_dir, Pin.OUT)
        self.pul.value(0)
        self.pasos_por_mm = pasos_por_mm
        self.invertir = invertir
        self.pasos = 0            # posición actual en pulsos desde el origen

    def mm(self):
        return self.pasos / self.pasos_por_mm

    def ir_a(self, mm):
        """Mueve a `mm` desde el origen. Devuelve los pulsos que dio."""
        destino = int(round(mm * self.pasos_por_mm))
        n = destino - self.pasos
        if n == 0:
            return 0
        adelante = n > 0
        self.dir.value(1 if adelante != self.invertir else 0)
        time.sleep_us(100)                        # el TB6600 pide DIR antes del primer pulso
        n = abs(n)
        rampa = min(RAMPA_PASOS, n // 2)
        print("  Moviendo %s %s %d pulsos..." % (self.nombre, "+" if adelante else "-", n))
        for i in range(n):
            medio = MEDIO_PERIODO_US
            if rampa:
                k = min(i, n - 1 - i)             # distancia al inicio o al final
                if k < rampa:
                    medio = int(MEDIO_PERIODO_INICIO_US - (MEDIO_PERIODO_INICIO_US - MEDIO_PERIODO_US) * k / rampa)
            self.pul.value(1)
            time.sleep_us(medio)
            self.pul.value(0)
            time.sleep_us(medio)
        self.pasos = destino
        return n


def pedir_mm(texto):
    while True:
        dato = input(texto).strip().replace(",", ".")
        try:
            return float(dato)
        except ValueError:
            print("  Escribe un número en mm (por ejemplo 25 o 12.5)")


def principal():
    ena = None
    if PIN_ENA is not None:
        ena = Pin(PIN_ENA, Pin.OUT)
        ena.value(ENA_HABILITADO)             # energiza los drivers
        time.sleep_ms(100)                    # pausa para que el driver se estabilice
    x = Eje("X", PIN_PUL_X, PIN_DIR_X, PASOS_POR_MM_X, INVERTIR_X)
    y = Eje("Y", PIN_PUL_Y, PIN_DIR_Y, PASOS_POR_MM_Y, INVERTIR_Y)
    z = Eje("Z", PIN_PUL_Z, PIN_DIR_Z, PASOS_POR_MM_Z, INVERTIR_Z) if USAR_Z else None
    ejes = [e for e in (x, y, z) if e]

    print("Prueba de calibración. Origen = posición actual de la mesa.")
    print("Factores: X=%s  Y=%s  Z=%s pulsos/mm · medio periodo %d µs" % (
        PASOS_POR_MM_X, PASOS_POR_MM_Y, PASOS_POR_MM_Z if USAR_Z else "-", MEDIO_PERIODO_US))
    try:
        while True:
            print()
            objetivo = [pedir_mm("Ingresa posición en mm X: "), pedir_mm("Ingresa posición en mm Y: ")]
            if z:
                objetivo.append(pedir_mm("Ingresa posición en mm Z: "))
            for eje, mm in zip(ejes, objetivo):
                n = eje.ir_a(mm)
                if n:
                    print("  %s: %d pulsos → %.3f mm (si mediste d mm: factor nuevo = %d / d)" % (eje.nombre, n, eje.mm(), n))
            print("Llegó a X=%.3f  Y=%.3f%s mm" % (x.mm(), y.mm(), "  Z=%.3f" % z.mm() if z else ""))

            while input("Ingresa 1 para regresar al punto de origen: ").strip() != "1":
                pass
            for eje in reversed(ejes):        # Z primero, para no arrastrar el sensor
                eje.ir_a(0)
            print("En el origen. Puedes repetir el experimento.")
    finally:
        if ena is not None:
            ena.value(1 - ENA_HABILITADO)     # deshabilita los drivers al salir
            print("Drivers deshabilitados.")


principal()
