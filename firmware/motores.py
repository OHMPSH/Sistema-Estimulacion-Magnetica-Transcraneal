# ═══════════════════════════════════════════════════════════════
# motores.py — mesa XY(Z) con NEMA 17 y TB6600 (STEP/DIR/ENA)
#
# Cada eje usa una máquina de estados del PIO que genera los pulsos con
# precisión de 1 µs. El movimiento se describe como una lista de segmentos
# (n pasos a un periodo fijo) y un canal DMA los pasa al PIO: una vez
# lanzado, el movimiento ocurre en hardware y el programa puede mandar un
# lote por Wi-Fi mientras la mesa se mueve.
#
# Palabra de 32 bits por segmento (el PIO la lee de derecha a izquierda):
#   bits  0–14  pasos del segmento − 1   (hasta 32 768)
#   bit   15    DIR
#   bits 16–31  espera Y; periodo de cada paso = 2·Y + 7 µs (pulso simétrico)
#
# Rampa trapezoidal: acelera de VEL_INICIO a VEL_MAX con ACEL, crucero y
# frena con la misma rampa. Los movimientos de la mesa son generadores
# (cede el control con `yield` mientras el eje se mueve).
# ═══════════════════════════════════════════════════════════════
import math
import time
from array import array

import config
from registro import log

try:
    import rp2
    from machine import Pin, mem32
except ImportError:      # CPython (pruebas de la lógica pura)
    rp2 = None

FREQ_SM = 1_000_000          # 1 ciclo = 1 µs
# Pulso simétrico: PUL pasa (y + 3) µs en alto y (y + 4) en bajo. Con los 3,3 V de
# la Pico, el optoacoplador del TB6600 no responde bien a pulsos cortos de 10 µs.
def periodo_de(y):
    """µs por paso con la espera Y: set + mov + (y+1) + set + mov + (y+1) + jmp."""
    return 2 * y + 7


def y_para(periodo_us):
    return int((periodo_us - 7) / 2 + 0.5)
CICLOS_FIJOS_SEGMENTO = 18   # out x + out pins [15] + out isr
MAX_PASOS_SEGMENTO = 1 << 15
MAX_Y = 0xFFFF


class ErrorMovimiento(Exception):
    pass


# ── Perfil de velocidad (lógica pura, probada en CPython) ──────
def perfil(pasos, v_max, acel, v_ini, f_max=config.FRECUENCIA_MAX_HZ, tramos=24):
    """Rampa trapezoidal en segmentos [(n, y)] para `pasos` pasos (> 0).
    Velocidades en pasos/s, aceleración en pasos/s²."""
    if pasos <= 0:
        return []
    v_max = min(v_max, f_max)
    v_ini = min(v_ini, v_max)
    n_acel = int((v_max * v_max - v_ini * v_ini) / (2 * acel)) if acel > 0 else 0
    if 2 * n_acel > pasos:
        n_acel = pasos // 2
    v_pico = math.sqrt(v_ini * v_ini + 2 * acel * n_acel) if n_acel else v_ini

    rampa = []      # (n, velocidad) de la aceleración
    if n_acel:
        dv = (v_pico - v_ini) / tramos
        anterior = 0
        for k in range(1, tramos + 1):
            v_k = v_ini + dv * k
            limite = n_acel if k == tramos else min(n_acel, int((v_k * v_k - v_ini * v_ini) / (2 * acel)))
            n = limite - anterior
            if n > 0:
                v_medio = math.sqrt(v_ini * v_ini + 2 * acel * (anterior + n / 2))
                rampa.append((n, v_medio))
                anterior = limite
    crucero = pasos - 2 * n_acel

    tramos_v = list(rampa)
    if crucero:
        tramos_v.append((crucero, v_pico))
    tramos_v.extend(reversed(rampa))

    segmentos = []
    for n, v in tramos_v:
        y = y_para(FREQ_SM / v)
        y = max(0, min(MAX_Y, y))
        if segmentos and segmentos[-1][1] == y:
            segmentos[-1] = (segmentos[-1][0] + n, y)
        else:
            segmentos.append((n, y))
    # Partir los segmentos que no caben en 15 bits
    partidos = []
    for n, y in segmentos:
        while n > MAX_PASOS_SEGMENTO:
            partidos.append((MAX_PASOS_SEGMENTO, y))
            n -= MAX_PASOS_SEGMENTO
        partidos.append((n, y))
    return partidos


def codificar(segmentos, bit_dir):
    """Palabras para el PIO y duración total en µs."""
    palabras = array("I", [((y << 16) | (bit_dir << 15) | (n - 1)) for n, y in segmentos])
    duracion = sum(n * periodo_de(y) + CICLOS_FIJOS_SEGMENTO for n, y in segmentos)
    return palabras, duracion


def pasos_hechos(segmentos, t_us):
    """Pasos que el PIO alcanzó a dar en `t_us` microsegundos (para una parada brusca)."""
    hechos = 0
    for n, y in segmentos:
        t_us -= CICLOS_FIJOS_SEGMENTO
        if t_us <= 0:
            break
        periodo = periodo_de(y)
        dados = min(n, int(t_us // periodo))
        hechos += dados
        t_us -= dados * periodo
        if dados < n:
            break
    return hechos


# ── PIO ────────────────────────────────────────────────────────
if rp2:
    @rp2.asm_pio(set_init=rp2.PIO.OUT_LOW, out_init=rp2.PIO.OUT_LOW,
                 out_shiftdir=rp2.PIO.SHIFT_RIGHT, autopull=True, pull_thresh=32,
                 fifo_join=rp2.PIO.JOIN_TX)
    def _programa_pasos():
        out(x, 15)                 # pasos − 1
        out(pins, 1)       [15]    # DIR, y 16 µs de preparación (el TB6600 pide ≥ 5 µs)
        out(isr, 16)               # espera Y (el ISR se usa como registro de reserva)
        label("paso")
        set(pins, 1)               # PUL alto la mitad del periodo
        mov(y, isr)
        label("alto")
        jmp(y_dec, "alto")
        set(pins, 0)               # y bajo la otra mitad
        mov(y, isr)
        label("bajo")
        jmp(y_dec, "bajo")
        jmp(x_dec, "paso")

_DMA_ABORT = 0x50000444
_PIO_BASE = (0x50200000, 0x50300000)


class Eje:
    def __init__(self, nombre, cfg, id_sm):
        self.nombre = nombre
        self.cfg = cfg
        self.ppmm = cfg["pasos_por_mm"]
        self.pos = 0                  # en pasos, desde el origen del homing
        self.referenciado = False     # True después de un homing con final de carrera
        self.final_tocado = False
        self._dir_actual = 0
        self._segmentos = []
        self._palabras = None
        self._t0 = 0
        self._duracion = 0
        self._objetivo = 0
        self.id_sm = id_sm
        pio = id_sm // 4
        self._txf = _PIO_BASE[pio] + 0x010 + 4 * (id_sm % 4)
        self._dreq = pio * 8 + id_sm % 4
        self.final = None
        if cfg.get("final") is not None:
            self.final = Pin(cfg["final"], Pin.IN, Pin.PULL_UP)
            self._activo = 1 if cfg.get("final_nc", True) else 0
            self.final.irq(self._al_tocar_final, Pin.IRQ_RISING if self._activo else Pin.IRQ_FALLING)
        for n in (cfg["paso"], cfg["dir"]):
            try:
                Pin(n, Pin.OUT, value=0, drive=Pin.DRIVE_3)   # 12 mA para el optoacoplador del TB6600
            except (TypeError, AttributeError, ValueError):
                Pin(n, Pin.OUT, value=0)
        self._iniciar_sm()
        self.dma = rp2.DMA() if hasattr(rp2, "DMA") else None
        if not self.dma:
            log("AVISO: esta versión de MicroPython no tiene rp2.DMA (>= 1.22); los movimientos bloquearán el programa")

    def _iniciar_sm(self):
        self.sm = rp2.StateMachine(self.id_sm, _programa_pasos, freq=FREQ_SM,
                                   set_base=Pin(self.cfg["paso"]), out_base=Pin(self.cfg["dir"]))
        self.sm.active(1)

    # ── Final de carrera ───────────────────────────────────────
    def final_activo(self):
        return self.final is not None and self.final.value() == self._activo

    def _al_tocar_final(self, _pin):
        # Solo detiene si el eje va hacia el final (sentido −) y la lectura se confirma
        if self._dir_actual < 0 and self.final_activo() and self.ocupado():
            self.final_tocado = True
            self.detener()

    # ── Movimiento ─────────────────────────────────────────────
    def mm(self):
        return self.pos / self.ppmm

    def mover_pasos(self, delta, v_mm_s=None, acel_mm_s2=None, v_ini_mm_s=None):
        """Lanza un movimiento relativo sin esperar a que termine."""
        if self.ocupado():
            raise ErrorMovimiento("el eje %s todavía se mueve" % self.nombre)
        if delta == 0:
            return
        v = (v_mm_s or config.VEL_MAX_MM_S) * self.ppmm
        a = (acel_mm_s2 or config.ACEL_MM_S2) * self.ppmm
        v0 = (v_ini_mm_s or config.VEL_INICIO_MM_S) * self.ppmm
        self._segmentos = perfil(abs(delta), v, a, v0)
        sentido = 1 if delta > 0 else 0
        bit_dir = sentido ^ (1 if self.cfg.get("invertir") else 0)
        self._palabras, self._duracion = codificar(self._segmentos, bit_dir)
        self._dir_actual = 1 if delta > 0 else -1
        self._objetivo = self.pos + delta
        self.final_tocado = False
        self._t0 = time.ticks_us()
        if self.dma:
            ctrl = self.dma.pack_ctrl(size=2, inc_read=True, inc_write=False, treq_sel=self._dreq)
            self.dma.config(read=self._palabras, write=self._txf, count=len(self._palabras), ctrl=ctrl, trigger=True)
        else:
            for w in self._palabras:      # sin DMA: bloquea mientras el FIFO se llena
                self.sm.put(w)

    def ocupado(self):
        if not self._dir_actual:
            return False
        if time.ticks_diff(time.ticks_us(), self._t0) < self._duracion + 200:
            return True
        if self.dma and self.dma.active():
            return True
        self.pos = self._objetivo
        self._dir_actual = 0
        return False

    def detener(self):
        """Parada brusca: corta el DMA y el PIO y estima los pasos que se dieron."""
        if not self._dir_actual:
            return
        transcurrido = time.ticks_diff(time.ticks_us(), self._t0)
        if self.dma:
            mascara = 1 << self.dma.channel
            mem32[_DMA_ABORT] = mascara
            while mem32[_DMA_ABORT] & mascara:
                pass
        self.sm.active(0)
        hechos = min(pasos_hechos(self._segmentos, transcurrido), abs(self._objetivo - self.pos))
        self.pos += hechos * self._dir_actual
        self._dir_actual = 0
        self._iniciar_sm()               # vacía el FIFO y vuelve al inicio del programa
        self.sm.exec("set(pins, 0)")

    def esperar(self):
        """Generador: cede mientras el eje se mueve."""
        while self.ocupado():
            yield


class Mesa:
    def __init__(self):
        self.ena = Pin(config.PIN_ENA, Pin.OUT, value=1 - config.ENA_HABILITADO) if config.PIN_ENA is not None else None
        self.x = Eje("X", config.EJE_X, 0)
        self.y = Eje("Y", config.EJE_Y, 1)
        self.z = Eje("Z", config.EJE_Z, 2) if (config.MODO_Z == "motor" and config.EJE_Z) else None
        self.ejes = [e for e in (self.x, self.y, self.z) if e]
        self.habilitada = False
        self.referenciada = False     # homing hecho y drivers habilitados desde entonces

    def habilitar(self, si=True):
        if self.ena is not None:
            self.ena.value(config.ENA_HABILITADO if si else 1 - config.ENA_HABILITADO)
        if si and not self.habilitada:
            time.sleep_ms(50)            # el TB6600 necesita energizar las bobinas antes del primer pulso
        if not si:
            self.referenciada = False    # sin corriente, el eje puede moverse a mano
        self.habilitada = si

    def ocupada(self):
        return any(e.ocupado() for e in self.ejes)

    def detener(self):
        """Parada inmediata de todos los ejes. La posición queda estimada: hace falta homing."""
        if self.ocupada():
            self.referenciada = False
        for e in self.ejes:
            e.detener()

    def posicion_mm(self):
        return (self.x.mm(), self.y.mm(), self.z.mm() if self.z else 0.0)

    def final_tocado(self):
        return [e.nombre for e in self.ejes if e.final_tocado]

    # ── Movimientos (generadores) ──────────────────────────────
    def mover_a(self, x_mm, y_mm, z_mm=None):
        """Mueve a coordenadas de MÁQUINA. Aproxima siempre en sentido + (holgura_mm de cada eje)."""
        destinos = [(self.x, x_mm), (self.y, y_mm)]
        if self.z and z_mm is not None:
            destinos.append((self.z, z_mm))
        objetivos = []
        for eje, mm in destinos:
            if not (0 <= mm <= eje.cfg["recorrido_mm"] + 1e-6):
                raise ErrorMovimiento("%s = %.2f mm está fuera del recorrido 0–%.1f mm" % (eje.nombre, mm, eje.cfg["recorrido_mm"]))
            objetivos.append((eje, int(round(mm * eje.ppmm))))
        holgura = []
        for e, p in objetivos:
            h = e.cfg.get("holgura_mm", config.HOLGURA_MM)
            if h > 0 and p < e.pos:
                holgura.append((e, max(0, p - int(h * e.ppmm))))
        for fase in (holgura, objetivos):
            for eje, p in fase:
                eje.mover_pasos(p - eje.pos)
            while self.ocupada():
                yield
            tocados = self.final_tocado()
            if tocados:
                raise ErrorMovimiento("final de carrera inesperado en %s" % ", ".join(tocados))

    def homing(self):
        """Generador: referencia los ejes (Z primero; X e Y a la vez) y deja la mesa en 0, 0, 0."""
        self.referenciada = False
        self.habilitar(True)
        if self.z:
            yield from self._homing_eje(self.z)
        yield from _en_paralelo(self._homing_eje(self.x), self._homing_eje(self.y))
        self.referenciada = True
        log("Homing terminado: mesa en el origen X=%.2f Y=%.2f Z=%.2f mm" % self.posicion_mm())

    def _homing_eje(self, eje):
        rapida, lenta = config.HOMING_VEL_RAPIDA_MM_S, config.HOMING_VEL_LENTA_MM_S
        sep = config.HOMING_SEPARACION_MM
        if eje.final is None:
            # Sin final de carrera: vuelve a donde estaba al encender (el operador lo dejó en el origen)
            if not eje.referenciado:
                log("AVISO: el eje %s no tiene final de carrera; su origen es la posición al encender" % eje.nombre)
                eje.referenciado = True
            eje.mover_pasos(-eje.pos)
            yield from eje.esperar()
            return
        ppmm = eje.ppmm
        if eje.final_activo():               # ya está sobre el final: separarse primero
            eje.mover_pasos(int(config.HOMING_RETROCESO_MM * ppmm), lenta, v_ini_mm_s=lenta)
            yield from eje.esperar()
            if eje.final_activo():
                raise ErrorMovimiento("el final de %s sigue activo: revisa el cableado (NC/NA)" % eje.nombre)
        # 1. Rápido hacia el final
        eje.mover_pasos(-int(config.HOMING_MAX_MM * ppmm), rapida)
        yield from self._esperar_final(eje)
        # 2. Retrocede
        eje.mover_pasos(int(config.HOMING_RETROCESO_MM * ppmm), rapida)
        yield from eje.esperar()
        # 3. Lento hasta tocar otra vez
        eje.mover_pasos(-int(2 * config.HOMING_RETROCESO_MM * ppmm), lenta, v_ini_mm_s=lenta)
        yield from self._esperar_final(eje)
        # 4. Se separa del interruptor y ese punto es el origen (0)
        eje.pos = 0
        eje.mover_pasos(int(sep * ppmm), lenta, v_ini_mm_s=lenta)
        yield from eje.esperar()
        eje.pos = 0
        eje.referenciado = True
        eje.final_tocado = False

    def _esperar_final(self, eje):
        while eje.ocupado():
            if eje.final_activo():       # por si la interrupción no llegó
                eje.final_tocado = True
                eje.detener()
                break
            yield
        if not eje.final_tocado:
            raise ErrorMovimiento("el eje %s no tocó su final de carrera" % eje.nombre)


def _en_paralelo(*generadores):
    pendientes = list(generadores)
    while pendientes:
        for g in list(pendientes):
            try:
                next(g)
            except StopIteration:
                pendientes.remove(g)
        yield
