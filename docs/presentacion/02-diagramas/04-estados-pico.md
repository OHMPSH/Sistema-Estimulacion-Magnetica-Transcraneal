# 04 · Máquina de estados de la Pico

Estados que la Pico informa en cada latido (`espera`, `homing`, `midiendo`, `calibrando`, `error`). Internamente, «midiendo» agrupa las fases `barrido` y `vaciando` (mandar lo que queda en el búfer) y «homing» agrupa el arranque y el regreso al descanso (`cierre`). Un 401 (token inválido) detiene todo desde cualquier estado y manda la mesa al descanso.

**Fuente:** `firmware/main.py` (`Controlador.estado_pico`, `avanzar_tarea`, `fallar`, `abortar_sesion`, `revisar_calibracion`).

```mermaid
stateDiagram-v2
  [*] --> homing: encender, la posición actual es el descanso
  homing --> espera: mesa en (0, 0, 0)
  espera --> espera: BOOTSEL vuelve a medir el fondo
  espera --> midiendo: el latido trae sesion_activa
  espera --> calibrando: el latido trae calibracion
  state midiendo {
    [*] --> barrido
    barrido --> vaciando: malla completa
    vaciando --> [*]: búfer confirmado
  }
  midiendo --> homing: terminó, o el operador detuvo
  midiendo --> error: zona fuera del recorrido, sensor o movimiento
  calibrando --> homing: calibracion = null
  calibrando --> homing: llegó una sesión, que manda
  error --> homing: manda lo ya medido y vuelve al descanso
  homing --> espera
```
