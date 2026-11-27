# 05 · Recorrido en serpentina (3 × 2 puntos, 2 planos)

El vector de prueba del contrato: `nx = 3`, `ny = 2`, dos planos, k = 0…11, en índices (ix, iy); en cada plano, la fila de abajo es iy = 0, y el plano de arriba es el más alejado de la bobina. Rojo: primer punto; azul: último. Entre dos puntos seguidos solo cambia un índice en ±1: la mesa nunca regresa en vacío. Z empieza junto a la bobina y **sube** un paso por plano; el plano siguiente arranca donde quedó la mesa, así que Y también va y viene. Con una lectura por punto, `seq = k + 1`.

**Fuente:** `firmware/barrido.py` (contrato), `server/services/geometria.js` (`indicesDeSerpentina`), `docs/firmware-pico-w.md` §7 (vector de prueba), prueba `test_mismo_conjunto_que_el_servidor`.

```mermaid
block-beta
  columns 3
  t1["Plano z = 1 paso · Z subió"]:3
  k6["k6 · (0,1)"] k7["k7 · (1,1)"] k8["k8 · (2,1)"]
  k11["k11 · (0,0)"] k10["k10 · (1,0)"] k9["k9 · (2,0)"]
  space:3
  t0["Plano z = 0 · junto a la bobina"]:3
  k5["k5 · (0,1)"] k4["k4 · (1,1)"] k3["k3 · (2,1)"]
  k0["k0 · (0,0)"] k1["k1 · (1,0)"] k2["k2 · (2,0)"]
  k0 --> k1
  k1 --> k2
  k2 --> k3
  k3 --> k4
  k4 --> k5
  k5 -- "Z + 1 paso" --> k6
  k6 --> k7
  k7 --> k8
  k8 --> k9
  k9 --> k10
  k10 --> k11
  style k0 fill:#c0233f,color:#fff
  style k11 fill:#0072B2,color:#fff
```
