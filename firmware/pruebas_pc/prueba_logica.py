"""Pruebas de la lógica pura del firmware en CPython (sin Pico ni servidor).

    cd firmware/pruebas_pc && python3 -m unittest prueba_logica -v
    (o, desde la raíz: python3 firmware/pruebas_pc/prueba_logica.py)
"""
import json
import os
import subprocess
import sys
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
    def test_a_maquina(self):
        self.assertEqual(barrido.a_maquina(0, 0, 0), (config.ORIGEN_ZONA_X_MM, config.ORIGEN_ZONA_Y_MM, config.ORIGEN_ZONA_Z_MM))
        viejo = config.ORIGEN_ZONA_X_MM
        try:
            config.ORIGEN_ZONA_X_MM = 100.0
            self.assertEqual(barrido.a_maquina(30, 20, 10), (130.0, 20.0, 10.0))
        finally:
            config.ORIGEN_ZONA_X_MM = viejo

    def test_zona(self):
        self.assertEqual(barrido.errores_de_zona(sesion((410, 562, 88), 20)), [])
        self.assertEqual(barrido.errores_de_zona(sesion((60, 60, 20), 5)), [])
        self.assertTrue(any(e.startswith("X") for e in barrido.errores_de_zona(sesion((420, 60, 20), 5))))
        self.assertTrue(any(e.startswith("Y") for e in barrido.errores_de_zona(sesion((60, 600, 20), 5))))
        self.assertTrue(any(e.startswith("Z") for e in barrido.errores_de_zona(sesion((60, 60, 90), 10))))
        viejo = config.ORIGEN_ZONA_X_MM
        try:
            config.ORIGEN_ZONA_X_MM = 400.0
            self.assertTrue(any(e.startswith("X") for e in barrido.errores_de_zona(sesion((20, 20, 0), 5))))
        finally:
            config.ORIGEN_ZONA_X_MM = viejo
        viejo = config.MODO_Z
        try:
            config.MODO_Z = "ninguno"
            self.assertTrue(barrido.errores_de_zona(sesion((60, 60, 20), 5)))
            self.assertEqual(barrido.errores_de_zona(sesion((60, 60, 0), 5)), [])
        finally:
            config.MODO_Z = viejo
        malo = dict(sesion((60, 60, 20), 5), puntos_esperados=12)
        self.assertTrue(any("puntos_esperados" in e for e in barrido.errores_de_zona(malo)))

    def test_mesa(self):
        mesa = motores.Mesa()

        def mover(x, y, z):
            try:
                correr(mesa.mover_a(x, y, z))
                return True
            except motores.ErrorMovimiento:
                return False

        self.assertTrue(mover(410, 562, 88))
        self.assertFalse(mover(410.5, 0, 0))
        self.assertFalse(mover(0, -1, 0))
        self.assertFalse(mover(0, 0, 89))
        self.assertEqual(mesa.posicion_mm(), (410, 562, 88), "los rechazos no mueven nada")
        correr(mesa.homing())
        self.assertEqual(mesa.posicion_mm(), (0, 0, 0), "homing sin finales vuelve a 0, 0, 0")

    def test_holgura_por_eje(self):
        mesa = motores.Mesa()
        movimientos = []
        for e in mesa.ejes:
            e.mover_pasos = (lambda delta, *a, _e=e, **k: delta and (movimientos.append((_e.nombre, delta)),
                                                                      setattr(_e, "pos", _e.pos + delta)))
            e.ocupado = lambda: False
        correr(mesa.mover_a(20, 20, 10))
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


if __name__ == "__main__":
    unittest.main()
