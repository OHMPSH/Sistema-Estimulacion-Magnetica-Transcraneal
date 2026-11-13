# Graph Report - PT  (2026-11-13)

## Corpus Check
- 150 files · ~125,727 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .service 1, .css 1)

## Summary
- 1537 nodes · 3152 edges · 97 communities (68 shown, 29 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 149 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `224b41e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- utils/geometria.js
- Usuario.js
- Firmware de prueba: Pico W + sensor Hall 49E (un eje)
- configuracion.js
- app.js
- Dependencias del frontend
- validar.js
- apiFetch
- conversionSensor.js
- firmware/banco.py
- Esquema SQL y migraciones
- pico_w_cliente_ejemplo.py
- dev.sh
- tiempoReal.js
- mediciones.controller.js
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
- medicion_campo_qmc5883p.py
- HistorialPage.jsx
- idx_sesiones_eliminada
- Controlador
- firmware/barrido.py
- firmware/pruebas_pc/prueba_logica.py
- firmware_hall_1d/red.py
- App.jsx
- ConfigContext.jsx
- firmware/red.py
- dispositivo.routes.js
- Eje
- Eje
- Mesa
- Pin
- QMC5883P
- Mesa
- Controlador
- Hall49E
- firmware_hall_1d/main.py
- WLAN
- firmware_hall_1d/pruebas_pc/ejecutar_pc.py
- machine.py
- services/geometria.js
- simulador.test.js
- firmware/main.py
- emular-pico.js
- sesiones.js
- useSesionActiva.js
- dispositivo.js
- Firmware de la Raspberry Pi Pico W (MicroPython)
- Bufer
- Sensor HMC5883L (magnetómetro AMR triaxial I2C)
- Malla
- api.integ.js
- trazabilidad.test.js
- nginx/tms.conf (proxy inverso, NO TOCAR)
- Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)
- qmc
- I2C
- DMA
- 4. Conexiones
- punto
- correr
- Eje
- urequests.py
- Perfil
- firmware_hall_1d/pruebas_pc/prueba_logica.py
- firmware_hall_1d/motores.py
- validacionConfiguracion.js
- Prompts: QMC5883P en el firmware cliente y recorrido en serpentina
- firmware/cliente.py
- sensor
- Magnetómetro QMC5883P con la Raspberry Pi Pico W
- Enviador
- firmware_hall_1d/registro.py
- rp2.py
- ADC

## God Nodes (most connected - your core abstractions)
1. `react` - 35 edges
2. `QMC5883P` - 26 edges
3. `Controlador` - 23 edges
4. `Controlador` - 22 edges
5. `obtener()` - 22 edges
6. `apiFetch()` - 20 edges
7. `leerJSON()` - 19 edges
8. `DashboardPage()` - 18 edges
9. `Pin` - 18 edges
10. `difundir()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `1.2 Lote de mediciones` --references--> `QMC5883P`  [INFERRED]
  docs/firmware-pico-w.md → firmware/sensor.py
- `4.5 Magnetómetro QMC5883P → Pico W` --references--> `sensor()`  [INFERRED]
  docs/instructivo-calibracion-y-conexiones.md → firmware/banco.py
- `En el servidor y la página: hecho el 2026-11-12 (opción **b**)` --references--> `QMC5883P`  [INFERRED]
  docs/sensor-qmc5883p.md → firmware/sensor.py
- `7. Orden del barrido: serpentina` --references--> `indiceEnMalla()`  [INFERRED]
  docs/firmware-pico-w.md → frontend/src/utils/geometria.js
- `7. Orden del barrido: serpentina` --references--> `indiceDeMalla()`  [INFERRED]
  docs/firmware-pico-w.md → server/services/geometria.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de una medición en el servidor (sesiones → simulador → ingesta → modelo → SSE)** — claude_servicio_sesiones, claude_servicio_simulador, claude_servicio_ingesta, server_models_medicion, claude_servicio_tiemporeal, claude_use_acquisition [EXTRACTED 1.00]
- **Protocolo Pico W (Fase 4)** — claude_token_dispositivo, claude_latido_dispositivo, claude_ingesta_lotes, claude_servicio_dispositivo, claude_tabla_dispositivos, server_scripts_emular_pico [EXTRACTED 1.00]
- **Autenticación y sesión de usuario (Fase 2)** — claude_auth_controller, claude_servicio_passwords, claude_servicio_sesionusuario, claude_servicio_limiteintentos, claude_middleware_auth, claude_cookie_tms_sesion, claude_auth_context [INFERRED 0.85]

## Communities (97 total, 29 thin omitted)

### Community 0 - "utils/geometria.js"
Cohesion: 0.09
Nodes (38): Canvas3D, claveDe(), ZONA_POR_DEFECTO, COMPONENTES, LineChartComponent, Plot, Superficie3D, useLimitado() (+30 more)

### Community 1 - "Usuario.js"
Cohesion: 0.06
Nodes (23): Migración 002 (usuarios y sesiones_login), models/Usuario.js (protege al último admin), Tabla sesiones_login, Tabla usuarios, faltantes, pool, leerValor(), obtenerTodas() (+15 more)

### Community 2 - "Firmware de prueba: Pico W + sensor Hall 49E (un eje)"
Cohesion: 0.15
Nodes (9): 1. Archivos, 2. Conexiones, 3. Origen y límites, 4. Cómo llega el campo al servidor (`UNIDAD_ENVIO`), 5. Conexión con el servidor (la laptop), 6. Primera prueba, paso a paso, 7. Prueba sin servidor (`banco.py`), 8. Pruebas en el PC (+1 more)

### Community 3 - "configuracion.js"
Cohesion: 0.15
Nodes (13): actualizar(), cache, cargar(), copia(), mezclarSensor(), obtenerTodo(), POR_DEFECTO, CLAVES (+5 more)

### Community 4 - "app.js"
Cohesion: 0.07
Nodes (38): cors, dotenv, express, mysql2, nodemon, crearApp(), iniciarServicios(), testConnection() (+30 more)

### Community 5 - "Dependencias del frontend"
Cohesion: 0.06
Nodes (41): dependencies, bootstrap@^5.3.8, bootstrap-icons@^1.13.2, chart.js@^4.4.3, @fontsource/inter@^5.3.0, @fontsource/rajdhani@^5.3.0, @fontsource/share-tech-mono@^5.3.0, plotly.js-gl3d-dist-min@^3.7.0 (+33 more)

### Community 6 - "validar.js"
Cohesion: 0.06
Nodes (76): ROLES, TEMAS, cambiarPassword(), guardarPreferencias(), login(), logout(), responderBloqueo(), usuarioPublico() (+68 more)

### Community 7 - "apiFetch"
Cohesion: 0.22
Nodes (21): alPerderSesion(), apiFetch(), enviarJSON(), leerJSON(), SeccionDispositivo(), explicar(), FilaUsuario(), ROLES (+13 more)

### Community 8 - "conversionSensor.js"
Cohesion: 0.14
Nodes (25): clasificarLote(), convertirCrudo(), CRUDO_MAX, CRUDO_MIN, crudoValido(), cuentasPorGauss(), DESBORDE, EJES (+17 more)

### Community 9 - "firmware/banco.py"
Cohesion: 0.36
Nodes (8): apagar(), _correr(), ir(), _m(), mover(), origen(), pasos(), posicion()

### Community 10 - "Esquema SQL y migraciones"
Cohesion: 0.25
Nodes (12): configuracion, dispositivos, idx_mediciones_sesion, idx_sesiones_eliminada, idx_sesiones_filtros, idx_sesiones_iniciada, idx_sesiones_login_expira, idx_sesiones_login_usuario (+4 more)

### Community 11 - "pico_w_cliente_ejemplo.py"
Cohesion: 0.20
Nodes (13): ahora_ms(), conectar_wifi(), configurar_sensor(), enviar_lote(), latido(), leer_crudo(), malla(), medir_sesion() (+5 more)

### Community 14 - "tiempoReal.js"
Cohesion: 0.12
Nodes (12): sseHandler(), BuferEventos, bufer, clientes, conectar(), escribir(), formatear(), MAX_PENDIENTES (+4 more)

### Community 15 - "mediciones.controller.js"
Cohesion: 0.13
Nodes (21): deleteSesion(), finalizarSesion(), getCsv(), getMedicionesDeSesion(), getSesionActiva(), getSesiones(), getStatus(), iniciarSesion() (+13 more)

### Community 16 - "Fase 7 — Revisión de la interfaz y plan de diseño"
Cohesion: 0.10
Nodes (20): 1. Salida de la revisión (formato archivo:línea), 2. Hallazgos que se mantienen, con su justificación, 3. Plan de diseño (skill frontend-design), 4. Contraste AA de los pares texto/fondo, 5. Segunda pasada de web-design-guidelines (después de corregir), 6. Verificación en el navegador integrado, Fase 7 — Revisión de la interfaz y plan de diseño, frontend/index.html (+12 more)

### Community 17 - "Fase 4: Pico W (docs)"
Cohesion: 0.16
Nodes (15): Cuestiones abiertas (física de solución salina, control de motores, eje Z, dirección I2C), Estado de la Pico W en la barra superior (solo modo real), Fase 4: Pico W como cliente (pendiente), Sensor HMC5883L (magnetómetro AMR triaxial I2C), Latido POST /api/dispositivo/latido, Mesa cartesiana XY (NEMA 17, husillos T8), Raspberry Pi Pico W (RP2040), QMC5883L (chip alternativo en módulos GY-271) (+7 more)

### Community 18 - "Estado de las fases (1 a 8)"
Cohesion: 0.15
Nodes (14): api/cliente.js (apiFetch; 401 → login), context/AuthContext.jsx (useAuth), Carpeta mnt/ sobrante (se borra en la Fase 8), CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto, COMANDOS.md (guía de arranque), Estado de las fases (1 a 8), Fase 2: Login y usuarios (hecha), Fase 8: Tests y despliegue (pendiente) (+6 more)

### Community 19 - "SAVD / TMS (sistema de adquisición y visualización)"
Cohesion: 0.10
Nodes (19): Raspberry Pi 5 (servidor Node.js + MariaDB + Nginx), Paso 2b — Crear el usuario administrador (npm run crear-admin), Paso 2 — Crear la base de datos y el usuario (setup_db.sql), COMANDOS.md — Guía de arranque TMS v3.0, Paso 1 — Instalar MariaDB en la Raspberry Pi, Pasos 3–7 — Dependencias, backend (4000), frontend (5173) y dashboard, Migraciones para bases de versiones anteriores (001, 002, 003), Problemas comunes (+11 more)

### Community 20 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.20
Nodes (8): API REST actual (roles público/sesión/op/admin), Códigos HTTP 400/401/403/404/409/422, config/roles.js (ROLES y TEMAS), middleware/auth.js (requiereLogin, requiereRol), middleware/errores.js (404 y errores en JSON), middleware/validar.js (validadores → req.<algo>, 400/422), Roles admin / operador / observador, hooks/useServerStatus.js (/api/status cada 15 s)

### Community 21 - "Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS"
Cohesion: 0.11
Nodes (18): 1.1 Latido, 1.2 Lote de mediciones, 1.3 Códigos de error, 1. Resumen del protocolo, 2. Idempotencia, búfer y reintentos, 3. El token del dispositivo, 4.1 Verificar el chip, 4.2 Configuración y rangos (+10 more)

### Community 22 - "Prompt Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas"
Cohesion: 0.15
Nodes (13): Fase 6: Frontend funcional (pendiente), Gráficas y datos del dashboard (LineChart, Canvas3D, Superficie3D, tabla, KPI, historial), Menú lateral (usuario, modo, tema, navegación), Navegación en la URL con History API (sin react-router), SSE /api/stream (eventos medicion, sesion, configuracion), Stack: React 18 + Vite 5, Node 20 + Express 4 + mysql2, MariaDB, Chart.js/Three.js/Plotly, Bootstrap 5, hooks/useAcquisition.js (sin simulación: configuración, SSE, iniciar/detener), Vulnerabilidades restantes (nodemon, esbuild/vite, plotly.js → maplibre-gl) (+5 more)

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
Nodes (19): Borrado lógico de sesiones (eliminada_en, restaurar), CSV generado en el servidor con metadatos, Fase 5: Datos y trazabilidad (pendiente), Física de espira exacta (K(k), E(k) por AGM), Hallazgos de la auditoría abiertos (C1, C3, C4, A3, A5–A7, M1–M10, B1, B5), Metadatos de reproducibilidad en sesiones (config_*, versiones, huecos), Ruido con mulberry32 y Box–Muller, Precisión float32 (FLOAT → DOUBLE en Fase 5) (+11 more)

### Community 34 - "medicion_campo_qmc5883p.py"
Cohesion: 0.20
Nodes (7): iniciar(), leer_cuentas(), leer_uT(), medir_fondo(), calibrar_cero(), leer_voltios(), principal()

### Community 36 - "HistorialPage.jsx"
Cohesion: 0.21
Nodes (21): ModalConfirmacion, StartModal, StopModal, useModalBootstrap(), CampoPaso(), CampoZona(), ControlPanel(), GrupoOpciones() (+13 more)

### Community 39 - "firmware/barrido.py"
Cohesion: 0.23
Nodes (8): prueba(), a_maquina(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), reanudar_en(), total_puntos()

### Community 41 - "firmware_hall_1d/red.py"
Cohesion: 0.15
Nodes (9): latido(), post(), ahora_ms(), conectado(), conectar_inicial(), mantener(), _pedir_conexion(), rssi() (+1 more)

### Community 42 - "App.jsx"
Cohesion: 0.19
Nodes (15): App(), Shell(), MenuLateral(), NAVEGACION, Navbar, useAuth(), leer(), SECCIONES (+7 more)

### Community 43 - "ConfigContext.jsx"
Cohesion: 0.17
Nodes (19): aTexto(), escribirRuta(), leerRuta(), SeccionFormulario(), AYUDA, DESCRIPCION, SelectorModeloSensor(), aplicarTema() (+11 more)

### Community 44 - "firmware/red.py"
Cohesion: 0.20
Nodes (10): latido(), ahora_ms(), conectar_inicial(), mantener(), _pedir_conexion(), rssi(), sincronizar_reloj(), _desfase_epoch() (+2 more)

### Community 45 - "dispositivo.routes.js"
Cohesion: 0.36
Nodes (8): generarToken(), getEstado(), latido(), lote(), patchDispositivo(), revocarToken(), soloAdmin, ultimoSeq()

### Community 47 - "Eje"
Cohesion: 0.19
Nodes (6): codificar(), _en_paralelo(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 49 - "Pin"
Cohesion: 0.32
Nodes (3): Eje, pedir_mm(), principal()

### Community 50 - "QMC5883P"
Cohesion: 0.12
Nodes (5): 6. En el firmware cliente (`firmware/`): hecho el 2026-11-12, En el servidor y la página: hecho el 2026-11-12 (opción **b**), ErrorSensor, QMC5883P, _rango_valido()

### Community 51 - "Mesa"
Cohesion: 0.20
Nodes (3): _en_paralelo(), ErrorMovimiento, Mesa

### Community 52 - "Controlador"
Cohesion: 0.06
Nodes (12): a_maquina(), _decimas(), ejecutar(), errores_de_zona(), ErrorZona, lecturas_por_punto(), Progreso, punto() (+4 more)

### Community 53 - "Hall49E"
Cohesion: 0.12
Nodes (13): apagar(), cero(), _correr(), hall(), ir(), _leer(), _m(), origen() (+5 more)

### Community 54 - "firmware_hall_1d/main.py"
Cohesion: 0.13
Nodes (7): poner(), apagar(), _bootsel_pulsado(), _correr(), principal(), _bootsel_pulsado(), bootsel_button()

### Community 57 - "machine.py"
Cohesion: 0.17
Nodes (5): _Mem32, reset(), Timer, WDT, 3. Origen, límites y regreso al origen

### Community 58 - "services/geometria.js"
Cohesion: 0.29
Nodes (9): erroresDePaso(), indiceDeMalla(), indicesDeSerpentina(), mallaDeBarrido(), mallaDeZona(), PASO_MAX_MM, PASOS_SUGERIDOS_MM, serpentinaDeIndices() (+1 more)

### Community 59 - "simulador.test.js"
Cohesion: 0.25
Nodes (12): generadorGaussiano(), mulberry32(), campoEnPlaca(), campoEspira(), integralesElipticas(), crearGeneradorMuestras(), FACTOR_SATURACION, limiteSensorUT() (+4 more)

### Community 60 - "firmware/main.py"
Cohesion: 0.19
Nodes (4): poner(), apagar(), _correr(), principal()

### Community 61 - "emular-pico.js"
Cohesion: 0.25
Nodes (15): firmware/pico_w_cliente_ejemplo.py (MicroPython), azar, bucleLatido(), bucleMedicion(), dormir(), enviarConReintento(), gauss, hora() (+7 more)

### Community 62 - "sesiones.js"
Cohesion: 0.17
Nodes (19): barridoVigente(), limiteCampoUT(), mallaDeSesion(), zonaDeSesion(), obtener(), limitesDeBarrido(), ErrorIngesta, olvidarSesion() (+11 more)

### Community 63 - "useSesionActiva.js"
Cohesion: 0.29
Nodes (10): claveDe(), porSeq(), useSesionActiva(), abrir(), alConectar, cerrar(), EVENTOS, suscriptores (+2 more)

### Community 64 - "dispositivo.js"
Cohesion: 0.38
Nodes (9): calcularEnLinea(), cambiarActivo(), cargar(), difundirEstado(), estadoPublico(), generarToken(), registrarLatido(), revisar() (+1 more)

### Community 65 - "Firmware de la Raspberry Pi Pico W (MicroPython)"
Cohesion: 0.12
Nodes (17): 10. LED y comportamiento ante fallas, 11. Pruebas en el PC, 12. Límites conocidos, 1. Archivos, 2.1 Pines (cámbialos en `config.py`), 2.2 TB6600, 2.3 Sin finales de carrera, 2. Conexiones (+9 more)

### Community 68 - "Sensor HMC5883L (magnetómetro AMR triaxial I2C)"
Cohesion: 0.11
Nodes (23): Claves de configuración (modo_operacion, barrido, sensor, simulacion, dispositivo, visualizacion, datos), config/barrido.js (tamanoPlacaMM, mallaParaPaso, limiteCampoUT), ControlPanel.jsx (velocidad, paso, medio), Fase 3: Configuración, modos y simulador en el servidor (hecha), Ganancias válidas del HMC5883L (0,88–8,1 Ga), Geometría derivada del paso (grid_n, z_levels, puntos), HistorialPage.jsx (filtros; CSV en el navegador), Ingesta por lotes POST /api/dispositivo/mediciones (idempotente por seq) (+15 more)

### Community 70 - "api.integ.js"
Cohesion: 0.26
Nodes (8): carpetaServidor, sesionSimulada(), carpetaServidor, cliente(), configurarEntorno(), esperar(), leerCSV(), levantar()

### Community 71 - "trazabilidad.test.js"
Cohesion: 0.26
Nodes (13): puntoDeMalla(), calcularHuecos(), COLUMNAS_CSV, encabezadoCSV(), escaparMeta(), fecha(), lineaCSV(), MAX_HUECOS_LISTADOS (+5 more)

### Community 72 - "nginx/tms.conf (proxy inverso, NO TOCAR)"
Cohesion: 0.20
Nodes (7): config/database.js (pool mysql2 en UTC), Fase 1: Base del backend (hecha), Límite de intentos de login (5 en 15 min, 429), Migración 001 (sesiones hora local a UTC, no ejecutada), nginx/tms.conf (proxy inverso, NO TOCAR), server/server.js (entrada Express), services/limiteIntentos.js (5 fallos en 15 min)

### Community 73 - "Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante)"
Cohesion: 0.25
Nodes (6): controllers/auth.controller.js · usuarios.controller.js, Contraseñas con scrypt (sal 16 bytes, timingSafeEqual), Cookie tms_sesion (HttpOnly, SameSite=Strict, 12 h deslizante), services/passwords.js (scrypt), services/sesionUsuario.js (token, SHA-256, cookie tms_sesion), Token Bearer del dispositivo (SHA-256, mostrado una vez)

### Community 76 - "DMA"
Cohesion: 0.22
Nodes (5): DMA, 8.1 MicroPython, 8.2 Cargar los archivos, 8.3 Calibración, 8. Instalar y calibrar

### Community 77 - "4. Conexiones"
Cohesion: 0.08
Nodes (26): 1. Material, 2. Pines de la Raspberry Pi Pico W, 3.1 Interruptores (DIP) de cada TB6600, 3. El driver TB6600, 4.1 Señales: Pico W → TB6600 (cátodo común), 4.2 Sobre los 3,3 V y la entrada ENA, 4.3 Motores → TB6600, 4.4 Fuente de los motores → TB6600 (+18 more)

### Community 78 - "punto"
Cohesion: 0.29
Nodes (4): _decimas(), indices(), punto(), 4. Recorrido en serpentina

### Community 79 - "correr"
Cohesion: 0.47
Nodes (3): correr(), Limites, mover()

### Community 86 - "firmware_hall_1d/motores.py"
Cohesion: 0.19
Nodes (5): codificar(), pasos_hechos(), perfil(), periodo_de(), y_para()

### Community 87 - "validacionConfiguracion.js"
Cohesion: 0.11
Nodes (21): BLOQUEADAS_CON_SESION, getConfiguracion(), putConfiguracion(), MAX_PUNTOS_SESION, MEDIOS, PASO_MIN_MM, sesionAbierta(), CUENTAS_MAXIMAS (+13 more)

### Community 88 - "Prompts: QMC5883P en el firmware cliente y recorrido en serpentina"
Cohesion: 0.50
Nodes (3): Prompt 1 — Sesión nueva: firmware cliente de la Pico W, Prompt 2 — Sesión ya creada: página web (servidor y frontend), Prompts: QMC5883P en el firmware cliente y recorrido en serpentina

### Community 89 - "firmware/cliente.py"
Cohesion: 0.13
Nodes (3): Enviador, post(), conectado()

### Community 92 - "sensor"
Cohesion: 0.33
Nodes (4): fondo(), _s(), sensor(), _texto()

### Community 93 - "Magnetómetro QMC5883P con la Raspberry Pi Pico W"
Cohesion: 0.25
Nodes (8): 1. Conexión, 2. Registros, 3. Rangos (registro `0x0B`, bits 3–2), 4. Medición, 5. Aplicación, 7. Problemas comunes, Diferencias con el HMC5883L (lo que daba por hecho el firmware viejo), Magnetómetro QMC5883P con la Raspberry Pi Pico W

### Community 96 - "firmware_hall_1d/registro.py"
Cohesion: 0.60
Nodes (3): _desfase_epoch(), _hora(), log()

### Community 97 - "rp2.py"
Cohesion: 0.20
Nodes (5): _programa_pasos(), _programa_pasos(), asm_pio(), PIO, StateMachine

## Ambiguous Edges - Review These
- `Raspberry Pi Pico W (RP2040)` → `Raspberry Pi Pico 2W (C++ / MicroPython)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **38 isolated node(s):** `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)`, `Tabla dispositivos (Fase 4)`, `api/cliente.js (apiFetch; 401 → login)`, `LoginPage.jsx · CambiarPasswordPage.jsx` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 521 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `7. Orden del barrido: serpentina` connect `Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS` to `utils/geometria.js`, `services/geometria.js`, `trazabilidad.test.js`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `QMC5883P` (e.g. with `1.2 Lote de mediciones` and `6. En el firmware cliente (`firmware/`): hecho el 2026-11-12`) actually correct?**
  _`QMC5883P` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Estado de la Pico W en la barra superior (solo modo real)`, `Red por hotspot de iPhone (varios observadores)`, `Tabla dispositivos (Fase 4)` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils/geometria.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08563134978229318 - nodes in this community are weakly interconnected._
- **Why does `indiceEnMalla()` connect `utils/geometria.js` to `Firmware de la Raspberry Pi Pico W — protocolo con el servidor TMS`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Controlador` (e.g. with `ErrorSensor` and `QMC5883P`) actually correct?**
  _`Controlador` has 2 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Raspberry Pi Pico W (RP2040)` and `Raspberry Pi Pico 2W (C++ / MicroPython)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._