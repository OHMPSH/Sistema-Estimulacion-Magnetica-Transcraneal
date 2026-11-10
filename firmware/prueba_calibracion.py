# ═══════════════════════════════════════════════════════════════
# prueba_calibracion.py — calibrar los milímetros de cada eje (Thonny)
#
# Programa independiente: no usa config.py ni el resto del firmware.
# Ábrelo en Thonny y pulsa F5 (Ejecutar). Te pide X, Y y Z en mm, mueve
# la mesa a esa posición, y con "1" la regresa al punto de origen (la
# posición en que estaba la mesa al arrancar el programa).
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
#      Ejemplo: factor 200, pediste 40 mm y midió 39,6 mm
#               → 200 × 40 / 39,6 = 202,02
#      El programa también te imprime los pasos que dio: si mediste d mm,
#      factor nuevo = pasos dados / d (es lo mismo).
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
# │ FACTORES DE CONVERSIÓN  (micropasos por milímetro)            │
# │ Aquí se corrigen después de medir. Valor teórico:             │
# │   200 pasos/vuelta × micropasos del TB6600 / avance del husillo│
# │   = 200 × 8 / 8 mm = 200   (1/8 de micropaso, T8 de 8 mm/vuelta)│
# └─────────────────────────────────────────────────────────────┘
PASOS_POR_MM_X = 200.0
PASOS_POR_MM_Y = 200.0
PASOS_POR_MM_Z = 200.0

# Si un eje se mueve al revés de lo que pides, cambia su False por True
INVERTIR_X = False
INVERTIR_Y = False
INVERTIR_Z = False

# Pines (los mismos que firmware/config.py). PUL = STEP del TB6600.
PIN_PUL_X, PIN_DIR_X = 10, 11
PIN_PUL_Y, PIN_DIR_Y = 12, 13
PIN_PUL_Z, PIN_DIR_Z = 14, 15
PIN_ENA = 16              # ENA+ común de los tres TB6600 (None si no está conectado; ver el instructivo)
ENA_HABILITADO = 0        # con cátodo común, ENA+ en 0 = driver habilitado
USAR_Z = True             # False si todavía no hay motor en Z

# Velocidad (mm/s). Si el motor vibra o se salta pasos, bájala.
VELOCIDAD_MM_S = 10.0
VELOCIDAD_INICIO_MM_S = 2.0
PASOS_DE_RAMPA = 400      # pasos para acelerar (y otros tantos para frenar)


def salida(n):
    """GPIO de salida con la corriente máxima (12 mA) para el optoacoplador del TB6600."""
    try:
        return Pin(n, Pin.OUT, value=0, drive=Pin.DRIVE_3)
    except (TypeError, AttributeError, ValueError):
        return Pin(n, Pin.OUT, value=0)


class Eje:
    def __init__(self, nombre, pin_pul, pin_dir, pasos_por_mm, invertir):
        self.nombre = nombre
        self.pul = salida(pin_pul)
        self.dir = salida(pin_dir)
        self.pasos_por_mm = pasos_por_mm
        self.invertir = invertir
        self.pasos = 0            # posición actual en pasos desde el origen

    def mm(self):
        return self.pasos / self.pasos_por_mm

    def ir_a(self, mm):
        """Mueve a `mm` desde el origen. Devuelve los pasos que dio."""
        destino = round(mm * self.pasos_por_mm)
        n = destino - self.pasos
        if n == 0:
            return 0
        adelante = n > 0
        self.dir.value(1 if adelante != self.invertir else 0)
        time.sleep_us(20)                         # el TB6600 pide DIR 5 µs antes del pulso
        n = abs(n)
        lento = 1_000_000 / (VELOCIDAD_INICIO_MM_S * self.pasos_por_mm)   # µs entre pasos
        rapido = 1_000_000 / (VELOCIDAD_MM_S * self.pasos_por_mm)
        rampa = min(PASOS_DE_RAMPA, n // 2)
        for i in range(n):
            # rampa lineal: acelera al principio y frena al final
            k = min(i, n - 1 - i)
            periodo = rapido if k >= rampa else lento - (lento - rapido) * k / max(rampa, 1)
            self.pul.value(1)
            time.sleep_us(10)                     # pulso de 10 µs (el TB6600 pide ≥ 2,5 µs)
            self.pul.value(0)
            time.sleep_us(max(int(periodo) - 10, 5))
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
    ena = Pin(PIN_ENA, Pin.OUT, value=ENA_HABILITADO) if PIN_ENA is not None else None
    time.sleep_ms(100)
    x = Eje("X", PIN_PUL_X, PIN_DIR_X, PASOS_POR_MM_X, INVERTIR_X)
    y = Eje("Y", PIN_PUL_Y, PIN_DIR_Y, PASOS_POR_MM_Y, INVERTIR_Y)
    z = Eje("Z", PIN_PUL_Z, PIN_DIR_Z, PASOS_POR_MM_Z, INVERTIR_Z) if USAR_Z else None
    ejes = [e for e in (x, y, z) if e]

    print("Prueba de calibración. Origen = posición actual de la mesa.")
    print("Factores: X=%s  Y=%s  Z=%s pasos/mm" % (PASOS_POR_MM_X, PASOS_POR_MM_Y, PASOS_POR_MM_Z if USAR_Z else "-"))
    try:
        while True:
            print()
            objetivo = [pedir_mm("Ingresa posición en mm X: "), pedir_mm("Ingresa posición en mm Y: ")]
            if z:
                objetivo.append(pedir_mm("Ingresa posición en mm Z: "))
            for eje, mm in zip(ejes, objetivo):
                n = eje.ir_a(mm)
                if n:
                    print("  %s: %d pasos → %.3f mm (si mediste d mm: factor nuevo = %d / d)" % (eje.nombre, n, eje.mm(), n))
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
