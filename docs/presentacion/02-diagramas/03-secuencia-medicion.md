# 03 · Secuencia de una medición completa

De que el operador pulsa «Iniciar medición» a que la mesa vuelve al descanso. La Pico se entera de la sesión por el latido (no hay otra vía de entrada al microcontrolador). Las lecturas salen en lotes mientras la mesa sigue moviéndose. El servidor cierra la sesión solo cuando tiene todos los `seq` esperados.

**Fuente:** `server/controllers/mediciones.controller.js`, `server/controllers/dispositivo.controller.js`, `server/services/ingesta.js`, `firmware/main.py`, `firmware/barrido.py`, `firmware/cliente.py`.

```mermaid
sequenceDiagram
  autonumber
  actor OP as Operador
  participant S as Servidor
  participant DB as MariaDB
  participant P as Pico 2 W
  participant N as Navegadores y app
  OP->>S: POST /api/sesiones (modo, paso, medio, zona)
  S->>DB: INSERT sesión hw con copias de la configuración
  S-->>N: SSE sesion iniciada
  P->>S: POST /dispositivo/latido (estado espera) cada 5 s
  S-->>P: sesion_activa (malla, sensor, inicio, ultimo_seq)
  P->>P: valida que la zona cabe en la mesa
  loop cada punto de la serpentina
    P->>P: mover (PIO + DMA), asentar 300 ms, promediar 10 lecturas
    P->>P: guardar en el búfer con su seq
    opt 25 lecturas o 3 s
      P->>S: POST /dispositivo/mediciones (lote)
      S->>DB: INSERT en transacción, UNIQUE sesion_id + seq
      S-->>P: aceptadas, duplicadas, rechazadas
      S-->>N: SSE medicion (µT y módulo)
    end
  end
  Note over S,DB: seq guardados = puntos esperados
  S->>DB: cerrar sesión, puntos recibidos y huecos
  S-->>N: SSE sesion finalizada (completa)
  P->>P: búfer vacío, vuelve al descanso (0, 0, 0)
  P->>S: latido
  S-->>P: sesion_activa = null
```
