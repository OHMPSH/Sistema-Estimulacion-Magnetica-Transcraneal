# 01 · Arquitectura general

Bloques del sistema y por dónde viajan los datos. La Pico mide y mueve la mesa; el servidor valida, convierte, guarda y difunde; la web y la app solo dibujan lo que llega por SSE. El simulador entra por la misma ingesta que la Pico, así que los datos simulados y reales siguen el mismo camino (y se distinguen por `origen`).

**Fuente:** `firmware/main.py`, `server/app.js`, `server/services/ingesta.js`, `server/services/tiempoReal.js`; CLAUDE.md §3.

```mermaid
flowchart TB
  subgraph MESA["Mesa de medición"]
    BOB["Bobina TMS sobre el phantom"]
    QMC["Magnetómetro QMC5883P<br/>I2C 0x2C · 200 Hz · ±30 G"]
    MOT["3 × NEMA 17 + husillos T8"]
    TB["3 × TB6600<br/>STEP / DIR / ENA"]
  end
  subgraph PICO["Raspberry Pi Pico 2 W · pico-tms-2.4"]
    FW["Bucle cooperativo<br/>barrido · latido · lotes · previsualizador"]
    PIO["PIO + DMA<br/>pulsos con resolución de 1 µs"]
  end
  subgraph SRV["Servidor Node.js + Express · MVC"]
    API["Rutas → middleware → controladores"]
    ING["Ingesta<br/>valida · cuentas → µT · abs B"]
    SIM["Simulador<br/>espira exacta"]
    SSE["SSE /api/stream"]
    DB[("MariaDB tms_db")]
  end
  NGX["Nginx · HTTPS"]
  WEB["Web React<br/>dashboard · historial · previsualizador"]
  APP["App Android<br/>TMS Monitor"]
  BOB -. campo magnético .-> QMC
  QMC -- I2C --> FW
  FW --> PIO --> TB --> MOT
  MOT -. posiciona .-> QMC
  FW -- "Wi-Fi · HTTP + token Bearer" --> API
  API --> ING
  SIM --> ING
  ING --> DB
  ING --> SSE
  SSE --> NGX --> WEB
  SSE -- "HTTP :4000" --> APP
```
