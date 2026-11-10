# Graph Report - PT  (2026-11-10)

## Corpus Check
- 127 files · ~93,037 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .service 1, .css 1)

## Summary
- 1171 nodes · 2554 edges · 67 communities (49 shown, 18 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 147 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a72b1615`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formato.js
- Usuario.js
- mediciones.controller.js
- Login, cookie y límite de intentos
- Arranque Express y dependencias
- Dependencias del frontend
- sesiones.js
- apiFetch
- emular-pico.js
- banco.py
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- Parámetros de cada medición: velocidad, paso, medio (7.0)
- dev.sh
- Convenciones y arquitectura MVC
- Guía de arranque (COMANDOS.md)
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Estado de las fases (1 a 8)
- Hardware y sensor
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
- Física de espira exacta (K(k), E(k) por AGM)
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
- app.js
- SesionLogin.js
- perfil
- Mesa
- machine.py
- HMC5883L
- api.integ.js
- rp2.py
- Eje
- Geometría derivada del paso (grid_n, z_levels, puntos)
- WLAN
- urequests.py
- ConfiguracionPage.jsx
- crear-admin.js
- scripts
- Pin
- I2C
- database.js
- Dispositivo.js
- react
- StateMachine

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `log()` - 27 edges
3. `Controlador` - 22 edges
4. `obtener()` - 22 edges
5. `apiFetch()` - 20 edges
6. `leerJSON()` - 19 edges
7. `DashboardPage()` - 18 edges
8. `difundir()` - 18 edges
9. `Fase 7 — Revisión de la interfaz y plan de diseño` - 18 edges
10. `Mesa` - 17 edges

## Surprising Connections (you probably didn't know these)
- `7. Orden del barrido` --references--> `lecturas_por_punto()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/barrido.py
- `9. Pruebas en el PC` --references--> `Controlador`  [INFERRED]
  firmware/README.md → firmware/main.py
- `5. Hora: NTP al arrancar` --references--> `settime()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/pruebas_pc/stubs/ntptime.py
- `5.2 Sentido de los ejes y homing` --references--> `homing()`  [INFERRED]
  firmware/README.md → firmware/banco.py
- `5.3 Pasos por milímetro` --references--> `homing()`  [INFERRED]
  firmware/README.md → firmware/banco.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (67 total, 18 thin omitted)

### Community 0 - "formato.js"
Cohesion: 0.15
Nodes (22): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+14 more)

### Community 1 - "Usuario.js"
Cohesion: 0.18
Nodes (6): buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId(), buscarPorUsuario(), listar(), normalizar()

### Community 2 - "mediciones.controller.js"
Cohesion: 0.06
Nodes (47): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+39 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.07
Nodes (71): ROLES, TEMAS, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico() (+63 more)

### Community 4 - "Arranque Express y dependencias"
Cohesion: 0.13
Nodes (19): cors, dotenv, express, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5 (+11 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.07
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "sesiones.js"
Cohesion: 0.05
Nodes (78): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), generarToken() (+70 more)

### Community 7 - "apiFetch"
Cohesion: 0.18
Nodes (25): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES (+17 more)

### Community 8 - "emular-pico.js"
Cohesion: 0.07
Nodes (42): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+34 more)

### Community 9 - "banco.py"
Cohesion: 0.09
Nodes (35): apagar(), centro(), _correr(), homing(), ir(), _m(), mover(), pasos() (+27 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.17
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 12 - "Parámetros de cada medición: velocidad, paso, medio (7.0)"
Cohesion: 0.18
Nodes (14): ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), StartModal.jsx · StopModal.jsx, Parámetros de cada medición: velocidad, paso, medio (7.0), Recorrido de una medición (desde la Fase 3), Saturación inyectada (prob_saturacion), services/ingesta.js (registrarMedicion: valida, |B|, inserta, difunde) (+6 more)

### Community 14 - "Convenciones y arquitectura MVC"
Cohesion: 0.15
Nodes (9): API REST actual (roles público/sesión/op/admin), Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), Fase 1: Base del backend (hecha), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Migración 001 (sesiones hora local a UTC, no ejecutada), server/server.js (entrada Express) (+1 more)

### Community 15 - "Guía de arranque (COMANDOS.md)"
Cohesion: 0.09
Nodes (20): nginx/tms.conf (proxy inverso, NO TOCAR), Stack: React 18 + Vite 5, Node 20 + Express 4 + mysql2, MariaDB, Chart.js/Three.js/Plotly, Bootstrap 5, Vulnerabilidades restantes (nodemon, esbuild/vite, plotly.js → maplibre-gl), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi, Pasos 3–7 — Dependencias, backend (4000), frontend (5173) y dashboard (+12 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.29
Nodes (8): Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js), Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython, Prompt Fase 4 — Pico W como cliente del servidor

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (14): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 2: Login y usuarios (hecha), Fase 8: Tests y despliegue (pendiente) (+6 more)

### Community 19 - "Hardware y sensor"
Cohesion: 0.14
Nodes (14): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271) (+6 more)

### Community 20 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.18
Nodes (9): controllers/auth.controller.js · usuarios.controller.js, config/roles.js (ROLES y TEMAS), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Límite de intentos de login (5 en 15 min, 429), middleware/auth.js (requiereLogin, requiereRol), Roles admin / operador / observador, services/limiteIntentos.js (5 fallos en 15 min), services/sesionUsuario.js (token, SHA-256, cookie tms_sesion) (+1 more)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.11
Nodes (17): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip con un escaneo I2C, 4.2 Configuración (+9 more)

### Community 22 - "Fase 6: frontend (docs)"
Cohesion: 0.22
Nodes (8): Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Fase 6: Frontend funcional (pendiente), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router), services/passwords.js (scrypt), plotly.js-gl3d-dist-min (variante aprobada de Plotly), Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas, Hook useStream (un único EventSource compartido)

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

### Community 31 - "Física de espira exacta (K(k), E(k) por AGM)"
Cohesion: 0.13
Nodes (19): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller (+11 more)

### Community 34 - "main.py"
Cohesion: 0.14
Nodes (4): poner(), _bootsel_pulsado(), principal(), activo()

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.19
Nodes (24): ModalConfirmacion, StartModal, CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones(), HistorialPage(), pasoValido() (+16 more)

### Community 38 - "log"
Cohesion: 0.14
Nodes (13): latido(), post(), _homing_eje(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion() (+5 more)

### Community 39 - "barrido.py"
Cohesion: 0.16
Nodes (11): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto(), reanudar_en() (+3 more)

### Community 40 - "Bufer"
Cohesion: 0.11
Nodes (4): Progreso, Bufer, Enviador, Bufer

### Community 42 - "App.jsx"
Cohesion: 0.22
Nodes (13): App(), Shell(), MenuLateral(), NAVEGACION, Navbar, useAuth(), leer(), SECCIONES (+5 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.18
Nodes (15): aplicarTema(), CLAVE_TEMA, ConfigContext, ConfigProvider(), consulta(), guardarTemaLocal(), leerTemaLocal(), TEMAS (+7 more)

### Community 44 - "DashboardPage.jsx"
Cohesion: 0.20
Nodes (10): LimiteErrores, DashboardPage(), Superficie3D, useSegundos(), leerMM(), leerPaso(), leerZona(), limitesDeBarrido() (+2 more)

### Community 45 - "app.js"
Cohesion: 0.24
Nodes (11): crearApp(), iniciarServicios(), testConnection(), corsMiddleware, origenes, manejadorErrores(), rutaNoEncontrada(), router (+3 more)

### Community 46 - "SesionLogin.js"
Cohesion: 0.18
Nodes (6): Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), Tabla sesiones_login, Tabla usuarios, buscarVigenteConUsuario(), normalizarPreferencias()

### Community 47 - "perfil"
Cohesion: 0.21
Nodes (4): codificar(), pasos_hechos(), perfil(), Perfil

### Community 49 - "machine.py"
Cohesion: 0.15
Nodes (4): _Mem32, reset(), Timer, WDT

### Community 51 - "api.integ.js"
Cohesion: 0.26
Nodes (8): carpetaServidor, sesionSimulada(), carpetaServidor, cliente(), configurarEntorno(), esperar(), leerCSV(), levantar()

### Community 52 - "rp2.py"
Cohesion: 0.18
Nodes (5): _programa_pasos(), asm_pio(), DMA, PIO, 3. Instalar MicroPython

### Community 54 - "Geometría derivada del paso (grid_n, z_levels, puntos)"
Cohesion: 0.22
Nodes (9): config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), Geometría derivada del paso (grid_n, z_levels, puntos), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Malla de medición (60×60 mm, planos Z 0–20 mm), services/configuracion.js (caché en memoria + SSE), hooks/useAcquisition.js (sin simulación: configuración, SSE, iniciar/detener), utils/geometria.js (mallaDePaso, mismo cálculo que el servidor), Paso 9 — Prueba completa del Dashboard (+1 more)

### Community 57 - "ConfiguracionPage.jsx"
Cohesion: 0.44
Nodes (7): aTexto(), escribirRuta(), leerRuta(), SeccionFormulario(), useConfig(), ConfiguracionPage(), SECCIONES

### Community 58 - "crear-admin.js"
Cohesion: 0.32
Nodes (4): main(), obtenerPassword(), PREDETERMINADO, preguntarSinEco()

### Community 59 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, crear-admin, dev, emular-pico, start, test, test:integracion, test:unit

### Community 62 - "database.js"
Cohesion: 0.38
Nodes (4): faltantes, pool, leerValor(), obtenerTodas()

### Community 63 - "Dispositivo.js"
Cohesion: 0.38
Nodes (3): buscarPorTokenHash(), normalizar(), obtenerPrincipal()

### Community 64 - "react"
Cohesion: 0.67
Nodes (3): StopModal, useModalBootstrap(), react

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `StartModal.jsx · StopModal.jsx`, `config/database.js (pool mysql2 en UTC)`, `config/roles.js (ROLES y TEMAS)`, `middleware/errores.js (404 y errores en JSON)`, `middleware/validar.js (validadores → req.<algo>, 400/422)` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 346 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Raspberry Pi Pico W (RP2040)` connect `Hardware y sensor` to `Fase 4: Pico W (docs)`, `Guía de arranque (COMANDOS.md)`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Controlador` (e.g. with `Mesa` and `Pin`) actually correct?**
  _`Controlador` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StartModal.jsx · StopModal.jsx`, `config/database.js (pool mysql2 en UTC)`, `config/roles.js (ROLES y TEMAS)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mediciones.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05827505827505827 - nodes in this community are weakly interconnected._
- **Why does `Estado de las fases (1 a 8)` connect `Estado de las fases (1 a 8)` to `Parámetros de cada medición: velocidad, paso, medio (7.0)`, `Convenciones y arquitectura MVC`, `Fase 4: Pico W (docs)`, `Fase 6: frontend (docs)`, `Accesibilidad e index.html`, `Física de espira exacta (K(k), E(k) por AGM)`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Login, cookie y límite de intentos` be split into smaller, more focused modules?**
  _Cohesion score 0.06597819850831899 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._