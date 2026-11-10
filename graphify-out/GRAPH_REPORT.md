# Graph Report - PT  (2026-11-10)

## Corpus Check
- 67 files · ~45,073 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 551 nodes · 1115 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.85)
- Token cost: 272,804 input · 0 output

## Community Hubs (Navigation)
- Dashboard React y cliente API
- Modelos SQL y acceso admin
- Sesiones, simulador e ingesta
- Login, cookie y límite de intentos
- Arranque Express y dependencias
- Dependencias del frontend
- Configuración del sistema
- Validación y gestión de usuarios
- Física del simulador y tests
- Fase 2: login (docs)
- Esquema SQL y migraciones
- API y geometría del paso (docs)
- Fase 3: parámetros y medición (docs)
- Fase 5: datos y trazabilidad
- Convenciones y arquitectura MVC
- Guía de arranque (COMANDOS.md)
- Restricciones y seguridad (docs)
- Fase 4: Pico W (docs)
- Estado de las fases
- Hardware y sensor
- Nginx, Raspberry y despliegue
- Sensor y configuración (docs)
- Fase 6: frontend (docs)
- Simulador puro y tests (docs)
- Accesibilidad e index.html
- README
- Tablas de usuarios (migración 002)
- Prompts de las fases

## God Nodes (most connected - your core abstractions)
1. `react` - 19 edges
2. `Dashboard()` - 16 edges
3. `obtener()` - 16 edges
4. `rechazar()` - 13 edges
5. `login()` - 11 edges
6. `requiereLogin()` - 11 edges
7. `COMANDOS.md — Guía de arranque TMS v3.0` - 11 edges
8. `apiFetch()` - 10 edges
9. `registrarMedicion()` - 10 edges
10. `cambiarPassword()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython` --references--> `Sensor HMC5883L (magnetómetro AMR triaxial I2C)`  [EXTRACTED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Raspberry Pi Pico 2W (C++ / MicroPython)` --conceptually_related_to--> `Raspberry Pi Pico W (RP2040)`  [AMBIGUOUS]
  README.md → CLAUDE.md
- `Instalación y despliegue local (README)` --semantically_similar_to--> `COMANDOS.md — Guía de arranque TMS v3.0`  [INFERRED] [semantically similar]
  README.md → COMANDOS.md
- `Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…)` --references--> `Colores del modo oscuro (:root en global.css)`  [INFERRED]
  docs/prompts-sesiones.md → CLAUDE.md
- `Prompt Fase 3 — Configuración, modos y simulador en el servidor` --references--> `Física de espira exacta (K(k), E(k) por AGM)`  [EXTRACTED]
  docs/prompts-sesiones.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, claude_emular_pico [EXTRACTED 1.00]

## Communities (29 total, 2 thin omitted)

### Community 0 - "Dashboard React y cliente API"
Cohesion: 0.09
Nodes (47): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), App(), Dashboard(), Canvas3D(), alpha() (+39 more)

### Community 1 - "Modelos SQL y acceso admin"
Cohesion: 0.06
Nodes (16): faltantes, pool, leerValor(), obtenerTodas(), buscarVigenteConUsuario(), buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId() (+8 more)

### Community 2 - "Sesiones, simulador e ingesta"
Cohesion: 0.11
Nodes (33): barridoVigente(), limiteCampoUT(), mallaParaPaso(), tamanoPlacaMM(), createMedicion(), deleteSesion(), finalizarSesion(), getMedicionesDeSesion() (+25 more)

### Community 3 - "Login, cookie y límite de intentos"
Cohesion: 0.12
Nodes (36): cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico(), yo(), leerCookie() (+28 more)

### Community 4 - "Arranque Express y dependencias"
Cohesion: 0.07
Nodes (36): cors, dotenv, express, mysql2, nodemon, testConnection(), corsMiddleware, origenes (+28 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.07
Nodes (35): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, plotly.js@^3.6.0, react@^18.3.1, react-chartjs-2@^5.2.0, react-dom@^18.3.1 (+27 more)

### Community 6 - "Configuración del sistema"
Cohesion: 0.10
Nodes (28): BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), router, actualizar(), cache, cargar(), copia() (+20 more)

### Community 7 - "Validación y gestión de usuarios"
Cohesion: 0.15
Nodes (28): ROLES, TEMAS, actualizarUsuario(), crearUsuario(), listarUsuarios(), restablecerPassword(), esEnteroPositivo(), esNumeroFinito() (+20 more)

### Community 8 - "Física del simulador y tests"
Cohesion: 0.21
Nodes (13): generadorGaussiano(), mulberry32(), campoEnPlaca(), campoEspira(), integralesElipticas(), puntoDeMalla(), crearGeneradorMuestras(), FACTOR_SATURACION (+5 more)

### Community 9 - "Fase 2: login (docs)"
Cohesion: 0.11
Nodes (16): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), controllers/auth.controller.js · usuarios.controller.js, Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Fase 2: Login y usuarios (hecha), frontend App.jsx (login / cambio forzado / Dashboard), Límite de intentos de login (5 en 15 min, 429), Migración 002 (usuarios y sesiones_login) (+8 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.18
Nodes (13): configuracion, idx_sesiones_filtros, idx_sesiones_iniciada, configuracion, idx_mediciones_sesion, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira (+5 more)

### Community 11 - "API y geometría del paso (docs)"
Cohesion: 0.17
Nodes (13): API REST actual (roles público/sesión/op/admin), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), config/roles.js (ROLES y TEMAS), Geometría derivada del paso (grid_n, z_levels, puntos), Malla de medición (60×60 mm, planos Z 0–20 mm), middleware/auth.js (requiereLogin, requiereRol), Roles admin / operador / observador, services/configuracion.js (caché en memoria + SSE) (+5 more)

### Community 12 - "Fase 3: parámetros y medición (docs)"
Cohesion: 0.21
Nodes (12): ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), StartModal.jsx · StopModal.jsx, Parámetros de cada medición: velocidad, paso, medio (7.0), Recorrido de una medición (desde la Fase 3), Saturación inyectada (prob_saturacion), services/ingesta.js (registrarMedicion: valida, |B|, inserta, difunde) (+4 more)

### Community 13 - "Fase 5: datos y trazabilidad"
Cohesion: 0.21
Nodes (12): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Precisión float32 (FLOAT → DOUBLE en Fase 5), Semilla reproducible del simulador (+4 more)

### Community 14 - "Convenciones y arquitectura MVC"
Cohesion: 0.18
Nodes (7): Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), Fase 1: Base del backend (hecha), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Migración 001 (sesiones hora local a UTC, no ejecutada), Características principales (3-DOF, telemetría distribuida, integridad, MVC)

### Community 15 - "Guía de arranque (COMANDOS.md)"
Cohesion: 0.18
Nodes (11): Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi, Pasos 3–7 — Dependencias, backend (4000), frontend (5173) y dashboard, Migraciones para bases de versiones anteriores (001, 002, 003), Problemas comunes (+3 more)

### Community 16 - "Restricciones y seguridad (docs)"
Cohesion: 0.20
Nodes (7): Colores del modo oscuro (:root en global.css), Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), styles/global.css, Navegación en la URL con History API (sin react-router), services/passwords.js (scrypt), Stack: React 18 + Vite 5, Node 20 + Express 4 + mysql2, MariaDB, Chart.js/Three.js/Plotly, Bootstrap 5, Vulnerabilidades restantes (nodemon, esbuild/vite, plotly.js → maplibre-gl)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.22
Nodes (10): scripts/emular-pico.js, Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), firmware/pico_w_cliente_ejemplo.py (MicroPython), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js) (+2 more)

### Community 18 - "Estado de las fases"
Cohesion: 0.25
Nodes (9): Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 7: Accesibilidad y diseño (pendiente), Fase 8: Tests y despliegue (pendiente), Hooks de git que reconstruyen el grafo (solo código), Reglas de graphify (query/path/explain, GRAPH_REPORT primero) (+1 more)

### Community 19 - "Hardware y sensor"
Cohesion: 0.29
Nodes (8): Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), docs/firmware-pico-w.md, Sensor HMC5883L (magnetómetro AMR triaxial I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271), Red por hotspot de iPhone (varios observadores), SAVD / TMS (sistema de adquisición y visualización)

### Community 20 - "Nginx, Raspberry y despliegue"
Cohesion: 0.25
Nodes (6): nginx/tms.conf (proxy inverso, NO TOCAR), Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), server/server.js (entrada Express), Prompt Fase 8 — Tests, documentación y despliegue en la Raspberry Pi 5, Unit de systemd deploy/tms-server.service, Tests de integración contra tms_db_test

### Community 21 - "Sensor y configuración (docs)"
Cohesion: 0.38
Nodes (5): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), services/validacionConfiguracion.js (reglas por clave, limiteSensorUT), Tabla configuracion (clave, valor JSON)

### Community 22 - "Fase 6: frontend (docs)"
Cohesion: 0.33
Nodes (7): Fase 6: Frontend funcional (pendiente), Menú lateral (usuario, modo, tema, navegación), Tema claro (tokens, data-theme, data-bs-theme), plotly.js-gl3d-dist-min (variante aprobada de Plotly), Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas, Hook useStream (un único EventSource compartido), html lang=es data-bs-theme=dark

### Community 23 - "Simulador puro y tests (docs)"
Cohesion: 0.33
Nodes (7): Física de espira exacta (K(k), E(k) por AGM), Ruido con mulberry32 y Box–Muller, Servicios puros: simulacionPura, fisicaEspira, aleatorio, geometria, Standoff de 5 mm (bobina–sensor), tests/simulador.test.js (node --test, 10 pruebas), Cómo ejecutar y verificar (curl, navegador, npm test), Tests automáticos (npm test)

### Community 24 - "Accesibilidad e index.html"
Cohesion: 0.40
Nodes (5): Prompt Fase 7 — Accesibilidad y diseño con web-design-guidelines y frontend-design, Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…), frontend/index.html (punto de entrada de Vite), Google Fonts por CDN (Rajdhani, Share Tech Mono, Inter), div#root y script /src/main.jsx

### Community 25 - "README"
Cohesion: 0.33
Nodes (6): Arquitectura del Sistema (capas de instrumentación, servidor, persistencia y visualización), README.md — SAVD | Sistema Automatizado de Adquisición y Visualización de Datos, Digitalización concurrente y Edge Computing (de 3 h a 30 min), Filtro activo MFB de Bessel (acondicionamiento analógico), Instalación y despliegue local (README), Raspberry Pi Pico 2W (C++ / MicroPython)

### Community 26 - "Tablas de usuarios (migración 002)"
Cohesion: 0.70
Nodes (4): idx_sesiones_login_expira, idx_sesiones_login_usuario, sesiones_login, usuarios

## Ambiguous Edges - Review These
- `Raspberry Pi Pico 2W (C++ / MicroPython)` → `Raspberry Pi Pico W (RP2040)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **39 isolated node(s):** `Prompts para las fases pendientes`, `Tests de integración contra tms_db_test`, `Digitalización concurrente y Edge Computing (de 3 h a 30 min)`, `Filtro activo MFB de Bessel (acondicionamiento analógico)`, `div#root y script /src/main.jsx` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 135 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Estado de las fases (1 a 8)` connect `Estado de las fases` to `Fase 2: login (docs)`, `Fase 3: parámetros y medición (docs)`, `Fase 5: datos y trazabilidad`, `Convenciones y arquitectura MVC`, `Fase 4: Pico W (docs)`, `Fase 6: frontend (docs)`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `Prompts para las fases pendientes`, `Tests de integración contra tms_db_test`, `Digitalización concurrente y Edge Computing (de 3 h a 30 min)` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard React y cliente API` be split into smaller, more focused modules?**
  _Cohesion score 0.08717948717948718 - nodes in this community are weakly interconnected._
- **Why does `services/sesiones.js (una sola sesión abierta, cola de promesas)` connect `Fase 3: parámetros y medición (docs)` to `Sesiones, simulador e ingesta`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `Modelos SQL y acceso admin` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `services/simulador.js (setTimeout encadenado sobre la malla)` connect `Fase 3: parámetros y medición (docs)` to `Simulador puro y tests (docs)`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico 2W (C++ / MicroPython)` and `Raspberry Pi Pico W (RP2040)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._