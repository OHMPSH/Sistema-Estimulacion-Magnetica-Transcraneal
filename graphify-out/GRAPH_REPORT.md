# Graph Report - PT  (2026-11-24)

## Corpus Check
- 210 files · ~236,827 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .ttf 8, (none) 5, .service 1)

## Summary
- 2374 nodes · 4928 edges · 143 communities (110 shown, 33 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 204 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03dec5a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ConfigContext.jsx
- Usuario.js
- Firmware de prueba: Pico W + sensor Hall 49E (un eje)
- useTheme
- server/package.json
- Dependencias del frontend
- validacionConfiguracion.js
- apiFetch
- conversionSensor.js
- calibracion.js
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- dev.sh
- validar.js
- mediciones.controller.js
- Fase 7 — Revisión de la interfaz y plan de diseño
- Fase 4: Pico W (docs)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- SAVD / TMS (sistema de adquisición y visualización)
- Códigos HTTP 400/401/403/404/409/422
- Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS
- configuracion.js
- setup_test_db.sql
- Accesibilidad e index.html
- util.ts
- Tablas de usuarios (migración 002)
- Prompts de las fases
- 003_configuracion.sql
- 004_dispositivo.sql
- services/ingesta.js (registrarMedicion: valida, |B|, inserta, difunde)
- time
- HistorialPage.jsx
- idx_sesiones_eliminada
- Controlador
- firmware/barrido.py
- react
- firmware_hall_1d/red.py
- App.jsx
- ConfigContext.jsx
- trazabilidad.test.js
- Estado de las fases (1 a 8)
- Sabana3D.tsx
- firmware/motores.py
- Mesa
- Pin
- dispositivo.routes.js
- Mesa
- firmware_hall_1d/banco.py
- sesionesLocales.ts
- firmware_hall_1d/main.py
- WLAN
- firmware_hall_1d/pruebas_pc/ejecutar_pc.py
- calibracion.py
- sesiones.js
- emular-pico.js
- Controlador
- Dashboard.tsx
- SAVD / TMS (sistema de adquisición y visualización)
- machine.py
- firmware/main.py
- Firmware de la Raspberry Pi Pico W (MicroPython)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- firmware_hall_1d/banco.py
- app/package.json
- app.js
- App.tsx
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- 3. Mecánica de la mesa
- firmware_hall_1d/motores.py
- 06 — Protocolo de comunicación
- dispositivo.js
- Instructivo: conexiones de los drivers TB6600 y calibración de los ejes
- Medicion.js
- 11 — Interfaz web (frontend)
- 07 — Backend (servidor Node.js + Express)
- I2C
- Fase 2: Login y usuarios (hecha)
- QMC5883P
- Pin
- crear-admin.js
- Prompts: QMC5883P en el firmware cliente y recorrido en serpentina
- expo
- SesionLogin.js
- firmware_hall_1d/barrido.py
- 09 — Modelo físico y simulación
- Eje
- Canvas3D.jsx
- Bufer
- qmc
- urequests.py
- scripts
- database.js
- Dispositivo.js
- firmware_hall_1d/registro.py
- Magnetómetro QMC5883P con la Raspberry Pi Pico W
- 05 — Firmware de la Raspberry Pi Pico W
- 08 — Base de datos
- 14 — Pruebas y verificación
- firmware/banco.py
- 03 — Hardware
- 04 — Sensores y medición
- storage.ts
- 01 — Resumen y alcance del sistema
- 12 — Seguridad, usuarios y roles
- 13 — Despliegue e infraestructura
- Api
- 16 — Evolución y cambios
- TMS Monitor (app Android)
- 00 — Índice y guía para el revisor
- DMA
- 02 — Arquitectura general
- 10 — Geometría de la malla
- devDependencies
- Prompt para la sesión del informe técnico completo (tesis)
- 15 — Metodología de desarrollo
- 17 — Limitaciones, pendientes y trabajo futuro
- 18 — Tecnologías y glosario
- Calibracion
- @types/react
- Capturas de la app móvil (TMS Monitor) para la tesis
- Capturas del SAVD para la tesis
- scripts
- tsconfig.json
- 6. Numeración, búfer y envío por lotes
- 4. Resolución y velocidad de posicionamiento
- portapapeles.ts
- scripts
- capturas-faltantes/LEEME.md
- firmware/pruebas_pc/prueba_logica.py
- sesion
- Limites
- Perfil

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 58 edges
2. `useStyles()` - 56 edges
3. `react` - 53 edges
4. `Icono()` - 31 edges
5. `useTms()` - 30 edges
6. `Boton()` - 28 edges
7. `obtener()` - 27 edges
8. `QMC5883P` - 26 edges
9. `apiFetch()` - 25 edges
10. `leerJSON()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `2.2 Flujo de datos en vivo` --references--> `useSesionActiva()`  [INFERRED]
  docs/tesis/11-frontend.md → frontend/src/hooks/useSesionActiva.js
- `3. Términos obsoletos y su equivalente actual` --references--> `useSesionActiva()`  [INFERRED]
  docs/tesis/16-evolucion-y-cambios.md → frontend/src/hooks/useSesionActiva.js
- `1.2 Lote de mediciones` --references--> `QMC5883P`  [INFERRED]
  docs/firmware-pico-w.md → firmware/sensor.py
- `2. Módulos` --references--> `QMC5883P`  [INFERRED]
  docs/tesis/05-firmware-pico-w.md → firmware/sensor.py
- `1.1 Aclaración sobre el microcontrolador` --references--> `DMA`  [INFERRED]
  docs/tesis/03-hardware.md → firmware/pruebas_pc/stubs/rp2.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (143 total, 33 thin omitted)

### Community 0 - "ConfigContext.jsx"
Cohesion: 0.11
Nodes (36): aplicarTema(), CLAVE_TEMA, ConfigContext, ConfigProvider(), consulta(), guardarTemaLocal(), leerTemaLocal(), TEMAS (+28 more)

### Community 1 - "Usuario.js"
Cohesion: 0.18
Nodes (6): buscarConHashPorId(), buscarConHashPorUsuario(), buscarPorId(), buscarPorUsuario(), listar(), normalizar()

### Community 2 - "Firmware de prueba: Pico W + sensor Hall 49E (un eje)"
Cohesion: 0.16
Nodes (9): 1. Archivos, 2. Conexiones, 3. Origen y límites, 4. Cómo llega el campo al servidor (`UNIDAD_ENVIO`), 5. Conexión con el servidor (la laptop), 6. Primera prueba, paso a paso, 7. Prueba sin servidor (`banco.py`), 8. Pruebas en el PC (+1 more)

### Community 3 - "useTheme"
Cohesion: 0.17
Nodes (46): Raiz(), AvisoAuth(), CambiarPassword(), Cargando(), ElegirOrigen(), Login(), Marca(), Tarjeta() (+38 more)

### Community 4 - "server/package.json"
Cohesion: 0.13
Nodes (19): cors, dotenv, express, mysql2, nodemon, dependencies, cors@^2.8.5, dotenv@^16.4.5 (+11 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.09
Nodes (29): react-dom@19.2.3, dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0 (+21 more)

### Community 6 - "validacionConfiguracion.js"
Cohesion: 0.09
Nodes (30): BLOQUEADAS_CON_SESION, barridoActual(), validarNuevaSesion(), erroresDePaso(), erroresDeZona(), indicesDeSerpentina(), limitesDeBarrido(), mallaDeBarrido() (+22 more)

### Community 7 - "apiFetch"
Cohesion: 0.22
Nodes (20): apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES, SeccionUsuarios() (+12 more)

### Community 8 - "conversionSensor.js"
Cohesion: 0.13
Nodes (28): 3. Servicios, clasificarLote(), convertirCrudo(), CRUDO_MAX, CRUDO_MIN, crudoValido(), cuentasPorGauss(), EJES (+20 more)

### Community 9 - "calibracion.js"
Cohesion: 0.25
Nodes (15): anotarLimites(), difundirEstado(), EJES, ErrorCalibracion, erroresDeObjetivo(), estadoPublico(), iniciar(), LIMITE_MAXIMO_MM (+7 more)

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.20
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 14 - "validar.js"
Cohesion: 0.05
Nodes (90): 2. Estructura y capas, ROLES, TEMAS, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo() (+82 more)

### Community 15 - "mediciones.controller.js"
Cohesion: 0.09
Nodes (31): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+23 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.29
Nodes (8): Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Latido POST /api/dispositivo/latido, services/dispositivo.js (estado en línea, event: dispositivo), Tabla dispositivos (Fase 4), Emulador de la Pico (server/scripts/emular-pico.js), Documentación del firmware (docs/firmware-pico-w.md) y ejemplo MicroPython, Prompt Fase 4 — Pico W como cliente del servidor

### Community 18 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.22
Nodes (10): API REST actual (roles público/sesión/op/admin), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), Geometría derivada del paso (grid_n, z_levels, puntos), Malla de medición (60×60 mm, planos Z 0–20 mm), services/configuracion.js (caché en memoria + SSE), services/tiempoReal.js (SSE: conectar, difundir, ping 25 s), SSE /api/stream (eventos medicion, sesion, configuracion), hooks/useAcquisition.js (sin simulación: configuración, SSE, iniciar/detener) (+2 more)

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.11
Nodes (19): Carpeta mnt/ sobrante (se borra en la Fase 8), COMANDOS.md (guía de arranque), Fase 8: Tests y despliegue (pendiente), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi, Pasos 3–7 — Dependencias, backend (4000), frontend (5173) y dashboard (+11 more)

### Community 20 - "Códigos HTTP 400/401/403/404/409/422"
Cohesion: 0.22
Nodes (5): Códigos HTTP 400/401/403/404/409/422, config/database.js (pool mysql2 en UTC), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Características principales (3-DOF, telemetría distribuida, integridad, MVC)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.11
Nodes (18): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1.3 Punto de inicio de la medición (desde el 2026-11-13), 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip (+10 more)

### Community 22 - "configuracion.js"
Cohesion: 0.13
Nodes (14): actualizar(), cache, cargar(), copia(), mezclarSensor(), obtenerTodo(), POR_DEFECTO, CLAVES (+6 more)

### Community 23 - "setup_test_db.sql"
Cohesion: 0.28
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 24 - "Accesibilidad e index.html"
Cohesion: 0.24
Nodes (10): Colores del modo oscuro (:root en global.css), Fase 7: Accesibilidad y diseño (pendiente), styles/global.css, Tema claro (tokens, data-theme, data-bs-theme), Prompt Fase 7 — Accesibilidad y diseño con web-design-guidelines y frontend-design, Problemas de accesibilidad de la revisión anterior (div onClick, labels, focus-visible, contraste --text-dim…), html lang=es data-bs-theme=dark, frontend/index.html (punto de entrada de Vite) (+2 more)

### Community 25 - "util.ts"
Cohesion: 0.07
Nodes (30): useOrbita(), claveDe(), Mapa3D, r1(), useAppActiva(), colorPlano(), BARRIDO_POR_DEFECTO, cacheNumeros (+22 more)

### Community 26 - "Tablas de usuarios (migración 002)"
Cohesion: 0.70
Nodes (4): idx_sesiones_login_expira, idx_sesiones_login_usuario, sesiones_login, usuarios

### Community 29 - "003_configuracion.sql"
Cohesion: 0.40
Nodes (3): configuracion, idx_sesiones_filtros, idx_sesiones_iniciada

### Community 31 - "services/ingesta.js (registrarMedicion: valida, |B|, inserta, difunde)"
Cohesion: 0.14
Nodes (17): Fase 3: Configuración, modos y simulador en el servidor (hecha), Física de espira exacta (K(k), E(k) por AGM), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller, Recorrido de una medición (desde la Fase 3), Saturación inyectada (prob_saturacion), Semilla reproducible del simulador (+9 more)

### Community 34 - "time"
Cohesion: 0.14
Nodes (10): iniciar(), leer_cuentas(), leer_uT(), medir_fondo(), Eje, pedir_mm(), principal(), calibrar_cero() (+2 more)

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.09
Nodes (41): ModalConfirmacion, StartModal, StopModal, useModalBootstrap(), CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones() (+33 more)

### Community 38 - "Controlador"
Cohesion: 0.05
Nodes (16): Progreso, Bufer, Enviador, latido(), post(), Controlador, ahora_ms(), conectado() (+8 more)

### Community 39 - "firmware/barrido.py"
Cohesion: 0.17
Nodes (11): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, inicio_de(), lecturas_por_punto(), punto() (+3 more)

### Community 40 - "react"
Cohesion: 0.08
Nodes (33): EN_NAVEGADOR, probarServidor(), Resp, COMPONENTES, LineChart, Punto, r1(), normalizarUrl() (+25 more)

### Community 41 - "firmware_hall_1d/red.py"
Cohesion: 0.10
Nodes (9): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+1 more)

### Community 42 - "App.jsx"
Cohesion: 0.12
Nodes (23): 2.1 Navegación en la URL, 2.2 Flujo de datos en vivo, 2. Estructura, alPerderSesion(), App(), Shell(), MenuLateral(), NAVEGACION (+15 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.15
Nodes (19): FIGURAS, ICONO_SVG, MAGNITUDES, Plot, RDBU, Superficie3D, useLimitado(), aTexto() (+11 more)

### Community 44 - "trazabilidad.test.js"
Cohesion: 0.21
Nodes (16): 7. Orden del barrido: serpentina, indiceDeMalla(), puntoDeMalla(), serpentinaDeIndices(), calcularHuecos(), COLUMNAS_CSV, encabezadoCSV(), escaparMeta() (+8 more)

### Community 45 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (17): Borrado lógico de sesiones (eliminada_en, restaurar), ControlPanel.jsx (velocidad, paso, medio), CSV generado en el servidor con metadatos, Estado de las fases (1 a 8), Fase 1: Base del backend (hecha), Fase 5: Datos y trazabilidad (pendiente), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), HistorialPage.jsx (filtros; CSV en el navegador) (+9 more)

### Community 46 - "Sabana3D.tsx"
Cohesion: 0.10
Nodes (35): compartirArchivo(), aHex(), cacheEscala, camara(), colorEscala(), cruz(), decimalesDePaso(), diferencia (+27 more)

### Community 47 - "firmware/motores.py"
Cohesion: 0.15
Nodes (9): _programa_pasos(), codificar(), es_rp2350(), pasos_hechos(), perfil(), periodo_de(), _programa_pasos(), y_para() (+1 more)

### Community 48 - "Mesa"
Cohesion: 0.15
Nodes (3): _en_paralelo(), ErrorMovimiento, Mesa

### Community 50 - "dispositivo.routes.js"
Cohesion: 0.33
Nodes (9): generarToken(), getEstado(), latido(), lecturaCalibracion(), lote(), patchDispositivo(), revocarToken(), soloAdmin (+1 more)

### Community 53 - "sesionesLocales.ts"
Cohesion: 0.11
Nodes (24): cambiar(), cargarOrigen(), csv(), eliminar(), estadisticas(), guardarConfig(), guardarOrigen(), guardarSesion() (+16 more)

### Community 54 - "firmware_hall_1d/main.py"
Cohesion: 0.11
Nodes (8): poner(), apagar(), _bootsel_pulsado(), _correr(), principal(), bootsel_button(), PIO, StateMachine

### Community 56 - "firmware_hall_1d/pruebas_pc/ejecutar_pc.py"
Cohesion: 0.07
Nodes (3): ADC, ADC, campo_ut()

### Community 57 - "calibracion.py"
Cohesion: 0.21
Nodes (7): ejecutar(), _esperar_ms(), _esperar_turno(), _informar(), _posicion(), _tupla(), _turno_libre()

### Community 58 - "sesiones.js"
Cohesion: 0.17
Nodes (18): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), paraPico(), obtener(), mallaDeZona(), olvidarSesion() (+10 more)

### Community 59 - "emular-pico.js"
Cohesion: 0.13
Nodes (28): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+20 more)

### Community 61 - "Dashboard.tsx"
Cohesion: 0.14
Nodes (29): ESTADOS_PICO, Estimado, mediana(), ritmoActual(), ritmoHistorico(), useCongelado(), useTiempoEstimado(), COLS (+21 more)

### Community 62 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.16
Nodes (14): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Mesa cartesiana XY (NEMA 17, husillos T8), Migración 003 (configuracion y sesiones.origen/paso_mm/medio), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271) (+6 more)

### Community 63 - "machine.py"
Cohesion: 0.20
Nodes (3): _Mem32, Timer, WDT

### Community 64 - "firmware/main.py"
Cohesion: 0.17
Nodes (5): poner(), apagar(), _bootsel_pulsado(), _correr(), principal()

### Community 65 - "Firmware de la Raspberry Pi Pico W (MicroPython)"
Cohesion: 0.12
Nodes (17): 10. LED y comportamiento ante fallas, 11. Pruebas en el PC, 12. Límites conocidos, 1. Archivos, 2.1 Pines (cámbialos en `config.py`), 2.2 TB6600, 2.3 Sin finales de carrera, 2. Conexiones (+9 more)

### Community 67 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.13
Nodes (11): controllers/auth.controller.js · usuarios.controller.js, config/roles.js (ROLES y TEMAS), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), Límite de intentos de login (5 en 15 min, 429), middleware/auth.js (requiereLogin, requiereRol), nginx/tms.conf (proxy inverso, NO TOCAR), Roles admin / operador / observador, server/server.js (entrada Express) (+3 more)

### Community 68 - "firmware_hall_1d/banco.py"
Cohesion: 0.32
Nodes (11): apagar(), cero(), _correr(), hall(), ir(), _leer(), _m(), origen() (+3 more)

### Community 69 - "app/package.json"
Cohesion: 0.09
Nodes (30): dependencies, expo@~57.0.0, expo-build-properties@~57.0.22, expo-file-system@~57.0.7, expo-font@~57.0.4, @expo/metro-runtime@~57.0.18, expo-sharing@~57.0.26, expo-status-bar@~57.0.1 (+22 more)

### Community 70 - "app.js"
Cohesion: 0.09
Nodes (22): crearApp(), iniciarServicios(), testConnection(), corsMiddleware, origenes, manejadorErrores(), rutaNoEncontrada(), router (+14 more)

### Community 71 - "App.tsx"
Cohesion: 0.16
Nodes (24): App(), AvisoPico, ConTema(), Indicador(), MenuLateral(), Navbar(), NAVEGACION, Seccion() (+16 more)

### Community 72 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.11
Nodes (17): CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Fase 6: Frontend funcional (pendiente), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Hooks de git que reconstruyen el grafo (solo código), Reglas de graphify (query/path/explain, GRAPH_REPORT primero), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router) (+9 more)

### Community 73 - "3. Mecánica de la mesa"
Cohesion: 0.22
Nodes (9): 3.1 Sistema de coordenadas de máquina y recorridos, 3.2 Posición de descanso y ausencia de finales de carrera, 3.3 Origen de la medición, 3.4 Orden de movimiento de los ejes, 3.5 Compensación de la holgura del husillo, 3. Mecánica de la mesa, 2.1 Hardware y sensores, reset() (+1 more)

### Community 74 - "firmware_hall_1d/motores.py"
Cohesion: 0.21
Nodes (6): codificar(), _en_paralelo(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 75 - "06 — Protocolo de comunicación"
Cohesion: 0.08
Nodes (24): 06 — Protocolo de comunicación, 1. Principios del protocolo con la Pico W, 2. Autenticación de la Pico con token, 3.1 Petición, 3.2 Respuesta, 3.3 Sincronización de reloj, 3.4 Detección de «en línea» y «sin señal», 3. Latido (+16 more)

### Community 76 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 77 - "Instructivo: conexiones de los drivers TB6600 y calibración de los ejes"
Cohesion: 0.08
Nodes (26): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600 (+18 more)

### Community 78 - "Medicion.js"
Cohesion: 0.11
Nodes (10): insertarLote(), insertarMedicion(), leerJSON(), medicionesComoEventos(), normalizarSesion(), obtenerMedicionesDeSesion(), obtenerSesion(), obtenerSesiones() (+2 more)

### Community 79 - "11 — Interfaz web (frontend)"
Cohesion: 0.09
Nodes (21): 11 — Interfaz web (frontend), 1. Tecnologías, 3.1 Inicio de sesión y cambio obligatorio de contraseña, 3.2 Barra superior y menú lateral, 3.3 Dashboard en vivo, 3.4 Mediciones pasadas (historial), 3.5 Configuración, 3.6 Matriz de permisos en la interfaz (+13 more)

### Community 80 - "07 — Backend (servidor Node.js + Express)"
Cohesion: 0.10
Nodes (20): 07 — Backend (servidor Node.js + Express), 1. Tecnologías, 4.1 Autenticación y usuarios, 4.2 Estado, configuración y tiempo real, 4.3 Sesiones y mediciones, 4.4 Dispositivo, 4.5 Convención de códigos HTTP, 4. API completa (+12 more)

### Community 82 - "Fase 2: Login y usuarios (hecha)"
Cohesion: 0.20
Nodes (10): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Fase 2: Login y usuarios (hecha), frontend App.jsx (login / cambio forzado / Dashboard), Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), LoginPage.jsx · CambiarPasswordPage.jsx, Tabla sesiones_login (+2 more)

### Community 83 - "QMC5883P"
Cohesion: 0.10
Nodes (7): En el servidor y la página: hecho el 2026-11-12 (opción **b**), 4.1 Diferencias entre el HMC5883L esperado y el QMC5883P real, 4.2 Cómo admite el servidor los dos modelos, 4. Historia del sensor, ErrorSensor, QMC5883P, _rango_valido()

### Community 87 - "crear-admin.js"
Cohesion: 0.32
Nodes (4): main(), obtenerPassword(), PREDETERMINADO, preguntarSinEco()

### Community 88 - "Prompts: QMC5883P en el firmware cliente y recorrido en serpentina"
Cohesion: 0.50
Nodes (3): Prompt 1 — Sesión nueva: firmware cliente de la Pico W, Prompt 2 — Sesión ya creada: página web (servidor y frontend), Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

### Community 89 - "expo"
Cohesion: 0.11
Nodes (18): backgroundImage, foregroundImage, adaptiveIcon, package, versionCode, expo, android, backgroundColor (+10 more)

### Community 91 - "firmware_hall_1d/barrido.py"
Cohesion: 0.18
Nodes (9): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), punto(), reanudar_en() (+1 more)

### Community 93 - "09 — Modelo físico y simulación"
Cohesion: 0.12
Nodes (16): 09 — Modelo físico y simulación, 1.1 Planteamiento, 1.2 Componentes del campo, 1.3 Cálculo de $K(m)$ y $E(m)$ por la media aritmético-geométrica (AGM), 1.4 Normalización y *standoff*, 1.5 Paso a coordenadas cartesianas, 1. Modelo de la espira circular, 2.1 Generador uniforme con semilla (mulberry32) (+8 more)

### Community 95 - "Canvas3D.jsx"
Cohesion: 0.12
Nodes (28): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, DataTable, KpiCards, useAlConectarStream() (+20 more)

### Community 96 - "Bufer"
Cohesion: 0.11
Nodes (3): Progreso, Bufer, Enviador

### Community 99 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, crear-admin, dev, emular-pico, start, test, test:integracion, test:unit

### Community 100 - "database.js"
Cohesion: 0.38
Nodes (4): faltantes, pool, leerValor(), obtenerTodas()

### Community 101 - "Dispositivo.js"
Cohesion: 0.38
Nodes (3): buscarPorTokenHash(), normalizar(), obtenerPrincipal()

### Community 102 - "firmware_hall_1d/registro.py"
Cohesion: 0.60
Nodes (3): _desfase_epoch(), _hora(), log()

### Community 103 - "Magnetómetro QMC5883P con la Raspberry Pi Pico W"
Cohesion: 0.25
Nodes (8): 1. Conexión, 2. Registros, 3. Rangos (registro `0x0B`, bits 3–2), 4. Medición, 5. Aplicación, 7. Problemas comunes, Diferencias con el HMC5883L (lo que daba por hecho el firmware viejo), Magnetómetro QMC5883P con la Raspberry Pi Pico W

### Community 104 - "05 — Firmware de la Raspberry Pi Pico W"
Cohesion: 0.12
Nodes (15): 05 — Firmware de la Raspberry Pi Pico W, 2. Módulos, 3.1 Generación de pulsos con PIO y DMA, 3.2 Perfil de velocidad, 3. Arquitectura: bucle cooperativo con generadores, 4.1 Señales del LED, 4. Máquina de estados del dispositivo, 5.1 Serpentina (+7 more)

### Community 106 - "08 — Base de datos"
Cohesion: 0.13
Nodes (14): 08 — Base de datos, 1. Motor y conexión, 2. Diagrama entidad-relación, 3.1 `usuarios`, 3.2 `sesiones_login`, 3.3 `sesiones`, 3.4 `mediciones`, 3.5 `configuracion` (+6 more)

### Community 107 - "14 — Pruebas y verificación"
Cohesion: 0.13
Nodes (14): 14 — Pruebas y verificación, 1. Estrategia, 2. Pruebas unitarias del servidor, 3. Pruebas de integración del servidor, 4. Emulador de la Pico W, 5. Pruebas del firmware en la computadora, 6. Verificación en el navegador, 7. Revisión de diseño y accesibilidad (+6 more)

### Community 108 - "firmware/banco.py"
Cohesion: 0.17
Nodes (15): 6. En el firmware cliente (`firmware/`): hecho el 2026-11-12, 7. Programas independientes de prueba y calibración, apagar(), arranque(), _correr(), fondo(), ir(), _m() (+7 more)

### Community 109 - "03 — Hardware"
Cohesion: 0.14
Nodes (13): 03 — Hardware, 1.1 Aclaración sobre el microcontrolador, 1.2 Aclaración sobre el magnetómetro, 1.3 Sensores de prueba, 1. Componentes, 2.1 Tabla de pines de la Raspberry Pi Pico W, 2.2 Conexión de los TB6600 (cátodo común), 2. Cableado (+5 more)

### Community 110 - "04 — Sensores y medición"
Cohesion: 0.09
Nodes (22): 04 — Sensores y medición, 1.1 Características, 1.2 Registros, 1.3 Secuencia de inicialización, 1.4 Lectura, 1.5 Rangos, 1.6 Promediado, 1.7 Campo de fondo (+14 more)

### Community 111 - "storage.ts"
Cohesion: 0.33
Nodes (10): cargarActivo(), cargarCookie(), cargarPerfiles(), cargarTema(), guardar(), guardarActivo(), guardarCookie(), guardarPerfiles() (+2 more)

### Community 112 - "01 — Resumen y alcance del sistema"
Cohesion: 0.15
Nodes (12): 01 — Resumen y alcance del sistema, 1. Qué es el sistema, 2. Problema que resuelve, 3.1 Objetivo general, 3.2 Objetivos específicos (tal como están implementados), 3. Objetivos, 4.1 Dentro del alcance, 4.2 Fuera del alcance o con límites explícitos (+4 more)

### Community 113 - "12 — Seguridad, usuarios y roles"
Cohesion: 0.15
Nodes (12): 10. Verificación, 12 — Seguridad, usuarios y roles, 1. Roles y matriz de permisos, 2. Contraseñas, 3. Cookie de sesión, 4. Expiración y renovación, 5. Límite de intentos fallidos, 6. Token de la Pico W (+4 more)

### Community 114 - "13 — Despliegue e infraestructura"
Cohesion: 0.15
Nodes (12): 13 — Despliegue e infraestructura, 1. Diagrama de despliegue, 2. Instalación en la Raspberry Pi 5, 3.1 Nginx (`nginx/tms.conf`), 3.2 Servicio de systemd (`deploy/tms-server.service`), 3. Componentes del servidor, 4. Acceso desde el hotspot, 5. Configuración de la Pico W para el servidor (+4 more)

### Community 116 - "16 — Evolución y cambios"
Cohesion: 0.17
Nodes (11): 16 — Evolución y cambios, 1. Cronología, 2.2 Adquisición, protocolo y servidor, 2.3 Base de datos, 2.4 Interfaz, 2.5 Afirmaciones del texto original que conviene revisar, 2. Tabla «antes → ahora → motivo», 3. Términos obsoletos y su equivalente actual (+3 more)

### Community 117 - "TMS Monitor (app Android)"
Cohesion: 0.18
Nodes (10): 1. Servidor (Raspberry Pi o computadora de pruebas), 2. Generar el APK, 3. Probar sin teléfono (vista web, solo para desarrollo), 4. Comprobaciones, Estructura, Opción A — en tu computadora (Linux), Opción B — en la nube (sin Android Studio), Qué tiene (igual que la web) (+2 more)

### Community 119 - "00 — Índice y guía para el revisor"
Cohesion: 0.20
Nodes (9): 00 — Índice y guía para el revisor, 1. Índice de archivos, 2.1 Separador decimal y formato numérico, 2.2 Unidades, 2.3 Convención de estados, 2.4 Fecha de corte, 2. Criterios del informe, 3. Cómo usar el archivo de evolución para comparar con el avance de tesis (+1 more)

### Community 120 - "DMA"
Cohesion: 0.20
Nodes (6): 1. Plataforma, DMA, 8.1 MicroPython, 8.2 Cargar los archivos, 8.3 Calibración, 8. Instalar y calibrar

### Community 121 - "02 — Arquitectura general"
Cohesion: 0.22
Nodes (8): 02 — Arquitectura general, 1. Diagrama de bloques del sistema, 2. Modelos y patrones de arquitectura, 3.1 Diagrama de secuencia, 3.2 Descripción en prosa, 3. Recorrido de una medición de punta a punta, 4. Por qué el router de Express se monta en `/api` y en `/`, Fuentes en el proyecto

### Community 124 - "10 — Geometría de la malla"
Cohesion: 0.10
Nodes (18): 10 — Geometría de la malla, 1. Zona de muestreo y límites de la base, 2. Paso de medición, 3.1 Ejemplos con la base de 60 × 60 × 20 mm, 3.2 Ejemplos con zonas usadas en la mesa real, 3. Número de puntos, 4. Tolerancias, 5.1 Descripción (+10 more)

### Community 125 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @types/react@^18.3.3, @types/react-dom@^18.3.0, vite@^5.3.4, @vitejs/plugin-react@^4.3.1, @types/react-dom, vite, @vitejs/plugin-react

### Community 126 - "Prompt para la sesión del informe técnico completo (tesis)"
Cohesion: 0.25
Nodes (7): Al terminar, Archivos y contenido mínimo, Formato de la entrega, Para qué es el informe (léelo antes de empezar), Preguntas que debes hacerme antes de redactar, Prompt para la sesión del informe técnico completo (tesis), Reglas de trabajo

### Community 127 - "15 — Metodología de desarrollo"
Cohesion: 0.25
Nodes (7): 15 — Metodología de desarrollo, 1. Enfoque general, 2.1 Cambios posteriores a la Fase 8, 2. Fases, 3. Control de versiones, 4. Criterios de diseño, Fuentes en el proyecto

### Community 128 - "17 — Limitaciones, pendientes y trabajo futuro"
Cohesion: 0.25
Nodes (7): 17 — Limitaciones, pendientes y trabajo futuro, 1. Pruebas pendientes con el hardware, 2. Funciones no implementadas o a medias, 3. Cuestiones abiertas, 4. Limitaciones conocidas del sistema actual, 5. Mejoras posibles, Fuentes en el proyecto

### Community 129 - "18 — Tecnologías y glosario"
Cohesion: 0.25
Nodes (7): 18 — Tecnologías y glosario, 1.1 Hardware y firmware, 1.2 Servidor, 1.3 Interfaz, 1. Tecnologías, bibliotecas y herramientas, 2. Glosario, Fuentes en el proyecto

### Community 131 - "@types/react"
Cohesion: 0.29
Nodes (7): @types/react@~19.2.4, typescript@~6.0.3, devDependencies, @types/react@~19.2.4, typescript@~6.0.3, @types/react, typescript

### Community 132 - "Capturas de la app móvil (TMS Monitor) para la tesis"
Cohesion: 0.29
Nodes (6): Archivos, Capturas de la app móvil (TMS Monitor) para la tesis, Cómo se tomaron (las dos tandas), Diferencias y detalles, Tanda real (2026-11-17), Tanda simulada (2026-11-16)

### Community 133 - "Capturas del SAVD para la tesis"
Cohesion: 0.29
Nodes (6): Archivos, Capturas del SAVD para la tesis, Fotografías y capturas que te tocan, Pies de figura que hay que revisar, Tanda real (2026-11-17), Tanda simulada (2026-11-15)

### Community 134 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, export:android, start, typecheck, web

### Community 135 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, strict, extends, include, expo/tsconfig.base

### Community 136 - "6. Numeración, búfer y envío por lotes"
Cohesion: 0.33
Nodes (6): 6.1 Número de secuencia, 6.2 Búfer circular, 6.3 Envío por lotes, 6.4 Reanudación, 6.5 Hora, 6. Numeración, búfer y envío por lotes

### Community 137 - "4. Resolución y velocidad de posicionamiento"
Cohesion: 0.40
Nodes (5): 4.1 Resolución teórica, 4.2 Error de cuantización y requisito de ±1 mm, 4.3 Velocidad, rampas y frecuencia de pulsos, 4.4 Tiempo de un barrido real, 4. Resolución y velocidad de posicionamiento

### Community 139 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 145 - "Limites"
Cohesion: 0.27
Nodes (3): correr(), Limites, mover()

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **39 isolated node(s):** `expo/tsconfig.base`, `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)`, `Tabla dispositivos (Fase 4)`, `config/roles.js (ROLES y TEMAS)` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 928 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `reset()` connect `3. Mecánica de la mesa` to `firmware_hall_1d/pruebas_pc/ejecutar_pc.py`, `machine.py`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ConfigContext.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11282051282051282 - nodes in this community are weakly interconnected._
- **Why does `2. Tabla «antes → ahora → motivo»` connect `16 — Evolución y cambios` to `3. Mecánica de la mesa`?**
  _High betweenness centrality (0.293) - this node is a cross-community bridge._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._
- **Why does `2.1 Hardware y sensores` connect `3. Mecánica de la mesa` to `16 — Evolución y cambios`?**
  _High betweenness centrality (0.290) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._