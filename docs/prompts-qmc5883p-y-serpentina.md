# Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

Dos prompts para dos sesiones (2026-11-12). Comparten un **contrato**: el orden en serpentina y el formato de las lecturas del QMC5883P. El texto del contrato es igual en los dos para que el firmware y el servidor coincidan.

- **Prompt 1:** sesión nueva, firmware de la Pico W (`firmware/`).
- **Prompt 2:** la sesión ya creada de la página web (servidor y frontend).

Pueden correr a la vez. El firmware del prompt 1 funciona con el servidor de antes y con el de después (detecta el modelo del sensor en el latido). Al final, haz una prueba de punta a punta con los dos cambios juntos.

---

## Prompt 1 — Sesión nueva: firmware cliente de la Pico W

```text
Lee primero CLAUDE.md completo (y graphify-out/GRAPH_REPORT.md antes de cualquier búsqueda, como dice su regla) y después docs/sensor-qmc5883p.md, firmware/README.md, firmware_hall_1d/README.md y docs/firmware-pico-w.md. Responde en español, en prosa completa. No hagas commits.

OBJETIVO
Modificar el firmware cliente FINAL de la Pico W, el que está en firmware/ (main.py, config.py, sensor.py, barrido.py, motores.py, cliente.py, red.py, banco.py, led.py, registro.py y pruebas_pc/), para que:
  1. use el magnetómetro real, un QMC5883P de 3 ejes;
  2. trabaje igual que el firmware de prueba del Hall 49E (firmware_hall_1d/), que ya funciona perfecto con el servidor y la mesa;
  3. recorra la malla en SERPENTINA en X, Y y Z.
Todo el trabajo va en los archivos que ya existen en firmware/.

NO TOQUES (deben quedar intactos):
- firmware_hall_1d/ completo (es la referencia que funciona).
- firmware/prueba_hall_49e.py, firmware/prueba_qmc5883p.py, firmware/medicion_campo_qmc5883p.py y firmware/prueba_calibracion.py (pruebas independientes que ya funcionan).
- Nada del servidor (server/), del frontend (frontend/) ni nginx/. Si algo del servidor hace falta, anótalo para la otra sesión; no lo cambies.

1) TOMAR COMO MODELO firmware_hall_1d/
Compara archivo por archivo firmware_hall_1d/ con firmware/ y aplica a firmware/ el mismo comportamiento, cambiando solo el sensor:
- Sin finales de carrera: la posición de la mesa al arrancar es el origen (0, 0, 0). Los ejes llevan "final": None y recorrido_mm = el límite. Deja el código de homing con finales en motores.py tal como está, para cuando se instalen los interruptores.
- Límites de software: X 0–410, Y 0–562, Z 0–88 mm (LIMITE_X_MM, LIMITE_Y_MM, LIMITE_Z_MM). Un movimiento fuera se rechaza antes de dar un pulso, y una sesión cuya zona no cabe se rechaza entera.
- La zona empieza en ORIGEN_ZONA_X/Y/Z_MM (0 por defecto): x_máquina = ORIGEN_ZONA_X_MM + xMM. Ya NO va centrada bajo la bobina (X_BOBINA_MM).
- Los drivers quedan habilitados todo el tiempo que corre el programa.
- La mesa vuelve al origen al completar una sesión, al detenerla, ante un error, ante un 401 y con Ctrl+C o el botón rojo de Thonny: apagar() vuelve al origen bloqueando y luego deshabilita los drivers.
- Nunca se reinicia sola: ni machine.reset() ni watchdog, porque un reinicio tomaría como origen la posición en que quedó la mesa.
- Motores: los pines, factores e inversiones de prueba_calibracion.py (50 pulsos/mm; X GP10/11, Y GP12/13, Z GP14/15, ENA GP16 con ENA_HABILITADO = 0), VEL_MAX_MM_S = 60, ACEL_MM_S2 = 300, VEL_INICIO_MM_S = 6.
- El log avisa si el servidor está en modo simulación.
- secretos.py: crea firmware/secretos.py con el mismo contenido que firmware_hall_1d/secretos.py (Wi-Fi TP-LINK_5D41, SERVIDOR http://<IP de la laptop>:4000 y el token). Ya está en el .gitignore raíz. No copies esos valores a ningún otro archivo.

2) SENSOR: sensor.py → clase QMC5883P (ver docs/sensor-qmc5883p.md)
Misma interfaz que usan main.py, barrido.py y banco.py: verificar(), configurar(...) y el generador medir().
- Conexión: I2C0, SDA GP0 (pin 1), SCL GP1 (pin 2), 100 kHz, dirección 0x2C (en config.py: I2C_ID, PIN_SDA = 0, PIN_SCL = 1, I2C_FRECUENCIA = 100_000, DIR_SENSOR = 0x2C).
- verificar(): escanea el bus y comprueba el Chip ID (registro 0x00 = 0x80). Mensajes claros si en su lugar aparece 0x1E (HMC5883L), 0x0D (QMC5883L) o nada.
- configurar(rango_g): 0x29 ← 0x06; 0x0B ← bits << 2 (30 G → 0, 12 G → 1, 8 G → 2, 2 G → 3); 0x0A ← 0xCD; esperar 20 ms. Cuentas por gauss: 30 → 1000, 12 → 2500, 8 → 3750, 2 → 15000.
- medir(): generador. Promedia PROMEDIO_QMC lecturas (config, 10 por defecto). Para cada una, cede con yield mientras espera DRDY (0x09 bit 0), con un límite de 100 ms → ErrorSensor. Lee 6 bytes desde 0x01 con struct.unpack('<hhh') (orden X, Y, Z, byte bajo primero) y acumula OVFL (0x09 bit 1). Devuelve (x, y, z) como enteros (promedio redondeado) y si saturó.
- Ante un OSError del bus: reintenta una vez reinicializando el chip (iniciar de nuevo). Si vuelve a fallar → ErrorSensor (la sesión falla, manda lo ya medido y la mesa vuelve al origen, como en el Hall).
- Fondo: al arrancar, con la mesa en el origen y la bobina apagada, promedia unas 100 lecturas e imprime el fondo en µT por eje, con el aviso "cópialo en Configuración › Sensor › offset si quieres que el servidor lo reste". Con BOOTSEL en espera se vuelve a medir (como el cero del Hall). RESTAR_FONDO_EN_PICO = False por defecto: las cuentas se mandan crudas para no perder trazabilidad.
- Sin bibliotecas extra.

3) FORMATO DE LAS LECTURAS: compatibilidad con el servidor de antes y el de después
La otra sesión adaptará el servidor al QMC5883P. El firmware debe funcionar con los dos servidores, eligiendo según sesion_activa.sensor (que llega en el latido):
- Si sensor.modelo == "QMC5883P" (servidor nuevo): configura con sensor.rango_g y manda raw = cuentas crudas del QMC (enteros −32768..32767) más "saturado": true|false por lectura (OVFL). Es el CONTRATO de abajo.
- Si no (servidor de hoy, que espera un HMC5883L): configura el QMC en 30 G, convierte a µT (cuentas / cuentas_por_g × 100) y de ahí a "cuentas HMC" con sensor.lsb_por_ga y offset_ut, exactamente como firmware_hall_1d/sensor_hall.py (a_cuentas): −4096 si hay OVFL o si no cabe en −2048..2047. Avisa en el log que el rango queda limitado a ±(2047 / lsb_por_ga × 100) µT.
cliente.Bufer guarda hoy 8 enteros por lectura: agrega el bit de saturado sin romper el tamaño (por ejemplo, en el bit alto de un campo existente o en un campo más) y mándalo en lote() solo cuando corresponda.

4) RECORRIDO EN SERPENTINA (muy importante)
Hoy el barrido va en X de 0 al máximo, VUELVE al inicio de X, sube un paso en Y y repite (raster), y en Z vuelve a empezar desde y = 0. Debe ser un recorrido en serpentina continuo: X avanza hasta el máximo, Y sube un paso y X regresa midiendo punto por punto, y así sucesivamente. Al terminar un plano, Z sube un paso y el siguiente plano se recorre desde donde quedó la mesa (sin volver a x = 0, y = 0). La mesa solo vuelve al origen al terminar la sesión.

CONTRATO DEL ORDEN (idéntico en la sesión del servidor). Con nx = grid_nx, ny = grid_ny y k = índice del punto (0..total−1):
    iz   = k // (nx·ny)
    r    = k %  (nx·ny)
    fila = r // nx
    iy   = fila            si iz es par;  ny − 1 − fila   si iz es impar
    g    = iz·ny + fila                   (número global de fila)
    ix   = r % nx          si g es par;   nx − 1 − (r % nx) si g es impar
    punto = (ix·paso, iy·paso, z_levels_mm[iz])   (redondeado a décimas, como hoy)
Vector de prueba con nx = 3, ny = 2 y dos planos (k = 0..11):
    (0,0,0) (1,0,0) (2,0,0) (2,1,0) (1,1,0) (0,1,0) (0,1,1) (1,1,1) (2,1,1) (2,0,1) (1,0,1) (0,0,1)
    (en índices ix, iy, iz). Entre puntos seguidos solo cambia un índice en ±1.
- Cambia barrido.punto() a este orden. La reanudación (seq → índice = (seq − 1) // N) no cambia: el índice ahora es la posición en la serpentina.
- Holgura (HOLGURA_MM): hoy cada movimiento en sentido − se pasa 0,5 mm y vuelve en sentido +. Con la serpentina, la mitad de las filas van en sentido −, así que cada punto haría ese vaivén. Mantén la compensación (el requisito es ±1 mm), pero hazla configurable por eje y anota en el README cuánto tiempo agrega. Pregúntale al usuario antes de quitarla.
- No cambies la validación del servidor: acepta cualquier orden, porque valida la posición contra la malla y el seq.

5) banco.py y pruebas en el PC
- banco.py: sensor() con el QMC5883P (cuentas, µT, |B| y SATURADO), fondo(), y prueba() en serpentina con los límites. Se quita la tabla LSB_POR_GA del HMC.
- firmware/pruebas_pc/stubs/machine.py: el I2C falso pasa a ser un QMC5883P (0x2C, ID 0x80, DRDY, OVFL configurable, '<hhh'). Ojo: firmware_hall_1d/pruebas_pc usa estos stubs (pero no el I2C), así que comprueba que sus dos pruebas sigan pasando: python3 firmware_hall_1d/pruebas_pc/prueba_logica.py.
- firmware/pruebas_pc/prueba_logica.py:
  - la comparación con server/services/geometria.js punto por punto se rompe mientras el servidor siga en raster; cámbiala para comparar el CONJUNTO de puntos;
  - agrega una prueba del orden con el vector de arriba y otra que compruebe que entre puntos seguidos solo cambia un índice en ±1 (también al cambiar de plano);
  - agrega las de límites, el formato en los dos modos (QMC y "cuentas HMC") y la saturación.
- firmware/pruebas_pc/ejecutar_pc.py: que funcione con lo nuevo, sin finales simulados, como firmware_hall_1d/pruebas_pc/ejecutar_pc.py, y con un Ctrl+C simulado al final.
- Verificación de punta a punta contra una MariaDB temporal (CLAUDE.md, sección 5; usa el directorio scratchpad y un puerto distinto del 4000, sin tocar la base ni el servidor del usuario). Comprueba con el servidor de HOY (modo "cuentas HMC"):
  - una sesión pequeña sin huecos;
  - que las posiciones llegan en serpentina (revisa x_mm, y_mm, z_mm por seq);
  - el regreso al origen al completar y con Ctrl+C a mitad del barrido.
  Al terminar, detén los procesos y borra los temporales.

6) DOCUMENTACIÓN
Actualiza firmware/README.md (conexión GP0/GP1, sin finales, límites, serpentina, fondo, los dos modos de envío, cómo arrancar el backend con HOST=0.0.0.0), docs/firmware-pico-w.md (sección del sensor y orden del barrido), docs/instructivo-calibracion-y-conexiones.md (4.5: QMC5883P en GP0/GP1), docs/sensor-qmc5883p.md (sección 6: lo que quedó hecho) y CLAUDE.md (árbol, notas, estado). Después corre graphify update .

Al terminar, dime qué probaste y qué no (no se puede probar el hardware real desde aquí), y qué le falta a la sesión del servidor.
```

---

## Prompt 2 — Sesión ya creada: página web (servidor y frontend)

```text
Contexto nuevo (2026-11-12): lee la sección 1 (Hardware y "Cómo funciona el QMC5883P"), la parte "Sensor real y firmware del Hall de un eje" de la sección 6 de CLAUDE.md y docs/sensor-qmc5883p.md completo. Lee graphify-out/GRAPH_REPORT.md antes de buscar. Responde en español. No hagas commits.

QUÉ PASÓ
El módulo magnético real NO es un HMC5883L: es un QMC5883P (I2C 0x2C, cuentas de 16 bits con signo, rangos de 2/8/12/30 G con 15000/3750/2500/1000 cuentas por gauss, y la saturación llega como un bit (OVFL), no como −4096). En paralelo, otra sesión adapta el firmware de la Pico (firmware/) a este sensor y le cambia el recorrido a serpentina. Tu tarea es adaptar el servidor y la página a esos dos cambios.

RESTRICCIÓN PRINCIPAL
Cambia SOLO lo necesario para adaptar el sistema al QMC5883P y a la serpentina. No toques nada más de la infraestructura: ni nginx/tms.conf, ni la autenticación, ni el SSE, ni el despliegue (deploy/, COMANDOS.md salvo una nota si hace falta), ni el esquema de tablas que no tenga que ver con esto, ni las tecnologías (sin librerías nuevas), ni el diseño ni los colores. Se mantienen las cinco gráficas, la tabla, los KPI y el historial. No borres ni reescribas datos guardados: las sesiones viejas conservan su copia de config_sensor del HMC5883L y sus µT ya calculados.

1) EL SENSOR EN EL SERVIDOR (opción (b) de docs/sensor-qmc5883p.md, sección 6)
Hoy todo da por hecho un HMC5883L:
- server/services/conversionSensor.js: CRUDO_MIN −4096, CRUDO_MAX 2047, DESBORDE −4096 = saturado, convertirCrudo con lsb_por_ga, utACrudo;
- server/services/validacionConfiguracion.js: GANANCIAS_HMC5883L, rango_ga, lsb_por_ga, limiteSensorUT;
- la clave "sensor" de configuracion {modelo:'HMC5883L', rango_ga, lsb_por_ga, lecturas_por_punto, offset_ut};
- opciones.ganancias_hmc5883l en GET /configuracion y su sección en el frontend (Configuración › Sensor);
- services/simulacionPura.js y services/ingesta.js (saturación del simulador con el fondo de escala);
- server/scripts/emular-pico.js;
- los tests.

Hazlo con los DOS modelos, elegidos por sensor.modelo:
- "QMC5883P" (nuevo, POR DEFECTO): sensor = {modelo, rango_g ∈ {2, 8, 12, 30} (30 por defecto), cuentas_por_g (derivado del rango, no editable), lecturas_por_punto, offset_ut}. raw de −32768 a 32767. µT = raw / cuentas_por_g × 100 − offset_ut[eje]. Fondo de escala = 32767 / cuentas_por_g × 100 µT.
- "HMC5883L" (se conserva tal como está hoy, con rango_ga y lsb_por_ga): lo sigue usando el firmware de prueba del Hall 49E (firmware_hall_1d/), que el usuario NO quiere cambiar. Ese firmware lee sesion_activa.sensor.lsb_por_ga y manda cuentas HMC con −4096 = saturado. Con modelo HMC5883L debe seguir funcionando exactamente igual.
El validador acepta y convierte el formato viejo (como ya hace con barrido.grid_size_mm). Cambiar el modelo o el rango con una sesión abierta sigue respondiendo 409.

CONTRATO DE LAS LECTURAS DEL QMC5883P (idéntico en la sesión del firmware):
  POST /api/dispositivo/mediciones {sesionId, lecturas: [{seq, xMM, yMM, zMM, raw: {x, y, z}, saturado?: bool, ts_ms}]}
  - raw: enteros de −32768 a 32767 (las columnas raw_x/raw_y/raw_z ya son SMALLINT: no cambia el esquema de mediciones).
  - saturado: opcional (false por defecto). Con QMC5883P, saturado = true → bx, by, bz y magnitud se guardan NULL (el bit no dice qué eje se pasó), se conservan los raw y saturado = 1 (la misma regla de la Fase 4: no cuentan para MAX ni MIN). Con QMC5883P, −4096 es una cuenta válida, NO saturación.
  - Con HMC5883L se mantiene la regla de hoy (−4096 en un eje).
  - El latido manda en sesion_activa.sensor la copia de la sesión, con modelo, rango_g y cuentas_por_g (y, con HMC, rango_ga y lsb_por_ga como hoy).
  El firmware detecta el modelo en el latido: si recibe "QMC5883P" manda cuentas crudas con el campo saturado; si no, convierte a cuentas HMC. Así funciona antes y después de tu cambio.

Base de datos: hace falta una migración nueva (server/migrations/008_sensor_qmc5883p.sql, idempotente, con comentarios) que cambie el valor por defecto de configuracion.sensor al QMC5883P de 30 G conservando lecturas_por_punto y offset_ut, y actualizar setup_db.sql para que una instalación limpia quede igual. Las migraciones se ejecutan como root y el usuario las decide: pide confirmación o pídele que la ejecute (recuerda que en su base local faltan la 006 y la 007; compruébalo antes). Si no hace falta tocar columnas, no las toques.

2) RECORRIDO EN SERPENTINA
La Pico recorrerá la malla en serpentina: X hasta el máximo, sube un paso en Y y X regresa; al terminar un plano, sube Z y sigue desde donde quedó. La ingesta, los huecos (trazabilidad.js), el progreso (cuenta de lecturas), el CSV, la tabla, el mapa 3D y la superficie NO dependen del orden: déjalos como están.

Lo que SÍ depende del orden y hay que cambiar:
- server/services/geometria.js: puntoDeMalla(malla, k) y indiceDeMalla(malla, ix, iy, iz) pasan a la serpentina. Así el simulador (simulacionPura.js) y el emulador (emular-pico.js) recorren igual que la Pico real. Revisa todos los usos (trazabilidad.js solo enumera los puntos que faltan: puede seguir igual, pero sus huecos saldrán listados en orden de serpentina).
- frontend/src/utils/geometria.js: indiceEnMalla(malla, x, y, z) es el eje X de la gráfica de líneas ("posición en el barrido"). Con el orden raster, una fila recorrida de regreso dejaría "huecos" falsos entre la última lectura y el resto de la ventana. Debe devolver la posición en la serpentina; actualiza su comentario y el de LineChart.jsx. Es el único cambio de lógica en la página por la serpentina.
- Los tests que fijan el orden (server/tests/simulador.test.js, trazabilidad.test.js y los de integración que comparan el CSV con el simulador).

CONTRATO DEL ORDEN (idéntico en la sesión del firmware). Con nx = grid_nx, ny = grid_ny y k = índice (0..total−1):
    iz   = floor(k / (nx·ny));  r = k mod (nx·ny);  fila = floor(r / nx)
    iy   = fila si iz es par;  ny − 1 − fila si iz es impar
    g    = iz·ny + fila
    ix   = r mod nx si g es par;  nx − 1 − (r mod nx) si g es impar
  Inverso (para indiceDeMalla e indiceEnMalla):
    fila = iy si iz es par;  ny − 1 − iy si iz es impar
    g    = iz·ny + fila
    c    = ix si g es par;  nx − 1 − ix si g es impar
    k    = g·nx + c
  Vector de prueba con nx = 3, ny = 2 y dos planos, en (ix, iy, iz) para k = 0..11:
    (0,0,0) (1,0,0) (2,0,0) (2,1,0) (1,1,0) (0,1,0) (0,1,1) (1,1,1) (2,1,1) (2,0,1) (1,0,1) (0,0,1)
  Pon esta prueba (y la de ida y vuelta k → punto → k para varias mallas, incluida una con un solo plano y otra con ny = 1) en los tests del servidor.

3) FRONTEND (solo lo necesario)
- Configuración › Sensor: el selector de modelo (QMC5883P / HMC5883L) y, según el modelo, el rango (2, 8, 12, 30 G con sus cuentas por gauss y su fondo de escala en µT) o las ganancias del HMC como hoy. opciones de GET /configuracion pasa a traer los rangos de los dos modelos (por ejemplo rangos_qmc5883p además de ganancias_hmc5883l). Los textos de ayuda dicen el modelo real.
- La gráfica de líneas con indiceEnMalla en serpentina (punto 2).
- Nada más cambia de diseño. Revisa con la skill web-design-guidelines solo lo que toques.

4) LO DEMÁS
- emular-pico.js: con el modelo QMC5883P genera cuentas de 16 bits y el campo saturado, y recorre en serpentina (puntoDeMalla). Con HMC5883L, como hoy.
- Tests: actualiza los unitarios (conversión de los dos modelos, validadores, orden) y los de integración (CSV contra el simulador con semilla fija, Pico emulada con pérdidas y duplicados en los dos modelos). Córrelos (npm test y, con la MariaDB temporal de CLAUDE.md sección 5, npm run test:integracion).
- Verifica con curl contra un servidor de prueba en otro puerto y con la MariaDB temporal: una sesión QMC5883P con lecturas saturadas y sin saturar, una sesión HMC5883L con −4096 (el camino del Hall), el 409 al cambiar el sensor con una sesión abierta, y el CSV con el modelo en su encabezado. En el navegador: Configuración › Sensor con los dos modelos y una simulación en serpentina (la gráfica de líneas sin huecos falsos). Borra lo que crees y detén los procesos.
- Documentación: CLAUDE.md (secciones 3, 7.2, 7.3, la tabla de la API si cambia algo, notas y estado), docs/firmware-pico-w.md (formato de las lecturas, saturado y orden del barrido) y docs/sensor-qmc5883p.md (sección 6: lo hecho en el servidor). Después corre graphify update .

Al terminar, dime qué cambió, qué probaste y qué falta (por ejemplo, ejecutar la migración 008 en su base).
```
