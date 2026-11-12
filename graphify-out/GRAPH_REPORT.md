# Graph Report - PT  (2026-11-12)

## Corpus Check
- 148 files · ~116,538 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .service 1, .css 1)

## Summary
- 1447 nodes · 3040 edges · 89 communities (63 shown, 26 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27530e32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formato.js
- database.js
- firmware/banco.py
- Login, cookie y límite de intentos
- server/package.json
- Dependencias del frontend
- validar.js
- apiFetch
- conversionSensor.js
- firmware/banco.py
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- dev.sh
- tiempoReal.js
- app.js
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Estado de las fases (1 a 8)
- SAVD / TMS (sistema de adquisición y visualización)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS
- Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas
- setup_test_db.sql
- Accesibilidad e index.html
- Medicion.js
- Tablas de usuarios (migración 002)
- Prompts de las fases
- 003_configuracion.sql
- 004_dispositivo.sql
- Fase 5: Datos y trazabilidad (pendiente)
- time
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
- Mesa
- Controlador
- Hall49E
- firmware_hall_1d/main.py
- WLAN
- firmware/pruebas_pc/prueba_logica.py
- machine.py
- mediciones.controller.js
- Pin
- simulador.test.js
- sesiones.js
- useSesionActiva.js
- dispositivo.js
- rp2.py
- emular-pico.js
- Sensor HMC5883L (magnetómetro AMR triaxial I2C)
- Usuario.js
- api.integ.js
- trazabilidad.test.js
- Restricciones del usuario (obligatorias)
- Migración 002 (usuarios y sesiones_login)
- firmware_hall_1d/banco.py
- ref_node_assert
- scripts
- database.js
- Dispositivo.js
- firmware_hall_1d/barrido.py
- Eje
- urequests.py
- Bufer
- firmware_hall_1d/pruebas_pc/prueba_logica.py
- SesionLogin.js
- firmware_hall_1d/motores.py
- configuracion.js
- Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `log()` - 27 edges
3. `Controlador` - 23 edges
4. `Controlador` - 22 edges
5. `obtener()` - 22 edges
6. `apiFetch()` - 20 edges
7. `leerJSON()` - 19 edges
8. `Pin` - 18 edges
9. `DashboardPage()` - 18 edges
10. `difundir()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `4.5 Sensor HMC5883L (GY-271) → Pico W` --references--> `sensor()`  [INFERRED]
  docs/instructivo-calibracion-y-conexiones.md → firmware/banco.py
- `6. Pendiente: llevarlo al firmware cliente (`firmware/`)` --references--> `sensor()`  [INFERRED]
  docs/sensor-qmc5883p.md → firmware/banco.py
- `7. Orden del barrido` --references--> `lecturas_por_punto()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/barrido.py
- `5. Hora: NTP al arrancar` --references--> `settime()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/pruebas_pc/stubs/ntptime.py
- `3. Instalar MicroPython` --references--> `DMA`  [INFERRED]
  firmware/README.md → firmware/pruebas_pc/stubs/rp2.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (89 total, 26 thin omitted)

### Community 0 - "formato.js"
Cohesion: 0.15
Nodes (22): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+14 more)

### Community 1 - "database.js"
Cohesion: 0.32
Nodes (4): main(), obtenerPassword(), PREDETERMINADO, preguntarSinEco()

### Community 2 - "firmware/banco.py"
Cohesion: 0.05
Nodes (35): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600 (+27 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.10
Nodes (44): cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico(), yo(), actualizarUsuario() (+36 more)

### Community 4 - "server/package.json"
Cohesion: 0.13
Nodes (19): cors, dotenv, express, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5 (+11 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.06
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "validar.js"
Cohesion: 0.07
Nodes (55): ROLES, TEMAS, BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), barridoActual(), esEnteroPositivo(), esObjeto() (+47 more)

### Community 7 - "apiFetch"
Cohesion: 0.23
Nodes (20): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES (+12 more)

### Community 8 - "conversionSensor.js"
Cohesion: 0.17
Nodes (16): clasificarLote(), convertirCrudo(), CRUDO_MAX, CRUDO_MIN, crudoValido(), DESBORDE, EJES, erroresDePosicion() (+8 more)

### Community 9 - "firmware/banco.py"
Cohesion: 0.07
Nodes (44): 1. Conexión, 2. Registros, 3. Rangos (registro `0x0B`, bits 3–2), 4. Medición, 5. Aplicación, 6. Pendiente: llevarlo al firmware cliente (`firmware/`), 7. Problemas comunes, Diferencias con el HMC5883L (lo que daba por hecho el firmware viejo) (+36 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.06
Nodes (26): Enviador, latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion() (+18 more)

### Community 14 - "tiempoReal.js"
Cohesion: 0.13
Nodes (12): BuferEventos, bufer, clientes, conectar(), difundir(), escribir(), formatear(), MAX_PENDIENTES (+4 more)

### Community 15 - "app.js"
Cohesion: 0.14
Nodes (13): crearApp(), iniciarServicios(), corsMiddleware, origenes, manejadorErrores(), rutaNoEncontrada(), router, arrancar() (+5 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.15
Nodes (13): ControlPanel.jsx (velocidad, paso, medio), Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, StartModal.jsx · StopModal.jsx, Parámetros de cada medición: velocidad, paso, medio (7.0), services/dispositivo.js (estado en línea, event: dispositivo), services/sesiones.js (una sola sesión abierta, cola de promesas) (+5 more)

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (14): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 2: Login y usuarios (hecha), Fase 8: Tests y despliegue (pendiente) (+6 more)

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.10
Nodes (21): Raspberry Pi Pico W (RP2040), Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Red por hotspot de iPhone (varios observadores), SAVD / TMS (sistema de adquisición y visualización), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi (+13 more)

### Community 20 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.11
Nodes (13): API REST actual (roles público/sesión/op/admin), Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), config/roles.js (ROLES y TEMAS), Fase 1: Base del backend (hecha), middleware/auth.js (requiereLogin, requiereRol), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422) (+5 more)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.11
Nodes (17): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip con un escaneo I2C, 4.2 Configuración (+9 more)

### Community 22 - "Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas"
Cohesion: 0.18
Nodes (12): Fase 6: Frontend funcional (pendiente), Geometría derivada del paso (grid_n, z_levels, puntos), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Malla de medición (60×60 mm, planos Z 0–20 mm), Menú lateral (usuario, modo, tema, navegación), hooks/useAcquisition.js (sin simulación: configuración, SSE, iniciar/detener), utils/geometria.js (mallaDePaso, mismo cálculo que el servidor), Paso 9 — Prueba completa del Dashboard (+4 more)

### Community 23 - "setup_test_db.sql"
Cohesion: 0.28
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 24 - "Accesibilidad e index.html"
Cohesion: 0.24
Nodes (10): Colores del modo oscuro (:root en global.css), Fase 7: Accesibilidad y diseño (pendiente), styles/global.css, Tema claro (tokens, data-theme, data-bs-theme), Prompt Fase 7 — Accesibilidad y diseño con web-design-guidelines y frontend-design, Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…), html lang=es data-bs-theme=dark, frontend/index.html (punto de entrada de Vite) (+2 more)

### Community 25 - "Medicion.js"
Cohesion: 0.11
Nodes (10): insertarLote(), insertarMedicion(), leerJSON(), medicionesComoEventos(), normalizarSesion(), obtenerMedicionesDeSesion(), obtenerSesion(), obtenerSesiones() (+2 more)

### Community 26 - "Tablas de usuarios (migración 002)"
Cohesion: 0.70
Nodes (4): idx_sesiones_login_expira, idx_sesiones_login_usuario, sesiones_login, usuarios

### Community 29 - "003_configuracion.sql"
Cohesion: 0.40
Nodes (3): configuracion, idx_sesiones_filtros, idx_sesiones_iniciada

### Community 31 - "Fase 5: Datos y trazabilidad (pendiente)"
Cohesion: 0.13
Nodes (19): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller (+11 more)

### Community 34 - "time"
Cohesion: 0.14
Nodes (11): poner(), _bootsel_pulsado(), principal(), iniciar(), leer_cuentas(), leer_uT(), medir_fondo(), calibrar_cero() (+3 more)

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.18
Nodes (25): StartModal, CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones(), EditorNotas(), HistorialPage(), pasoValido() (+17 more)

### Community 38 - "log"
Cohesion: 0.17
Nodes (12): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+4 more)

### Community 39 - "barrido.py"
Cohesion: 0.16
Nodes (11): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto(), reanudar_en() (+3 more)

### Community 40 - "Bufer"
Cohesion: 0.11
Nodes (4): Progreso, Bufer, Enviador, Bufer

### Community 42 - "App.jsx"
Cohesion: 0.19
Nodes (15): App(), Shell(), MenuLateral(), NAVEGACION, Navbar, useAuth(), leer(), SECCIONES (+7 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.19
Nodes (16): aTexto(), escribirRuta(), leerRuta(), SeccionFormulario(), aplicarTema(), CLAVE_TEMA, ConfigContext, ConfigProvider() (+8 more)

### Community 44 - "DashboardPage.jsx"
Cohesion: 0.17
Nodes (12): ModalConfirmacion, StopModal, useModalBootstrap(), LimiteErrores, DashboardPage(), Superficie3D, useSegundos(), leerMM() (+4 more)

### Community 45 - "ingesta.js"
Cohesion: 0.18
Nodes (21): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), generarToken(), getEstado(), latido(), lote() (+13 more)

### Community 47 - "Eje"
Cohesion: 0.22
Nodes (6): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para(), Perfil

### Community 49 - "Pin"
Cohesion: 0.32
Nodes (3): Eje, pedir_mm(), principal()

### Community 50 - "HMC5883L"
Cohesion: 0.14
Nodes (3): I2C, ErrorSensor, HMC5883L

### Community 51 - "Mesa"
Cohesion: 0.20
Nodes (3): _en_paralelo(), ErrorMovimiento, Mesa

### Community 54 - "firmware_hall_1d/main.py"
Cohesion: 0.14
Nodes (6): poner(), apagar(), _bootsel_pulsado(), _correr(), principal(), bootsel_button()

### Community 57 - "machine.py"
Cohesion: 0.17
Nodes (4): _Mem32, reset(), Timer, WDT

### Community 58 - "mediciones.controller.js"
Cohesion: 0.22
Nodes (16): deleteSesion(), finalizarSesion(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion(), medicionRetirada() (+8 more)

### Community 61 - "simulador.test.js"
Cohesion: 0.24
Nodes (13): generadorGaussiano(), mulberry32(), campoEnPlaca(), campoEspira(), integralesElipticas(), puntoDeMalla(), crearGeneradorMuestras(), FACTOR_SATURACION (+5 more)

### Community 62 - "sesiones.js"
Cohesion: 0.29
Nodes (10): limitesDeBarrido(), olvidarSesion(), cola, conGeometria(), enCola(), ErrorSesion, finalizar(), inicializar() (+2 more)

### Community 63 - "useSesionActiva.js"
Cohesion: 0.29
Nodes (10): claveDe(), porSeq(), useSesionActiva(), abrir(), alConectar, cerrar(), EVENTOS, suscriptores (+2 more)

### Community 64 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 65 - "rp2.py"
Cohesion: 0.13
Nodes (6): _programa_pasos(), asm_pio(), DMA, PIO, StateMachine, 3. Instalar MicroPython

### Community 67 - "emular-pico.js"
Cohesion: 0.22
Nodes (17): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+9 more)

### Community 68 - "Sensor HMC5883L (magnetómetro AMR triaxial I2C)"
Cohesion: 0.13
Nodes (20): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), Mesa cartesiana XY (NEMA 17, husillos T8) (+12 more)

### Community 69 - "Usuario.js"
Cohesion: 0.18
Nodes (6): buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId(), buscarPorUsuario(), listar(), normalizar()

### Community 70 - "api.integ.js"
Cohesion: 0.26
Nodes (8): carpetaServidor, sesionSimulada(), carpetaServidor, cliente(), configurarEntorno(), esperar(), leerCSV(), levantar()

### Community 71 - "trazabilidad.test.js"
Cohesion: 0.23
Nodes (14): getCsv(), indiceDeMalla(), calcularHuecos(), COLUMNAS_CSV, encabezadoCSV(), escaparMeta(), fecha(), lineaCSV() (+6 more)

### Community 72 - "Restricciones del usuario (obligatorias)"
Cohesion: 0.12
Nodes (12): controllers/auth.controller.js · usuarios.controller.js, Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Límite de intentos de login (5 en 15 min, 429), Navegación en la URL con History API (sin react-router), nginx/tms.conf (proxy inverso, NO TOCAR), services/limiteIntentos.js (5 fallos en 15 min), services/passwords.js (scrypt) (+4 more)

### Community 73 - "Migración 002 (usuarios y sesiones_login)"
Cohesion: 0.50
Nodes (4): Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), Tabla sesiones_login, Tabla usuarios

### Community 74 - "firmware_hall_1d/banco.py"
Cohesion: 0.32
Nodes (11): apagar(), cero(), _correr(), hall(), ir(), _leer(), _m(), origen() (+3 more)

### Community 76 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, crear-admin, dev, emular-pico, start, test, test:integracion, test:unit

### Community 77 - "database.js"
Cohesion: 0.32
Nodes (5): faltantes, pool, testConnection(), leerValor(), obtenerTodas()

### Community 78 - "Dispositivo.js"
Cohesion: 0.38
Nodes (3): buscarPorTokenHash(), normalizar(), obtenerPrincipal()

### Community 79 - "firmware_hall_1d/barrido.py"
Cohesion: 0.19
Nodes (9): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto(), reanudar_en() (+1 more)

### Community 86 - "firmware_hall_1d/motores.py"
Cohesion: 0.24
Nodes (5): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 87 - "configuracion.js"
Cohesion: 0.42
Nodes (8): actualizar(), cache, cargar(), copia(), obtenerTodo(), esObjeto(), mezclar(), validarClave()

### Community 88 - "Prompts: QMC5883P en el firmware cliente y recorrido en serpentina"
Cohesion: 0.50
Nodes (3): Prompt 1 — Sesión nueva: firmware cliente de la Pico W, Prompt 2 — Sesión ya creada: página web (servidor y frontend), Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `StartModal.jsx · StopModal.jsx`, `Estado de la Pico W en la barra superior (solo modo real)`, `Tabla dispositivos (Fase 4)`, `api/cliente.js (apiFetch; 401 → login)`, `LoginPage.jsx · CambiarPasswordPage.jsx` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 471 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Raspberry Pi Pico W (RP2040)` connect `SAVD / TMS (sistema de adquisición y visualización)` to `Fase 4: Pico W (docs)`, `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Controlador` (e.g. with `ErrorZona` and `Mesa`) actually correct?**
  _`Controlador` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StartModal.jsx · StopModal.jsx`, `Estado de la Pico W en la barra superior (solo modo real)`, `Tabla dispositivos (Fase 4)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `firmware/banco.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Why does `SAVD / TMS (sistema de adquisición y visualización)` connect `SAVD / TMS (sistema de adquisición y visualización)` to `Estado de las fases (1 a 8)`, `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`, `Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Login, cookie y límite de intentos` be split into smaller, more focused modules?**
  _Cohesion score 0.10062893081761007 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._