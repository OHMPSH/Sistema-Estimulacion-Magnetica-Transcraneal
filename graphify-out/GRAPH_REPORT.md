# Graph Report - PT  (2026-11-11)

## Corpus Check
- 137 files · ~106,849 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 3, .ino 2, .properties 2)

## Summary
- 1288 nodes · 2732 edges · 82 communities (65 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2a53367`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formato.js
- SesionLogin.js
- banco.py
- Login, cookie y límite de intentos
- server/package.json
- Dependencias del frontend
- validar.js
- apiFetch
- conversionSensor.js
- Firmware de la Raspberry Pi Pico W (MicroPython)
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- Adafruit_HMC5883_Unified
- dev.sh
- tiempoReal.js
- app.js
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Estado de las fases (1 a 8)
- SAVD / TMS (sistema de adquisición y visualización)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS
- Fase 6: frontend (docs)
- setup_test_db.sql
- Accesibilidad e index.html
- Medicion.js
- Tablas de usuarios (migración 002)
- Prompts de las fases
- 003_configuracion.sql
- 004_dispositivo.sql
- Fase 5: Datos y trazabilidad (pendiente)
- main.py
- HistorialPage.jsx
- idx_sesiones_eliminada
- log
- barrido.py
- Bufer
- Controlador
- App.jsx
- ConfigContext.jsx
- DashboardPage.jsx
- ingesta.js
- Eje
- Eje
- Mesa
- Pin
- HMC5883L
- rp2.py
- Instructivo: conexiones de los drivers TB6600 y calibración de los ejes
- time
- configuracion.js
- WLAN
- prueba_logica.py
- machine.py
- mediciones.controller.js
- Pin
- simulador.test.js
- sesiones.js
- useSesionActiva.js
- dispositivo.js
- I2C
- emular-pico.js
- Sensor HMC5883L (magnetómetro AMR triaxial I2C)
- Usuario.js
- api.integ.js
- trazabilidad.test.js
- 4. Conexiones
- Fase 2: Login y usuarios (hecha)
- Adafruit Unified Sensor Driver
- ref_node_assert
- scripts
- database.js
- Dispositivo.js
- 6. Procedimiento de calibración
- Adafruit HMC5883L Driver (3-Axis Magnetometer) [![Build Status](https://github.com/adafruit/Adafruit_HMC5883_Unified/workflows/Arduino%20Library%20CI/badge.svg)](https://github.com/adafruit/Adafruit_HMC5883_Unified/actions)[![Documentation](https://github.com/adafruit/ci-arduino/blob/master/assets/doxygen_badge.svg)](http://adafruit.github.io/Adafruit_HMC5883_Unified/html/index.html)
- 5. Calibración

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `log()` - 27 edges
3. `Controlador` - 24 edges
4. `obtener()` - 22 edges
5. `apiFetch()` - 20 edges
6. `leerJSON()` - 19 edges
7. `Pin` - 18 edges
8. `DashboardPage()` - 18 edges
9. `difundir()` - 18 edges
10. `Fase 7 — Revisión de la interfaz y plan de diseño` - 18 edges

## Surprising Connections (you probably didn't know these)
- `7. Orden del barrido` --references--> `lecturas_por_punto()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/barrido.py
- `9. Pruebas en el PC` --references--> `Controlador`  [INFERRED]
  firmware/README.md → firmware/main.py
- `5.3 Pasos por milímetro` --references--> `homing()`  [INFERRED]
  firmware/README.md → firmware/banco.py
- `4.5 Sensor HMC5883L (GY-271) → Pico W` --references--> `sensor()`  [INFERRED]
  docs/instructivo-calibracion-y-conexiones.md → firmware/banco.py
- `5. Hora: NTP al arrancar` --references--> `settime()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/pruebas_pc/stubs/ntptime.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (82 total, 17 thin omitted)

### Community 0 - "formato.js"
Cohesion: 0.17
Nodes (19): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+11 more)

### Community 1 - "SesionLogin.js"
Cohesion: 0.16
Nodes (6): buscarVigenteConUsuario(), normalizarPreferencias(), main(), obtenerPassword(), PREDETERMINADO, preguntarSinEco()

### Community 2 - "banco.py"
Cohesion: 0.38
Nodes (11): apagar(), centro(), _correr(), homing(), ir(), _m(), mover(), pasos() (+3 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.10
Nodes (45): cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico(), yo(), actualizarUsuario() (+37 more)

### Community 4 - "server/package.json"
Cohesion: 0.13
Nodes (19): cors, dotenv, express, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5 (+11 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.07
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "validar.js"
Cohesion: 0.07
Nodes (55): ROLES, TEMAS, BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), barridoActual(), esEnteroPositivo(), esObjeto() (+47 more)

### Community 7 - "apiFetch"
Cohesion: 0.24
Nodes (19): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES (+11 more)

### Community 8 - "conversionSensor.js"
Cohesion: 0.16
Nodes (16): clasificarLote(), convertirCrudo(), CRUDO_MAX, CRUDO_MIN, crudoValido(), DESBORDE, EJES, erroresDePosicion() (+8 more)

### Community 9 - "Firmware de la Raspberry Pi Pico W (MicroPython)"
Cohesion: 0.13
Nodes (15): 10. Límites conocidos, 1. Archivos, 2.1 Pines por defecto (cámbialos en `config.py`), 2.2 TB6600, 2.3 Finales de carrera, 2. Cableado, 4. Cargar los archivos, 6. Prueba de banco (sin servidor) (+7 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.20
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 12 - "Adafruit_HMC5883_Unified"
Cohesion: 0.08
Nodes (18): Adafruit_HMC5883_Unified, _magData, _magGain, _sensorID, hmc5883MagData, hmc5883MagData_s, orientation, x (+10 more)

### Community 14 - "tiempoReal.js"
Cohesion: 0.12
Nodes (11): BuferEventos, bufer, clientes, conectar(), escribir(), formatear(), MAX_PENDIENTES, RETRY_MS (+3 more)

### Community 15 - "app.js"
Cohesion: 0.24
Nodes (11): crearApp(), iniciarServicios(), testConnection(), corsMiddleware, origenes, manejadorErrores(), rutaNoEncontrada(), router (+3 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.29
Nodes (8): Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js), Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython, Prompt Fase 4 — Pico W como cliente del servidor

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.29
Nodes (8): Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 8: Tests y despliegue (pendiente), Hooks de git que reconstruyen el grafo (solo código), Reglas de graphify (query/path/explain, GRAPH_REPORT primero), docs/prompts-sesiones.md

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.09
Nodes (24): Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271), Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Red por hotspot de iPhone (varios observadores), SAVD / TMS (sistema de adquisición y visualización), Paso 2b — Crear el usuario administrador (npm run crear-admin) (+16 more)

### Community 20 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.08
Nodes (20): API REST actual (roles público/sesión/op/admin), controllers/auth.controller.js · usuarios.controller.js, Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), config/roles.js (ROLES y TEMAS), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Fase 1: Base del backend (hecha), Límite de intentos de login (5 en 15 min, 429) (+12 more)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.11
Nodes (17): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip con un escaneo I2C, 4.2 Configuración (+9 more)

### Community 22 - "Fase 6: frontend (docs)"
Cohesion: 0.13
Nodes (13): Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Fase 6: Frontend funcional (pendiente), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router), Stack: React 18 + Vite 5, Node 20 + Express 4 + mysql2, MariaDB, Chart.js/Three.js/Plotly, Bootstrap 5, Vulnerabilidades restantes (nodemon, esbuild/vite, plotly.js → maplibre-gl), Paso 9 — Prueba completa del Dashboard (+5 more)

### Community 23 - "setup_test_db.sql"
Cohesion: 0.28
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 24 - "Accesibilidad e index.html"
Cohesion: 0.24
Nodes (10): Colores del modo oscuro (:root en global.css), Fase 7: Accesibilidad y diseño (pendiente), styles/global.css, Tema claro (tokens, data-theme, data-bs-theme), Prompt Fase 7 — Accesibilidad y diseño con web-design-guidelines y frontend-design, Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…), html lang=es data-bs-theme=dark, frontend/index.html (punto de entrada de Vite) (+2 more)

### Community 25 - "Medicion.js"
Cohesion: 0.11
Nodes (11): insertarLote(), insertarMedicion(), leerJSON(), medicionesComoEventos(), normalizarSesion(), obtenerMedicionesDeSesion(), obtenerSesion(), obtenerSesiones() (+3 more)

### Community 26 - "Tablas de usuarios (migración 002)"
Cohesion: 0.70
Nodes (4): idx_sesiones_login_expira, idx_sesiones_login_usuario, sesiones_login, usuarios

### Community 29 - "003_configuracion.sql"
Cohesion: 0.40
Nodes (3): configuracion, idx_sesiones_filtros, idx_sesiones_iniciada

### Community 31 - "Fase 5: Datos y trazabilidad (pendiente)"
Cohesion: 0.13
Nodes (20): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller (+12 more)

### Community 34 - "main.py"
Cohesion: 0.18
Nodes (3): _en_paralelo(), _desfase_epoch(), _hora()

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.16
Nodes (28): StartModal, CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones(), KpiCards, EditorNotas(), HistorialPage() (+20 more)

### Community 38 - "log"
Cohesion: 0.15
Nodes (9): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+1 more)

### Community 39 - "barrido.py"
Cohesion: 0.16
Nodes (12): prueba(), a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto() (+4 more)

### Community 40 - "Bufer"
Cohesion: 0.11
Nodes (4): Progreso, Bufer, Enviador, Bufer

### Community 41 - "Controlador"
Cohesion: 0.19
Nodes (4): poner(), Controlador, principal(), log()

### Community 42 - "App.jsx"
Cohesion: 0.20
Nodes (14): App(), Shell(), MenuLateral(), NAVEGACION, Navbar, useAuth(), leer(), SECCIONES (+6 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.19
Nodes (16): aTexto(), escribirRuta(), leerRuta(), SeccionFormulario(), aplicarTema(), CLAVE_TEMA, ConfigContext, ConfigProvider() (+8 more)

### Community 44 - "DashboardPage.jsx"
Cohesion: 0.16
Nodes (14): ModalConfirmacion, StopModal, useModalBootstrap(), DataTable, LimiteErrores, DashboardPage(), Superficie3D, useSegundos() (+6 more)

### Community 45 - "ingesta.js"
Cohesion: 0.18
Nodes (21): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), generarToken(), getEstado(), latido(), lote() (+13 more)

### Community 47 - "Eje"
Cohesion: 0.22
Nodes (6): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para(), Perfil

### Community 49 - "Pin"
Cohesion: 0.24
Nodes (3): Eje, pedir_mm(), principal()

### Community 51 - "rp2.py"
Cohesion: 0.12
Nodes (6): _programa_pasos(), asm_pio(), DMA, PIO, StateMachine, 3. Instalar MicroPython

### Community 52 - "Instructivo: conexiones de los drivers TB6600 y calibración de los ejes"
Cohesion: 0.18
Nodes (11): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 5.1 Preparar Thonny, 5.2 Ajustar el encabezado del programa, 5.3 Cómo funciona, 5. Programa de calibración en Thonny (+3 more)

### Community 53 - "time"
Cohesion: 0.17
Nodes (10): _bootsel_pulsado(), a_ut(), a_ut(), escanear(), leer_xyz(), principal(), revisar_niveles(), leer() (+2 more)

### Community 54 - "configuracion.js"
Cohesion: 0.36
Nodes (9): actualizar(), cache, cargar(), copia(), obtenerTodo(), POR_DEFECTO, esObjeto(), mezclar() (+1 more)

### Community 56 - "prueba_logica.py"
Cohesion: 0.11
Nodes (4): activo(), _homing_eje(), post(), Respuesta

### Community 57 - "machine.py"
Cohesion: 0.17
Nodes (4): _Mem32, reset(), Timer, WDT

### Community 58 - "mediciones.controller.js"
Cohesion: 0.13
Nodes (22): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+14 more)

### Community 61 - "simulador.test.js"
Cohesion: 0.23
Nodes (13): generadorGaussiano(), mulberry32(), campoEnPlaca(), campoEspira(), integralesElipticas(), puntoDeMalla(), crearGeneradorMuestras(), FACTOR_SATURACION (+5 more)

### Community 62 - "sesiones.js"
Cohesion: 0.32
Nodes (9): olvidarSesion(), cola, conGeometria(), enCola(), ErrorSesion, finalizar(), inicializar(), iniciar() (+1 more)

### Community 63 - "useSesionActiva.js"
Cohesion: 0.29
Nodes (10): claveDe(), porSeq(), useSesionActiva(), abrir(), alConectar, cerrar(), EVENTOS, suscriptores (+2 more)

### Community 64 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 67 - "emular-pico.js"
Cohesion: 0.26
Nodes (15): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+7 more)

### Community 68 - "Sensor HMC5883L (magnetómetro AMR triaxial I2C)"
Cohesion: 0.11
Nodes (25): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Geometría derivada del paso (grid_n, z_levels, puntos), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq) (+17 more)

### Community 69 - "Usuario.js"
Cohesion: 0.18
Nodes (6): buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId(), buscarPorUsuario(), listar(), normalizar()

### Community 70 - "api.integ.js"
Cohesion: 0.23
Nodes (8): carpetaServidor, sesionSimulada(), carpetaServidor, cliente(), configurarEntorno(), esperar(), leerCSV(), levantar()

### Community 71 - "trazabilidad.test.js"
Cohesion: 0.26
Nodes (12): indiceDeMalla(), calcularHuecos(), COLUMNAS_CSV, encabezadoCSV(), escaparMeta(), fecha(), lineaCSV(), MAX_HUECOS_LISTADOS (+4 more)

### Community 72 - "4. Conexiones"
Cohesion: 0.17
Nodes (12): 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600, 4.5 Sensor HMC5883L (GY-271) → Pico W, 4.6 Finales de carrera (para el firmware final), 4.7 Alimentación de la Pico, 4.8 Revisión antes de encender (+4 more)

### Community 73 - "Fase 2: Login y usuarios (hecha)"
Cohesion: 0.20
Nodes (10): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Fase 2: Login y usuarios (hecha), frontend App.jsx (login / cambio forzado / Dashboard), Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), LoginPage.jsx · CambiarPasswordPage.jsx, Tabla sesiones_login (+2 more)

### Community 74 - "Adafruit Unified Sensor Driver"
Cohesion: 0.20
Nodes (9): Adafruit Unified Sensor Driver, How Does it Work?, Required Functions, Sensor Data/Events (`sensors_event_t`), Sensor Details (`sensor_t`), Sensor Types (`sensors_type_t`), Standardised SI values for `sensors_event_t`, The Unified Driver Abstraction Layer in Practice (+1 more)

### Community 76 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, crear-admin, dev, emular-pico, start, test, test:integracion, test:unit

### Community 77 - "database.js"
Cohesion: 0.38
Nodes (4): faltantes, pool, leerValor(), obtenerTodas()

### Community 78 - "Dispositivo.js"
Cohesion: 0.38
Nodes (3): buscarPorTokenHash(), normalizar(), obtenerPrincipal()

### Community 79 - "6. Procedimiento de calibración"
Cohesion: 0.33
Nodes (6): 6.1 Factor teórico, 6.2 Sentido de cada eje, 6.3 Medir y corregir el factor (un eje a la vez), 6.4 Comprobar, 6.5 Hoja de registro, 6. Procedimiento de calibración

### Community 80 - "Adafruit HMC5883L Driver (3-Axis Magnetometer) [![Build Status](https://github.com/adafruit/Adafruit_HMC5883_Unified/workflows/Arduino%20Library%20CI/badge.svg)](https://github.com/adafruit/Adafruit_HMC5883_Unified/actions)[![Documentation](https://github.com/adafruit/ci-arduino/blob/master/assets/doxygen_badge.svg)](http://adafruit.github.io/Adafruit_HMC5883_Unified/html/index.html)"
Cohesion: 0.40
Nodes (4): About the HMC5883, About this Driver, Adafruit HMC5883L Driver (3-Axis Magnetometer) [![Build Status](https://github.com/adafruit/Adafruit_HMC5883_Unified/workflows/Arduino%20Library%20CI/badge.svg)](https://github.com/adafruit/Adafruit_HMC5883_Unified/actions)[![Documentation](https://github.com/adafruit/ci-arduino/blob/master/assets/doxygen_badge.svg)](http://adafruit.github.io/Adafruit_HMC5883_Unified/html/index.html), What is the Adafruit Unified Sensor Library?

### Community 81 - "5. Calibración"
Cohesion: 0.40
Nodes (5): 5.1 Sensor, 5.3 Pasos por milímetro, 5.5 Recorrido útil, 5.6 Velocidad, 5. Calibración

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **45 isolated node(s):** `x`, `y`, `z`, `orientation`, `_magGain` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 410 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Raspberry Pi Pico W (RP2040)` connect `SAVD / TMS (sistema de adquisición y visualización)` to `Fase 4: Pico W (docs)`, `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Controlador` (e.g. with `ErrorZona` and `Mesa`) actually correct?**
  _`Controlador` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `x`, `y`, `z` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Login, cookie y límite de intentos` be split into smaller, more focused modules?**
  _Cohesion score 0.09610389610389611 - nodes in this community are weakly interconnected._
- **Why does `Estado de las fases (1 a 8)` connect `Estado de las fases (1 a 8)` to `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`, `Fase 2: Login y usuarios (hecha)`, `Fase 4: Pico W (docs)`, `Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)`, `Fase 6: frontend (docs)`, `Accesibilidad e index.html`, `Fase 5: Datos y trazabilidad (pendiente)`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._