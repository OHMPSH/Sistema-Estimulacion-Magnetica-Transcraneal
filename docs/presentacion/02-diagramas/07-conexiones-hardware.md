# 07 · Conexiones de hardware

Pines de la Pico 2 W según `firmware/config.py` (GPIO) y el instructivo (pin físico). Los TB6600 tienen entradas con optoacoplador; ENA es común a los tres y en 0 los habilita. Recorridos en mm del sistema y, entre paréntesis, en mm reales (÷ 2). La fuente de los motores, cómo se alimenta la Pico y cómo quedó el recableado de tierras del *shield* están **por confirmar**.

**Fuente:** `firmware/config.py`, `firmware_hall_1d/config.py`, `docs/instructivo-calibracion-y-conexiones.md` (pines físicos).

```mermaid
flowchart LR
  subgraph PICO["Raspberry Pi Pico 2 W"]
    direction TB
    I2C["GP0 SDA · pin 1<br/>GP1 SCL · pin 2<br/>3V3 OUT · pin 36<br/>GND · pin 38"]
    PX["GP10 PUL · pin 14<br/>GP11 DIR · pin 15"]
    PY["GP12 PUL · pin 16<br/>GP13 DIR · pin 17"]
    PZ["GP14 PUL · pin 19<br/>GP15 DIR · pin 20"]
    PE["GP16 ENA · pin 21<br/>0 = habilitado"]
    PA["GP26 ADC0 · pin 31<br/>solo firmware del Hall"]
  end
  QMC["QMC5883P<br/>0x2C · I2C0 100 kHz"]
  HALL["Hall 49E<br/>sensor de prueba de 1 eje"]
  TX["TB6600 · eje corto"]
  TY["TB6600 · eje largo"]
  TZ["TB6600 · eje Z"]
  MX["NEMA 17 + T8<br/>0–410 mm sistema (0–205 reales)"]
  MY["NEMA 17 + T8<br/>0–562 mm sistema (0–281 reales)"]
  MZ["NEMA 17 + T8<br/>0–88 mm sistema (0–44 reales)"]
  FUENTE["Fuente de motores<br/>12–24 V CC · por confirmar"]
  I2C --- QMC
  PA --- HALL
  PX --> TX --> MX
  PY --> TY --> MY
  PZ --> TZ --> MZ
  PE --> TX
  PE --> TY
  PE --> TZ
  FUENTE --> TX
  FUENTE --> TY
  FUENTE --> TZ
```
