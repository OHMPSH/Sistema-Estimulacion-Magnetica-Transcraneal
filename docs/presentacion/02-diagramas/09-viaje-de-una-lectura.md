# 09 · El viaje de una lectura

Qué le pasa a un número desde el registro del QMC5883P hasta la gráfica. La Pico manda **cuentas crudas** (el dato tal como lo midió el chip); la conversión a µT se hace en el servidor con la copia de la configuración del sensor guardada con la sesión, así una sesión se puede reinterpretar después. Ejemplo con 30 G: 1000 cuentas/G, 1 cuenta = 0,1 µT.

**Fuente:** `firmware/sensor.py`, `firmware/cliente.py`, `server/middleware/validar.js`, `server/services/conversionSensor.js`, `server/services/ingesta.js`, `server/services/tiempoReal.js`, `frontend/src/utils/escalaMM.js`.

```mermaid
flowchart TB
  R["Registros 0x01–0x06<br/>X, Y, Z · 16 bits · byte bajo primero"] --> A["Promedio de 10<br/>DRDY · OVFL"]
  A --> B["Búfer de la Pico<br/>seq · posición · cuentas · saturado · hora"]
  B --> L["Lote JSON<br/>25 lecturas o 3 s"]
  L --> H["HTTP POST /api/dispositivo/mediciones<br/>Authorization Bearer"]
  H --> V["Validación<br/>formato 400 · valores 422 · posición en la malla"]
  V --> C["Conversión<br/>µT = cuentas ÷ cuentas por G × 100 − offset"]
  C --> M["Módulo<br/>raíz de Bx² + By² + Bz²"]
  M --> D[("INSERT en mediciones<br/>transacción · UNIQUE sesión + seq")]
  D --> E["SSE event medicion<br/>id para reconectar"]
  E --> F["Navegador: mm ÷ 2 · nombres X ↔ Y<br/>la app todavía no los aplica"]
  F --> G["Gráfica de líneas · mapa 3D · sábana 3D · tabla"]
```
