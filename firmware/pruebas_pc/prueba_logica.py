"""Pruebas de la lógica pura del firmware en CPython (sin Pico ni servidor).

    cd firmware/pruebas_pc && python3 -m unittest prueba_logica -v
    (o, desde la raíz: python3 firmware/pruebas_pc/prueba_logica.py)
"""
import json
import os
import subprocess
import sys
import time
import types
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(AQUI, "stubs"), os.path.dirname(AQUI)]
import _compat  # noqa: E402,F401

secretos = types.ModuleType("secretos")
secretos.WIFI_SSID, secretos.WIFI_PASSWORD = "prueba", "prueba"
secretos.TOKEN, secretos.SERVIDOR = "token-de-prueba", "http://127.0.0.1:9"
sys.modules.setdefault("secretos", secretos)

import config    # noqa: E402
import motores   # noqa: E402
import barrido   # noqa: E402
import cliente   # noqa: E402
import sensor    # noqa: E402

SERVIDOR = os.path.join(os.path.dirname(os.path.dirname(AQUI)), "server")


def sesion(zona, paso, n=1, ultimo_seq=0):
    """Una sesion_activa como la del latido, con la malla calculada como el servidor."""
    eje = lambda largo: int(largo / paso + 1e-6) + 1
    planos = [barrido._decimas(i * paso) for i in range(eje(zona[2]))]
    s = {"id": 1, "paso_mm": paso, "zona_mm": {"x": zona[0], "y": zona[1], "z": zona[2]},
         "grid_nx": eje(zona[0]), "grid_ny": eje(zona[1]), "z_levels_mm": planos, "ultimo_seq": ultimo_seq,
         "sensor": {"modelo": "HMC5883L", "rango_ga": 1.9, "lsb_por_ga": 820, "lecturas_por_punto": n}}
    s["puntos_esperados"] = barrido.total_puntos(s)
    return s


class Perfil(unittest.TestCase):
    def test_suma_y_simetria(self):
        for pasos in (1, 2, 7, 200, 2000, 12000, 100000):
            seg = motores.perfil(pasos, 4000, 20000, 400)
            self.assertEqual(sum(n for n, _ in seg), pasos)
            self.assertTrue(all(1 <= n <= motores.MAX_PASOS_SEGMENTO for n, _ in seg))
            ys = [y for _, y in seg]
            mitad = ys.index(min(ys))
            self.assertEqual(ys[:mitad + 1], sorted(ys[:mitad + 1], reverse=True), "acelera")
            self.assertEqual(ys[mitad:], sorted(ys[mitad:]), "frena")

    def test_velocidades(self):
        seg = motores.perfil(20000, 4000, 20000, 400)
        crucero = motores.periodo_de(min(y for _, y in seg))
        self.assertAlmostEqual(1e6 / crucero, 4000, delta=20)   # resolución de 2 µs
        self.assertAlmostEqual(1e6 / motores.periodo_de(seg[0][1]), 400, delta=80)
        # Nunca por encima de la frecuencia máxima del TB6600
        seg = motores.perfil(20000, 50000, 1e7, 400)
        self.assertGreaterEqual(motores.periodo_de(min(y for _, y in seg)), 1e6 / config.FRECUENCIA_MAX_HZ - 1)

    def test_constante_y_lenta(self):
        seg = motores.perfil(500, 200, 20000, 200)
        self.assertEqual(seg, [(500, motores.y_para(5000))])
        seg = motores.perfil(10, 1, 20000, 1)          # 1 paso/s no cabe en 16 bits: se satura
        self.assertEqual(seg[0][1], motores.MAX_Y)

    def test_codificar_y_pasos_hechos(self):
        seg = motores.perfil(40003, 20000, 1e9, 20000)  # un solo crucero partido en dos palabras
        palabras, dur = motores.codificar(seg, 1)
        self.assertEqual(len(palabras), 2)
        w = palabras[0]
        self.assertEqual(w & 0x7FFF, motores.MAX_PASOS_SEGMENTO - 1)
        self.assertEqual((w >> 15) & 1, 1)
        self.assertEqual(w >> 16, seg[0][1])
        self.assertEqual(motores.pasos_hechos(seg, dur), 40003)
        self.assertEqual(motores.pasos_hechos(seg, 0), 0)
        periodo = motores.periodo_de(seg[0][1])
        self.assertEqual(motores.pasos_hechos(seg, motores.CICLOS_FIJOS_SEGMENTO + 10 * periodo + 1), 10)


class Malla(unittest.TestCase):
    CASOS = [((60, 60, 20), 5), ((60, 60, 20), 7.5), ((40, 20, 10), 10), ((10, 10, 0), 10), ((33.3, 12.5, 5), 2.5),
             ((30, 10, 20), 10)]

    def test_mismo_conjunto_que_el_servidor(self):
        """El servidor todavía recorre en raster: se compara el CONJUNTO de puntos."""
        codigo = ("import('./services/geometria.js').then(g => console.log(JSON.stringify(%s.map(([z, p]) => {"
                  "const m = g.mallaDeZona({x: z[0], y: z[1], z: z[2]}, p);"
                  "return Array.from({length: m.totalPuntos}, (_, i) => { const q = g.puntoDeMalla(m, i); return [q.xMM, q.yMM, q.zMM]; });"
                  "}))))") % json.dumps([[list(z), p] for z, p in self.CASOS])
        try:
            salida = subprocess.run(["node", "--input-type=module", "-e", codigo], cwd=SERVIDOR,
                                    capture_output=True, text=True, timeout=30, check=True).stdout
        except (OSError, subprocess.CalledProcessError) as e:
            self.skipTest("sin node: %s" % e)
        esperado = json.loads(salida)
        for (zona, paso), puntos in zip(self.CASOS, esperado):
            s = sesion(zona, paso)
            self.assertEqual(s["puntos_esperados"], len(puntos))
            propios = [list(barrido.punto(s, i)) for i in range(s["puntos_esperados"])]
            self.assertEqual(len({tuple(p) for p in propios}), len(propios), "sin puntos repetidos")
            self.assertEqual(sorted(propios), sorted(puntos), "zona %s paso %s" % (zona, paso))

    def test_orden_del_contrato(self):
        esperado = [(0, 0, 0), (1, 0, 0), (2, 0, 0), (2, 1, 0), (1, 1, 0), (0, 1, 0),
                    (0, 1, 1), (1, 1, 1), (2, 1, 1), (2, 0, 1), (1, 0, 1), (0, 0, 1)]
        self.assertEqual([barrido.indices(3, 2, k) for k in range(12)], esperado)
        s = {"grid_nx": 3, "grid_ny": 2, "paso_mm": 7.5, "z_levels_mm": [0, 7.5]}
        self.assertEqual(barrido.punto(s, 3), (15.0, 7.5, 0))
        self.assertEqual(barrido.punto(s, 9), (15.0, 0.0, 7.5))

    def test_vecinos(self):
        """Entre puntos seguidos solo cambia un índice en ±1 (también al cambiar de plano)."""
        for nx, ny, nz in ((3, 2, 2), (2, 3, 3), (1, 4, 3), (4, 1, 3), (1, 1, 4), (13, 13, 5), (7, 6, 4), (5, 5, 1)):
            puntos = [barrido.indices(nx, ny, k) for k in range(nx * ny * nz)]
            self.assertEqual(len(set(puntos)), len(puntos))
            self.assertEqual(set(puntos), {(i, j, k) for i in range(nx) for j in range(ny) for k in range(nz)})
            for a, b in zip(puntos, puntos[1:]):
                difs = [abs(p - q) for p, q in zip(a, b)]
                self.assertEqual(sorted(difs), [0, 0, 1], "%dx%dx%d: %s → %s" % (nx, ny, nz, a, b))

    def test_reanudar(self):
        s = sesion((60, 60, 20), 5, n=3, ultimo_seq=0)
        self.assertEqual(barrido.reanudar_en(s), (1, 0, 0))
        s["ultimo_seq"] = 7          # 2 puntos completos y 1 lectura del tercero
        self.assertEqual(barrido.reanudar_en(s), (8, 2, 1))
        s["ultimo_seq"] = 845 * 3
        self.assertEqual(barrido.reanudar_en(s)[1], 845)


class Limites(unittest.TestCase):
    def test_configuracion_de_la_mesa(self):
        """X corto (0–410), Y largo (0–562); descanso e inicio en (0, 0, 0) (2026-11-15: el descanso
        (0, 562, 88) mandaba Y y Z contra su tope)."""
        self.assertEqual((config.LIMITE_X_MM, config.LIMITE_Y_MM, config.LIMITE_Z_MM), (410.0, 562.0, 88.0))
        self.assertEqual((config.EJE_X["paso"], config.EJE_X["dir"]), (10, 11), "X es el eje corto (GP10/GP11)")
        self.assertEqual((config.EJE_Y["paso"], config.EJE_Y["dir"]), (12, 13), "Y es el eje largo (GP12/GP13)")
        self.assertEqual((config.POSICION_ARRANQUE_X_MM, config.POSICION_ARRANQUE_Y_MM, config.POSICION_ARRANQUE_Z_MM),
                         (0.0, 0.0, 0.0))
        self.assertEqual(config.INICIO_MEDICION_MM, (0.0, 0.0, 0.0))
        self.assertEqual(barrido.sentidos(), (1, 1, 1))

    def test_a_maquina(self):
        # Sin inicio del servidor: desde el origen, X+, Y+, Z+
        self.assertEqual(barrido.a_maquina(0, 0, 0), (0.0, 0.0, 0.0))
        self.assertEqual(barrido.a_maquina(30, 20, 10), (30.0, 20.0, 10.0))
        self.assertEqual(barrido.a_maquina(30, 20, 10, (100.0, 200.0, 50.0)), (130.0, 220.0, 60.0))

    def test_inicio_del_servidor(self):
        s = sesion((60, 60, 20), 5)
        self.assertEqual(barrido.inicio_de(s), (0.0, 0.0, 0.0), "sin inicio_medicion: el del firmware")
        s["inicio_medicion"] = {"x_mm": 100, "y_mm": 300.5, "z_mm": 60}
        self.assertEqual(barrido.inicio_de(s), (100.0, 300.5, 60.0))
        self.assertEqual(barrido.errores_de_zona(s), [])
        for malo in ({"x_mm": 1}, {"x_mm": "a", "y_mm": 0, "z_mm": 0}, [0, 0, 0], 5):
            s["inicio_medicion"] = malo
            with self.assertRaises(barrido.ErrorZona):
                barrido.inicio_de(s)
            self.assertTrue(barrido.errores_de_zona(s), "un inicio inválido rechaza la sesión")

    def test_zona(self):
        # Desde (0, 0, 0): X cabe hasta 410, Y hasta 562 y Z hasta 88
        self.assertEqual(barrido.errores_de_zona(sesion((410, 562, 88), 20)), [])
        self.assertEqual(barrido.errores_de_zona(sesion((60, 60, 20), 5)), [])
        self.assertTrue(any(e.startswith("X") for e in barrido.errores_de_zona(sesion((420, 60, 20), 5))))
        self.assertTrue(any(e.startswith("Y") for e in barrido.errores_de_zona(sesion((60, 570, 20), 5))))
        self.assertTrue(any(e.startswith("Z") for e in barrido.errores_de_zona(sesion((60, 60, 90), 10))))
        # Con otro punto de inicio, la zona se valida desde ahí y en su sentido
        s = sesion((60, 60, 20), 5)
        s["inicio_medicion"] = {"x_mm": 360, "y_mm": 0, "z_mm": 0}
        self.assertTrue(any(e.startswith("X") for e in barrido.errores_de_zona(s)), "360 + 60 > 410")
        s["inicio_medicion"] = {"x_mm": 0, "y_mm": 520, "z_mm": 0}
        self.assertTrue(any(e.startswith("Y") for e in barrido.errores_de_zona(s)), "520 + 60 > 562")
        s["inicio_medicion"] = {"x_mm": 0, "y_mm": 0, "z_mm": 75}
        self.assertTrue(any(e.startswith("Z") for e in barrido.errores_de_zona(s)), "75 + 20 > 88")
        viejo = config.MODO_Z
        try:
            config.MODO_Z = "ninguno"
            self.assertTrue(barrido.errores_de_zona(sesion((60, 60, 20), 5)))
            self.assertEqual(barrido.errores_de_zona(sesion((60, 60, 0), 5)), [])
        finally:
            config.MODO_Z = viejo
        malo = dict(sesion((60, 60, 20), 5), puntos_esperados=12)
        self.assertTrue(any("puntos_esperados" in e for e in barrido.errores_de_zona(malo)))

    def test_recorrido_dentro_de_los_limites(self):
        """Toda la serpentina de una zona válida cae dentro de 0–LIMITE en coordenadas de máquina."""
        for zona, paso, inicio in (((410, 562, 88), 20, None), ((60, 60, 20), 5, None),
                                   ((40, 20, 10), 10, {"x_mm": 100, "y_mm": 200, "z_mm": 50})):
            s = sesion(zona, paso)
            if inicio:
                s["inicio_medicion"] = inicio
            self.assertEqual(barrido.errores_de_zona(s), [])
            ini = barrido.inicio_de(s)
            for k in range(s["puntos_esperados"]):
                xm, ym, zm = barrido.a_maquina(*barrido.punto(s, k), ini)
                self.assertTrue(-1e-6 <= xm <= 410 + 1e-6 and -1e-6 <= ym <= 562 + 1e-6 and -1e-6 <= zm <= 88 + 1e-6)

    def test_mesa(self):
        mesa = motores.Mesa()
        self.assertEqual(mesa.posicion_mm(), (0.0, 0.0, 0.0), "arranca en la posición de descanso")
        self.assertTrue(mesa.en_arranque())

        def mover(x, y, z):
            try:
                correr(mesa.mover_a(x, y, z))
                return True
            except motores.ErrorMovimiento:
                return False

        self.assertTrue(mover(410, 0, 0))
        self.assertFalse(mover(410.5, 0, 0))
        self.assertFalse(mover(0, 562.5, 0))
        self.assertFalse(mover(0, -1, 0))
        self.assertFalse(mover(0, 0, 89))
        self.assertEqual(mesa.posicion_mm(), (410, 0, 0), "los rechazos no mueven nada")
        self.assertFalse(mesa.en_arranque())
        correr(mesa.homing())
        self.assertEqual(mesa.posicion_mm(), (0.0, 0.0, 0.0), "sin finales vuelve a la posición de descanso")
        self.assertTrue(mesa.en_arranque())

    def test_orden_de_los_ejes(self):
        """Para bajar Z, primero X e Y y después Z; para subir, primero Z (nunca cruza con el sensor abajo)."""
        mesa = motores.Mesa()
        etapas = []
        for e in mesa.ejes:
            e.mover_pasos = (lambda delta, *a, _e=e, **k: delta and (etapas.append(_e.nombre),
                                                                      setattr(_e, "pos", _e.pos + delta)))
            e.ocupado = lambda: False
        correr(mesa.mover_a(0, 0, 0))            # del descanso (0, 0, 0) al origen: no se mueve
        self.assertEqual(etapas, [])
        correr(mesa.mover_a(10, 0, 10))          # sube Z: primero Z, después X
        self.assertEqual(etapas, ["Z", "X"])
        etapas.clear()
        correr(mesa.mover_a(20, 10, 10))         # mismo plano: X e Y juntos
        self.assertEqual(sorted(etapas), ["X", "Y"])
        etapas.clear()
        correr(mesa.mover_a(0, 0, 0))            # baja Z: primero X e Y (en 0 no hay holgura posible), después Z
        self.assertEqual((sorted(etapas[:2]), etapas[2:]), (["X", "Y"], ["Z"]))
        etapas.clear()
        correr(mesa.mover_a(10, 10, 10))
        etapas.clear()
        correr(mesa.homing())                    # vuelta al descanso (Z abajo): X e Y primero, Z baja al final
        self.assertEqual((sorted(etapas[:2]), etapas[2:]), (["X", "Y"], ["Z"]))
        self.assertTrue(mesa.en_arranque())

    def test_z_sube_desde_el_descanso(self):
        """2.4: Z descansa abajo (0) y mide subiendo; el sentido + de Z da DIR = 0 (invertido)."""
        self.assertEqual(config.POSICION_ARRANQUE_Z_MM, 0.0)
        self.assertEqual(config.SENTIDO_Z, 1)
        self.assertTrue(config.EJE_Z["invertir"])
        self.assertFalse(config.EJE_X["invertir"] or config.EJE_Y["invertir"], "X e Y no cambian")
        self.assertEqual((config.EJE_X["paso"], config.EJE_Y["paso"], config.EJE_Z["paso"]), (10, 12, 14))
        mesa = motores.Mesa()
        bits = []
        original = motores.codificar
        motores.codificar = lambda seg, bit_dir: (bits.append(bit_dir), original(seg, bit_dir))[1]
        try:
            mesa.z.mover_pasos(100)               # sube 2 mm
            mesa.x.mover_pasos(100)
        finally:
            motores.codificar = original
        self.assertEqual(bits, [0, 1], "Z+ con DIR = 0; X+ sigue con DIR = 1")
        # Los planos de una sesión crecen hacia arriba desde el inicio (z = 0 es el más bajo)
        s = sesion((20, 20, 20), 10)
        zs = [barrido.a_maquina(*barrido.punto(s, k))[2] for k in range(barrido.total_puntos(s))]
        self.assertEqual(sorted(set(zs)), [0.0, 10.0, 20.0])
        self.assertEqual(zs, sorted(zs), "cada plano nuevo queda más arriba")

    def test_detener_no_se_cuelga(self):
        """Si el bit de CHAN_ABORT nunca se borra (la dirección del RP2040 en un RP2350), detener() termina igual."""
        self.assertEqual(motores._DMA_ABORT, 0x50000444, "en CPython (sin RP2350) queda la dirección del RP2040")

        class SiempreUno:
            def __getitem__(self, direccion):
                return 0xFFFFFFFF

            def __setitem__(self, direccion, valor):
                pass

        mesa = motores.Mesa()
        original = motores.mem32
        motores.mem32 = SiempreUno()
        try:
            mesa.x.mover_pasos(5000)          # 100 mm: sigue «en movimiento» al detener
            self.assertTrue(mesa.x.ocupado())
            t0 = time.monotonic()
            mesa.detener()
            self.assertLess(time.monotonic() - t0, 1.0)
            self.assertFalse(mesa.x.ocupado())
        finally:
            motores.mem32 = original

    def test_holgura_por_eje(self):
        mesa = motores.Mesa()
        movimientos = []
        for e in mesa.ejes:
            e.mover_pasos = (lambda delta, *a, _e=e, **k: delta and (movimientos.append((_e.nombre, delta)),
                                                                      setattr(_e, "pos", _e.pos + delta)))
            e.ocupado = lambda: False
        correr(mesa.mover_a(20, 20, 10))         # desde el descanso (0, 0, 0)
        movimientos.clear()
        correr(mesa.mover_a(10, 20, 10))         # X en sentido −: se pasa 0,5 mm y vuelve
        self.assertEqual(movimientos, [("X", -525), ("X", 25)])
        movimientos.clear()
        viejo = config.EJE_X["holgura_mm"]
        try:
            config.EJE_X["holgura_mm"] = 0
            correr(mesa.mover_a(5, 20, 10))
            self.assertEqual(movimientos, [("X", -250)])
        finally:
            config.EJE_X["holgura_mm"] = viejo
        movimientos.clear()
        correr(mesa.mover_a(5, 25, 10))          # sentido +: sin vaivén
        self.assertEqual(movimientos, [("Y", 250)])


def correr(gen):
    try:
        while True:
            next(gen)
    except StopIteration as fin:
        return fin.value


def qmc(**atributos):
    s = sensor.QMC5883P()
    for k, v in atributos.items():
        setattr(s.i2c, k, v)
    return s


class Sensor(unittest.TestCase):
    def test_verificar_y_fondo(self):
        s = qmc(campo_ut=lambda: (20.0, -5.0, 40.0))
        texto = s.verificar()
        self.assertIn("QMC5883P en 0x2C", texto)
        self.assertEqual(s.rango_g, 30)
        self.assertEqual([r for r, _ in s.i2c.escrituras[:3]], [0x29, 0x0B, 0x0A])
        self.assertEqual(s.i2c.registros[0x29], 0x06)
        self.assertEqual(s.i2c.registros[0x0B], 0x00)
        self.assertEqual(s.i2c.registros[0x0A], 0xCD)
        self.assertEqual(s.fondo_ut, (20.0, -5.0, 40.0))

    def test_otros_chips(self):
        for direcciones, texto in (([0x1E], "HMC5883L"), ([0x0D], "QMC5883L"), ([], "nada en el bus"), ([0x40], "no hay QMC5883P")):
            with self.assertRaises(sensor.ErrorSensor) as ctx:
                qmc(direcciones=direcciones).verificar()
            self.assertIn(texto, str(ctx.exception))
        with self.assertRaises(sensor.ErrorSensor) as ctx:
            qmc(chip_id=0x12).verificar()
        self.assertIn("Chip ID", str(ctx.exception))

    def test_rangos(self):
        s = qmc(campo_ut=lambda: (150.0, -100.0, 50.0))
        for rango, bits, cpg in ((30, 0, 1000), (12, 1, 2500), (8, 2, 3750), (2, 3, 15000)):
            s.configurar({"modelo": "QMC5883P", "rango_g": rango})
            self.assertTrue(s.modo_qmc)
            self.assertEqual(s.i2c.registros[0x0B], bits << 2)
            crudos, sat = s.medir_bloqueando()
            self.assertEqual(crudos, (int(round(1.5 * cpg)), int(round(-1.0 * cpg)), int(round(0.5 * cpg))))
            self.assertEqual(s.a_ut(crudos), (150.0, -100.0, 50.0))
        with self.assertRaises(sensor.ErrorSensor):
            s.configurar({"modelo": "QMC5883P", "rango_g": 4})

    def test_promedio_y_drdy(self):
        valores = iter([(10.0, 0.0, 0.0), (20.0, 0.0, 0.0), (30.0, 0.0, 0.0), (40.0, 0.0, 0.0)] * 3)
        s = qmc(campo_ut=lambda: next(valores), no_listo=5)
        s.iniciar(30)
        cedidas = 0
        gen = s.medir(4)
        try:
            while True:
                next(gen)
                cedidas += 1
        except StopIteration as fin:
            crudos, sat = fin.value
        self.assertEqual(crudos, (250, 0, 0))     # promedio de 100, 200, 300 y 400 cuentas
        self.assertFalse(sat)
        self.assertGreaterEqual(cedidas, 5, "cede el control mientras espera DRDY")
        s.i2c.nunca_listo = True
        with self.assertRaises(sensor.ErrorSensor):
            s.medir_bloqueando()

    def test_saturacion(self):
        s = qmc(saturar=1.0)
        s.iniciar(30)
        crudos, sat = s.medir_bloqueando()
        self.assertTrue(sat)
        s.i2c.saturar = 0.0
        self.assertFalse(s.medir_bloqueando()[1])

    def test_oserror(self):
        s = qmc(campo_ut=lambda: (10.0, 10.0, 10.0))
        s.iniciar(30)
        s.i2c.fallos_os = 1                       # un fallo: reinicia el chip y sigue
        s.i2c.registros[0x0A] = 0x00
        crudos, sat = s.medir_bloqueando()
        self.assertEqual(crudos, (100, 100, 100))
        self.assertEqual(s.i2c.registros[0x0A], 0xCD, "se volvió a inicializar")
        s.i2c.fallos_os = 2                       # falla también el reinicio
        with self.assertRaises(sensor.ErrorSensor):
            s.medir_bloqueando()
        s.i2c.fallos_os = 0
        s.i2c.escrituras.clear()
        gen = s.medir(3)
        s.i2c.fallos_os = 1
        next(gen)
        s.i2c.fallos_os = 1                       # segundo OSError en la misma medición
        with self.assertRaises(sensor.ErrorSensor):
            correr(gen)

    def test_envio_qmc(self):
        s = qmc(campo_ut=lambda: (20.0, -5.0, 40.0))
        s.verificar()
        s.configurar({"modelo": "QMC5883P", "rango_g": 8})
        crudos, sat = s.medir_bloqueando()
        self.assertEqual(s.a_envio(crudos, sat), ((750, -188, 1500), False))
        self.assertEqual(s.a_envio(crudos, True), ((750, -188, 1500), True))
        viejo = config.RESTAR_FONDO_EN_PICO
        try:
            config.RESTAR_FONDO_EN_PICO = True
            self.assertEqual(s.a_envio(crudos, sat), ((0, 0, 0), False))
        finally:
            config.RESTAR_FONDO_EN_PICO = viejo

    def test_envio_cuentas_hmc(self):
        s = qmc(campo_ut=lambda: (100.0, -50.0, 249.0))
        s.verificar()
        s.configurar({"modelo": "HMC5883L", "rango_ga": 1.9, "lsb_por_ga": 820, "offset_ut": {"x": 0, "y": 0, "z": 0}})
        self.assertFalse(s.modo_qmc)
        self.assertEqual(s.rango_g, 30, "con el servidor de hoy se mide en 30 G")
        crudos, sat = s.medir_bloqueando()
        raw, sat_envio = s.a_envio(crudos, sat)
        self.assertEqual(raw, (820, -410, 2042))
        self.assertIsNone(sat_envio, "el servidor de hoy no recibe 'saturado'")
        # El servidor convierte con  µT = cuentas / 820 × 100
        self.assertAlmostEqual(raw[0] / 820 * 100, 100.0, places=6)
        self.assertEqual(s.a_envio(crudos, True), ((-4096, -4096, -4096), None))
        s.i2c.campo_ut = lambda: (260.0, 0.0, -260.0)   # ±249,6 µT es el máximo con 1,9 Ga
        raw, _ = s.a_envio(*s.medir_bloqueando())
        self.assertEqual(raw, (-4096, 0, -4096))
        s.configurar({"modelo": "HMC5883L", "lsb_por_ga": 230})       # 8,1 Ga: ±890 µT
        raw, _ = s.a_envio(*s.medir_bloqueando())
        self.assertEqual(raw, (598, 0, -598))
        s.configurar({})                                              # sin datos: 820
        self.assertEqual(s.lsb_por_ga, 820)


class Bufer(unittest.TestCase):
    def test_circular(self):
        b = cliente.Bufer(capacidad=5)
        for seq in range(1, 6):
            b.agregar(seq, seq * 1.5, 7.5, 10, (seq, -4096, -seq), 1_800_000_000_000 + seq)
        self.assertTrue(b.lleno())
        with self.assertRaises(RuntimeError):
            b.agregar(6, 0, 0, 0, (0, 0, 0), 0)
        lote = b.lote(3)
        self.assertEqual([l["seq"] for l in lote], [1, 2, 3])
        self.assertEqual(lote[1], {"seq": 2, "xMM": 3.0, "yMM": 7.5, "zMM": 10.0,
                                   "raw": {"x": 2, "y": -4096, "z": -2}, "ts_ms": 1_800_000_000_002})
        b.confirmar(3)
        b.agregar(6, 0, 0, 0, (0, 0, 0), 0)            # da la vuelta al arreglo; sin hora → ts 0
        b.agregar(7, 0, 0, 0, (0, 0, 0), 1_800_000_000_100)
        self.assertEqual([l["seq"] for l in b.lote(10)], [4, 5, 6, 7])
        self.assertEqual(b.lote(10)[2]["ts_ms"], 0)
        self.assertEqual(b.lote(10)[3]["ts_ms"], 1_800_000_000_100)
        json.dumps(b.lote(10))
        b.vaciar()
        self.assertEqual(len(b), 0)

    def test_saturado(self):
        b = cliente.Bufer(capacidad=10)
        b.agregar(1, 0, 0, 0, (32767, -32768, 5), 0, True)
        b.agregar(2, 0, 0, 0, (1, 2, 3), 0, False)
        b.agregar(3, 0, 0, 0, (1, 2, 3), 0)
        b.agregar(25000 * 10, 0, 0, 0, (1, 2, 3), 0, True)
        lote = b.lote(10)
        self.assertEqual([l["seq"] for l in lote], [1, 2, 3, 250000])
        self.assertEqual([l.get("saturado") for l in lote], [True, False, None, True])
        self.assertNotIn("saturado", lote[2], "solo se manda cuando corresponde")
        self.assertEqual(lote[0]["raw"], {"x": 32767, "y": -32768, "z": 5})
        with self.assertRaises(ValueError):
            b.agregar(1 << 29, 0, 0, 0, (0, 0, 0), 0)

    def test_cuando_enviar(self):
        b = cliente.Bufer(capacidad=100)
        e = cliente.Enviador(b)
        self.assertFalse(e.toca())
        b.agregar(1, 0, 0, 0, (0, 0, 0), 0)
        self.assertFalse(e.toca())
        self.assertTrue(e.toca(forzar=True))
        for s in range(2, config.TAMANO_LOTE + 1):
            b.agregar(s, 0, 0, 0, (0, 0, 0), 0)
        self.assertTrue(e.toca())


class Calibracion(unittest.TestCase):
    """Previsualizador de la bobina (2.4): ir al punto, medir en bucle y obedecer al servidor."""
    QMC30 = {"modelo": "QMC5883P", "rango_g": 30, "cuentas_por_g": 1000, "lecturas_por_punto": 1}

    def test_ciclo(self):
        import calibracion
        mesa = motores.Mesa()
        for e in mesa.ejes:
            e.mover_pasos = (lambda delta, *a, _e=e, **k: setattr(_e, "pos", _e.pos + delta))
            e.ocupado = lambda: False
        c = types.SimpleNamespace(mesa=mesa, sensor=qmc(), cal=None)
        c.cal = {"activa": True, "objetivo": {"x_mm": 100, "y_mm": 200, "z_mm": 10}, "sensor": self.QMC30}
        enviados, respuestas = [], []

        def post(ruta, cuerpo):
            self.assertEqual(ruta, "/dispositivo/calibracion")
            enviados.append(cuerpo)
            cal = respuestas.pop(0) if respuestas else c.cal
            return 200, {"ok": True, "calibracion": cal}

        original, cliente.post = cliente.post, post
        viejos = (config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS)
        config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS = 0, 0
        calibracion._ultima_peticion, calibracion._espera_ms = None, 0
        try:
            gen = calibracion.ejecutar(c)
            while not any(e["estado"] == "en_posicion" for e in enviados):
                next(gen)
            self.assertEqual(enviados[0]["estado"], "moviendo")
            self.assertEqual(mesa.posicion_mm(), (100, 200, 10))
            lectura = [e for e in enviados if e["estado"] == "en_posicion"][0]
            self.assertEqual(lectura["posicion_mm"], {"x_mm": 100, "y_mm": 200, "z_mm": 10})
            self.assertEqual(set(lectura["raw"]), {"x", "y", "z"})
            self.assertIn("saturado", lectura)
            # El servidor cambia el objetivo en la respuesta: la Pico va al nuevo punto
            respuestas.append(dict(c.cal, objetivo={"x_mm": 0, "y_mm": 50, "z_mm": 0}))
            enviados.clear()
            while mesa.posicion_mm() != (0, 50, 0):
                next(gen)
            # Fuera del recorrido: no se mueve y se informa el error
            c.cal = dict(c.cal, objetivo={"x_mm": 0, "y_mm": 50, "z_mm": 500})
            enviados.clear()
            while not any(e["estado"] == "error" for e in enviados):
                next(gen)
            self.assertEqual(mesa.posicion_mm(), (0, 50, 0))
            self.assertIn("fuera del recorrido", [e for e in enviados if e["estado"] == "error"][0]["error"])
            # calibracion = null en la respuesta: el generador termina
            respuestas.append(None)
            c.cal = dict(c.cal, objetivo={"x_mm": 0, "y_mm": 50, "z_mm": 0})
            correr(gen)
            self.assertIsNone(c.cal)
        finally:
            cliente.post = original
            config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS = viejos

    def test_ritmo_de_peticiones(self):
        """Como mucho una petición por CALIBRACION_PAUSA_MS, y más espera tras un fallo de red
        (con 150 ms entre peticiones la Pico 2 W se desconectaba y se apagaba)."""
        import calibracion
        self.assertGreaterEqual(config.CALIBRACION_PAUSA_MS, 1000)
        mesa = motores.Mesa()
        for e in mesa.ejes:
            e.mover_pasos = (lambda delta, *a, _e=e, **k: setattr(_e, "pos", _e.pos + delta))
            e.ocupado = lambda: False
        c = types.SimpleNamespace(mesa=mesa, sensor=qmc(), cal=None)
        c.cal = {"activa": True, "objetivo": {"x_mm": 0, "y_mm": 0, "z_mm": 0}, "sensor": self.QMC30}
        horas, sin_red = [], [False]

        def post(ruta, cuerpo):
            horas.append(time.monotonic())
            return (None, None) if sin_red[0] else (200, {"ok": True, "calibracion": c.cal})

        original, cliente.post = cliente.post, post
        viejos = (config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS, config.CALIBRACION_ESPERA_FALLO_MS)
        config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS, config.CALIBRACION_ESPERA_FALLO_MS = 0, 200, 600
        calibracion._ultima_peticion, calibracion._espera_ms = None, 0
        try:
            gen = calibracion.ejecutar(c)
            t0 = time.monotonic()
            while time.monotonic() - t0 < 1.0:
                next(gen)
            self.assertLessEqual(len(horas), 6, "con 200 ms de pausa, como mucho ~5 peticiones en 1 s")
            self.assertGreaterEqual(len(horas), 3)
            self.assertTrue(all(b - a >= 0.19 for a, b in zip(horas, horas[1:])), "nunca dos peticiones seguidas")
            sin_red[0] = True
            horas.clear()
            t0 = time.monotonic()
            while time.monotonic() - t0 < 1.0:
                next(gen)
            self.assertLessEqual(len(horas), 3, "sin red espera 600 ms entre intentos")
        finally:
            cliente.post = original
            config.ASENTAMIENTO_MS, config.CALIBRACION_PAUSA_MS, config.CALIBRACION_ESPERA_FALLO_MS = viejos

    def test_latido_y_controlador(self):
        import main
        cuerpos = []
        original = cliente.post
        cliente.post = lambda ruta, cuerpo: (cuerpos.append((ruta, cuerpo)), (None, None))[1]
        try:
            cliente.latido("calibrando")
        finally:
            cliente.post = original
        self.assertEqual(cuerpos[0][1]["limites_mm"], {"x_mm": 410.0, "y_mm": 562.0, "z_mm": 88.0})
        self.assertEqual(cuerpos[0][1]["estado"], "calibrando")
        c = main.Controlador()
        c.sensor_ok = True
        c.revisar_calibracion({"activa": True, "objetivo": {"x_mm": 1, "y_mm": 1, "z_mm": 1}, "sensor": self.QMC30})
        self.assertEqual((c.fase, c.estado_pico()), ("calibracion", "calibrando"))
        c.revisar_calibracion(None)              # el servidor la terminó: vuelve al descanso
        self.assertEqual(c.fase, "cierre")
        c.fase, c.tarea = None, None
        c.pendiente = {"id": 7}                  # con una sesión pendiente no se calibra
        c.revisar_calibracion({"activa": True, "objetivo": {"x_mm": 1, "y_mm": 1, "z_mm": 1}, "sensor": self.QMC30})
        self.assertIsNone(c.fase)


if __name__ == "__main__":
    unittest.main()
