# Graph Report - PT  (2026-11-11)

## Corpus Check
- 130 files · ~100,020 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .service 1, .css 1)

## Summary
- 1221 nodes · 2629 edges · 69 communities (52 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 152 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2a53367`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formato.js
- Usuario.js
- banco.py
- Login, cookie y límite de intentos
- server/package.json
- Dependencias del frontend
- services/geometria.js
- apiFetch
- emular-pico.js
- Firmware de la Raspberry Pi Pico W (MicroPython)
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- Física de espira exacta (K(k), E(k) por AGM)
- dev.sh
- API REST actual (roles público/sesión/op/admin)
- app.js
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Estado de las fases (1 a 8)
- SAVD / TMS (sistema de adquisición y visualización)
- Restricciones del usuario (obligatorias)
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
- ingesta.js
- Eje
- Eje
- Mesa
- Pin
- HMC5883L
- rp2.py
- 4. Conexiones
- dispositivo.routes.js
- validacionConfiguracion.js
- WLAN
- prueba_logica.py
- machine.py
- mediciones.controller.js
- Pin
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- sesiones.js
- useSesionActiva.js
- dispositivo.js
- I2C
- DMA
- Sensor HMC5883L (magnetómetro AMR triaxial I2C)

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `log()` - 27 edges
3. `Controlador` - 24 edges
4. `obtener()` - 22 edges
5. `apiFetch()` - 20 edges
6. `leerJSON()` - 19 edges
7. `DashboardPage()` - 18 edges
8. `difundir()` - 18 edges
9. `Fase 7 — Revisión de la interfaz y plan de diseño` - 18 edges
10. `Mesa` - 16 edges

## Surprising Connections (you probably didn't know these)
- `4.5 Sensor HMC5883L (GY-271) → Pico W` --references--> `sensor()`  [INFERRED]
  docs/instructivo-calibracion-y-conexiones.md → firmware/banco.py
- `7. Orden del barrido` --references--> `lecturas_por_punto()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/barrido.py
- `5.3 Pasos por milímetro` --references--> `homing()`  [INFERRED]
  firmware/README.md → firmware/banco.py
- `9. Pruebas en el PC` --references--> `Controlador`  [INFERRED]
  firmware/README.md → firmware/main.py
- `5. Hora: NTP al arrancar` --references--> `settime()`  [INFERRED]
  docs/firmware-pico-w.md → firmware/pruebas_pc/stubs/ntptime.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (69 total, 17 thin omitted)

### Community 0 - "formato.js"
Cohesion: 0.17
Nodes (19): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+11 more)

### Community 1 - "Usuario.js"
Cohesion: 0.06
Nodes (23): Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), Tabla sesiones_login, Tabla usuarios, faltantes, pool, leerValor(), obtenerTodas() (+15 more)

### Community 2 - "banco.py"
Cohesion: 0.27
Nodes (15): apagar(), centro(), _correr(), homing(), ir(), _m(), mover(), pasos() (+7 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.06
Nodes (72): ROLES, TEMAS, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico() (+64 more)

### Community 4 - "server/package.json"
Cohesion: 0.08
Nodes (27): cors, dotenv, express, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5 (+19 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.07
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "services/geometria.js"
Cohesion: 0.17
Nodes (18): BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), barridoActual(), validarNuevaSesion(), erroresDePaso(), erroresDeZona(), mallaDeBarrido() (+10 more)

### Community 7 - "apiFetch"
Cohesion: 0.24
Nodes (19): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES (+11 more)

### Community 8 - "emular-pico.js"
Cohesion: 0.05
Nodes (51): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+43 more)

### Community 9 - "Firmware de la Raspberry Pi Pico W (MicroPython)"
Cohesion: 0.10
Nodes (20): 10. Límites conocidos, 1. Archivos, 2.1 Pines por defecto (cámbialos en `config.py`), 2.2 TB6600, 2.3 Finales de carrera, 2. Cableado, 4. Cargar los archivos, 5.1 Sensor (+12 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.20
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 12 - "Física de espira exacta (K(k), E(k) por AGM)"
Cohesion: 0.25
Nodes (9): Física de espira exacta (K(k), E(k) por AGM), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller, Semilla reproducible del simulador, Servicios puros: simulacionPura, fisicaEspira, aleatorio, geometria, Standoff de 5 mm (bobina–sensor), tests/simulador.test.js (node --test, 10 pruebas), Cómo ejecutar y verificar (curl, navegador, npm test) (+1 more)

### Community 14 - "API REST actual (roles público/sesión/op/admin)"
Cohesion: 0.13
Nodes (16): API REST actual (roles público/sesión/op/admin), Códigos HTTP 400/401/403/404/409/422, config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), Geometría derivada del paso (grid_n, z_levels, puntos), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Malla de medición (60×60 mm, planos Z 0–20 mm), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422) (+8 more)

### Community 15 - "app.js"
Cohesion: 0.26
Nodes (10): crearApp(), iniciarServicios(), testConnection(), corsMiddleware, origenes, manejadorErrores(), rutaNoEncontrada(), router (+2 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.29
Nodes (8): Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js), Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython, Prompt Fase 4 — Pico W como cliente del servidor

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (14): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 2: Login y usuarios (hecha), Fase 8: Tests y despliegue (pendiente) (+6 more)

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.09
Nodes (24): Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271), Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Red por hotspot de iPhone (varios observadores), SAVD / TMS (sistema de adquisición y visualización), Paso 2b — Crear el usuario administrador (npm run crear-admin) (+16 more)

### Community 20 - "Restricciones del usuario (obligatorias)"
Cohesion: 0.12
Nodes (10): config/database.js (pool mysql2 en UTC), Fase 1: Base del backend (hecha), Límite de intentos de login (5 en 15 min, 429), Migración 001 (sesiones hora local a UTC, no ejecutada), nginx/tms.conf (proxy inverso, NO TOCAR), server/server.js (entrada Express), services/limiteIntentos.js (5 fallos en 15 min), Stack: React 18 + Vite 5, Node 20 + Express 4 + mysql2, MariaDB, Chart.js/Three.js/Plotly, Bootstrap 5 (+2 more)

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
Cohesion: 0.16
Nodes (15): Borrado lógico de sesiones (eliminada_en, restaurar), ControlPanel.jsx (velocidad, paso, medio), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), StartModal.jsx · StopModal.jsx, Parámetros de cada medición: velocidad, paso, medio (7.0) (+7 more)

### Community 34 - "main.py"
Cohesion: 0.19
Nodes (5): poner(), _bootsel_pulsado(), principal(), _desfase_epoch(), _hora()

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.16
Nodes (28): StartModal, CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones(), KpiCards, EditorNotas(), HistorialPage() (+20 more)

### Community 38 - "log"
Cohesion: 0.16
Nodes (9): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+1 more)

### Community 39 - "barrido.py"
Cohesion: 0.16
Nodes (11): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto(), reanudar_en() (+3 more)

### Community 40 - "Bufer"
Cohesion: 0.11
Nodes (4): Progreso, Bufer, Enviador, Bufer

### Community 41 - "Controlador"
Cohesion: 0.17
Nodes (3): Controlador, _en_paralelo(), log()

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
Cohesion: 0.25
Nodes (15): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), obtener(), erroresDePosicion(), indicePlano(), ErrorIngesta (+7 more)

### Community 47 - "Eje"
Cohesion: 0.20
Nodes (7): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para(), activo(), Perfil

### Community 49 - "Pin"
Cohesion: 0.24
Nodes (3): Eje, pedir_mm(), principal()

### Community 51 - "rp2.py"
Cohesion: 0.20
Nodes (4): _programa_pasos(), asm_pio(), PIO, StateMachine

### Community 52 - "4. Conexiones"
Cohesion: 0.08
Nodes (26): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600 (+18 more)

### Community 53 - "dispositivo.routes.js"
Cohesion: 0.39
Nodes (7): generarToken(), getEstado(), latido(), lote(), patchDispositivo(), revocarToken(), soloAdmin

### Community 54 - "validacionConfiguracion.js"
Cohesion: 0.15
Nodes (18): actualizar(), cache, cargar(), copia(), obtenerTodo(), POR_DEFECTO, CLAVES, CUENTAS_MAXIMAS (+10 more)

### Community 56 - "prueba_logica.py"
Cohesion: 0.11
Nodes (4): _homing_eje(), reset(), post(), Respuesta

### Community 57 - "machine.py"
Cohesion: 0.13
Nodes (7): a_ut(), leer(), principal(), texto(), _Mem32, Timer, WDT

### Community 58 - "mediciones.controller.js"
Cohesion: 0.06
Nodes (48): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+40 more)

### Community 61 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.25
Nodes (7): controllers/auth.controller.js · usuarios.controller.js, config/roles.js (ROLES y TEMAS), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), middleware/auth.js (requiereLogin, requiereRol), Roles admin / operador / observador, services/sesionUsuario.js (token, SHA-256, cookie tms_sesion), Token Bearer del dispositivo (SHA-256, mostrado una vez)

### Community 62 - "sesiones.js"
Cohesion: 0.29
Nodes (10): limitesDeBarrido(), olvidarSesion(), cola, conGeometria(), enCola(), ErrorSesion, finalizar(), inicializar() (+2 more)

### Community 63 - "useSesionActiva.js"
Cohesion: 0.29
Nodes (10): claveDe(), porSeq(), useSesionActiva(), abrir(), alConectar, cerrar(), EVENTOS, suscriptores (+2 more)

### Community 64 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 68 - "Sensor HMC5883L (magnetómetro AMR triaxial I2C)"
Cohesion: 0.21
Nodes (13): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), Recorrido de una medición (desde la Fase 3), Saturación inyectada (prob_saturacion) (+5 more)

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `Standoff de 5 mm (bobina–sensor)`, `Cómo ejecutar y verificar (curl, navegador, npm test)`, `config/database.js (pool mysql2 en UTC)`, `config/roles.js (ROLES y TEMAS)`, `middleware/errores.js (404 y errores en JSON)` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Raspberry Pi Pico W (RP2040)` connect `SAVD / TMS (sistema de adquisición y visualización)` to `Fase 4: Pico W (docs)`, `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Controlador` (e.g. with `ErrorZona` and `Mesa`) actually correct?**
  _`Controlador` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Standoff de 5 mm (bobina–sensor)`, `Cómo ejecutar y verificar (curl, navegador, npm test)`, `config/database.js (pool mysql2 en UTC)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Usuario.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05725490196078432 - nodes in this community are weakly interconnected._
- **Why does `Estado de las fases (1 a 8)` connect `Estado de las fases (1 a 8)` to `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`, `Fase 4: Pico W (docs)`, `Restricciones del usuario (obligatorias)`, `Fase 6: frontend (docs)`, `Accesibilidad e index.html`, `Física de espira exacta (K(k), E(k) por AGM)`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Login, cookie y límite de intentos` be split into smaller, more focused modules?**
  _Cohesion score 0.06470588235294118 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._