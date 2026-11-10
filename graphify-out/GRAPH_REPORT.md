# Graph Report - PT  (2026-11-10)

## Corpus Check
- 107 files · ~81,477 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .service 1, .css 1)

## Summary
- 903 nodes · 2024 edges · 36 communities (28 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c63c8e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DashboardPage.jsx
- Modelos SQL y acceso admin
- mediciones.controller.js
- Login, cookie y límite de intentos
- Arranque Express y dependencias
- Dependencias del frontend
- sesiones.js
- react
- emular-pico.js
- validar.js
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
- idx_sesiones_eliminada

## God Nodes (most connected - your core abstractions)
1. `react` - 34 edges
2. `obtener()` - 22 edges
3. `apiFetch()` - 20 edges
4. `leerJSON()` - 19 edges
5. `DashboardPage()` - 18 edges
6. `difundir()` - 18 edges
7. `Fase 7 — Revisión de la interfaz y plan de diseño` - 18 edges
8. `rechazar()` - 16 edges
9. `numero()` - 16 edges
10. `enviarJSON()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython` --references--> `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`  [EXTRACTED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Ajustes de las gráficas (LineChart, Superficie3D, Canvas3D, KpiCards, DataTable)` --references--> `Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial)`  [INFERRED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Prompt Fase 3 — Configuración, modos y simulador en el servidor` --references--> `Física de espira exacta (K(k), E(k) por AGM)`  [EXTRACTED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Prompt Fase 5 — Datos y trazabilidad` --references--> `Fase 5: Datos y trazabilidad (pendiente)`  [EXTRACTED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Unit de systemd deploy/tms-server.service` --conceptually_related_to--> `Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx)`  [INFERRED]
  docs/prompts-sesiones.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (36 total, 8 thin omitted)

### Community 0 - "DashboardPage.jsx"
Cohesion: 0.08
Nodes (59): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+51 more)

### Community 1 - "Modelos SQL y acceso admin"
Cohesion: 0.05
Nodes (27): faltantes, pool, leerValor(), obtenerTodas(), buscarPorTokenHash(), normalizar(), obtenerPrincipal(), buscarVigenteConUsuario() (+19 more)

### Community 2 - "mediciones.controller.js"
Cohesion: 0.06
Nodes (47): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+39 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.09
Nodes (46): express, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico(), yo() (+38 more)

### Community 4 - "Arranque Express y dependencias"
Cohesion: 0.09
Nodes (26): cors, dotenv, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5, express@^4.19.2 (+18 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.06
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "sesiones.js"
Cohesion: 0.07
Nodes (61): crearApp(), iniciarServicios(), barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), testConnection(), generarToken() (+53 more)

### Community 7 - "react"
Cohesion: 0.07
Nodes (60): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), App(), Shell(), SeccionDispositivo(), aTexto() (+52 more)

### Community 8 - "emular-pico.js"
Cohesion: 0.07
Nodes (45): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+37 more)

### Community 9 - "validar.js"
Cohesion: 0.07
Nodes (51): ROLES, TEMAS, BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), barridoActual(), esEnteroPositivo(), esObjeto() (+43 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.13
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 12 - "Parámetros de cada medición: velocidad, paso, medio (7.0)"
Cohesion: 0.10
Nodes (25): config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Geometría derivada del paso (grid_n, z_levels, puntos), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), HistorialPage.jsx (filtros; CSV en el navegador), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), Malla de medición (60×60 mm, planos Z 0–20 mm) (+17 more)

### Community 14 - "Convenciones y arquitectura MVC"
Cohesion: 0.17
Nodes (9): API REST actual (roles público/sesión/op/admin), Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), config/roles.js (ROLES y TEMAS), middleware/auth.js (requiereLogin, requiereRol), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Roles admin / operador / observador (+1 more)

### Community 15 - "Guía de arranque (COMANDOS.md)"
Cohesion: 0.10
Nodes (21): Raspberry Pi Pico W (RP2040), Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Red por hotspot de iPhone (varios observadores), SAVD / TMS (sistema de adquisición y visualización), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi (+13 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.29
Nodes (8): Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js), Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython, Prompt Fase 4 — Pico W como cliente del servidor

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.12
Nodes (15): Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 1: Base del backend (hecha), Fase 8: Tests y despliegue (pendiente), Hooks de git que reconstruyen el grafo (solo código), Reglas de graphify (query/path/explain, GRAPH_REPORT primero) (+7 more)

### Community 19 - "Hardware y sensor"
Cohesion: 0.24
Nodes (9): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), QMC5883L (chip alternativo en módulos GY-271), services/validacionConfiguracion.js (reglas por clave, limiteSensorUT) (+1 more)

### Community 20 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.11
Nodes (16): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), controllers/auth.controller.js · usuarios.controller.js, Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Fase 2: Login y usuarios (hecha), frontend App.jsx (login / cambio forzado / Dashboard), Límite de intentos de login (5 en 15 min, 429), Migración 002 (usuarios y sesiones_login) (+8 more)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.12
Nodes (16): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip con un escaneo I2C, 4.2 Configuración (+8 more)

### Community 22 - "Fase 6: frontend (docs)"
Cohesion: 0.20
Nodes (9): Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Fase 6: Frontend funcional (pendiente), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router), services/passwords.js (scrypt), Ajustes de las gráficas (LineChart, Superficie3D, Canvas3D, KpiCards, DataTable), plotly.js-gl3d-dist-min (variante aprobada de Plotly), Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas (+1 more)

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
Nodes (16): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller, Semilla reproducible del simulador (+8 more)

## Ambiguous Edges - Review These
- `Raspberry Pi Pico 2W (C++ / MicroPython)` → `Raspberry Pi Pico W (RP2040)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `Borrado lógico de sesiones (eliminada_en, restaurar)`, `Prompt Fase 5 — Datos y trazabilidad`, `config/database.js (pool mysql2 en UTC)`, `middleware/errores.js (404 y errores en JSON)`, `middleware/validar.js (validadores → req.<algo>, 400/422)` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 252 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Estado de las fases (1 a 8)` connect `Estado de las fases (1 a 8)` to `Parámetros de cada medición: velocidad, paso, medio (7.0)`, `Fase 4: Pico W (docs)`, `Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)`, `Fase 6: frontend (docs)`, `Accesibilidad e index.html`, `Física de espira exacta (K(k), E(k) por AGM)`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `Borrado lógico de sesiones (eliminada_en, restaurar)`, `Prompt Fase 5 — Datos y trazabilidad`, `config/database.js (pool mysql2 en UTC)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DashboardPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0762739370334307 - nodes in this community are weakly interconnected._
- **Why does `Latido POST /api/dispositivo/latido` connect `Fase 4: Pico W (docs)` to `emular-pico.js`, `Parámetros de cada medición: velocidad, paso, medio (7.0)`, `Guía de arranque (COMANDOS.md)`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Modelos SQL y acceso admin` be split into smaller, more focused modules?**
  _Cohesion score 0.05384150030248034 - nodes in this community are weakly interconnected._
- **Why does `services/sesiones.js (una sola sesión abierta, cola de promesas)` connect `Parámetros de cada medición: velocidad, paso, medio (7.0)` to `mediciones.controller.js`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico 2W (C++ / MicroPython)` and `Raspberry Pi Pico W (RP2040)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._