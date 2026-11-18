# 07 — Backend (servidor Node.js + Express)

Este documento describe el servidor del SAVD, que corre en la Raspberry Pi 5 detrás de Nginx: las tecnologías con su versión, la estructura de carpetas y la responsabilidad de cada capa del patrón MVC, cada servicio de lógica compartida, la API completa con sus roles y códigos de respuesta, las reglas de negocio (una sola sesión abierta, cierre de sesiones huérfanas, copias de configuración, huecos, saturación, CSV, borrado lógico y notas), la configuración del sistema clave por clave y los dos modos de operación.

---

## 1. Tecnologías

| Tecnología | Versión declarada (`package.json`) | Versión instalada | Papel | Motivo de la elección |
|---|---|---|---|---|
| Node.js | `>= 20.0.0` | 20 LTS en la Raspberry (guía de instalación); 22.23.4 en la computadora de desarrollo | Entorno de ejecución de JavaScript del servidor | Un solo lenguaje en servidor e interfaz; E/S asíncrona adecuada para muchas conexiones SSE abiertas; incluye `node:crypto` y `node:test`, lo que evita dependencias para contraseñas y pruebas |
| Express | `^4.19.2` | 4.22.3 | Marco HTTP: rutas, middleware, JSON | Maduro, mínimo y conocido; se adapta al patrón MVC |
| mysql2 | `^3.10.0` | 3.24.6 | Cliente de MariaDB con promesas y consultas preparadas | Consultas con parámetros `?` (sin inyección SQL), *pool* de conexiones, transacciones y lectura en *streaming* |
| cors | `^2.8.5` | 2.8.6 | Política de orígenes cruzados | Solo se necesita en desarrollo (Vite en otro puerto) |
| dotenv | `^16.4.5` | 16.6.1 | Lectura de `server/.env` | Las credenciales nunca van en el código |
| nodemon | `^3.1.4` (solo desarrollo) | 3.1.14 | Reinicio automático al editar | No se instala en producción |

El paquete se llama `tms-server`, versión **3.0.0**, y usa módulos ES (`"type": "module"`). Por decisión de diseño **no se añadieron marcos ni librerías adicionales** (ni enrutadores, ni validadores de esquemas, ni gestores de sesión, ni bibliotecas de contraseñas, ni marcos de pruebas): las contraseñas usan `scrypt` de `node:crypto`, la cookie se lee a mano y las pruebas usan `node:test` y `node:assert`.

---

## 2. Estructura y capas

```
server/
├── server.js          entrada: dotenv, prueba de conexión, iniciarServicios(), listen y limpieza horaria
├── app.js             crearApp(): CORS, JSON (100 kB), routers en /api y en /, errores; iniciarServicios()
├── config/            database.js (pool en UTC), barrido.js (malla de una sesión), roles.js
├── routes/            auth, usuarios, configuracion, mediciones, dispositivo (solo declaran)
├── middleware/        auth.js (cookie, roles, token de la Pico), validar.js (400/422), cors.js, errores.js
├── controllers/       auth, usuarios, configuracion, mediciones, dispositivo (lógica HTTP)
├── models/            Usuario, SesionLogin, Medicion, Configuracion, Dispositivo (todo el SQL)
├── services/          lógica compartida y funciones puras (ver la sección 3)
├── migrations/        001 a 009
├── scripts/           crear-admin.js, emular-pico.js
├── tests/             pruebas unitarias (*.test.js) e integración (integracion/)
└── setup_db.sql       instalación limpia de la base
```

| Capa | Responsabilidad | Ejemplo |
|---|---|---|
| Rutas | Solo declaran método, ruta y la cadena de middleware y controlador | `router.post('/sesiones', operador, validarNuevaSesion, iniciarSesion)` |
| Middleware | Autentican (`requiereLogin`, `requiereRol`, `requiereDispositivo`) y validan las entradas, dejando los valores ya convertidos en `req.<algo>`; responden 400 si falta algo o el tipo es incorrecto y 422 si un valor es inválido | `validarNuevaSesion` deja `req.nuevaSesion` |
| Controladores | Lógica HTTP: llaman a servicios y modelos y traducen los errores conocidos a códigos HTTP | `finalizarSesion` |
| Modelos | Todo el SQL, con `pool.execute` y parámetros `?` | `Medicion.insertarLote` |
| Servicios | Lógica compartida por varios controladores o con estado en memoria, y funciones puras que se prueban sin base de datos | `ingesta.js`, `geometria.js` |

Todas las respuestas son JSON: `{ok: true, …}` o `{ok: false, error, errores?}`. En producción nunca se envía la traza de un error al cliente; un error no controlado responde 500 con un mensaje genérico y se registra en la consola.

---

## 3. Servicios

| Servicio | Tipo | Qué hace |
|---|---|---|
| `configuracion.js` | Con estado | Carga la tabla `configuracion` en una caché en memoria antes de aceptar conexiones; si falta una clave o la guardada es inválida, usa y guarda el valor por defecto. `obtener(clave)` devuelve copias profundas. `actualizar(clave, cambio, usuarioId)` mezcla un cambio parcial con el valor actual, valida, guarda, actualiza la caché y difunde `event: configuracion`. Para `sensor`, al cambiar de modelo parte de los valores por defecto del modelo nuevo y conserva las lecturas por punto y el *offset*. |
| `validacionConfiguracion.js` | Puro | Reglas por clave (sección 6), tablas de rangos del QMC5883P y de ganancias del HMC5883L, fondo de escala por modelo, mezcla de cambios parciales y extracción del punto de inicio de la copia de una sesión. Rechaza campos desconocidos para que una errata no se guarde en silencio. |
| `sesiones.js` | Con estado | Mantiene la única sesión abierta en memoria; crea y cierra sesiones serializando las operaciones con una **cola de promesas**; cierra las huérfanas al arrancar; guarda las copias de configuración; calcula puntos recibidos y huecos al cerrar; arranca y detiene el simulador; completa la versión del firmware con el primer latido. Difunde `event: sesion`. |
| `ingesta.js` | Con estado | Única puerta de entrada de las mediciones. `registrarMedicion` (simulador): valida la posición, trata la saturación según el modelo, numera `seq` desde 1, calcula $\|B\|$, inserta solo si la sesión sigue abierta y difunde. `registrarLoteDispositivo` (Pico): valida y convierte cada lectura, inserta las nuevas de forma idempotente, difunde y avisa si la sesión quedó completa. Mantiene en memoria el último `seq` de cada sesión abierta. |
| `simulador.js` | Con estado | Recorre la malla de la sesión con `setTimeout` encadenado (el siguiente punto se programa cuando el anterior ya se guardó), al ritmo `ms_por_punto[modo]`, usando las copias de configuración de la sesión; cuenta huecos, saturadas y rechazadas; cierra la sesión al terminar. |
| `simulacionPura.js`, `fisicaEspira.js`, `aleatorio.js` | Puros | Generador de muestras: espira circular exacta, mulberry32, Box–Muller, huecos y saturaciones (documento 09). |
| `geometria.js` | Puro | Malla de una zona, serpentina directa e inversa, índice del plano, validación de zona y paso, límites (documento 10). |
| `conversionSensor.js` | Puro | Validación de cada lectura de la Pico, conversión de cuentas a µT de los dos modelos, saturación, clasificación de un lote en nuevas, duplicadas y rechazadas, detección de un lote con apariencia de «cuentas HMC» y la conversión inversa µT → cuentas para el simulador y el emulador. |
| `tiempoReal.js`, `bufferEventos.js` | Con estado / puro | Canal SSE: identificadores, búfer circular de 2 000 eventos, `Last-Event-ID`, `retry`, contrapresión y *ping* (documento 06). |
| `dispositivo.js` | Con estado | Estado de la Pico en memoria, latido (escritura en la base como máximo cada 30 s), desfase de reloj, temporizador de 1 s para «sin señal», generación y revocación del token, activación. Difunde `event: dispositivo`. |
| `trazabilidad.js` | Puro | Cálculo de huecos, encabezado de metadatos del CSV, línea CSV sin redondear y nombre del archivo. |
| `version.js` | Puro | Versión del software: la de `package.json` más el commit corto de git (por ejemplo, `3.0.0+9a1ab30`; `3.0.0+desconocido` si la carpeta no es un repositorio). |
| `passwords.js` | Puro | Hash y verificación de contraseñas con scrypt; hash de relleno para usuarios inexistentes (documento 12). |
| `sesionUsuario.js` | Con estado | Token de sesión, su SHA-256, la cookie `tms_sesion` y la limpieza horaria de sesiones de login expiradas. |
| `limiteIntentos.js` | Con estado | Cinco fallos por usuario e IP en 15 minutos, en memoria. |

Scripts de apoyo: `crear-admin.js` (`npm run crear-admin`) crea o restablece el usuario administrador; `emular-pico.js` (`npm run emular-pico`) emula la Pico W con el mismo protocolo, con pérdidas, duplicados y saturaciones configurables.

---

## 4. API completa

Todas las rutas responden también sin el prefijo `/api` (documento 02). Roles: **público** = sin sesión; **sesión** = cualquier usuario con sesión iniciada; **op** = operador o administrador; **admin** = solo administrador; **Pico** = token del dispositivo. Sin una cookie válida, toda ruta no pública responde 401; con un rol insuficiente, 403. Mientras un usuario deba cambiar su contraseña, todo responde 403 salvo `/auth/yo`, `/auth/cambiar-password` y `/auth/logout`.

### 4.1 Autenticación y usuarios

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `POST /api/auth/login` `{usuario, password}` | público | Verifica las credenciales (el usuario se normaliza a minúsculas), cierra la sesión anterior de ese navegador y crea la cookie `tms_sesion` | 200, 400, 401 (mensaje único), 429 con `Retry-After` |
| `POST /api/auth/logout` | sesión | Borra la sesión de login y la cookie | 200 |
| `GET /api/auth/yo` | sesión | Usuario actual: id, usuario, nombre, rol, `debe_cambiar_password` y preferencias | 200 |
| `POST /api/auth/cambiar-password` `{actual, nueva}` | sesión | Cambia la contraseña, quita la obligación de cambiarla y cierra las **demás** sesiones del usuario | 200, 400, 422, 429 |
| `PATCH /api/auth/preferencias` `{tema}` | sesión | Guarda el tema (`oscuro`, `claro` o `sistema`) | 200, 400, 422 |
| `GET /api/usuarios` | admin | Lista de usuarios, sin hashes | 200 |
| `POST /api/usuarios` `{usuario, nombre, rol, password}` | admin | Crea un usuario que deberá cambiar su contraseña | 201, 400, 409 si ya existe, 422 |
| `PATCH /api/usuarios/:id` `{nombre?, rol?, activo?}` | admin | Edita; desactivar borra sus sesiones de login | 200, 400, 404, 409 si es el último admin, 422 |
| `POST /api/usuarios/:id/restablecer-password` `{password}` | admin | Pone una contraseña temporal, obliga a cambiarla y cierra sus sesiones | 200, 400, 404, 422 |

### 4.2 Estado, configuración y tiempo real

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `GET /api/status` | público | Verificación de salud: `version`, `commit`, `version_software`, tiempo encendido, clientes SSE conectados y `modo_operacion` | 200 |
| `GET /api/configuracion` | sesión | Toda la configuración, las opciones de los formularios (pasos sugeridos, paso mínimo, máximo de puntos, medios, modelos de sensor, rangos del QMC5883P con su fondo de escala, ganancias del HMC5883L) y la sesión abierta | 200 |
| `PUT /api/configuracion/:clave` `{valor}` | admin | Cambia una clave (las que son objetos admiten cambios parciales) y difunde el cambio | 200, 400, 404 clave desconocida, 409 (`general`, `modo_operacion`, `barrido` o `sensor` con una sesión abierta), 422 |
| `GET /api/stream` | sesión | Canal SSE (documento 06) | — |

### 4.3 Sesiones y mediciones

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `POST /api/sesiones` `{modo, paso_mm?, medio?, zona_mm?}` | op | Crea la sesión (sin `paso_mm` ni `medio`, usa los predeterminados; sin `zona_mm`, toda la base); en simulación arranca el simulador. Devuelve la sesión con `zona_mm`, `grid_nx`, `grid_ny`, `z_levels_mm` y `puntos_esperados` | 201, 409 si ya hay otra abierta, 422 |
| `PUT /api/sesiones/:id` | op | Cierra la sesión y detiene el simulador | 200, 404, 409 si ya estaba cerrada |
| `GET /api/sesiones?modo=&paso_mm=&medio=&origen=&incluir_eliminadas=` | sesión | Lista con conteo de lecturas, máximo y mínimo de $\|B\|$ (sin saturadas), saturadas, metadatos, puntos esperados y recibidos, huecos y versiones. Excluye las eliminadas salvo `incluir_eliminadas=1` (solo admin). El paso acepta punto o coma | 200, 403, 422 |
| `GET /api/sesiones/activa` | sesión | La sesión abierta con todas sus lecturas (formato de `event: medicion`), o sesión nula | 200 |
| `PATCH /api/sesiones/:id` `{notas}` | admin, u operador que la inició | Edita las notas (hasta 5 000 caracteres) y difunde el cambio | 200, 400, 403, 404, 422 |
| `DELETE /api/sesiones/:id` | admin | **Borrado lógico** | 200, 404, 409 si está en curso o ya eliminada |
| `POST /api/sesiones/:id/restaurar` | admin | Quita el borrado lógico | 200, 404, 409 si no estaba eliminada |
| `GET /api/sesiones/:id/csv` | sesión | CSV en *streaming* con encabezado de metadatos | 200, 404 (también si está eliminada) |
| `GET /api/sesiones/:id/mediciones` | sesión | Lecturas en JSON con `seq`, crudos y `saturado` | 200, 404 (también si está eliminada) |
| `POST /api/mediciones` | — | **Retirada** en la Fase 4: indica la ruta de la Pico | 410 |

### 4.4 Dispositivo

| Método y ruta | Rol | Qué hace | Códigos |
|---|---|---|---|
| `GET /api/dispositivo/estado` | sesión | Estado de la Pico: existe, en línea, último latido, firmware, RSSI, IP, tiempo encendido, si tiene token, si está activa, desfase de reloj, umbral, estado y error informados | 200 |
| `POST /api/dispositivo/token` | admin | Genera el token y lo devuelve una sola vez (reemplaza al anterior) | 201 |
| `DELETE /api/dispositivo/token` | admin | Revoca el token | 200, 404 |
| `PATCH /api/dispositivo` `{activo}` | admin | Activa o desactiva la Pico | 200, 400, 404 |
| `POST /api/dispositivo/latido` | Pico | Latido (documento 06) | 200, 401, 422 |
| `POST /api/dispositivo/mediciones` | Pico | Lote de lecturas (documento 06) | 200, 400, 401, 404, 409, 422 |

### 4.5 Convención de códigos HTTP

| Código | Uso en el sistema |
|---|---|
| 200 / 201 | Correcto / recurso creado |
| 400 | Falta un campo, el tipo es incorrecto o el cuerpo no es JSON |
| 401 | Sin sesión de usuario (o expirada), o token de la Pico ausente o inválido |
| 403 | El rol no tiene permiso, o el usuario debe cambiar su contraseña |
| 404 | El recurso no existe (o la sesión está eliminada, para el CSV y las mediciones) |
| 409 | Conflicto de estado: ya hay una sesión abierta, la sesión está cerrada, modo incorrecto, cambio de configuración con una sesión abierta, último administrador |
| 410 | Ruta retirada (`POST /api/mediciones`) |
| 413 | Cuerpo de más de 100 kB |
| 422 | Valores inválidos (fuera de rango, mal formados o incoherentes) |
| 429 | Demasiados intentos fallidos de contraseña, con la cabecera `Retry-After` |

---

## 5. Reglas de negocio

### 5.1 Una sola sesión abierta

Solo puede haber una sesión de medición abierta a la vez. Como el servidor es un único proceso, la creación y el cierre se **serializan con una cola de promesas**: cada operación espera a que termine la anterior, de modo que dos clics simultáneos en «Iniciar» no pueden crear dos sesiones. Además, antes de crear se consulta la base por si existiera una sesión abierta creada por fuera del servidor. La interfaz añade una guardia contra el doble clic.

### 5.2 Cierre de sesiones huérfanas al arrancar

Al arrancar no hay ningún barrido en marcha, así que cualquier sesión abierta en la base pertenece a una ejecución anterior (un reinicio o un corte de luz). El servidor la cierra con la hora de su última medición, calcula sus puntos recibidos y huecos y lo registra.

### 5.3 Copias de la configuración con cada sesión

Al crear una sesión se guardan: quién la inició, el origen (`sim` o `hw`, según el modo de operación), el paso, el medio, la zona, los puntos esperados, copias JSON de la configuración vigente de `barrido` y `sensor`, de `simulacion` (con su semilla) solo en las simuladas y de `general` (punto de inicio) solo en las reales, la versión del software y, en las reales, la versión del firmware del último latido (o del primero que llegue después). El simulador, la conversión de los lotes y el latido usan **las copias de la sesión**, de modo que un cambio de configuración no altera una sesión en curso y una sesión simulada puede reproducirse exactamente.

### 5.4 Puntos recibidos y huecos

Al cerrar una sesión:

- `puntos_recibidos` es el número de filas guardadas (incluidas las saturadas).
- Un punto de la malla cuenta como **medido** si tiene al menos una lectura **no saturada** en su plano a menos de 1 mm en X y en Y de su posición nominal (la misma tolerancia que el requisito de error posicional). Los puntos sin lectura válida son **huecos**.
- `huecos` se guarda como `{total, posiciones}`, con hasta 1 000 posiciones listadas en el orden de la serpentina, para que el total no se pierda si hay más.

### 5.5 Saturación

El tratamiento depende del modelo del sensor (documento 04). Las lecturas saturadas se guardan con sus crudos y `saturado = 1`, con las componentes afectadas nulas; no cuentan para el máximo ni el mínimo del historial y no cubren su punto. En el simulador, un eje por encima del fondo de escala del sensor configurado se trata igual que en el sensor real.

### 5.6 Exportación CSV en *streaming*

`GET /api/sesiones/:id/csv` genera el archivo en el servidor, fila por fila desde la base (lectura en *streaming* con contrapresión), sin cargarlo entero en memoria. El nombre es `tms_sesion_<id>_<AAAAMMDDTHHMMSSZ>.csv`. El encabezado son líneas `# clave: valor`:

| Clave | Contenido |
|---|---|
| `sistema`, `sesion_id`, `modo`, `paso_mm`, `medio`, `origen` | Identificación y parámetros |
| `iniciada_utc`, `terminada_utc`, `usuario` | Tiempos en ISO 8601 y quién la inició |
| `version_software`, `version_firmware` | Versiones |
| `zona_mm`, `malla` | Zona y malla (puntos por eje y planos) |
| `puntos_esperados`, `puntos_recibidos`, `huecos` | Completitud |
| `config_barrido`, `inicio_medicion_mm` (solo si la sesión tiene copia), `sensor_modelo`, `config_sensor`, `config_simulacion` (solo simuladas) | Configuración copiada |
| `unidades`, `saturado`, `notas` | Notas de interpretación y notas del usuario |

Las columnas son: `timestamp_utc, ts_dispositivo_utc, seq, x_mm, y_mm, z_mm, bx_uT, by_uT, bz_uT, magnitud_uT, raw_x, raw_y, raw_z, saturado`. Los números se escriben **sin redondear** (la representación más corta del valor DOUBLE).

### 5.7 Borrado lógico, restauración y notas

- `DELETE` no borra filas: marca `eliminada_en`. Una sesión en curso no se puede eliminar (409).
- Las sesiones eliminadas no aparecen en la lista salvo que un administrador active «Ver eliminadas», y responden 404 en el CSV y en las mediciones hasta que se restauren.
- El borrado definitivo no está en la API; la guía de instalación documenta la consulta SQL para hacerlo, tras un respaldo.
- Las notas (texto libre de hasta 5 000 caracteres) las edita un administrador o el operador que inició la sesión.

### 5.8 Validación de una sesión nueva

`modo` debe ser `DC` o `AC`; `medio`, `campo_magnetico` o `solucion_salina`; `zona_mm` (opcional), tres números de 0 al límite de la base en cada eje con un decimal; `paso_mm` (opcional), de 1 a 300 mm con un decimal y sin superar 25 000 puntos en la zona. Cualquier valor inválido responde 422 con la lista de errores.

---

## 6. Configuración del sistema

La tabla `configuracion` tiene una fila por clave con un valor JSON. El servidor la mantiene en memoria y la difunde por SSE al cambiar. Solo un administrador la modifica; las claves `general`, `modo_operacion`, `barrido` y `sensor` no se pueden cambiar con una sesión abierta (409), porque alterarían los datos a mitad de un barrido.

| Clave | Campos y valores por defecto | Validación |
|---|---|---|
| `general` | `inicio_medicion: {x_mm: 0, y_mm: 0, z_mm: 0}` (punto de inicio de la medición en mm de máquina) | Tres números de 0 a 1 000 con un decimal como máximo; los límites reales de la mesa (410, 562 y 88 mm) los valida la Pico |
| `modo_operacion` | `simulacion` | `simulacion` o `real` |
| `barrido` | `limite_x_mm: 60`, `limite_y_mm: 60`, `limite_z_mm: 20` (límites de la base), `standoff_mm: 5`, `paso_predeterminado_mm: 5` | Límites X e Y de 1 a 1 000 mm y Z de 0 a 500 mm, con un decimal; *standoff* de 0,1 a 100 mm; paso válido para la base completa. Convierte la forma anterior a la migración 007 (`grid_size_mm`, `z_max_mm`) |
| `sensor` (QMC5883P) | `modelo: 'QMC5883P'`, `rango_g: 30`, `cuentas_por_g: 1000`, `lecturas_por_punto: 1`, `offset_ut: {x: 0, y: 0, z: 0}` | `rango_g` ∈ {2, 8, 12, 30}; `cuentas_por_g` se calcula del rango (no se elige); lecturas por punto de 1 a 100; *offset* de −1 000 a 1 000 µT por eje |
| `sensor` (HMC5883L) | `modelo: 'HMC5883L'`, `rango_ga: 1.9`, `lsb_por_ga: 820`, `lecturas_por_punto`, `offset_ut` | `rango_ga` ∈ {0,88; 1,3; 1,9; 2,5; 4,0; 4,7; 5,6; 8,1}; `lsb_por_ga` se calcula del rango. Un sensor sin modelo pero con `rango_ga` se interpreta como HMC5883L |
| `simulacion` | `ms_por_punto: {DC: 60, AC: 120}`, `semilla: 12345`, `ruido_sigma_ut: 0.25`, `radio_bobina_mm: 25`, `campo_centro_ut: 120`, `prob_hueco: 0`, `prob_saturacion: 0` | Tiempos de 20 a 10 000 ms; semilla de 0 a $2^{32}-1$; ruido de 0 a 100 µT; radio de 1 a 500 mm; campo de 0,001 a 10 000 µT; probabilidades de 0 a 1 |
| `dispositivo` | `intervalo_latido_s: 5`, `umbral_desconexion_s: 15` | Intervalo de 1 a 300 s; umbral de 2 a 3 600 s y mayor que el intervalo |
| `visualizacion` | `ventana_grafica: 80`, `filas_tabla: 60`, `decimales: 3`, `escala_superficie: 'Jet'`, `rotacion_auto: true`, `reducir_animaciones: false` | Ventana y filas de 10 a 2 000; decimales de 0 a 6; escala `Jet` o `Viridis` (la interfaz ya no la usa); booleanos |
| `datos` | `zona_horaria: 'America/Mexico_City'` | Zona IANA válida |

En la base local de desarrollo, un administrador cambió los límites de la base a 400 × 500 × 60 mm y el paso predeterminado a 10 mm, para las pruebas en la mesa real.

---

## 7. Modos de operación

| Aspecto | Modo simulación | Modo real |
|---|---|---|
| Quién genera los datos | El simulador del servidor | La Pico W con la mesa y el sensor |
| Origen de las sesiones | `sim` | `hw` |
| Latido de la Pico | Se atiende y la Pico aparece «en línea», pero `sesion_activa` siempre es nula (el firmware avisa en su consola) | `sesion_activa` con la sesión abierta |
| Lotes de la Pico | Rechazados con 409 | Aceptados para la sesión abierta |
| Copias guardadas | `barrido`, `sensor`, `simulacion` | `barrido`, `sensor`, `general` |
| Cierre automático | Al recorrer toda la malla | Al recibir todos los `seq` esperados |
| Interfaz | Etiqueta SIMULACIÓN muy visible en la barra superior | Etiqueta REAL e indicador de la Pico W |
| Cambio de modo | Solo un administrador, desde el menú lateral, y solo sin sesión abierta (409) | Igual |

---

## Fuentes en el proyecto

- `server/package.json`, `server/app.js`, `server/server.js`, `server/config/*.js`
- `server/routes/*.js`, `server/middleware/*.js`, `server/controllers/*.js`, `server/models/*.js`
- `server/services/*.js` (todos)
- `server/scripts/crear-admin.js`, `server/scripts/emular-pico.js`
- `server/setup_db.sql`, `server/.env.example`
- Base de datos local `tms_db`: tabla `configuracion` (consulta `SELECT`)
- Versiones instaladas leídas de `server/node_modules/*/package.json`
