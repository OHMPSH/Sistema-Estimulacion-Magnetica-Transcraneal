# CLAUDE.md — SAVD / TMS: contexto para continuar el proyecto

Este archivo es la fuente de contexto para cualquier sesión de Claude que trabaje en este repositorio. Léelo completo antes de tocar código. Al terminar una fase, **actualiza la sección "Estado de las fases"** (y lo que haya cambiado en las demás secciones) para que la siguiente sesión parta del estado real.

Los prompts listos para cada fase pendiente están en [docs/prompts-sesiones.md](docs/prompts-sesiones.md).

---

## 1. Qué es el proyecto

Sistema de adquisición y visualización de datos para la tesis de ingeniería (IPN, ESIME Zacatenco) sobre la **caracterización del campo magnético** en un montaje de estimulación magnética transcraneal (TMS) sobre un phantom de solución salina.

- Un sensor recorre una malla de **13 × 13 puntos por plano** sobre una placa de **60 × 60 mm** (paso de 5 mm), en **5 planos Z**: 0, 5, 10, 15 y 20 mm. En total, **845 puntos por sesión**.
- Por cada punto se guardan las tres componentes Bx, By, Bz (en **µT**) y su módulo |B|.
- Hoy los datos los genera una **simulación**. Más adelante los mandará una **Raspberry Pi Pico W** por Wi-Fi.

### Hardware (confirmado por el usuario)

| Pieza | Detalle |
|---|---|
| Servidor | Raspberry Pi 5 con Node.js, MariaDB y Nginx. **Esta carpeta NO es la Raspberry**: el usuario descargará el proyecto ahí y lo levantará después. |
| Microcontrolador | **Raspberry Pi Pico W** (RP2040). No es la Pico 2W, aunque algunos textos viejos digan "Pico 2W". |
| Sensor | Módulo **HMC5883L**: magnetómetro AMR triaxial por I2C. Rango de ±1,3 a ±8,1 Ga (130 a 810 µT); 1090 LSB/Ga con la ganancia más alta. Salida de datos de 75 Hz en modo continuo y 160 Hz en medición única. El ADC de la Pico **no** se usa con este sensor. |
| Posicionamiento | Mesa cartesiana XY con motores NEMA 17 y husillos T8 (0,04 mm por paso teórico). Requisito: error posicional menor que ±1 mm. |
| Red | Hotspot de un iPhone, con salida a internet. Varias personas (el director, un ingeniero, el tesista y un compañero) miran el dashboard a la vez desde laptops y teléfonos. |

**El sensor es solo de prueba.** El usuario sabe que el HMC5883L no mide el pulso real de la bobina TMS. **No vuelvas a señalarlo** ni lo uses como argumento en contra de nada.

Datos útiles del HMC5883L para el firmware y la conversión de unidades:
- Si un eje se desborda, el registro devuelve **−4096**: hay que marcar la lectura como saturada.
- Los registros de datos vienen en el orden **X, Z, Y**, no X, Y, Z.
- Conversión: µT = cuentas / (LSB/Ga) × 100.
- Muchos módulos GY-271 traen en realidad un **QMC5883L**, que tiene otra dirección I2C (0x0D en lugar de 0x1E) y otros registros. Hay que verificar el chip con un escaneo del bus.

El "+5 mm" que aparece en la simulación es el **standoff**: la separación física entre la bobina y el elemento sensor. El **origen de coordenadas** es el hotspot, debajo del centro de la bobina, aunque el código actual usa x, y de 0 a 60 mm con el centro en 30.

**Python no se usa** en el proyecto: ignora cualquier mención a un puente con Python.

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
├── COMANDOS.md                   ← guía de arranque (se actualiza en la Fase 8)
├── docs/prompts-sesiones.md      ← prompts de cada fase pendiente
├── nginx/tms.conf                ← NO TOCAR
├── server/                       ← Node.js + Express (ESM, "type":"module")
│   ├── server.js                 ← entrada: cors, json(100kb), router en /api y /, errores
│   ├── .env / .env.example       ← el .env está ignorado por git
│   ├── setup_db.sql              ← crea la BD, el usuario (permisos mínimos) y las tablas
│   ├── migrations/001_sesiones_hora_local_a_utc.sql
│   ├── migrations/002_usuarios.sql            ← tablas usuarios y sesiones_login (Fase 2)
│   ├── config/database.js        ← pool de mysql2, timezone 'Z', SET time_zone '+00:00'
│   ├── config/barrido.js         ← GRID_SIZE_MM, Z_LEVELS, B_MAX_UT (pasa a la BD en la Fase 3)
│   ├── config/roles.js           ← ROLES ('admin','operador','observador') y TEMAS
│   ├── middleware/cors.js        ← orígenes de CORS_ORIGINS; un origen ajeno no recibe cabeceras (sin 500)
│   ├── middleware/auth.js        ← leerCookie, requiereLogin → req.usuario y req.sesionLoginId, requiereRol(...)
│   ├── middleware/validar.js     ← validarIdSesion → req.idSesion, validarModo → req.modo,
│   │                                validarMedicion → req.medicion, y los de la Fase 2: validarLogin,
│   │                                validarCambioPassword, validarPreferencias, validarIdUsuario,
│   │                                validarNuevoUsuario, validarCambiosUsuario, validarPasswordNueva
│   │                                (400 si falta algo o el tipo es incorrecto, 422 si un valor es inválido)
│   ├── middleware/errores.js     ← 404 y manejador de errores, siempre en JSON
│   ├── routes/auth.routes.js · usuarios.routes.js · mediciones.routes.js
│   ├── controllers/auth.controller.js · usuarios.controller.js
│   ├── controllers/mediciones.controller.js  ← incluye el SSE (broadcast, sseClients)
│   ├── models/Medicion.js        ← SQL; insertarMedicion solo inserta si la sesión está abierta
│   ├── models/Usuario.js         ← SQL de usuarios; actualizar() protege al último admin con FOR UPDATE
│   ├── models/SesionLogin.js     ← SQL de sesiones_login
│   ├── services/passwords.js     ← scrypt (hashPassword, verificarPassword, errorDePassword)
│   ├── services/sesionUsuario.js ← token, SHA-256, cookie tms_sesion, limpieza horaria
│   ├── services/limiteIntentos.js ← 5 fallos por usuario+IP en 15 min, en memoria
│   └── scripts/crear-admin.js    ← npm run crear-admin (o ADMIN_PASSWORD=… sin terminal)
├── frontend/                     ← React 18 + Vite 5
│   ├── vite.config.js            ← proxy /api → 127.0.0.1:4000; build.outDir '../dist'
│   ├── index.html                ← fuentes de Google por CDN; Bootstrap ya va empaquetado
│   └── src/
│       ├── main.jsx              ← importa el CSS de Bootstrap e iconos; envuelve App en AuthProvider
│       ├── App.jsx               ← login / cambio forzado / Dashboard; la página activa vive en el estado (no en la URL)
│       ├── api/cliente.js        ← apiFetch, enviarJSON, leerJSON; credentials 'same-origin'; un 401 devuelve al login
│       ├── context/AuthContext.jsx  ← useAuth(): usuario, cargando, iniciarSesion, cerrarSesion, cambiarPassword
│       ├── pages/LoginPage.jsx · CambiarPasswordPage.jsx  ← versión mínima (diseño final en las Fases 6 y 7)
│       ├── constants/system.js   ← GRID_N, Z_LEVELS, colores, SIM_RATE_MS, MAX_CHART_POINTS…
│       ├── hooks/useAcquisition.js  ← HOY la simulación corre aquí, en el navegador (generarMuestra)
│       ├── hooks/useServerStatus.js ← consulta /api/status cada 15 s
│       ├── components/charts/  LineChart.jsx · Canvas3D.jsx · Superficie3D.jsx
│       ├── components/panels/  ControlPanel.jsx · HistorialPage.jsx (CSV armado en el navegador)
│       ├── components/ui/      Navbar.jsx · KpiCards.jsx · DataTable.jsx
│       ├── components/modals/  StartModal.jsx · StopModal.jsx (usan bootstrap/js/dist/modal)
│       └── styles/global.css
└── mnt/                          ← carpeta sobrante; se borra en la Fase 8
```

### Recorrido de una medición (hoy)

0. El usuario inicia sesión (`POST /api/auth/login`); todas las peticiones siguientes, incluido el SSE, llevan la cookie `tms_sesion`.
1. El navegador (operador o admin) crea la sesión con `POST /api/sesiones {modo}`.
2. Un `setInterval` (60 ms en DC, 120 ms en AC) ejecuta `generarMuestra()` en `useAcquisition.js`.
3. La muestra se dibuja **en local** y se envía con `POST /api/mediciones` sin esperar la respuesta (los errores se ignoran).
4. El servidor valida, calcula |B| con `Math.hypot`, guarda la fila con la hora del servidor en UTC y la difunde por SSE (`event: medicion`).
5. Los demás navegadores dibujan lo que llega por SSE. El que simula ignora sus propios eventos.
6. Al detener, `PUT /api/sesiones/:id` cierra la sesión.
7. El historial usa `GET /api/sesiones` y `GET /api/sesiones/:id/mediciones`, y el CSV se arma en el navegador.

### API actual (todas las rutas responden también sin el prefijo `/api`)

Roles: **público** = sin sesión; **sesión** = cualquier usuario con login; **op** = operador o admin; **admin** = solo admin. Sin cookie válida, toda ruta no pública responde **401**; con un rol insuficiente, **403**. Mientras el usuario tenga `debe_cambiar_password`, todo responde **403** salvo `/auth/yo`, `/auth/cambiar-password` y `/auth/logout`.

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `GET /api/status` | público | Health-check | 200 |
| `POST /api/auth/login {usuario,password}` | público | Crea la cookie `tms_sesion` (el usuario se normaliza a minúsculas) | 200, 400, 401 (mensaje único), 429 con `Retry-After` |
| `POST /api/auth/logout` | sesión | Borra la fila de `sesiones_login` y la cookie | 200 |
| `GET /api/auth/yo` | sesión | Usuario actual `{id,usuario,nombre,rol,debe_cambiar_password,preferencias}` | 200 |
| `POST /api/auth/cambiar-password {actual,nueva}` | sesión | Cambia la contraseña, apaga `debe_cambiar_password` y cierra las **demás** sesiones del usuario | 200, 400, 422, 429 |
| `PATCH /api/auth/preferencias {tema}` | sesión | `tema`: `oscuro`, `claro` o `sistema`; se mezcla con el JSON existente | 200, 400, 422 |
| `GET /api/usuarios` | admin | Lista sin hashes | 200 |
| `POST /api/usuarios {usuario,nombre,rol,password}` | admin | Crea con `debe_cambiar_password` | 201, 400, 409 si ya existe, 422 |
| `PATCH /api/usuarios/:id {nombre?,rol?,activo?}` | admin | Desactivar borra sus sesiones de login | 200, 400, 404, 409 último admin, 422 |
| `POST /api/usuarios/:id/restablecer-password {password}` | admin | Deja `debe_cambiar_password` y cierra sus sesiones | 200, 400, 404, 422 |
| `GET /api/stream` | sesión | SSE con los eventos `medicion` | — |
| `POST /api/sesiones {modo:'DC'\|'AC'}` | op | Crea una sesión | 201, 422 |
| `PUT /api/sesiones/:id` | op | Cierra la sesión | 200, 404, 409 si ya estaba cerrada |
| `GET /api/sesiones` | sesión | Lista las sesiones con COUNT, MAX y MIN | 200 |
| `DELETE /api/sesiones/:id` | admin | Borrado **físico** en cascada (lógico en la Fase 5) | 200, 404 |
| `POST /api/mediciones {sesionId,xMM,yMM,zMM,bx,by,bz}` | op | Inserta una medición (la usa el simulador del navegador hasta la Fase 3) | 201, 400, 422, 404, 409 |
| `GET /api/sesiones/:id/mediciones` | sesión | Exporta las mediciones de una sesión | 200 |

**Detalles del login (Fase 2):**
- El token es de 32 bytes aleatorios (base64url); en la base solo se guarda su SHA-256. La cookie es `HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`, más `Secure` con `NODE_ENV=production`. Por eso, **en producción solo funciona por HTTPS** (Nginx).
- La renovación de 12 h es deslizante, pero solo se escribe en la base si pasó más de 60 s desde el último uso (`RENOVAR_CADA_S`), para no escribir en cada medición.
- El rol y `activo` se leen de la base en cada petición: degradar o desactivar aplica de inmediato.
- `app.set('trust proxy', 'loopback')`: `req.ip` sale de `X-Forwarded-For` solo si la conexión viene de 127.0.0.1 (Nginx).
- El límite de intentos vive en memoria (se reinicia al reiniciar el servidor). El cambio de contraseña tiene su propio contador con el mismo límite.
- Si el usuario no existe, se verifica contra un hash de relleno para que el tiempo de respuesta no delate qué usuarios existen.
- Cada hora (y al arrancar) se borran las sesiones de login expiradas.

### Esquema actual de MariaDB

- `sesiones(id, modo ENUM('DC','AC'), iniciada_en DATETIME, terminada_en DATETIME NULL)`
- `mediciones(id, sesion_id FK con ON DELETE CASCADE, x_mm, y_mm, z_mm, bx, by, bz, magnitud FLOAT, timestamp DATETIME(3))`, con índice en `sesion_id`.
- `usuarios(id, usuario VARCHAR(32) UNIQUE, nombre VARCHAR(100), rol ENUM('admin','operador','observador'), hash_password, activo BOOL, debe_cambiar_password BOOL, preferencias JSON NULL, creado_en DATETIME, ultimo_acceso DATETIME NULL)` (migración 002).
- `sesiones_login(id CHAR(64) PK = SHA-256 del token, usuario_id FK con ON DELETE CASCADE, creada_en, expira_en, ultimo_uso, ip VARCHAR(45), user_agent VARCHAR(255))`, con índices en `usuario_id` y `expira_en` (migración 002).
- **La migración 002 ya se aplicó en la base local del usuario** (2026-11-09, con `tms_user`, que ahí todavía tiene ALL PRIVILEGES). Las tablas quedaron vacías: hay que correr `npm run crear-admin` para entrar.
- Todas las columnas numéricas son **FLOAT (float32)**: el CSV muestra valores como `2.3410000801086426`. Se pasan a DOUBLE en la Fase 5.
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
- Los tests automáticos (`node:test`) llegan en la Fase 8. Si una fase agrega lógica pura (conversión, validación, física del simulador), puedes adelantar sus tests en `server/tests/`.

---

## 6. Estado de las fases

| Fase | Estado | Resumen |
|---|---|---|
| 1. Base del backend | ✅ Hecha (commit `Fase1`) | Router en `/api` y `/`; CORS sin 500; pool en UTC; validación de entradas con 400/422; 404 y 409 para sesiones; errores en JSON; credenciales solo en `.env` y `.env.example`; migración 001; Bootstrap empaquetado; `npm audit fix`. |
| 2. Login y usuarios | ✅ Hecha (sin commit todavía) | Tablas `usuarios` y `sesiones_login` (migración 002 y `setup_db.sql`); contraseñas con scrypt; cookie `tms_sesion` HttpOnly con token hasheado; 5 intentos por usuario+IP en 15 min (429); roles admin/operador/observador en todas las rutas (solo `/status` es público); cambio de contraseña forzado; protección del último admin; `npm run crear-admin`; limpieza horaria. Frontend: `AuthContext`, `LoginPage`, `CambiarPasswordPage`, `api/cliente.js` (401 → login), botones ocultos por rol y "Salir" en la Navbar. Verificado con 73 pruebas de curl y en el navegador. |
| 3. Configuración, modos y simulador en el servidor | ⏳ Pendiente | — |
| 4. Pico W como cliente | ⏳ Pendiente | — |
| 5. Datos y trazabilidad | ⏳ Pendiente | — |
| 6. Frontend funcional | ⏳ Pendiente | — |
| 7. Accesibilidad y diseño (skills) | ⏳ Pendiente | — |
| 8. Tests y despliegue | ⏳ Pendiente | — |

**Notas que deja la Fase 2 para las siguientes:**
- El observador todavía ve los botones de modo DC/AC del panel de control (no hacen nada sin Iniciar). El menú lateral y los permisos finos de la interfaz llegan en la Fase 6.
- Las páginas de login y cambio de contraseña usan clases nuevas (`.auth-*`, `.campo-tms`, `.navbar-usuario`, `.btn-logout`) al final de `global.css`, solo con las variables existentes. Su diseño final y el tema claro son de las Fases 6 y 7.
- `PATCH /api/auth/preferencias` ya guarda el tema, pero la interfaz todavía no lo usa (Fase 6).
- En desarrollo, la consola muestra dos 401 de `/api/auth/yo` al abrir la página sin sesión (React StrictMode lo llama dos veces). Es el comportamiento esperado.
- Los tests de `services/passwords.js` y `services/limiteIntentos.js` se probaron a mano con `node:assert`; pasarlos a `server/tests/` queda para la Fase 8 (o antes, si una fase crea la carpeta).

**Cuestiones abiertas que el usuario todavía no ha confirmado:**
- Quién controla los motores y quién informa la posición. Hasta saberlo, se asume que la Pico W manda `xMM`, `yMM` y `zMM` con cada lectura.
- Cómo se mueve el eje Z.
- La dirección I2C real del sensor.

**Vulnerabilidades que quedan:**
- En el servidor: 2 moderadas en `nodemon`, solo de desarrollo.
- En el frontend: `esbuild` y `vite`, que solo afectan al servidor de desarrollo (corregirlas exige subir Vite de versión mayor, y no se hace).
- También en el frontend: `plotly.js` → `maplibre-gl`, que desaparece en la Fase 6 al usar `plotly.js-gl3d-dist-min`.

---

## 7. Especificación acordada (lo que falta construir)

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
- **`server/scripts/crear-admin.js`:** crea o restablece el usuario `admin` pidiendo la contraseña por terminal y lo marca con `debe_cambiar_password`.
- No se puede desactivar ni degradar al último admin activo.

### 7.2 Configuración y modos (Fase 3)
- **Tabla `configuracion`:** `clave VARCHAR PK, valor JSON, actualizado_en, actualizado_por`. Los valores por defecto se cargan en la migración.

  | Clave | Valor por defecto |
  |---|---|
  | `modo_operacion` | `'simulacion'` o `'real'` |
  | `barrido` | `{ grid_size_mm: 60, grid_n: 13, z_levels_mm: [0,5,10,15,20], standoff_mm: 5 }` |
  | `sensor` | `{ modelo: 'HMC5883L', rango_ga: 1.3, lsb_por_ga: 1090, lecturas_por_punto: 1, offset_ut: {x:0,y:0,z:0} }` |
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
- **Endpoints:** `GET /api/configuracion` (cualquier usuario con sesión) y `PUT /api/configuracion/:clave` (solo admin, con validación por clave). Cambiar `modo_operacion`, `barrido` o `sensor` con una sesión abierta responde 409.
- **Sesiones:** se agrega la columna `origen ENUM('sim','hw') NOT NULL`. Todas las sesiones existentes son `'sim'`. Solo puede haber **una sesión abierta a la vez**: si ya hay otra, responde 409.
- **El simulador pasa al servidor** (`services/simulador.js`):
  - Arranca al crear una sesión en modo simulación y se detiene al cerrarla. Al recorrer los 845 puntos, cierra la sesión solo.
  - Inserta y difunde a través del **mismo servicio de ingesta** que usa la API (`services/ingesta.js`).
  - Usa la física de una espira exacta, con integrales elípticas K(k) y E(k) calculadas por AGM, normalizada para que |B| en el centro con z = 0 sea `campo_centro_ut`, y con z_real = z + standoff.
  - Usa una semilla (mulberry32) y ruido gaussiano (Box–Muller) con σ igual a `ruido_sigma_ut`.
  - Inyecta huecos y saturación según las probabilidades configuradas.
- En modo simulación, `POST /api/mediciones` desde fuera responde 409.
- El frontend deja de generar muestras: solo crea o cierra la sesión y dibuja lo que llega por SSE.

### 7.3 Pico W (Fase 4)
- **Tabla `dispositivos`:** `id, nombre, token_hash, activo, creado_en, ultimo_latido DATETIME(3), ip, firmware, rssi, uptime_s`.
- **Token:** lo genera un admin con `POST /api/dispositivo/token`, que lo muestra **una sola vez**. Se guarda como SHA-256. El dispositivo lo envía como `Authorization: Bearer <token>`.
- **Latido:** `POST /api/dispositivo/latido {firmware, rssi, uptime_s, ts_dispositivo_ms}` cada `intervalo_latido_s`. Responde `{ ok, modo_operacion, sesion_activa: {id, modo, barrido, sensor} | null, servidor_ts_ms }`. Así la Pico sabe cuándo empezar a enviar sin necesidad de otra tecnología.
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

### 7.6 Hallazgos de la auditoría que siguen abiertos

| Hallazgo | Fase que lo resuelve |
|---|---|
| Datos simulados y reales mezclados (C1) | Fases 3 y 5 |
| Unidades y calibración (C3) | Fases 3 a 5 |
| Pérdida silenciosa de muestras (C4) | Fases 4 a 6 |
| Inyección y borrado sin autenticación (A3) | Fase 2 (autenticación y roles, hecho); Fase 5 (borrado lógico) |
| Simulador incorrecto (A5) | Fase 3 |
| Ningún test (A6) | Fase 8 |
| Metadatos de reproducibilidad (A7) | Fase 5 |
| Precisión float32 (M1) | Fase 5 |
| Gráficas engañosas (M2–M4) | Fase 6 |
| Condiciones de carrera (M5) | Fases 3 y 6 |
| Ritmo marcado por el navegador (M6) | Fase 3 |
| Rendimiento (M7) | Fase 6 |
| SSE sin ids (M8) | Fase 5 |
| CSV sin metadatos (M10) | Fase 5 |
| KPI desfasado (B1) | Fase 6 |
| Documentación y carpeta `mnt/` (B5) | Fase 8 |
