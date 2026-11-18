# Graph Report - PT  (2026-11-13)

## Corpus Check
- 152 files · ~134,591 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .service 1, .css 1)

## Summary
- 1580 nodes · 3238 edges · 107 communities (71 shown, 36 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 148 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a1ab302`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KpiCards.jsx
- Usuario.js
- Firmware de prueba: Pico W + sensor Hall 49E (un eje)
- configuracion.js
- server/package.json
- Dependencias del frontend
- validacionConfiguracion.js
- apiFetch
- conversionSensor.js
- 4. Conexiones
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- dev.sh
- auth.controller.js
- mediciones.controller.js
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- SAVD / TMS (sistema de adquisición y visualización)
- Códigos HTTP 400/401/403/404/409/422
- Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS
- Superficie3D.jsx
- setup_test_db.sql
- Accesibilidad e index.html
- firmware_hall_1d/banco.py
- Tablas de usuarios (migración 002)
- Prompts de las fases
- 003_configuracion.sql
- 004_dispositivo.sql
- Sensor HMC5883L (magnetómetro AMR triaxial I2C)
- medicion_campo_qmc5883p.py
- HistorialPage.jsx
- idx_sesiones_eliminada
- Controlador
- firmware/barrido.py
- qmc
- firmware_hall_1d/red.py
- App.jsx
- ConfigContext.jsx
- firmware/red.py
- Fase 5: Datos y trazabilidad (pendiente)
- 4. El sensor: QMC5883P
- firmware/motores.py
- Mesa
- Pin
- SesionLogin.js
- Mesa
- Controlador
- Hall49E
- firmware_hall_1d/main.py
- WLAN
- firmware_hall_1d/pruebas_pc/ejecutar_pc.py
- machine.py
- sesiones.js
- simulador.test.js
- firmware/main.py
- emular-pico.js
- dispositivo.routes.js
- ConfigContext.jsx
- dispositivo.js
- Firmware de la Raspberry Pi Pico W (MicroPython)
- Enviador
- Enviador
- database.js
- api.integ.js
- 6. Procedimiento de calibración
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- app.js
- Bufer
- rp2.py
- DashboardPage.jsx
- Instructivo: conexiones de los drivers TB6600 y calibración de los ejes
- Medicion.js
- Bufer
- firmware_hall_1d/pruebas_pc/prueba_logica.py
- I2C
- Estado de las fases (1 a 8)
- scripts
- Pin
- firmware_hall_1d/registro.py
- Prompts: QMC5883P en el firmware cliente y recorrido en serpentina
- Configuracion.js
- 1. Resumen del protocolo
- Eje
- Canvas3D.jsx
- firmware_hall_1d/motores.py
- Limites
- urequests.py
- firmware/pruebas_pc/prueba_logica.py
- Dispositivo.js
- QMC5883P
- Magnetómetro QMC5883P con la Raspberry Pi Pico W
- ADC
- Progreso
- Perfil

## God Nodes (most connected - your core abstractions)
1. `react` - 36 edges
2. `QMC5883P` - 23 edges
3. `apiFetch()` - 23 edges
4. `Controlador` - 22 edges
5. `obtener()` - 22 edges
6. `leerJSON()` - 22 edges
7. `Controlador` - 21 edges
8. `DashboardPage()` - 19 edges
9. `difundir()` - 18 edges
10. `Fase 7 — Revisión de la interfaz y plan de diseño` - 18 edges

## Surprising Connections (you probably didn't know these)
- `1.2 Lote de mediciones` --references--> `QMC5883P`  [INFERRED]
  docs/firmware-pico-w.md → firmware/sensor.py
- `4.5 Magnetómetro QMC5883P → Pico W` --references--> `sensor()`  [INFERRED]
  docs/instructivo-calibracion-y-conexiones.md → firmware/banco.py
- `En el servidor y la página: hecho el 2026-11-12 (opción **b**)` --references--> `QMC5883P`  [INFERRED]
  docs/sensor-qmc5883p.md → firmware/sensor.py
- `7. Orden del barrido: serpentina` --references--> `indiceEnMalla()`  [INFERRED]
  docs/firmware-pico-w.md → frontend/src/utils/geometria.js
- `6. En el firmware cliente (`firmware/`): hecho el 2026-11-12` --references--> `QMC5883P`  [INFERRED]
  docs/sensor-qmc5883p.md → firmware/sensor.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (107 total, 36 thin omitted)

### Community 0 - "KpiCards.jsx"
Cohesion: 0.36
Nodes (6): ModalConfirmacion, StopModal, useModalBootstrap(), KpiCards, duracion(), clasePlano()

### Community 1 - "Usuario.js"
Cohesion: 0.18
Nodes (6): buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId(), buscarPorUsuario(), listar(), normalizar()

### Community 2 - "Firmware de prueba: Pico W + sensor Hall 49E (un eje)"
Cohesion: 0.22
Nodes (9): 1. Archivos, 2. Conexiones, 3. Origen y límites, 4. Cómo llega el campo al servidor (`UNIDAD_ENVIO`), 5. Conexión con el servidor (la laptop), 6. Primera prueba, paso a paso, 7. Prueba sin servidor (`banco.py`), 8. Pruebas en el PC (+1 more)

### Community 3 - "configuracion.js"
Cohesion: 0.23
Nodes (12): actualizar(), cache, cargar(), copia(), mezclarSensor(), obtenerTodo(), POR_DEFECTO, CLAVES (+4 more)

### Community 4 - "server/package.json"
Cohesion: 0.11
Nodes (21): cors, dotenv, express, mysql2, nodemon, corsMiddleware, origenes, dependencies (+13 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.06
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "validacionConfiguracion.js"
Cohesion: 0.10
Nodes (27): BLOQUEADAS_CON_SESION, barridoActual(), validarNuevaSesion(), erroresDePaso(), erroresDeZona(), MAX_PUNTOS_SESION, MEDIOS, PASO_MAX_MM (+19 more)

### Community 7 - "apiFetch"
Cohesion: 0.26
Nodes (18): apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES, SeccionUsuarios() (+10 more)

### Community 8 - "conversionSensor.js"
Cohesion: 0.10
Nodes (30): clasificarLote(), convertirCrudo(), CRUDO_MAX, CRUDO_MIN, crudoValido(), cuentasPorGauss(), DESBORDE, EJES (+22 more)

### Community 9 - "4. Conexiones"
Cohesion: 0.22
Nodes (9): 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600, 4.5 Magnetómetro QMC5883P → Pico W, 4.6 Finales de carrera (opcionales; hoy no están instalados), 4.7 Alimentación de la Pico, 4.8 Revisión antes de encender (+1 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.20
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 14 - "auth.controller.js"
Cohesion: 0.06
Nodes (73): ROLES, TEMAS, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico() (+65 more)

### Community 15 - "mediciones.controller.js"
Cohesion: 0.06
Nodes (44): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+36 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.16
Nodes (15): Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Latido POST /api/dispositivo/latido, Mesa cartesiana XY (NEMA 17, husillos T8), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271) (+7 more)

### Community 18 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.13
Nodes (15): API REST actual (roles público/sesión/op/admin), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), config/roles.js (ROLES y TEMAS), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Geometría derivada del paso (grid_n, z_levels, puntos), Malla de medición (60×60 mm, planos Z 0–20 mm), middleware/auth.js (requiereLogin, requiereRol), Roles admin / operador / observador (+7 more)

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.12
Nodes (18): Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi, Pasos 3–7 — Dependencias, backend (4000), frontend (5173) y dashboard, Migraciones para bases de versiones anteriores (001, 002, 003), Problemas comunes (+10 more)

### Community 20 - "Códigos HTTP 400/401/403/404/409/422"
Cohesion: 0.15
Nodes (8): Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), Fase 1: Base del backend (hecha), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Migración 001 (sesiones hora local a UTC, no ejecutada), server/server.js (entrada Express), Características principales (3-DOF, telemetría distribuida, integridad, MVC)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.25
Nodes (7): 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 5. Hora: NTP al arrancar, 6. Encontrar el servidor en el hotspot del iPhone, 8. Probar sin hardware, Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS, settime()

### Community 22 - "Superficie3D.jsx"
Cohesion: 0.32
Nodes (7): FIGURAS, ICONO_SVG, MAGNITUDES, Plot, RDBU, Superficie3D, useLimitado()

### Community 23 - "setup_test_db.sql"
Cohesion: 0.28
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 24 - "Accesibilidad e index.html"
Cohesion: 0.24
Nodes (10): Colores del modo oscuro (:root en global.css), Fase 7: Accesibilidad y diseño (pendiente), styles/global.css, Tema claro (tokens, data-theme, data-bs-theme), Prompt Fase 7 — Accesibilidad y diseño con web-design-guidelines y frontend-design, Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…), html lang=es data-bs-theme=dark, frontend/index.html (punto de entrada de Vite) (+2 more)

### Community 25 - "firmware_hall_1d/banco.py"
Cohesion: 0.32
Nodes (11): apagar(), cero(), _correr(), hall(), ir(), _leer(), _m(), origen() (+3 more)

### Community 26 - "Tablas de usuarios (migración 002)"
Cohesion: 0.70
Nodes (4): idx_sesiones_login_expira, idx_sesiones_login_usuario, sesiones_login, usuarios

### Community 29 - "003_configuracion.sql"
Cohesion: 0.40
Nodes (3): configuracion, idx_sesiones_filtros, idx_sesiones_iniciada

### Community 31 - "Sensor HMC5883L (magnetómetro AMR triaxial I2C)"
Cohesion: 0.14
Nodes (18): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), StartModal.jsx · StopModal.jsx, Parámetros de cada medición: velocidad, paso, medio (7.0) (+10 more)

### Community 34 - "medicion_campo_qmc5883p.py"
Cohesion: 0.18
Nodes (7): iniciar(), leer_cuentas(), leer_uT(), medir_fondo(), calibrar_cero(), leer_voltios(), principal()

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.17
Nodes (26): StartModal, CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones(), TiempoEstimado(), tiempoAproximado(), EditorNotas() (+18 more)

### Community 39 - "firmware/barrido.py"
Cohesion: 0.08
Nodes (22): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, indices(), inicio_de(), lecturas_por_punto() (+14 more)

### Community 41 - "firmware_hall_1d/red.py"
Cohesion: 0.11
Nodes (9): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+1 more)

### Community 42 - "App.jsx"
Cohesion: 0.15
Nodes (21): alPerderSesion(), App(), Shell(), MenuLateral(), NAVEGACION, Navbar, AuthContext, AuthProvider() (+13 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.25
Nodes (12): aTexto(), escribirRuta(), leerRuta(), SeccionFormulario(), AYUDA, DESCRIPCION, SelectorModeloSensor(), useConfig() (+4 more)

### Community 44 - "firmware/red.py"
Cohesion: 0.15
Nodes (12): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+4 more)

### Community 45 - "Fase 5: Datos y trazabilidad (pendiente)"
Cohesion: 0.14
Nodes (18): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller (+10 more)

### Community 46 - "4. El sensor: QMC5883P"
Cohesion: 0.33
Nodes (6): 4.1 Verificar el chip, 4.2 Configuración y rangos, 4.3 Lectura: X, Y, Z, byte bajo primero, 4.4 Cómo llegan las lecturas al servidor, 4.5 Validar los ejes con un imán, 4. El sensor: QMC5883P

### Community 47 - "firmware/motores.py"
Cohesion: 0.21
Nodes (5): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 48 - "Mesa"
Cohesion: 0.15
Nodes (3): _en_paralelo(), ErrorMovimiento, Mesa

### Community 49 - "Pin"
Cohesion: 0.18
Nodes (4): Eje, pedir_mm(), principal(), Pin

### Community 50 - "SesionLogin.js"
Cohesion: 0.18
Nodes (6): Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), Tabla sesiones_login, Tabla usuarios, buscarVigenteConUsuario(), normalizarPreferencias()

### Community 54 - "firmware_hall_1d/main.py"
Cohesion: 0.14
Nodes (6): poner(), apagar(), _bootsel_pulsado(), _correr(), principal(), ErrorSensor

### Community 57 - "machine.py"
Cohesion: 0.17
Nodes (5): _Mem32, reset(), Timer, WDT, 3. Posición de arranque, punto de inicio y límites

### Community 58 - "sesiones.js"
Cohesion: 0.17
Nodes (19): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), obtener(), limitesDeBarrido(), mallaDeZona(), olvidarSesion() (+11 more)

### Community 59 - "simulador.test.js"
Cohesion: 0.17
Nodes (19): 7. Orden del barrido: serpentina, getConfiguracion(), generadorGaussiano(), mulberry32(), campoEnPlaca(), campoEspira(), integralesElipticas(), indiceDeMalla() (+11 more)

### Community 60 - "firmware/main.py"
Cohesion: 0.17
Nodes (6): poner(), apagar(), _bootsel_pulsado(), _correr(), principal(), bootsel_button()

### Community 61 - "emular-pico.js"
Cohesion: 0.28
Nodes (14): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+6 more)

### Community 62 - "dispositivo.routes.js"
Cohesion: 0.33
Nodes (9): generarToken(), getEstado(), latido(), lote(), patchDispositivo(), revocarToken(), soloAdmin, ultimoSeq() (+1 more)

### Community 63 - "ConfigContext.jsx"
Cohesion: 0.18
Nodes (15): aplicarTema(), CLAVE_TEMA, ConfigContext, ConfigProvider(), consulta(), guardarTemaLocal(), leerTemaLocal(), TEMAS (+7 more)

### Community 64 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 65 - "Firmware de la Raspberry Pi Pico W (MicroPython)"
Cohesion: 0.08
Nodes (22): DMA, 10. LED y comportamiento ante fallas, 11. Pruebas en el PC, 12. Límites conocidos, 1. Archivos, 2.1 Pines (cámbialos en `config.py`), 2.2 TB6600, 2.3 Sin finales de carrera (+14 more)

### Community 69 - "database.js"
Cohesion: 0.32
Nodes (4): main(), obtenerPassword(), PREDETERMINADO, preguntarSinEco()

### Community 70 - "api.integ.js"
Cohesion: 0.26
Nodes (8): carpetaServidor, sesionSimulada(), carpetaServidor, cliente(), configurarEntorno(), esperar(), leerCSV(), levantar()

### Community 71 - "6. Procedimiento de calibración"
Cohesion: 0.33
Nodes (6): 6.1 Factor teórico, 6.2 Sentido de cada eje, 6.3 Medir y corregir el factor (un eje a la vez), 6.4 Comprobar, 6.5 Hoja de registro, 6. Procedimiento de calibración

### Community 72 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.10
Nodes (18): controllers/auth.controller.js · usuarios.controller.js, Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Fase 6: Frontend funcional (pendiente), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Límite de intentos de login (5 en 15 min, 429), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router), nginx/tms.conf (proxy inverso, NO TOCAR) (+10 more)

### Community 73 - "app.js"
Cohesion: 0.29
Nodes (10): crearApp(), iniciarServicios(), testConnection(), manejadorErrores(), rutaNoEncontrada(), router, router, arrancar() (+2 more)

### Community 75 - "rp2.py"
Cohesion: 0.20
Nodes (5): _programa_pasos(), _programa_pasos(), asm_pio(), PIO, StateMachine

### Community 76 - "DashboardPage.jsx"
Cohesion: 0.14
Nodes (18): LimiteErrores, instante(), mediana(), ritmoActual(), ritmoHistorico(), useTiempoEstimado(), DashboardPage(), Superficie3D (+10 more)

### Community 77 - "Instructivo: conexiones de los drivers TB6600 y calibración de los ejes"
Cohesion: 0.18
Nodes (11): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 5.1 Preparar Thonny, 5.2 Ajustar el encabezado del programa, 5.3 Cómo funciona, 5. Programa de calibración en Thonny (+3 more)

### Community 78 - "Medicion.js"
Cohesion: 0.11
Nodes (10): insertarLote(), insertarMedicion(), leerJSON(), medicionesComoEventos(), normalizarSesion(), obtenerMedicionesDeSesion(), obtenerSesion(), obtenerSesiones() (+2 more)

### Community 82 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (14): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 2: Login y usuarios (hecha), Fase 8: Tests y despliegue (pendiente) (+6 more)

### Community 83 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, crear-admin, dev, emular-pico, start, test, test:integracion, test:unit

### Community 87 - "firmware_hall_1d/registro.py"
Cohesion: 0.60
Nodes (3): _desfase_epoch(), _hora(), log()

### Community 88 - "Prompts: QMC5883P en el firmware cliente y recorrido en serpentina"
Cohesion: 0.50
Nodes (3): Prompt 1 — Sesión nueva: firmware cliente de la Pico W, Prompt 2 — Sesión ya creada: página web (servidor y frontend), Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

### Community 90 - "Configuracion.js"
Cohesion: 0.38
Nodes (4): faltantes, pool, leerValor(), obtenerTodas()

### Community 93 - "1. Resumen del protocolo"
Cohesion: 0.40
Nodes (5): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1.3 Punto de inicio de la medición (desde el 2026-11-13), 1. Resumen del protocolo

### Community 95 - "Canvas3D.jsx"
Cohesion: 0.17
Nodes (17): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, DataTable, leerTokens(), NOMBRES (+9 more)

### Community 96 - "firmware_hall_1d/motores.py"
Cohesion: 0.19
Nodes (6): codificar(), _en_paralelo(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 97 - "Limites"
Cohesion: 0.11
Nodes (5): correr(), Limites, mover(), Malla, sesion()

### Community 101 - "Dispositivo.js"
Cohesion: 0.38
Nodes (3): buscarPorTokenHash(), normalizar(), obtenerPrincipal()

### Community 102 - "QMC5883P"
Cohesion: 0.08
Nodes (18): 6. En el firmware cliente (`firmware/`): hecho el 2026-11-12, En el servidor y la página: hecho el 2026-11-12 (opción **b**), apagar(), arranque(), _correr(), fondo(), ir(), _m() (+10 more)

### Community 103 - "Magnetómetro QMC5883P con la Raspberry Pi Pico W"
Cohesion: 0.25
Nodes (8): 1. Conexión, 2. Registros, 3. Rangos (registro `0x0B`, bits 3–2), 4. Medición, 5. Aplicación, 7. Problemas comunes, Diferencias con el HMC5883L (lo que daba por hecho el firmware viejo), Magnetómetro QMC5883P con la Raspberry Pi Pico W

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)`, `Tabla dispositivos (Fase 4)`, `config/roles.js (ROLES y TEMAS)`, `hooks/useServerStatus.js (/api/status cada 15 s)` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 544 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `7. Orden del barrido: serpentina` connect `simulador.test.js` to `Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS`, `Canvas3D.jsx`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `QMC5883P` (e.g. with `1.2 Lote de mediciones` and `6. En el firmware cliente (`firmware/`): hecho el 2026-11-12`) actually correct?**
  _`QMC5883P` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)`, `Tabla dispositivos (Fase 4)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1067193675889328 - nodes in this community are weakly interconnected._
- **Why does `indiceEnMalla()` connect `Canvas3D.jsx` to `simulador.test.js`, `HistorialPage.jsx`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Should `Dependencias del frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._