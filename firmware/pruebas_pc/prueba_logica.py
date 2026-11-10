"""Pruebas de la lógica pura del firmware en CPython (sin Pico ni servidor).

    cd firmware/pruebas_pc && python3 -m unittest prueba_logica -v
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

SERVIDOR = os.path.join(os.path.dirname(os.path.dirname(AQUI)), "server")


def sesion(zona, paso, n=1, ultimo_seq=0):
    """Una sesion_activa como la del latido, con la malla calculada como el servidor."""
    eje = lambda largo: int(largo / paso + 1e-6) + 1
    planos = [barrido._decimas(i * paso) for i in range(eje(zona[2]))]
    s = {"id": 1, "paso_mm": paso, "zona_mm": {"x": zona[0], "y": zona[1], "z": zona[2]},
         "grid_nx": eje(zona[0]), "grid_ny": eje(zona[1]), "z_levels_mm": planos, "ultimo_seq": ultimo_seq,
         "sensor": {"rango_ga": 1.9, "lecturas_por_punto": n}}
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
    CASOS = [((60, 60, 20), 5), ((60, 60, 20), 7.5), ((40, 20, 10), 10), ((10, 10, 0), 10), ((33.3, 12.5, 5), 2.5)]

    def test_igual_que_el_servidor(self):
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
            for i, p in enumerate(puntos):
                self.assertEqual(list(barrido.punto(s, i)), p, "zona %s paso %s punto %d" % (zona, paso, i))

    def test_reanudar(self):
        s = sesion((60, 60, 20), 5, n=3, ultimo_seq=0)
        self.assertEqual(barrido.reanudar_en(s), (1, 0, 0))
        s["ultimo_seq"] = 7          # 2 puntos completos y 1 lectura del tercero
        self.assertEqual(barrido.reanudar_en(s), (8, 2, 1))
        s["ultimo_seq"] = 845 * 3
        self.assertEqual(barrido.reanudar_en(s)[1], 845)

    def test_a_maquina_y_zona(self):
        s = sesion((60, 60, 20), 5)
        self.assertEqual(barrido.a_maquina(s, 0, 0, 0), (config.X_BOBINA_MM - 30, config.Y_BOBINA_MM - 30, config.Z_CERO_MM))
        self.assertEqual(barrido.a_maquina(s, 30, 30, 10)[:2], (config.X_BOBINA_MM, config.Y_BOBINA_MM))
        self.assertEqual(barrido.errores_de_zona(s), [])
        grande = sesion((102, 60, 20), 6)
        self.assertTrue(any(e.startswith("X:") for e in barrido.errores_de_zona(grande)))
        alta = sesion((60, 60, 30), 10)
        self.assertTrue(any(e.startswith("Z:") for e in barrido.errores_de_zona(alta)))
        viejo = config.MODO_Z
        try:
            config.MODO_Z = "ninguno"
            self.assertTrue(barrido.errores_de_zona(s))
            self.assertEqual(barrido.errores_de_zona(sesion((60, 60, 0), 5)), [])
        finally:
            config.MODO_Z = viejo
        malo = dict(s, puntos_esperados=12)
        self.assertTrue(any("puntos_esperados" in e for e in barrido.errores_de_zona(malo)))


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
