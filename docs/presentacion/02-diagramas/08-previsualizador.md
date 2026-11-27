# 08 · Flujo del previsualizador de la bobina

Para ajustar la corriente de la bobina antes de medir: el operador mueve un slider, la mesa va a ese punto y la página muestra el campo en vivo y cuánto del rango del sensor se está usando. Nada se guarda en la base ni se crean sesiones. La Pico manda como mucho una petición por segundo (con 150 ms se apagaba). La página trabaja en mm reales y manda mm del sistema (× 2).

**Fuente:** `firmware/calibracion.py`, `server/services/calibracion.js`, `server/controllers/calibracion.controller.js`, `frontend/src/pages/CalibracionPage.jsx`; CLAUDE.md §0.11.

```mermaid
sequenceDiagram
  autonumber
  actor OP as Operador
  participant W as Página Previsualizar bobina
  participant S as Servidor
  participant P as Pico 2 W
  OP->>W: Empezar a previsualizar
  W->>S: POST /api/calibracion (descanso 0, 0, 0)
  P->>S: latido (estado espera)
  S-->>P: calibracion activa con objetivo y sensor
  loop mientras la calibración está activa
    OP->>W: suelta un slider X, Y o Z
    W->>S: PATCH /api/calibracion (objetivo en mm del sistema)
    P->>S: POST /dispositivo/calibracion (moviendo)
    S-->>P: objetivo vigente
    P->>P: mover_a con límites y orden de ejes, asentar 300 ms
    P->>S: POST /dispositivo/calibracion (en posición, cuentas, saturado) máximo 1 por segundo
    S->>S: cuentas a µT con el sensor vigente, sin guardar
    S-->>W: SSE calibracion (Bx, By, Bz, módulo)
    W-->>OP: medidor del rango con avisos saturado, cerca del tope y señal baja
  end
  OP->>W: Terminar y volver al dashboard
  W->>S: DELETE /api/calibracion
  P->>S: siguiente petición
  S-->>P: calibracion = null
  P->>P: vuelve al descanso (X e Y primero, Z al final)
```
