# CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto

Este archivo es la fuente de contexto para cualquier sesión de Claude que trabaje en este repositorio. Léelo completo antes de tocar código. Al terminar una fase, **actualiza la sección "Estado de las fases"** (y lo que haya cambiado en las demás secciones) para que la siguiente sesión parta del estado real.

Los prompts de cada fase están en [docs/prompts-sesiones.md](docs/prompts-sesiones.md). **Las 8 fases están hechas** (ver la sección 6); lo que queda está en las notas de la Fase 8.

---

## 1. Qué es el proyecto

Sistema de adquisición y visualización de datos para la tesis de ingeniería (IPN, ESIME Zacatenco) sobre la **caracterización del campo magnético** en un montaje de estimulación magnética transcraneal (TMS) sobre un phantom de solución salina.

- Un sensor recorre una malla sobre una **zona de muestreo** X × Y × Z que elige el operador en cada sesión (por defecto toda la base: **60 × 60 mm** y planos Z de **0 a 20 mm**; los límites de la base se configuran, ver 7.0). El **paso de medición** se elige al iniciar cada sesión (ver 7.0) y se aplica **igual en X, Y y Z**:

  | Paso | Malla X-Y | Planos Z (mm) | Puntos por sesión |
  |---|---|---|---|
  | 0,5 cm (5 mm, el de siempre) | 13 × 13 | 0, 5, 10, 15, 20 | **845** |
  | 1 cm (10 mm) | 7 × 7 | 0, 10, 20 | 147 |
  | 2 cm (20 mm) | 4 × 4 | 0, 20 | 32 |

  Desde el 2026-11-10 el paso es **libre** (en mm, con un decimal; ver 7.0): los de la tabla son solo los más usados. Por ejemplo, 7,5 mm da 9 × 9 × 3 planos = 243 puntos.
- Por cada punto se guardan las tres componentes Bx, By, Bz (en **µT**) y su módulo |B|.
- Hoy los datos los genera una **simulación**. Más adelante los mandará una **Raspberry Pi Pico W** por Wi-Fi.

### Hardware (confirmado por el usuario)

| Pieza | Detalle |
|---|---|
| Servidor | Raspberry Pi 5 con Node.js, MariaDB y Nginx. **Esta carpeta NO es la Raspberry**: el usuario descargará el proyecto ahí y lo levantará después. |
| Microcontrolador | **Raspberry Pi Pico W** (RP2040). No es la Pico 2W, aunque algunos textos viejos digan "Pico 2W". |
| Sensor magnético (3 ejes) | Módulo **QMC5883P** por I2C, dirección **0x2C** (confirmado y funcionando, 2026-11-12). La tienda lo vendía como HMC5883L, pero **no lo es**: ni HMC5883L (0x1E) ni QMC5883L (0x0D). Rangos de 2, 8, 12 y 30 G; 200 Hz. Ficha completa en [docs/sensor-qmc5883p.md](docs/sensor-qmc5883p.md). |
| Sensor Hall (1 eje) | **49E** (SS49E) lineal, analógico, en GP26/ADC0 con 3,3 V: unos 9,24 mV/mT y unos 0,09 mT por cuenta del ADC. Lo usa el firmware de prueba [firmware_hall_1d/](firmware_hall_1d/README.md). |
| Posicionamiento | Mesa cartesiana XY con motores NEMA 17 y husillos T8 (0,04 mm por paso teórico). Requisito: error posicional menor que ±1 mm. |
| Red | Hotspot de un iPhone, con salida a internet. Varias personas (el director, un ingeniero, el tesista y un compañero) miran el dashboard a la vez desde laptops y teléfonos. |

**Los sensores son solo de prueba.** El usuario sabe que ni el QMC5883P ni el Hall 49E miden el pulso real de la bobina TMS. **No vuelvas a señalarlo** ni lo uses como argumento en contra de nada.

**Cómo funciona el QMC5883P** (resumen; lo demás está en `docs/sensor-qmc5883p.md`):
- **Conexión probada:** SDA → GP0 (pin 1), SCL → GP1 (pin 2), VCC → 3V3(OUT) (pin 36), GND → pin 38; I2C0 a 100 kHz. El firmware cliente todavía dice GP4/GP5.
- **Inicialización:**
  1. Chip ID `0x00` = `0x80`.
  2. `0x29 ← 0x06` (signo de los ejes).
  3. `0x0B ← bits_rango << 2` (Set/Reset y rango).
  4. `0x0A ← 0xCD` (modo normal, 200 Hz). **Sin este paso, todo vale 0.**
  5. Esperar 20 ms.
- **Lectura:**
  - Esperar `DRDY` (`0x09` bit 0, con un límite de 100 ms).
  - Leer 6 bytes desde `0x01` con `struct.unpack('<hhh')`: orden **X, Y, Z**, **byte bajo primero**, de −32768 a 32767.
  - La saturación es el bit **OVFL** (`0x09` bit 1), **no** −4096.
- **Rangos** (`0x0B`, bits 3–2):

  | Rango | Bits | Cuentas/G | Máximo |
  |---|---|---|---|
  | 30 G | 0 | 1000 | ±3000 µT |
  | 12 G | 1 | 2500 | ±1200 µT |
  | 8 G | 2 | 3750 | ±800 µT |
  | 2 G | 3 | 15000 | ±200 µT |

  Conversión: µT = cuentas / (cuentas/G) × 100.
- **Medición:** se promedian N lecturas, y el fondo (Tierra + entorno, con la bobina apagada) se mide y se resta. Ante un `OSError`, se vuelve a inicializar.
- Los programas que funcionan son `firmware/prueba_qmc5883p.py` y `firmware/medicion_campo_qmc5883p.py`.
- La biblioteca de Arduino que trajo el módulo (Adafruit HMC5883) no servía para este chip y se borró el 2026-11-12 a pedido del usuario (recuperable desde git).

El "+5 mm" que aparece en la simulación es el **standoff**: la separación física entre la bobina y el elemento sensor. El **origen de coordenadas** es el hotspot, debajo del centro de la bobina, aunque el código actual usa x, y de 0 a 60 mm con el centro en 30.

**Python no se usa** en el proyecto: ignora cualquier mención a un puente con Python.

### Acceso de administrador (decisión del usuario, 2026-11-09)

El sistema trae un acceso **admin / admin**, sin cambio obligatorio de contraseña, **en desarrollo y en la Raspberry**. Se crea o restaura con `npm run crear-admin -- --predeterminado` (no aplica la longitud mínima de 8). Ya existe en la base local del usuario. Las sesiones de Claude lo usan para verificar en el navegador y con curl, y **no deben borrarlo ni cambiarle la contraseña**. El usuario conoce el riesgo de que cualquiera en el hotspot pueda entrar como admin; no lo vuelvas a discutir, como mucho recuérdalo una vez en la guía de despliegue.

---

## 2. Restricciones del usuario (obligatorias)

1. **No tocar `nginx/tms.conf`.** La arquitectura es MVC detrás de un proxy inverso y se queda así. Su `proxy_pass http://127.0.0.1:4000/;` **quita el prefijo `/api`**. Por eso Express monta el router dos veces: en `/api` (para el proxy de Vite en desarrollo) y en `/` (para Nginx en producción). Cualquier arreglo de rutas se hace del lado de Express.
2. **No cambiar las tecnologías**: React 18 + Vite 5 en el frontend; Node.js 20 + Express 4 + mysql2 en el backend; MariaDB; Chart.js, Three.js y Plotly para las gráficas; Bootstrap 5 y Bootstrap Icons. Se mantiene el **MVC** en el backend (routes → middleware → controllers → models, más `services/` para la lógica compartida).
   - **No agregues frameworks ni librerías nuevas** (nada de react-router, zod, ajv, express-session, passport, bcrypt, cookie-parser ni Vitest) salvo que el usuario lo apruebe. Usa lo que trae Node: `node:crypto` (`scrypt`, `randomBytes`), `node:test` y `node:assert`.
   - Sí está permitido cambiar a una **variante del mismo paquete**, como `plotly.js-gl3d-dist-min` en lugar de `plotly.js`.
3. **Los colores del modo oscuro no cambian**: son los de `:root` en `frontend/src/styles/global.css`. Se puede **agregar** un modo claro.
4. **No se quitan gráficas ni datos** del dashboard: la gráfica de líneas Bx/By/Bz, el mapa 3D de flechas (Canvas3D), la superficie de Plotly (Superficie3D), la tabla de lecturas, las tarjetas KPI y el historial. Se pueden reordenar y ajustar (forma, ejes, escalas), pero su uso y sus datos se mantienen.
5. **Los commits los hace el usuario.** No hagas `git commit` ni `git push`, ni crees ramas, salvo que te lo pida.
6. Para el frontend, el usuario quiere sus skills: **`web-design-guidelines`** para revisar y **`frontend-design`** para corregir.
7. Responde en **español**, en prosa completa. Nada de modo caveman.

---

## 3. Arquitectura actual

```
PT/
├── CLAUDE.md                     ← este archivo
├── COMANDOS.md                   ← guía completa de instalación en la Raspberry Pi 5 (Fase 8)
├── README.md                     ← descripción real del sistema
├── deploy/tms-server.service     ← unit de systemd (usuario tms, Restart=on-failure)
├── docs/fase7-revision-diseno.md ← revisión de interfaz, plan de diseño y contrastes
├── docs/prompts-sesiones.md      ← prompts de cada fase pendiente
├── docs/instructivo-calibracion-y-conexiones.md ← cableado de los 3 TB6600 con pines físicos y calibración de pasos/mm
├── docs/firmware-pico-w.md       ← protocolo de la Pico W, token, NTP, hotspot (su sección del sensor todavía describe el HMC5883L)
├── docs/sensor-qmc5883p.md       ← el magnetómetro real: conexión, registros, rangos, medición y QUÉ FALTA en el firmware cliente
├── docs/prompts-qmc5883p-y-serpentina.md ← prompts (2026-11-12): firmware cliente con QMC5883P y serpentina; servidor y página para el QMC5883P
├── firmware/                     ← firmware MicroPython de la Pico W (2026-11-10; guía en firmware/README.md):
│                                    config.py, main.py, red.py, cliente.py, sensor.py (⚠ todavía HMC5883L), motores.py (PIO + DMA, TB6600),
│                                    barrido.py, led.py, registro.py, banco.py (prueba de banco y calibración),
│                                    prueba_calibracion.py (independiente, para Thonny: X/Y/Z en mm y regreso al origen),
│                                    prueba_qmc5883p.py y medicion_campo_qmc5883p.py (QMC5883P, independientes, funcionan),
│                                    prueba_hall_49e.py (Hall 49E en el ADC, independiente),
│                                    secretos_ejemplo.py (secretos.py está en .gitignore), pruebas_pc/ (stubs y tests en CPython)
│                                    y pico_w_cliente_ejemplo.py (el ejemplo anterior, solo referencia)
├── firmware_hall_1d/             ← copia del firmware para el Hall 49E de un eje (2026-11-11; guía en su README.md):
│                                    sensor_hall.py (nuevo), barrido.py y main.py adaptados, el resto copiado sin cambios;
│                                    secretos.py local (en su propio .gitignore) y pruebas_pc/ (usa los stubs de firmware/)
├── nginx/tms.conf                ← NO TOCAR
├── server/                       ← Node.js + Express (ESM, "type":"module")
│   ├── server.js                 ← entrada: dotenv, testConnection, iniciarServicios y listen
│   ├── app.js                    ← crearApp() (cors, json(100kb), routers en /api y /, errores) e iniciarServicios()
│   ├── .env / .env.example       ← el .env está ignorado por git
│   ├── setup_db.sql              ← crea la BD, el usuario (permisos mínimos) y las tablas
│   ├── migrations/001_sesiones_hora_local_a_utc.sql
│   ├── migrations/002_usuarios.sql            ← tablas usuarios y sesiones_login (Fase 2)
│   ├── migrations/003_configuracion.sql       ← configuracion y sesiones.origen/paso_mm/medio (Fase 3)
│   ├── migrations/004_dispositivo.sql         ← dispositivos y mediciones.seq/raw/saturado/ts_dispositivo (Fase 4)
│   ├── migrations/005_trazabilidad.sql        ← DOUBLE en mediciones; metadatos y borrado lógico en sesiones (Fase 5)
│   ├── migrations/006_paso_libre.sql          ← sesiones.paso_mm DECIMAL(4,1): paso libre en mm (2026-11-10)
│   ├── migrations/007_zona_muestreo.sql       ← sesiones.zona_x/y/z_mm y barrido → límites de la base (2026-11-10)
│   ├── config/database.js        ← pool de mysql2, timezone 'Z', SET time_zone '+00:00'
│   ├── config/barrido.js         ← lee la configuración: tamanoPlacaMM(), mallaParaPaso(paso), limiteCampoUT()
│   ├── config/roles.js           ← ROLES ('admin','operador','observador') y TEMAS
│   ├── middleware/cors.js        ← orígenes de CORS_ORIGINS; un origen ajeno no recibe cabeceras (sin 500)
│   ├── middleware/auth.js        ← leerCookie, requiereLogin → req.usuario y req.sesionLoginId, requiereRol(...),
│   │                                requiereDispositivo (Bearer de la Pico → req.dispositivo)
│   ├── middleware/validar.js     ← validarIdSesion → req.idSesion, validarNuevaSesion, validarFiltrosSesiones,
│   │                                validarLatido, validarLoteDispositivo, validarCambiosDispositivo (Fase 4),
│   │                                y los de la Fase 2: validarLogin,
│   │                                validarCambioPassword, validarPreferencias, validarIdUsuario,
│   │                                validarNuevoUsuario, validarCambiosUsuario, validarPasswordNueva
│   │                                (400 si falta algo o el tipo es incorrecto, 422 si un valor es inválido)
│   ├── middleware/errores.js     ← 404 y manejador de errores, siempre en JSON
│   ├── routes/auth.routes.js · usuarios.routes.js · mediciones.routes.js · dispositivo.routes.js
│   ├── controllers/auth.controller.js · usuarios.controller.js
│   ├── controllers/mediciones.controller.js  ← sesiones y mediciones; delega en services/
│   ├── controllers/configuracion.controller.js · routes/configuracion.routes.js
│   ├── controllers/dispositivo.controller.js  ← estado, token, latido y lotes de la Pico W
│   ├── models/Configuracion.js   ← SQL de la tabla configuracion (acepta JSON ya convertido o como texto)
│   ├── models/Medicion.js        ← SQL; insertarMedicion solo inserta si la sesión está abierta;
│   │                                insertarLote: transacción con FOR UPDATE sobre la sesión (idempotente por seq)
│   ├── models/Dispositivo.js     ← SQL de dispositivos (token como SHA-256)
│   ├── models/Usuario.js         ← SQL de usuarios; actualizar() protege al último admin con FOR UPDATE
│   ├── models/SesionLogin.js     ← SQL de sesiones_login
│   ├── services/passwords.js     ← scrypt (hashPassword, verificarPassword, errorDePassword)
│   ├── services/sesionUsuario.js ← token, SHA-256, cookie tms_sesion, limpieza horaria
│   ├── services/limiteIntentos.js ← 5 fallos por usuario+IP en 15 min, en memoria
│   ├── services/configuracion.js ← caché en memoria; cargar() antes del listen; actualizar() valida, guarda y difunde
│   ├── services/validacionConfiguracion.js ← reglas por clave (puro); ganancias HMC5883L; limiteSensorUT()
│   ├── services/tiempoReal.js    ← SSE: ids, búfer de 2000, Last-Event-ID, retry 3000, drain, resincronizar, ping de 25 s
│   ├── services/bufferEventos.js ← puro: búfer circular del SSE
│   ├── services/trazabilidad.js  ← puro: calcularHuecos, encabezadoCSV, lineaCSV, nombreArchivoCSV
│   ├── services/version.js       ← versión de package.json + commit (git rev-parse --short HEAD)
│   ├── services/sesiones.js      ← una sola sesión abierta (cola de promesas), iniciar/finalizar, cierre de huérfanas
│   ├── services/ingesta.js       ← registrarMedicion (simulador: seq desde 1, desborde → saturado) y
│   │                                registrarLoteDispositivo (Pico W); valida, |B|, inserta, difunde
│   ├── services/conversionSensor.js ← puro: cuentas → µT, −4096, validación de lecturas, clasificarLote
│   ├── services/dispositivo.js   ← estado de la Pico en memoria, temporizador de 1 s, event: dispositivo
│   ├── services/simulador.js     ← setTimeout encadenado sobre la malla de la sesión; usa ingesta.js
│   ├── services/simulacionPura.js · fisicaEspira.js · aleatorio.js · geometria.js ← puros, con tests
│   ├── tests/*.test.js           ← unitarios (npm test = test:unit): simulador, conversion, ingesta-dispositivo,
│   │                                trazabilidad, passwords (y límite de intentos), validadores — 53 pruebas
│   ├── tests/integracion/        ← helper.js + api.integ.js (npm run test:integracion, contra tms_db_test)
│   ├── tests/setup_test_db.sql   ← setup_db.sql con el nombre tms_db_test
│   ├── scripts/crear-admin.js    ← npm run crear-admin (o ADMIN_PASSWORD=…; --predeterminado = admin/admin)
│   └── scripts/emular-pico.js    ← npm run emular-pico -- --token … (latido, lotes, pérdidas, duplicados)
├── frontend/                     ← React 18 + Vite 5
│   ├── vite.config.js            ← proxy /api → 127.0.0.1:4000; build.outDir '../dist'
│   ├── index.html                ← aplica el tema guardado antes de pintar; nada de CDN
│   └── src/
│       ├── main.jsx              ← importa Bootstrap, iconos y las fuentes (@fontsource); envuelve App en AuthProvider
│       ├── App.jsx               ← login / cambio forzado / Shell (Navbar + MenuLateral + página de la URL);
│       │                            useSesionActiva vive aquí para no perder datos al cambiar de página
│       ├── api/cliente.js        ← apiFetch, enviarJSON, leerJSON; credentials 'same-origin'; un 401 devuelve al login
│       ├── context/AuthContext.jsx   ← useAuth(): usuario, iniciarSesion, cerrarSesion, cambiarPassword, guardarPreferencias
│       ├── context/ConfigContext.jsx ← useConfig(): config, opciones, modoOperacion, guardarClave, tema/temaEfectivo/
│       │                                cambiarTema (data-theme + data-bs-theme + color-scheme), reducirMovimiento
│       ├── pages/                ← LoginPage · CambiarPasswordPage · DashboardPage · HistorialPage · ConfiguracionPage
│       ├── utils/geometria.js    ← PASOS, MEDIOS, MODOS, mallaDePaso(barrido, paso), indiceEnMalla (mismo cálculo que el servidor)
│       ├── utils/formato.js      ← Intl: numero(v, decimales), fechaHora(v, zona), horaPrecisa, diaLocal, duracion
│       ├── hooks/useStream.js       ← un único EventSource compartido (useEventoStream, useAlConectarStream)
│       ├── hooks/useSesionActiva.js ← carga /sesiones/activa al (re)conectar y con `resincronizar`; dedup por seq;
│       │                               un render por cuadro (rAF); iniciar/detener con guardia contra doble clic
│       ├── hooks/useDispositivo.js  ← estado de la Pico W y texto "hace N s" recalculado cada segundo
│       ├── hooks/useNavegacion.js   ← ?vista=dashboard|historial|configuracion&seccion=… con la History API
│       ├── hooks/useTokensTema.js   ← lee los tokens CSS del tema para Chart.js, Three.js y Plotly
│       ├── hooks/useServerStatus.js ← consulta /api/status cada 15 s
│       ├── components/layout/  Navbar.jsx · MenuLateral.jsx (role="dialog", foco atrapado, Esc, ✕, clic fuera)
│       ├── components/charts/  LineChart.jsx · Canvas3D.jsx · Superficie3D.jsx (lazy, plotly.js-gl3d-dist-min)
│       ├── components/panels/  ControlPanel.jsx (velocidad, paso, medio, progreso)
│       ├── components/ui/      KpiCards.jsx · DataTable.jsx · LimiteErrores.jsx
│       ├── components/modals/  StartModal · StopModal · ModalConfirmacion (refs + useModalBootstrap; sin globales)
│       ├── components/config/  SeccionFormulario (genérico por clave) · SeccionUsuarios · SeccionDispositivo · TokenDispositivo
│       └── styles/global.css     ← :root (oscuro, intacto) + tokens semánticos + [data-theme="light"]
```

### Recorrido de una medición (desde la Fase 3)

0. El usuario inicia sesión (`POST /api/auth/login`); todas las peticiones siguientes, incluido el SSE, llevan la cookie `tms_sesion`.
1. Al abrir el dashboard, el navegador lee `GET /api/configuracion` (configuración, opciones y la sesión abierta, si hay) y se suscribe al SSE.
2. Un operador o admin elige velocidad, paso y medio en la barra del panel y confirma: `POST /api/sesiones {modo, paso_mm, medio}`. El servidor crea la sesión (409 si ya hay otra), con `origen` según `modo_operacion`, y difunde `event: sesion {tipo:'iniciada', sesion}` con su geometría.
3. En simulación, `services/simulador.js` recorre la malla de la sesión (x → y → z) con `setTimeout` encadenado a `ms_por_punto[modo]`. En modo real, la Pico W pregunta en cada latido si hay sesión (`sesion_activa`) y manda lotes de cuentas crudas a `POST /api/dispositivo/mediciones`.
4. Todo pasa por `services/ingesta.js`: valida contra la malla de la sesión, numera o respeta `seq`, convierte (Pico) o marca como saturado el eje que pasa del fondo de escala (simulador), calcula |B|, guarda con la hora del servidor en UTC y difunde `event: medicion`.
5. **Todos** los navegadores dibujan solo lo que llega por SSE (y lo ya medido, con `GET /sesiones/activa` al conectarse), y descartan las lecturas de otra sesión. Nadie genera datos en el navegador.
6. Al recorrer toda la malla, la sesión simulada se cierra sola; también se puede cerrar con `PUT /api/sesiones/:id`. Al cerrar se calculan `puntos_recibidos` y `huecos`, y se difunde `event: sesion {tipo:'finalizada', motivo:'completa'|'manual', sesion}`.
7. El historial usa `GET /api/sesiones` (filtros en el servidor) y el CSV lo genera el servidor (`GET /api/sesiones/:id/csv`).

### API actual (todas las rutas responden también sin el prefijo `/api`)

Roles: **público** = sin sesión; **sesión** = cualquier usuario con login; **op** = operador o admin; **admin** = solo admin. Sin cookie válida, toda ruta no pública responde **401**; con un rol insuficiente, **403**. Mientras el usuario tenga `debe_cambiar_password`, todo responde **403** salvo `/auth/yo`, `/auth/cambiar-password` y `/auth/logout`.

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `GET /api/status` | público | Health-check: `version` (package.json), `commit`, `version_software`, `modo_operacion` | 200 |
| `GET /api/configuracion` | sesión | `{data:{clave:valor…}, opciones:{pasos_mm, medios, ganancias_hmc5883l}, sesion_activa}` | 200 |
| `PUT /api/configuracion/:clave {valor}` | admin | `valor` puede ser parcial en las claves que son objetos (se mezcla). Difunde `event: configuracion` | 200, 400, 404 clave desconocida, 409 (modo, barrido o sensor con sesión abierta), 422 |
| `POST /api/auth/login {usuario,password}` | público | Crea la cookie `tms_sesion` (el usuario se normaliza a minúsculas) | 200, 400, 401 (mensaje único), 429 con `Retry-After` |
| `POST /api/auth/logout` | sesión | Borra la fila de `sesiones_login` y la cookie | 200 |
| `GET /api/auth/yo` | sesión | Usuario actual `{id,usuario,nombre,rol,debe_cambiar_password,preferencias}` | 200 |
| `POST /api/auth/cambiar-password {actual,nueva}` | sesión | Cambia la contraseña, apaga `debe_cambiar_password` y cierra las **demás** sesiones del usuario | 200, 400, 422, 429 |
| `PATCH /api/auth/preferencias {tema}` | sesión | `tema`: `oscuro`, `claro` o `sistema`; se mezcla con el JSON existente | 200, 400, 422 |
| `GET /api/usuarios` | admin | Lista sin hashes | 200 |
| `POST /api/usuarios {usuario,nombre,rol,password}` | admin | Crea con `debe_cambiar_password` | 201, 400, 409 si ya existe, 422 |
| `PATCH /api/usuarios/:id {nombre?,rol?,activo?}` | admin | Desactivar borra sus sesiones de login | 200, 400, 404, 409 último admin, 422 |
| `POST /api/usuarios/:id/restablecer-password {password}` | admin | Deja `debe_cambiar_password` y cierra sus sesiones | 200, 400, 404, 422 |
| `GET /api/stream` | sesión | SSE con `id:` y los eventos `medicion`, `sesion`, `configuracion`, `dispositivo` y `resincronizar`; reenvía desde `Last-Event-ID` (búfer de 2000) | — |
| `POST /api/sesiones {modo, paso_mm?, medio?, zona_mm?: {x, y, z}}` | op | Crea la sesión (7.0) y arranca el simulador en modo simulación. Sin `zona_mm`, toda la base. Responde `{sesionId, sesion}` con `zona_mm`, `grid_nx`, `grid_ny`, `z_levels_mm` y `puntos_esperados` | 201, 409 si ya hay otra abierta, 422 |
| `PUT /api/sesiones/:id` | op | Cierra la sesión y detiene el simulador | 200, 404, 409 si ya estaba cerrada |
| `GET /api/sesiones?modo=&paso_mm=&medio=&origen=&incluir_eliminadas=` | sesión | Lista con COUNT, MAX y MIN (sin saturadas), `saturadas`, metadatos de la Fase 5 (`usuario_id`, `iniciada_por`, `notas`, `puntos_esperados`, `puntos_recibidos`, `huecos`, versiones, `eliminada_en`). Excluye las eliminadas salvo `incluir_eliminadas=1` (solo admin). Incluye `activa` | 200, 403, 422 |
| `GET /api/sesiones/activa` | sesión | `{sesion, mediciones}` de la sesión abierta (mismo formato que `event: medicion`), o `{sesion: null, mediciones: []}` | 200 |
| `PATCH /api/sesiones/:id {notas}` | admin u operador que la inició | Máx. 5000 caracteres; difunde `event: sesion {tipo:'notas'}` | 200, 400, 403, 404, 422 |
| `DELETE /api/sesiones/:id` | admin | **Borrado lógico** (`eliminada_en`); difunde `{tipo:'eliminada'}` | 200, 404, 409 si está en curso o ya eliminada |
| `POST /api/sesiones/:id/restaurar` | admin | Quita el borrado lógico; difunde `{tipo:'restaurada'}` | 200, 404, 409 si no estaba eliminada |
| `GET /api/sesiones/:id/csv` | sesión | CSV en streaming con encabezado `# clave: valor` y columnas con unidades (7.4) | 200, 404 (también si está eliminada) |
| `POST /api/mediciones` | — | **Retirada** (Fase 4): responde 410 e indica la ruta de la Pico | 410 |
| `GET /api/dispositivo/estado` | sesión | `{ok, existe, enLinea, ultimoLatido, firmware, rssi, ip, uptime_s, tieneToken, activo, desfase_ms, umbral_desconexion_s, estadoPico, errorPico}` | 200 |
| `POST /api/dispositivo/token` | admin | Genera el token (32 bytes base64url) y lo devuelve **una vez**; reemplaza al anterior | 201 |
| `DELETE /api/dispositivo/token` | admin | Revoca el token | 200, 404 |
| `PATCH /api/dispositivo {activo}` | admin | Activa o desactiva la Pico | 200, 400, 404 |
| `POST /api/dispositivo/latido {firmware?, rssi?, uptime_s?, ts_dispositivo_ms?, estado?, error?}` | Pico (Bearer) | `{modo_operacion, sesion_activa: {id, modo, paso_mm, medio, zona_mm, grid_nx, grid_ny, z_levels_mm, puntos_esperados, ultimo_seq, barrido, sensor} \| null, intervalo_latido_s, servidor_ts_ms}`; `sesion_activa` solo en modo real y con sesión `hw` | 200, 401, 422 |
| `POST /api/dispositivo/mediciones {sesionId, lecturas:[{seq,xMM,yMM,zMM,raw:{x,y,z},ts_ms}]}` | Pico (Bearer) | Máx. 200 por lote; idempotente por `(sesion_id, seq)`. `{aceptadas, duplicadas, rechazadas:[{seq,error}]}` | 200, 400, 401, 404, 409 (simulación, sesión cerrada o `sim`), 422 |
| `GET /api/sesiones/:id/mediciones` | sesión | Mediciones en JSON, con `seq`, crudos y `saturado` | 200, 404 (también si está eliminada) |

**Detalles del login (Fase 2):**
- El token es de 32 bytes aleatorios (base64url); en la base solo se guarda su SHA-256. La cookie es `HttpOnly; SameSite=Strict; Path=/`, **sin Max-Age** (cookie de sesión del navegador: se borra al cerrarlo), más `Secure` con `NODE_ENV=production`; la expiración de 12 h la aplica el servidor. Por eso, **en producción solo funciona por HTTPS** (Nginx).
- La renovación de 12 h es deslizante, pero solo se escribe en la base si pasó más de 60 s desde el último uso (`RENOVAR_CADA_S`), para no escribir en cada medición.
- El rol y `activo` se leen de la base en cada petición: degradar o desactivar aplica de inmediato.
- `app.set('trust proxy', 'loopback')`: `req.ip` sale de `X-Forwarded-For` solo si la conexión viene de 127.0.0.1 (Nginx).
- El límite de intentos vive en memoria (se reinicia al reiniciar el servidor). El cambio de contraseña tiene su propio contador con el mismo límite.
- Si el usuario no existe, se verifica contra un hash de relleno para que el tiempo de respuesta no delate qué usuarios existen.
- Cada hora (y al arrancar) se borran las sesiones de login expiradas.

### Esquema actual de MariaDB

- `sesiones(id, usuario_id FK NULL, modo ENUM('DC','AC'), origen ENUM('sim','hw'), paso_mm DECIMAL(4,1) UNSIGNED, medio ENUM, iniciada_en, terminada_en NULL, notas TEXT, puntos_esperados, puntos_recibidos, huecos JSON {total, posiciones≤1000}, config_barrido/config_sensor/config_simulacion JSON, version_software VARCHAR(64), version_firmware VARCHAR(40), eliminada_en DATETIME NULL)`, con índices en `iniciada_en`, `(modo, paso_mm, medio, origen)` y `eliminada_en` (migraciones 003 y 005).
- `configuracion(clave VARCHAR(40) PK, valor JSON, actualizado_en DATETIME, actualizado_por FK a usuarios NULL con ON DELETE SET NULL)` (migración 003).
- `mediciones(id, sesion_id FK con ON DELETE CASCADE, seq INT NULL, x_mm, y_mm, z_mm, bx, by, bz, magnitud FLOAT (bx/by/bz/magnitud NULL si saturó), raw_x/raw_y/raw_z SMALLINT NULL, saturado BOOL, timestamp DATETIME(3), ts_dispositivo DATETIME(3) NULL)`, con índice en `sesion_id` y `UNIQUE(sesion_id, seq)` (migración 004).
- `dispositivos(id, nombre UNIQUE, token_hash CHAR(64) UNIQUE NULL, activo, creado_en, ultimo_latido DATETIME(3), ip, firmware, rssi, uptime_s)`, con la fila `pico-w-1` (migración 004).
- **La migración 004 ya se aplicó en la base local** (2026-11-10, con `tms_user`; respaldo previo en `~/tms-respaldos/tms_db_antes_fase4.sql`). La Pico `pico-w-1` quedó sin token.
- `usuarios(id, usuario VARCHAR(32) UNIQUE, nombre VARCHAR(100), rol ENUM('admin','operador','observador'), hash_password, activo BOOL, debe_cambiar_password BOOL, preferencias JSON NULL, creado_en DATETIME, ultimo_acceso DATETIME NULL)` (migración 002).
- `sesiones_login(id CHAR(64) PK = SHA-256 del token, usuario_id FK con ON DELETE CASCADE, creada_en, expira_en, ultimo_uso, ip VARCHAR(45), user_agent VARCHAR(255))`, con índices en `usuario_id` y `expira_en` (migración 002).
- **La migración 002 ya se aplicó en la base local del usuario** (2026-11-09, con `tms_user`, que ahí todavía tiene ALL PRIVILEGES). Existe el usuario `admin` / `admin` (ver la sección 1).
- **La migración 003 ya se aplicó en la base local** (2026-11-10, igual que la 002). Las 24 sesiones existentes quedaron como `sim`, 5 mm y campo magnético. Al arrancar por primera vez, el servidor cerró las sesiones 16 y 28, que seguían abiertas desde junio. Como la migración 001 no se ejecutó, su `terminada_en` (hora UTC de la última medición) queda unas 6 h después de su `iniciada_en` (hora local).
- Desde la migración 005 las columnas numéricas de `mediciones` son **DOUBLE**. Las filas guardadas antes conservan su error de float32 (`2.3410000801086426`); las nuevas no. Las sesiones anteriores a la 005 tienen `puntos_esperados` y `puntos_recibidos` rellenados por la migración, pero `huecos` NULL (no calculados).
- **La migración 005 ya se aplicó en la base local** (2026-11-10; respaldo previo en `~/tms-respaldos/tms_db_antes_fase5.sql`).
- **Todo se guarda en UTC.** Las sesiones creadas antes de la Fase 1 en la BD local del usuario siguen en hora local: la migración 001 **no se ha ejecutado** y la decide el usuario.
- En `setup_db.sql`, el usuario de la aplicación (`tms_user`) tiene solo `SELECT, INSERT, UPDATE, DELETE`, así que **las migraciones se ejecutan como root** (`sudo mysql tms_db < archivo.sql`). En la máquina de desarrollo del usuario, `tms_user` puede tener todavía `ALL PRIVILEGES` de la versión anterior. **Pide confirmación antes de ejecutar migraciones sobre su base**, o pídele que las ejecute.

---

## 4. Convenciones de código

- Nombres de variables, funciones, archivos, columnas y comentarios **en español**, como el resto del proyecto (`iniciarSesion`, `obtenerSesiones`, `sesion_id`).
- Backend en ESM (`import`/`export`).
- **Capas:**
  - Las **rutas** solo declaran.
  - Los **middleware** validan y dejan los valores ya convertidos en `req.<algo>`.
  - Los **controladores** contienen la lógica HTTP.
  - Los **modelos** contienen todo el SQL, con `pool.execute` y parámetros `?`.
  - La lógica que comparten varios controladores va en `services/` (por ejemplo, la ingesta y difusión de mediciones, el simulador o el estado del dispositivo).
- **Respuestas:** siempre JSON `{ ok: true, ... }` o `{ ok: false, error, errores? }`.
  - 400: falta algo o el formato es inválido.
  - 401: sin sesión de usuario.
  - 403: el rol no tiene permiso.
  - 404: el recurso no existe.
  - 409: conflicto de estado (sesión cerrada, modo incorrecto, ya hay una sesión activa).
  - 422: valores inválidos.
- **Unidades:** posiciones en **mm**, campo en **µT**, tiempos en **UTC**. En la API, los instantes van como ISO 8601 con `Z` o como epoch en ms.
- **Redondeo:** solo para mostrar. Nunca se redondea antes de guardar.
- Las migraciones son archivos `server/migrations/NNN_descripcion.sql`, numerados, con comentarios que explican qué hacen y cómo ejecutarlas. Cuando cambie el esquema, actualiza **también** `setup_db.sql`, para que una instalación limpia quede igual que una migrada.
- **No guardes secretos** en el código ni en archivos versionados. Las contraseñas y los tokens se guardan como hash.

---

## 5. Cómo ejecutar y verificar

```bash
# Backend (lee server/.env; PORT=4000)
cd server && npm run dev            # o: node server.js

# Para pruebas sin chocar con el servidor del usuario, usa otro puerto:
cd server && PORT=4100 node server.js

# Frontend en desarrollo (el proxy /api va a 127.0.0.1:4000)
cd frontend && npm run dev          # http://localhost:5173

# Compilar sin tocar ../dist (que es la ruta de producción)
cd frontend && npx vite build --outDir <directorio-temporal> --emptyOutDir
```

- **Verifica la API con `curl`** contra el servidor real y la MariaDB local, que está activa en 127.0.0.1:3306. **Borra las sesiones de prueba que crees** y deja la base como la encontraste.
- **Verifica el frontend en el navegador integrado:** levanta el backend y Vite en segundo plano, abre `http://localhost:5173` y revisa la consola. Al terminar, detén los procesos.
- `cd server && npm test` (= `npm run test:unit`) ejecuta `node --test`, que encuentra solo los `*.test.js`: 53 pruebas sin base de datos. La lógica pura va en módulos que no importan `config/database.js`; `validadores.test.js` pone variables `DB_*` de relleno antes de importar (el pool no se conecta hasta la primera consulta).
- `npm run test:integracion` levanta `app.js` en un puerto aleatorio contra **`tms_db_test`** (nunca `tms_db`; el helper lo impide), vacía sus tablas y crea admin/operador/observador. Sin la base, las pruebas se omiten con el comando para crearla. Variables: `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_NAME`.
- **Sin sudo** (la contraseña de sudo no está disponible para Claude), los tests de integración se pueden correr con una MariaDB temporal del usuario: `mariadb-install-db --no-defaults --datadir=<dir>` y `mariadbd --no-defaults --datadir=<dir> --socket=~/.cache/tmsdb/sock --port=3307` (el socket debe tener una ruta de menos de 108 caracteres), luego `sed 's/CAMBIA_ESTA_CONTRASENA/x/' tests/setup_test_db.sql | mariadb -S ~/.cache/tmsdb/sock -u root` y `TEST_DB_PORT=3307 TEST_DB_PASSWORD=x npm run test:integracion`. Así se verificaron en la Fase 8.

---

## 6. Estado de las fases

| Fase | Estado | Resumen |
|---|---|---|
| 1. Base del backend | ✅ Hecha (commit `Fase1`) | Router en `/api` y `/`; CORS sin 500; pool en UTC; validación de entradas con 400/422; 404 y 409 para sesiones; errores en JSON; credenciales solo en `.env` y `.env.example`; migración 001; Bootstrap empaquetado; `npm audit fix`. |
| 2. Login y usuarios | ✅ Hecha (sin commit todavía) | Tablas `usuarios` y `sesiones_login` (migración 002 y `setup_db.sql`); contraseñas con scrypt; cookie `tms_sesion` HttpOnly con token hasheado; 5 intentos por usuario+IP en 15 min (429); roles admin/operador/observador en todas las rutas (solo `/status` es público); cambio de contraseña forzado; protección del último admin; `npm run crear-admin`; limpieza horaria. Frontend: `AuthContext`, `LoginPage`, `CambiarPasswordPage`, `api/cliente.js` (401 → login), botones ocultos por rol y "Salir" en la Navbar. Verificado con 73 pruebas de curl y en el navegador. |
| 3. Configuración, modos y simulador en el servidor | ✅ Hecha (sin commit todavía) | Migración 003: tabla `configuracion` y `sesiones.origen/paso_mm/medio`. Configuración en memoria con validación por clave y SSE. Una sola sesión abierta; cierre de huérfanas al arrancar. Simulador en el servidor (espira exacta con K y E por AGM, mulberry32, Box–Muller, huecos y saturaciones) a través de `services/ingesta.js`. Parámetros por sesión (7.0): velocidad, paso de 0,5/1/2 cm en X, Y y Z, y medio; filtros en el historial. Frontend sin simulación: todo por SSE, barra de configuración de la medición, etiqueta SIMULACIÓN/REAL y selector para admin. 10 tests con `npm test`; 66 comprobaciones con curl; probado en el navegador con dos pestañas. |
| 4. Pico W como cliente | ✅ Hecha (sin commit todavía) | Migración 004 (`dispositivos`; `seq`, crudos, `saturado` y `ts_dispositivo` en `mediciones`, `UNIQUE(sesion_id, seq)`). Token de la Pico como SHA-256 (`requiereDispositivo`), latido con `sesion_activa` y `ultimo_seq`, lotes idempotentes en una transacción con `FOR UPDATE`, conversión cuentas → µT con offset, −4096 → saturado. Estado en línea con temporizador de 1 s y `event: dispositivo`. `POST /mediciones` responde 410. Emulador (`npm run emular-pico`), `docs/firmware-pico-w.md` y ejemplo en MicroPython. Frontend: `useStream` (un EventSource), `useDispositivo`, indicador en la Navbar (solo modo real) y panel provisional del token. 23 tests; verificado con curl, el emulador (pérdida 0,3 y duplicados: 147 seq sin huecos ni duplicados) y el navegador. |
| 5. Datos y trazabilidad | ✅ Hecha (sin commit todavía) | Migración 005 (DOUBLE; `usuario_id`, `notas`, puntos esperados/recibidos, `huecos`, copias de configuración, versiones, `eliminada_en`). `services/version.js` (versión real en `/status`). Copias de la configuración al iniciar (el simulador usa las de la sesión); huecos y puntos recibidos al cerrar (también las huérfanas). Borrado lógico y restaurar, notas con permisos, `GET /sesiones/activa`, SSE con ids, búfer de 2000, `Last-Event-ID`, `retry`, `drain` y `resincronizar`; CSV en streaming con metadatos. Frontend (hecho junto con la Fase 6): carga de lo ya medido, historial con id real, origen, puntos, huecos, notas, eliminar con modal, ver eliminadas y restaurar. 33 tests; verificado con curl (845/147/32 puntos, huecos con `prob_hueco` 0,05, roles, reconexión del SSE) y en el navegador. |
| 6. Frontend funcional | ✅ Hecha (sin commit todavía) | Reorganización en `pages/`, `components/layout/`, `context/` (Auth y Config) y hooks (`useStream`, `useSesionActiva`, `useDispositivo`, `useNavegacion`, `useTokensTema`); `useAcquisition` y `constants/system.js` eliminados. Navegación en la URL con la History API. Menú lateral accesible. Configuración por secciones (Barrido, Sensor, Simulación, Dispositivo con token, Visualización, Usuarios). Tema oscuro/claro/sistema con persistencia en el usuario y en localStorage (sin parpadeo). Gráficas corregidas (7.5). `plotly.js` → `plotly.js-gl3d-dist-min` cargado aparte. Bundle: de 5 746 kB (1 731 kB gzip) a 860 kB (247 kB gzip) inicial + 1 707 kB (542 kB gzip) diferido. Verificado en el navegador (ver notas). |
| 7. Accesibilidad y diseño (skills) | ✅ Hecha (sin commit todavía) | Revisión con `web-design-guidelines` y correcciones con `frontend-design`; informe, plan, tokens finales y tabla de contraste AA en [docs/fase7-revision-diseno.md](docs/fase7-revision-diseno.md). Fuentes con @fontsource (sin CDN). Filtros del historial en la URL, foco al primer error, aviso de cambios sin guardar, `scroll-padding-top`, áreas seguras, `translate="no"`, espacios de no separación. Bx claro → `#0062A8`. El plan no esperó aprobación porque el usuario pidió trabajar sin pausas. |
| 8. Tests y despliegue | ✅ Hecha (sin commit todavía) | `app.js` separado de `server.js`. Tests unitarios de validadores (400/422/403/404), contraseñas y límite de intentos (53 en total). Tests de integración (5) contra `tms_db_test`: CSV contra el simulador con semilla fija (1e-9), Pico emulada con pérdidas y duplicados, roles, borrado lógico y 409; pasan contra una MariaDB temporal. `setup_db.sql` limpio = base migrada (esquemas comparados tabla por tabla). COMANDOS.md reescrita para una Raspberry Pi 5 limpia; `deploy/tms-server.service`; README real; `mnt/` borrada. Despliegue probado sin root: `npm ci --omit=dev`, build a `<raíz>/dist`, servidor en producción y Nginx con una **copia** de `tms.conf` en puertos altos (HTTPS por IP y por `.local`, redirección, cookie `Secure`, SSE). |

**Notas que deja la Fase 2 para las siguientes:**
- El observador ve la barra de parámetros de la medición deshabilitada, sin Iniciar ni Detener. El menú lateral y los permisos finos de la interfaz llegan en la Fase 6.
- Las páginas de login y cambio de contraseña usan clases nuevas (`.auth-*`, `.campo-tms`, `.navbar-usuario`, `.btn-logout`) al final de `global.css`, solo con las variables existentes. Su diseño final y el tema claro son de las Fases 6 y 7.
- `PATCH /api/auth/preferencias` ya guarda el tema, pero la interfaz todavía no lo usa (Fase 6).
- En desarrollo, la consola muestra dos 401 de `/api/auth/yo` al abrir la página sin sesión (React StrictMode lo llama dos veces). Es el comportamiento esperado.
- Los tests de `services/passwords.js` y `services/limiteIntentos.js` se probaron a mano con `node:assert`; pasarlos a `server/tests/` queda para la Fase 8 (o antes, si una fase crea la carpeta).

**Notas que deja la Fase 3 para las siguientes:**
- **Límite del sensor:** la ingesta rechaza (422) cualquier componente por encima del **fondo de escala del ADC**, 2047 / `lsb_por_ga` × 100 µT (249,6 µT con el 1,9 Ga por defecto; 187,8 µT con 1,3 Ga), no del rango nominal. Así lo hace el HMC5883L real: por encima, el registro desborda (−4096).
- **Rango por defecto 1,9 Ga (decisión del usuario, 2026-11-10).** Con `campo_centro_ut` 120, radio 25 mm y standoff 5 mm, el campo junto al hilo de la espira en Z = 0 llega a 213 µT. Con 1,3 Ga (fondo 187,8 µT) se perdían 4 de los 845 puntos; con 1,9 Ga (249,6 µT) no satura ninguno y un barrido de 0,5 cm guarda los 845 (verificado). Ya está cambiado en la migración 003, en `setup_db.sql`, en `POR_DEFECTO` y en la base local.
- **Saturación inyectada** (`prob_saturacion`): el simulador pone `bz` = ±1,5 × el fondo de escala; desde la Fase 4 la ingesta lo guarda marcado como `saturado` (bz NULL, crudo −4096).
- **Semilla:** desde la Fase 5 se guarda con la sesión en `config_simulacion`, y el simulador usa esa copia.
- `PUT /api/configuracion/:clave` usa siempre el cuerpo `{ "valor": … }`, porque `express.json` no acepta un texto suelto. En `sensor`, `lsb_por_ga` se recalcula del rango y no se puede fijar a mano.
- **Recarga a mitad del barrido:** resuelto en las Fases 5 y 6 con `GET /sesiones/activa` (se dibujan todos los puntos anteriores y el "% del plano" es exacto).
- El modal de inicio es una **confirmación** con el resumen (velocidad, paso, medio, malla y total). Desde la Fase 6 los modales se abren con refs (sin globales de `window`).
- El historial muestra el id real desde la Fase 5 y filtra en el servidor (el día se filtra en el navegador, en la zona horaria de `datos.zona_horaria`).

**Notas que deja la Fase 4 para las siguientes:**
- **Saturación (decisión):** el eje que vale −4096 se guarda NULL, con su crudo, y la lectura `saturado = 1`; `magnitud` también queda NULL. Las saturadas **no cuentan** para MAX ni MIN (`CASE WHEN saturado = 0`), y `GET /sesiones` devuelve además `saturadas`. El simulador hace lo mismo: un eje por encima del fondo de escala ya no se rechaza (422), se guarda como saturado con crudo −4096 (los demás crudos quedan NULL).
- `seq`: el simulador lo numera desde 1 por sesión en `services/ingesta.js` (contador en memoria que se inicializa con `MAX(seq)`); los huecos del simulador **no** dejan saltos en `seq`. La Pico manda su propio `seq` y, si se reinicia, sigue desde `ultimo_seq + 1` del latido.
- Solo hay un dispositivo "principal" (el de menor id): el estado en línea, el token y `PATCH /dispositivo` actúan sobre él. La tabla admite más, pero la interfaz no.
- Las sesiones `hw` **no se cierran solas** al completar la malla (la Pico puede mandar varias lecturas por punto): las cierra el operador. El emulador avisa "Malla completa".
- El latido se escribe en la BD como máximo cada 30 s si no cambia nada importante (firmware, IP o volver a estar en línea). El desfase de reloj (servidor − Pico) se guarda en memoria (`desfase_ms` en el estado) y se registra en el log cuando cambia más de 1 s.
- `frontend/src/hooks/useStream.js` ya es el EventSource único que pide la Fase 6. El panel del token es provisional (dashboard, admin y modo real); pasa a Configuración › Dispositivo en la Fase 6.
- `.claude/launch.json` tiene las entradas `backend` y `frontend` para el navegador integrado.
- Para matar el emulador desde un comando, no uses `pkill -f emular-pico` en la misma línea que lo lanza: el patrón coincide con la propia shell. Guarda el PID con `$!`.

**Notas que deja la Fase 5 para las siguientes:**
- `huecos` se guarda como objeto `{total, posiciones}` (no una lista sola) para que el total no se pierda cuando hay más de 1000. Un punto cuenta como medido si tiene al menos una lectura **no saturada** a menos de 1 mm (`TOLERANCIA_POSICION_MM`); por eso una lectura saturada deja un hueco.
- `puntos_recibidos` es el número de filas guardadas (incluye las saturadas).
- `version_firmware` sale del último latido al iniciar; si la sesión real se crea antes del primer latido, se completa con el primero que llegue (`sesiones.anotarFirmware`).
- Los ids del SSE empiezan en `Date.now()` al arrancar el proceso: un `Last-Event-ID` de un proceso anterior siempre queda fuera del búfer y recibe `resincronizar`.
- Borrado definitivo: no está en la API. COMANDOS.md documenta la consulta SQL (sesiones eliminadas hace más de 30 días).
- Las sesiones eliminadas responden 404 en `/mediciones` y `/csv` para todos; un admin debe restaurarlas antes de exportar.

**Notas que deja la Fase 6 para las siguientes:**
- **Ajustes del tema claro (contraste AA, documentado):** Bz `#007A55` → `#00704D` (sobre la superficie `#EDEFF2` no llegaba a 4,5:1) y Bx `#007C8C` → `#0062A8` (azul: el verde azulado no se distinguía de Bz en la gráfica; ajuste de la Fase 7). Texto secundario claro `#5C6273`. El oscuro no cambió (se verificó con un diff del bloque `:root`).
- **Mapa 3D:** mapeo diestro laboratorio (x, y, z) → Three.js (x − c, z, −(y − c)) y vector (Bx, Bz, −By); antes era un espejo. Ejes: X cian, Y magenta, Z verde (como Bx, By, Bz). Flechas de 1,5 a 9 mm según |B| / |B| máximo de la sesión, con leyenda. El canvas se crea dentro del efecto (tras `forceContextLoss` no se puede reutilizar y StrictMode monta dos veces). Materiales compartidos por plano; nunca se liberan las geometrías de `ArrowHelper`.
- **Gráfica de líneas:** eje X = índice del punto en la malla (`indiceEnMalla`), así los huecos se ven como cortes.
- **Superficie:** se redibuja como máximo cada 350 ms; `cmin`/`cmax` de toda la sesión; `uirevision` conserva la cámara.
- `frontend/.npmrc` tiene `legacy-peer-deps=true` para que npm no instale `plotly.js` (dependencia par de react-plotly.js); con eso desaparecen las vulnerabilidades críticas de `maplibre-gl`.
- El historial descarta respuestas viejas (condición de carrera al cambiar varios filtros seguidos; encontrada y corregida al verificar).
- "Medir cero" del sensor queda **pendiente**: el backend no lo soporta.
- Medición de rendimiento: durante un barrido de 845 puntos a 20 ms/punto no hubo ninguna tarea larga (> 50 ms) en el hilo principal. El panel del navegador estaba oculto, así que no se pudo medir el tiempo entre cuadros.
- Los mensajes 422 del servidor nombran el campo técnico (`umbral_desconexion_s debe ser…`); el formulario los muestra junto al campo.

**Notas que deja la Fase 7:**
- Escala tipográfica: Rajdhani 700 para títulos (h1 1,6 rem; h2 1,15–1,2 rem), Inter 400/500 para la interfaz (13–14 px, minúscula normal, sin mayúsculas espaciadas ni «//»), Share Tech Mono solo en cifras con `tabular-nums`. Mínimo 12 px.
- Un solo movimiento con sentido: el destello de la fila nueva de la tabla (más el punto de «Adquiriendo»). Todo se apaga con movimiento reducido.
- `--text-dim` y `--guinda-bright` del tema oscuro no llegan a AA como texto: no se usan para texto (solo bordes, iconos y fondos de botón con texto blanco).
- Títulos en mayúscula inicial (norma del español), no *Title Case*.

**Cuestiones abiertas que el usuario todavía no ha confirmado:**
- Si la solución salina con voltaje debe simularse con otra física (hoy es la misma espira; el medio solo es una etiqueta).
- Quién controla los motores y quién informa la posición. Hasta saberlo, se asume que la Pico W manda `xMM`, `yMM` y `zMM` con cada lectura.
- Cómo se mueve el eje Z.
- La dirección I2C real del sensor.

**Cambios posteriores a la Fase 8 (2026-11-10, pedidos por el usuario):**
- **Paso libre** (ver 7.0): migración 006, `erroresDePaso`, `indicePlano`, campo del panel, filtro del historial y paso predeterminado numérico en Configuración › Barrido. `opciones` de `GET /configuracion` ahora trae `pasos_sugeridos_mm`, `paso_min_mm` y `max_puntos_sesion` (antes `pasos_mm`). Los colores de los planos se repiten cada 5 (`clasePlano`). 54 tests unitarios y 6 de integración. ⚠ **La migración 006 NO se aplicó en la base local** (el clasificador de permisos lo bloqueó): hay que ejecutarla con `sudo mysql tms_db < server/migrations/006_paso_libre.sql`; sin ella, un paso decimal se trunca en la base. Se verificó contra una MariaDB temporal (migración idempotente, simulador con 12,5 mm, Pico emulada con 7,5 mm, filtro del historial).
- **Zona de muestreo por sesión y límites de la base** (ver 7.0): migración 007, `mallaDeZona`/`limitesDeBarrido`/`erroresDeZona` (servidor y frontend), `zonaDeSesion`/`mallaDeSesion` en `config/barrido.js`, mallas rectangulares en el mapa 3D, la superficie y la gráfica de líneas; CSV con `# zona_mm`; latido con `zona_mm`, `grid_nx` y `grid_ny` (ya no `grid_n`). 55 tests unitarios y 7 de integración. ⚠ **La migración 007 tampoco se aplicó en la base local**: ejecuta la 006 y luego la 007 (`sudo mysql tms_db < server/migrations/007_zona_muestreo.sql`). Sin la 007 el servidor falla al crear sesiones (no existen las columnas de zona). Verificado contra una MariaDB temporal (esquema migrado = `setup_db.sql`, migración idempotente, sesión 40 × 20 × 10, Pico emulada 30 × 15 × 5, límites de la base 422).
- **Login obligatorio al entrar:** cada pestaña nueva y cada navegador recién abierto piden usuario y contraseña. La marca `tms_login_pestana` vive en `sessionStorage` (por pestaña; sobrevive a la recarga, así que recargar a mitad de un barrido no saca al usuario). La cookie ya no lleva `Max-Age`, y al iniciar sesión el servidor borra la sesión de login anterior de ese navegador.

**Firmware de la Pico W (2026-11-10, pedido por el usuario):**
- Hardware confirmado: NEMA 17 con drivers **TB6600** y sensor **HMC5883L** (después se supo que el módulo es un **QMC5883P**, ver abajo). Los pines, micropasos, recorridos, finales de carrera, modo de Z y la posición de la bobina siguen como `PENDIENTE` en `firmware/config.py`.
- Diseño: bucle cooperativo en `main.py`; homing y barrido son generadores. Los pulsos los genera el PIO (1 MHz) y un canal DMA le pasa los segmentos de la rampa, así que un lote sale mientras la mesa se mueve (necesita MicroPython ≥ 1.22). Coordenadas: `x_máquina = X_BOBINA_MM − zona.x/2 + xMM` y `z_máquina = Z_CERO_MM + zMM` (Z_CERO_MM es una constante de calibración agregada; vale 0 por defecto).
- Reanudación con `lecturas_por_punto = N`: el seq s es la lectura (s − 1) % N del punto (s − 1) // N.
- Verificado solo en el PC (`firmware/pruebas_pc/`): 9 pruebas de lógica (la malla coincide punto por punto con `services/geometria.js`) y el firmware completo contra el servidor con una MariaDB temporal: 2 × 2 × 1, 2 lecturas por punto con reinicio a mitad (60 seq sin huecos ni duplicados), caída de Wi-Fi, parada del operador, zona fuera del recorrido y 401. **Sin probar en la Pico ni con la mesa.**
- Segunda vuelta (aprobada por el usuario el mismo día): el latido acepta `estado` (`espera`/`homing`/`midiendo`/`error`) y `error` (≤ 300), guardados solo en memoria y expuestos como `estadoPico`/`errorPico`; la Navbar muestra la Pico **en los dos modos** («en línea · midiendo», punto amarillo con error) y la página un aviso con el error. **Corregido un fallo previo:** el servidor solo difundía `event: dispositivo` en los cambios en línea ↔ sin señal, y el navegador marcaba «sin señal» 15 s después aunque llegaran latidos; ahora se difunde en cada latido.
- Firmware: watchdog **apagado por defecto** (`USAR_WATCHDOG = False`, decisión del usuario: no quiere que la Pico se reinicie al detener el programa). El homing deja la mesa en **0, 0, 0** (el origen está `HOMING_SEPARACION_MM` delante del disparo del final; `Z_CERO_MM` y `MARGEN_ORIGEN_MM` pasan a 0). Al completar, detener o fallar una sesión, la mesa vuelve a 0, 0, 0. LED: parpadeo desde que se alimenta, **fijo** con el servidor conectado, tres destellos con error, parpadeo lento con 401. Verificado en el navegador con el firmware corriendo en el PC (en línea en simulación, aviso de zona fuera del recorrido, «midiendo», Detener → origen).

**Sensor real y firmware del Hall de un eje (2026-11-11 y 2026-11-12):**
- El HMC5883L nunca respondió porque el módulo es un **QMC5883P** (0x2C). Se borraron las pruebas del HMC5883L (`prueba_sensor.py` y `prueba_sensor_adafruit.py`, recuperables desde git) y se agregaron las del QMC5883P que hizo funcionar el usuario. Se probaron en el PC con un bus simulado.
- **Pendiente (lo hará el usuario en otra sesión): adaptar el firmware cliente de `firmware/` al QMC5883P.** La lista completa está en `docs/sensor-qmc5883p.md`, sección 6. En resumen:
  - `sensor.py` → clase `QMC5883P` con la misma interfaz (`verificar`, `configurar`, generador `medir`), DRDY, OVFL, promedio y reinicio tras `OSError`;
  - `config.py`: GP0/GP1, 0x2C, 100 kHz;
  - `banco.sensor()`;
  - el fondo, en la Pico o en `offset_ut`.
- **Decisión pendiente del usuario sobre el servidor.** Hoy está hecho para el HMC5883L:
  - `raw` de −4096 a 2047 (`conversionSensor.js`);
  - −4096 = saturado;
  - ganancias del HMC (0,88 a 8,1 Ga) en `validacionConfiguracion.js`;
  - `sensor.modelo = 'HMC5883L'`.

  Las cuentas del QMC5883P (±32767) no caben. Hay dos opciones:
  - **(a)** La Pico convierte a «cuentas HMC» con el `lsb_por_ga` de la sesión, como `firmware_hall_1d/sensor_hall.py` (`a_cuentas`). Llega como mucho a ±890 µT.
  - **(b)** Adaptar el servidor al QMC5883P (modelo, rangos 2/8/12/30 G, `raw` de 16 bits, saturación explícita), que toca archivos del servidor y de la página.

  No cambies el servidor sin su aprobación.
- **`firmware_hall_1d/`:** firmware completo para el Hall 49E de un eje, copiado de `firmware/`.
  - **Sensor:** `sensor_hall.py` calibra el cero al arrancar (BOOTSEL en espera lo recalibra).
  - **Unidades:** como el servidor solo acepta cuentas HMC, con `UNIDAD_ENVIO = "mT"` **el número que muestra el dashboard (rotulado µT) son mT** (±249,6 con 1,9 Ga). Bx = By = 0.
  - **Sin finales de carrera:** la posición al arrancar es el origen 0, 0, 0, y los límites de software son X 0–410, Y 0–562, Z 0–88 mm (los midió el usuario con `prueba_calibracion.py`).
  - **Zona:** empieza en `ORIGEN_ZONA_*_MM` (por defecto, el origen).
  - **Drivers y origen:** los drivers quedan habilitados todo el tiempo. La mesa vuelve al origen al terminar, al detener, ante un error y con Ctrl+C; nunca se reinicia sola.
  - **Motores:** 50 pulsos/mm y velocidad máxima de 60 mm/s.
  - **Verificación:** en el PC, contra una MariaDB temporal (50 puntos sin huecos; Ctrl+C a mitad del barrido → origen). **Sin probar en la Pico con la mesa.**
- **Para que la Pico alcance el backend de la laptop**, arráncalo con `cd server && HOST=0.0.0.0 npm run dev`. El `.env` tiene `HOST=127.0.0.1`, y dotenv no pisa una variable que ya existe. La Pico usa `SERVIDOR = "http://<IP de la laptop>:4000"`.
  - Red del laboratorio: `TP-LINK_5D41`; la laptop tenía la IP 192.168.0.186 (puede cambiar).
  - Las credenciales y el token están en `firmware_hall_1d/secretos.py` (ignorado por git). **No los copies a otros archivos.**

**Notas que deja la Fase 8 (pendientes y mejoras futuras):**
- ⚠ **Contraseña publicada:** el `.env` local usa `DB_PASSWORD=tms_password`, que aparece en el historial de git (commit `22d3e7f`, quitada en `010cb13`). No se reescribió el historial. En la Raspberry usa otra contraseña (COMANDOS.md 3.1); si el repositorio es público, cámbiala también en local.
- **Acceso desde el hotspot (comprobado con Nginx y una copia de `tms.conf`):** por HTTPS funciona con la IP o cualquier nombre, porque `tms.conf` es el único servidor en el 443. Por HTTP, el sitio `default` de Raspberry Pi OS captura `http://<IP>`; la guía lo deshabilita y recomienda el nombre de host `tms` → `https://tms.local` por mDNS. `tms.ipn.local` no se resuelve por mDNS (dos etiquetas).
- La versión en `/status` es `3.0.0+desconocido` si `/opt/tms` no es un repositorio git (por ejemplo, copiado con rsync); el unit de systemd agrega `safe.directory` para el caso con git.
- Pendiente con hardware: probar el firmware con la Pico W, la mesa y el sensor real (el QMC5883P; ver «Sensor real» abajo).
- Pendiente de decidir: «Medir cero» del sensor (necesita un endpoint), qué hacer con `lecturas_por_punto > 1` (promediar en la Pico o en el servidor), si las sesiones `hw` deben cerrarse solas al completar la malla, y las cuestiones abiertas de abajo.
- Mejoras posibles: pasar Lighthouse o axe cuando se puedan instalar; mostrar en el historial la superficie de una sesión pasada; paginar `GET /sesiones` si el historial crece mucho; traducir a lenguaje llano los mensajes 422 del servidor.

**Vulnerabilidades que quedan:**
- En producción (`npm audit --omit=dev`): **0** en el servidor y **0** en el frontend (2026-11-10).
- Solo de desarrollo: 2 moderadas en `nodemon` → `minimatch` (`npm audit fix` no las resuelve) y `esbuild`/`vite` en el frontend (corregirlas exige subir Vite de versión mayor, y no se hace). No llegan a la Raspberry: allí se instala con `--omit=dev` y Vite solo se usa para compilar.
- `plotly.js` → `maplibre-gl` desapareció en la Fase 6 (`plotly.js-gl3d-dist-min` + `.npmrc` con `legacy-peer-deps`).

---

## 7. Especificación acordada (lo que falta construir)

### 7.0 Parámetros de cada medición (requisito del usuario, 2026-11-09)

Al iniciar una sesión, en la barra de **configuración de la medición** del panel de control, el operador elige tres cosas. Se guardan **con la sesión** en la base de datos y son **filtros** en Mediciones pasadas:

| Parámetro | Valores | Columna en `sesiones` |
|---|---|---|
| Velocidad | **DC — rápida** o **AC — normal** (ya existía) | `modo ENUM('DC','AC')` |
| Paso de medición | **Libre, en mm** (decisión del usuario, 2026-11-10): de 1 mm en adelante, con un decimal; 5, 10 y 20 mm son solo sugerencias. Se aplica igual a X, Y y Z | `paso_mm DECIMAL(4,1) UNSIGNED NOT NULL DEFAULT 5.0` (migración 006) |
| Medio | **Campo magnético** o **Solución salina con voltaje** (solo se guarda el medio, sin el valor del voltaje) | `medio ENUM('campo_magnetico','solucion_salina') NOT NULL DEFAULT 'campo_magnetico'` |

- `POST /api/sesiones {modo, paso_mm, medio}`. Si faltan `paso_mm` o `medio`, se usan los predeterminados de la configuración (`barrido.paso_predeterminado_mm`, y `campo_magnetico`).
- **Zona de muestreo** (decisión del usuario, 2026-11-10; migración 007): el operador elige en el panel, junto a velocidad, paso y medio, el tamaño de la zona en X, Y y Z (mm, un decimal; botón «Toda la base»). Se guarda en `sesiones.zona_x_mm/zona_y_mm/zona_z_mm`. No puede pasar de los **límites de la base** (`barrido.limite_x_mm/limite_y_mm/limite_z_mm`, Configuración › Barrido, solo admin; se cambian si se cambia de base) → 422. Coordenadas de la zona: x 0..zona.x, y 0..zona.y, z 0..zona.z; la zona va **centrada bajo la bobina** (el simulador pone el eje en zona/2).
- **Geometría** (`mallaDeZona`): `grid_nx = floor(zona.x / paso) + 1`, `grid_ny = floor(zona.y / paso) + 1`, `z_levels = 0, paso, 2·paso …` hasta `zona.z`, `puntos = grid_nx × grid_ny × planos`; las posiciones se redondean a décimas. Si el paso no divide la zona, el último punto queda antes del borde. La validación de `zMM` usa los planos **de la sesión**, con tolerancia de coma flotante (`indicePlano`).
- **Límites del paso** (`services/geometria.js` y `frontend/src/utils/geometria.js`): mínimo 1 mm (el posicionamiento tiene ±1 mm de error), máximo el tamaño de la placa, un decimal, y como máximo **25 000 puntos** por sesión (`MAX_PUNTOS_SESION`: el mapa 3D dibuja una flecha por punto). Con la placa de 60 mm y z_max 20 el paso mínimo práctico es unos 1,5 mm. Fuera de eso, 422.
- En el dashboard el paso se escribe en un campo (mm) con un botón de 5 mm al lado (pedido del usuario: sin botones de 10 y 20); debajo se ve la malla y el total. En el historial el filtro de paso es un campo libre con sugerencias (los más usados y los que ya hay en el historial); `GET /sesiones?paso_mm=7.5` acepta punto o coma.
- La **física del simulador es la misma** en los dos medios; el medio es una etiqueta de la sesión. (Que la solución salina con voltaje se simule distinto queda como pregunta abierta.)
- La Pico W recibe `paso_mm` y `medio` en `sesion_activa` del latido (Fase 4), para saber qué malla recorrer.
- Las sesiones anteriores a la migración 003 quedan como `paso_mm = 5` y `medio = 'campo_magnetico'`.
- El historial permite filtrar por **modo**, **paso**, **medio**, origen y fecha.

### 7.1 Usuarios y login (Fase 2)
- **Roles:**
  - `admin`: todo, incluidos los usuarios y la configuración del sistema.
  - `operador`: inicia y detiene barridos, edita las notas de sus sesiones y exporta.
  - `observador`: solo mira y exporta.
- **Tabla `usuarios`:** `id, usuario UNIQUE, nombre, rol ENUM, hash_password, activo BOOL, debe_cambiar_password BOOL, preferencias JSON` (por ejemplo, el tema), `creado_en, ultimo_acceso`.
- **Tabla `sesiones_login`:** `id` (hash SHA-256 del token, CHAR(64) PK), `usuario_id, creada_en, expira_en, ultimo_uso, ip, user_agent`. El nombre evita confundirla con la tabla `sesiones` de medición.
- **Contraseñas:** `crypto.scrypt` con una sal aleatoria de 16 bytes, guardadas como `scrypt$N$r$p$salHex$hashHex`. La comparación se hace con `timingSafeEqual`. Mínimo 8 caracteres.
- **Cookie** `tms_sesion`: `HttpOnly; SameSite=Strict; Path=/`, y `Secure` cuando `NODE_ENV=production`. Expira a las 12 h y se renueva con el uso. Se lee a mano desde `req.headers.cookie`, sin cookie-parser.
- **Límite de intentos:** 5 fallidos por usuario e IP en 15 minutos, guardados en memoria; después responde 429. Detrás de Nginx, la IP real llega por `X-Real-IP`, así que se usa `app.set('trust proxy', 'loopback')`.
- **Endpoints:**
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/yo`, `POST /api/auth/cambiar-password`, `PATCH /api/auth/preferencias`.
  - Solo para admin: `GET/POST /api/usuarios`, `PATCH /api/usuarios/:id` (nombre, rol, activo) y `POST /api/usuarios/:id/restablecer-password`.
- **Protección:**
  - `GET /api/status` es la única ruta pública.
  - Todo lo demás exige sesión, incluido el SSE. EventSource manda la cookie porque es del mismo origen.
  - El dispositivo (Fase 4) se autentica con un token aparte.
- **`server/scripts/crear-admin.js`:** crea o restablece el usuario `admin` pidiendo la contraseña por terminal y lo marca con `debe_cambiar_password`. Con `--predeterminado` lo deja como admin / admin sin cambio obligatorio.
- No se puede desactivar ni degradar al último admin activo.

### 7.2 Configuración y modos (Fase 3)
- **Tabla `configuracion`:** `clave VARCHAR PK, valor JSON, actualizado_en, actualizado_por`. Los valores por defecto se cargan en la migración.

  | Clave | Valor por defecto |
  |---|---|
  | `modo_operacion` | `'simulacion'` o `'real'` |
  | `barrido` | `{ limite_x_mm: 60, limite_y_mm: 60, limite_z_mm: 20, standoff_mm: 5, paso_predeterminado_mm: 5 }` (límites de la base; antes de la migración 007 era `{grid_size_mm, z_max_mm, …}`, que el validador todavía convierte) |
  | `sensor` | `{ modelo: 'HMC5883L', rango_ga: 1.9, lsb_por_ga: 820, lecturas_por_punto: 1, offset_ut: {x:0,y:0,z:0} }` (1,9 Ga por decisión del usuario, 2026-11-10: con 1,3 Ga saturaban 4 puntos) |
  | `simulacion` | `{ ms_por_punto: {DC:60, AC:120}, semilla: 12345, ruido_sigma_ut: 0.25, radio_bobina_mm: 25, campo_centro_ut: 120, prob_hueco: 0, prob_saturacion: 0 }` |
  | `dispositivo` | `{ intervalo_latido_s: 5, umbral_desconexion_s: 15 }` |
  | `visualizacion` | `{ ventana_grafica: 80, filas_tabla: 60, decimales: 3, escala_superficie: 'Jet', rotacion_auto: true, reducir_animaciones: false }` |
  | `datos` | `{ zona_horaria: 'America/Mexico_City' }` |

  Las ganancias válidas del HMC5883L son:

  | Rango (Ga) | LSB/Ga |
  |---|---|
  | 0,88 | 1370 |
  | 1,3 | 1090 |
  | 1,9 | 820 |
  | 2,5 | 660 |
  | 4,0 | 440 |
  | 4,7 | 390 |
  | 5,6 | 330 |
  | 8,1 | 230 |

- **Servicio `services/configuracion.js`:** guarda la configuración en caché en memoria (se carga al arrancar y se actualiza al cambiarla) y la difunde por SSE (`event: configuracion`). `config/barrido.js` deja de tener constantes fijas y lee de este servicio.
- **Endpoints:** `GET /api/configuracion` (cualquier usuario con sesión) y `PUT /api/configuracion/:clave {valor}` (solo admin, con validación por clave). Cambiar `modo_operacion`, `barrido` o `sensor` con una sesión abierta responde 409.
- **Sesiones:** se agregan las columnas `origen ENUM('sim','hw') NOT NULL`, `paso_mm` y `medio` (ver 7.0). Todas las sesiones existentes son `'sim'`, de 5 mm y de campo magnético. Solo puede haber **una sesión abierta a la vez**: si ya hay otra, responde 409.
- **El simulador pasa al servidor** (`services/simulador.js`):
  - Arranca al crear una sesión en modo simulación y se detiene al cerrarla. Al recorrer todos los puntos de la malla de la sesión (845 con el paso de 5 mm), cierra la sesión solo.
  - Inserta y difunde a través del **mismo servicio de ingesta** que usa la API (`services/ingesta.js`).
  - Usa la física de una espira exacta, con integrales elípticas K(k) y E(k) calculadas por AGM, normalizada para que |B| en el centro con z = 0 sea `campo_centro_ut`, y con z_real = z + standoff.
  - Usa una semilla (mulberry32) y ruido gaussiano (Box–Muller) con σ igual a `ruido_sigma_ut`.
  - Inyecta huecos y saturación según las probabilidades configuradas.
- En modo simulación, `POST /api/mediciones` desde fuera responde 409.
- El frontend deja de generar muestras: solo crea o cierra la sesión y dibuja lo que llega por SSE.

### 7.3 Pico W (Fase 4)
- **Tabla `dispositivos`:** `id, nombre, token_hash, activo, creado_en, ultimo_latido DATETIME(3), ip, firmware, rssi, uptime_s`.
- **Token:** lo genera un admin con `POST /api/dispositivo/token`, que lo muestra **una sola vez**. Se guarda como SHA-256. El dispositivo lo envía como `Authorization: Bearer <token>`. Se revoca con `DELETE /api/dispositivo/token` (agregado en la Fase 4).
- **Latido:** `POST /api/dispositivo/latido {firmware, rssi, uptime_s, ts_dispositivo_ms}` cada `intervalo_latido_s`. Responde `{ ok, modo_operacion, sesion_activa: {id, modo, paso_mm, medio, zona_mm, grid_nx, grid_ny, z_levels_mm, puntos_esperados, ultimo_seq, barrido, sensor} | null, intervalo_latido_s, servidor_ts_ms }`. Así la Pico sabe cuándo empezar a enviar sin necesidad de otra tecnología, y `ultimo_seq` le permite seguir numerando tras un reinicio.
- **Ingesta por lotes:** `POST /api/dispositivo/mediciones {sesionId, lecturas:[{seq, xMM, yMM, zMM, raw:{x,y,z}, ts_ms}]}`.
  - Solo en modo real y con la sesión abierta.
  - El servidor convierte las cuentas a µT con la configuración del sensor y resta el offset.
  - Marca `saturado` si algún eje vale −4096.
  - Es idempotente gracias a `UNIQUE(sesion_id, seq)`.
  - Responde `{aceptadas, duplicadas, rechazadas:[{seq, error}]}`.
- **Columnas nuevas en `mediciones`:** `seq INT NULL, raw_x/raw_y/raw_z SMALLINT NULL, saturado BOOL NOT NULL DEFAULT 0, ts_dispositivo DATETIME(3) NULL`, más `UNIQUE(sesion_id, seq)`. El simulador también numera `seq`.
- **Estado:** `services/dispositivo.js` guarda el último latido. Un temporizador de 1 s detecta el paso a desconectado según `umbral_desconexion_s` y lo difunde (`event: dispositivo {enLinea, ultimoLatido, firmware, rssi, ip}`). `GET /api/dispositivo/estado` lo devuelve para quien tenga sesión.
- **Herramientas:**
  - `server/scripts/emular-pico.js` simula la Pico (latido y lotes) para probar sin hardware.
  - `docs/firmware-pico-w.md` documenta el protocolo y las notas del sensor.
  - `firmware/pico_w_cliente_ejemplo.py` es un ejemplo en MicroPython de referencia.

### 7.4 Datos y trazabilidad (Fase 5)
- Las columnas numéricas de `mediciones` pasan de FLOAT a **DOUBLE**.
- **`sesiones` gana:** `usuario_id` (quien la inició), `notas TEXT`, `puntos_esperados`, `puntos_recibidos`, `huecos JSON` (posiciones que faltan, calculadas al cerrar), `config_barrido JSON`, `config_sensor JSON`, `config_simulacion JSON` (copias de la configuración al iniciar), `version_software` (versión de `package.json` más el commit de git si existe), `version_firmware` y `eliminada_en` para el **borrado lógico**.
- `DELETE` hace borrado lógico; solo un admin puede restaurar con `POST /api/sesiones/:id/restaurar`. `PATCH /api/sesiones/:id {notas}`.
- `GET /api/sesiones/activa` devuelve la sesión abierta con todas sus mediciones, para quien abre el dashboard tarde.
- **SSE con `id:`** en cada evento y un búfer circular de unos 2000 eventos, para reenviar desde `Last-Event-ID` al reconectarse.
- **CSV generado en el servidor** (`GET /api/sesiones/:id/csv`): un encabezado de metadatos con líneas `# clave: valor` y columnas con su unidad: `timestamp_utc, seq, x_mm, y_mm, z_mm, bx_uT, by_uT, bz_uT, magnitud_uT, raw_x, raw_y, raw_z, saturado`.

### 7.5 Frontend (Fases 6 y 7)
- **Login** antes de todo. Si hay `debe_cambiar_password`, se fuerza el cambio.
- **Menú lateral** que se abre con el botón ☰ de la barra superior. Contiene:
  - el usuario y su rol;
  - el **modo de operación** (Simulación o Real — Pico W → servidor), solo para admin;
  - el **tema** (Oscuro, Claro o Sistema);
  - la navegación: Dashboard en vivo, Mediciones pasadas y Configuración (Barrido, Sensor, Simulación, Dispositivo, Visualización y Usuarios, esta última solo para admin);
  - Cerrar sesión.
- **Barra superior:** etiqueta visible de **SIMULACIÓN** cuando corresponda, estado del servidor y, **solo en modo real**, el estado de la **Pico W**: "en línea · hace 2 s", "sin señal hace 40 s" o "nunca conectada".
- **Tema claro** (propuesta; el contraste se verifica en la Fase 7):

  | Token | Oscuro (no cambia) | Claro |
  |---|---|---|
  | Fondo | `#0d0d0f` | `#F4F5F7` |
  | Tarjeta | `#1a1a20` | `#FFFFFF` |
  | Texto | `#eef0f5` | `#1B1D23` |
  | Bx | `#00e5ff` | `#007C8C` |
  | By | `#ff00c8` | `#A3007F` |
  | Bz | `#00ffa3` | `#007A55` |
  | \|B\| | `#ffe600` | `#7A6500` |
  | Guinda | `#c0233f` | `#8b1a2f` |

  Se activa con `data-theme` en `<html>` y con `data-bs-theme` para Bootstrap. Chart.js, Three.js y Plotly leen los colores de los tokens.
- **Navegación en la URL** con la History API (`?vista=dashboard|historial|configuracion&seccion=…`), sin react-router.
- **Gráficas:** se mantienen las cinco, con los ajustes de la Fase 6 (ver el prompt correspondiente).

### 7.6 Hallazgos de la auditoría (todos atendidos)

| Hallazgo | Cómo quedó |
|---|---|
| Datos simulados y reales mezclados (C1) | Resuelto: `origen` por sesión, modo de operación bloqueado con una sesión abierta, etiqueta SIMULACIÓN, filtro por origen (Fases 3 y 5). |
| Unidades y calibración (C3) | Resuelto: µT en toda la API, cuentas crudas guardadas, conversión con ganancia y offset en el servidor, copias de la configuración del sensor por sesión (Fases 3 a 5). |
| Pérdida silenciosa de muestras (C4) | Resuelto: `seq` idempotente con reintentos, huecos calculados y listados, SSE recuperable con `Last-Event-ID` (Fases 4 a 6). |
| Inyección y borrado sin autenticación (A3) | Resuelto: login con roles (Fase 2), token de la Pico (Fase 4), borrado lógico (Fase 5). |
| Simulador incorrecto (A5) | Resuelto en la Fase 3 (espira exacta, verificado contra la fórmula en el eje). |
| Ningún test (A6) | Resuelto: 53 unitarios y 5 de integración (Fase 8). |
| Metadatos de reproducibilidad (A7) | Resuelto: configuración, semilla, versiones de software y firmware con cada sesión; CSV con encabezado (Fase 5). |
| Precisión float32 (M1) | Resuelto para los datos nuevos (DOUBLE, Fase 5); los viejos conservan su error. |
| Gráficas engañosas (M2–M4) | Resuelto: eje X por posición con huecos visibles, escala de color fija por sesión, flechas relativas al máximo y orientación diestra (Fase 6). |
| Condiciones de carrera (M5) | Resuelto: cola de sesiones, transacción con `FOR UPDATE` en los lotes, guardia contra doble inicio, respuestas viejas descartadas en el historial (Fases 3 a 6). |
| Ritmo marcado por el navegador (M6) | Resuelto en la Fase 3. |
| Rendimiento (M7) | Resuelto: un render por cuadro, Plotly diferido y limitado, Three.js bajo demanda, bundle inicial de 860 kB (Fase 6). |
| SSE sin ids (M8) | Resuelto en la Fase 5. |
| CSV sin metadatos (M10) | Resuelto en la Fase 5. |
| KPI desfasado (B1) | Resuelto: el KPI muestra la última lectura recibida (Fase 6). |
| Documentación y carpeta `mnt/` (B5) | Resuelto: COMANDOS.md, README, firmware y diseño documentados; `mnt/` borrada (Fase 8). |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

### Regla del usuario sobre el grafo (2026-11-10)

- **Antes de cualquier Glob o Grep, lee primero `graphify-out/GRAPH_REPORT.md`.** Esta regla del usuario tiene prioridad sobre la indicación anterior de leerlo "solo para revisiones de arquitectura". Después puedes afinar con `graphify query`, `path` o `explain`.
- Graphify está instalado en un entorno virtual propio (`~/.local/share/graphify/venv`, enlazado en `~/.local/bin/graphify`), porque Debian bloquea `pip install` en el Python del sistema (PEP 668). Si `graphify` no está en el PATH de una shell, usa esa ruta.
- Los hooks de git (`post-commit`, `post-checkout`, `post-merge`, `post-rewrite`) reconstruyen el grafo **solo con los cambios de código** (AST, sin costo). Los cambios en documentos (`CLAUDE.md`, `COMANDOS.md`, `docs/`) necesitan `/graphify . --update`, que vuelve a pasar esos archivos por un subagente. El log de los hooks queda en `~/.cache/graphify-rebuild.log`.
- Lo que Graphify no lee está en `.graphifyignore` (incluye `.env`, certificados, `node_modules`, `package-lock.json` y `mnt/`).
