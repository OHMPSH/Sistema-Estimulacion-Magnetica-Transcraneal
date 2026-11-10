# Prompts para las fases pendientes

Cada bloque es un prompt completo para pegar en una **sesión nueva** de Claude Code abierta en esta carpeta (`PT/`). Ejecuta las fases **en orden**, porque cada una depende de la anterior. Haz tu commit al terminar cada fase y antes de abrir la siguiente.

Todas las fases comparten estas reglas. Ya están dentro de cada prompt, así que no hace falta pegarlas aparte:
- Para entrar al sistema (curl o navegador) se usa el acceso **admin / admin**, que ya existe y no se borra ni se cambia (CLAUDE.md, sección 1).
- Los parámetros de cada medición (paso de 0,5, 1 o 2 cm; DC o AC; campo magnético o solución salina) se describen en CLAUDE.md 7.0.
- Leer `CLAUDE.md` completo antes de empezar.
- No hacer commits, no crear ramas y no tocar `nginx/tms.conf`.
- No agregar librerías ni frameworks nuevos.
- Verificar el trabajo de verdad (curl, navegador, build) y dejar la base de datos como estaba.
- Al terminar, actualizar la sección 6 ("Estado de las fases") de `CLAUDE.md`.

---

## Fase 2 — Login y usuarios

```text
Vas a implementar la Fase 2 (login y usuarios) del proyecto SAVD/TMS.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial las secciones 2 (restricciones), 3 (arquitectura), 4 (convenciones) y 7.1 (especificación de usuarios y login). Esa especificación manda: si algo de este prompt la contradice, gana CLAUDE.md y me lo avisas.
2. Revisa el código actual de server/ y frontend/src/ para confirmar que coincide con lo que describe CLAUDE.md. Si encuentras cambios sin commitear que no esperabas, dímelo antes de seguir.

REGLAS
- No hagas commits ni crees ramas; yo hago los commits.
- No toques nginx/tms.conf. Recuerda que Nginx quita el prefijo /api, así que todo router nuevo se monta en /api y en /, igual que el actual.
- No agregues dependencias: usa node:crypto (scrypt, randomBytes, createHash, timingSafeEqual). Nada de express-session, passport, bcrypt ni cookie-parser. En el frontend no agregues react-router.
- Mantén el MVC: routes → middleware → controllers → models, y services/ para la lógica compartida. Nombres y comentarios en español.
- Respóndeme en español y en prosa completa.

BACKEND
1. Migración server/migrations/002_usuarios.sql con las tablas `usuarios` y `sesiones_login` exactamente como en CLAUDE.md 7.1, con índices en usuario_id y expira_en. Actualiza también setup_db.sql para que una instalación limpia ya las tenga.
2. models/Usuario.js y models/SesionLogin.js con todo el SQL: crear, buscar por usuario o id, listar, actualizar, contar admins activos, crear, buscar y borrar sesiones de login, y limpiar las expiradas.
3. services/passwords.js: hashPassword y verificarPassword con scrypt y el formato scrypt$N$r$p$salHex$hashHex, comparando con timingSafeEqual. Rechaza contraseñas de menos de 8 caracteres.
4. middleware/auth.js:
   - leerCookie: parsea req.headers.cookie a mano.
   - requiereLogin: busca el hash SHA-256 del token en sesiones_login, comprueba que no haya expirado y que el usuario esté activo, renueva expira_en a 12 h y deja req.usuario = {id, usuario, nombre, rol, debe_cambiar_password, preferencias}. Si algo falla, responde 401.
   - requiereRol(...roles): responde 403 si el rol no está permitido.
   - Mientras debe_cambiar_password sea verdadero, solo permite /auth/yo, /auth/cambiar-password y /auth/logout; el resto responde 403 con un mensaje claro.
5. Límite de intentos de login: 5 fallidos por la combinación de usuario e IP en 15 minutos, en memoria, con 429 y el tiempo restante. Usa app.set('trust proxy', 'loopback') para que req.ip sea la IP real detrás de Nginx.
6. controllers/auth.controller.js y routes/auth.routes.js:
   - POST /auth/login {usuario, password}: crea la cookie tms_sesion (HttpOnly; SameSite=Strict; Path=/; Secure si NODE_ENV=production; Max-Age de 12 h) y actualiza ultimo_acceso.
   - POST /auth/logout: borra la fila y la cookie.
   - GET /auth/yo: devuelve el usuario actual.
   - POST /auth/cambiar-password {actual, nueva}.
   - PATCH /auth/preferencias {tema: 'oscuro'|'claro'|'sistema'}: se guarda en el JSON de preferencias.
   - Los errores de login nunca dicen si el que falló fue el usuario o la contraseña.
7. controllers/usuarios.controller.js y routes/usuarios.routes.js, solo para admin:
   - GET /usuarios, que nunca devuelve hashes.
   - POST /usuarios {usuario, nombre, rol, password}: el nuevo usuario queda con debe_cambiar_password.
   - PATCH /usuarios/:id {nombre?, rol?, activo?}: impide degradar o desactivar al último admin activo (409). Si se desactiva un usuario, se borran sus sesiones de login.
   - POST /usuarios/:id/restablecer-password {password}: deja debe_cambiar_password activado.
   - Agrega a middleware/validar.js los validadores que necesites, siguiendo el estilo existente (400 o 422, con el valor convertido en req).
8. Protege las rutas existentes:
   - GET /status queda público.
   - El SSE /stream y los GET de sesiones y mediciones requieren sesión.
   - POST /sesiones, PUT /sesiones/:id y POST /mediciones requieren operador o admin. POST /mediciones lo sigue usando el simulador del navegador hasta la Fase 3.
   - DELETE /sesiones/:id requiere admin.
9. Script server/scripts/crear-admin.js: crea el usuario admin o le restablece la contraseña. La pide por terminal sin mostrarla y la confirma (usa readline con el eco silenciado; si no se puede, acepta la variable de entorno ADMIN_PASSWORD). Marca debe_cambiar_password. Agrega a package.json el script "crear-admin": "node scripts/crear-admin.js".
10. Una limpieza periódica (cada hora) de las sesiones de login expiradas.

FRONTEND (mínimo para que el sistema siga usable; el diseño final llega en las Fases 6 y 7)
1. src/context/AuthContext.jsx: al montar llama a GET /api/auth/yo y expone {usuario, cargando, iniciarSesion, cerrarSesion, cambiarPassword}.
2. src/pages/LoginPage.jsx: formulario con usuario y contraseña, cada campo con su <label> asociado (autocomplete="username" y "current-password"), un mensaje de error en un elemento con aria-live y el botón desactivado solo mientras la petición está en curso. Usa las clases y variables de global.css del tema oscuro actual, sin cambiar colores.
3. src/pages/CambiarPasswordPage.jsx para cuando debe_cambiar_password sea verdadero.
4. App.jsx: si no hay usuario, muestra el login; si debe cambiar la contraseña, muestra esa página; si no, el dashboard actual.
5. Un helper src/api/cliente.js (fetch con credentials 'same-origin') que, ante un 401, devuelva al usuario al login. Úsalo en useAcquisition, useServerStatus e HistorialPage, cambiando lo mínimo.
6. Según el rol: el observador no ve los botones de Iniciar, Detener ni Eliminar, y el operador no ve Eliminar. En la Navbar, un botón para cerrar sesión y el nombre del usuario. Algo simple; el menú lateral llega en la Fase 6.

VERIFICACIÓN (obligatoria antes de terminar)
- Pídeme que ejecute la migración 002 con sudo, o ejecútala tú si te confirmo que puedes. Después ejecuta crear-admin con ADMIN_PASSWORD para un usuario de prueba.
- Con curl, contra el servidor en el puerto 4100:
  - Sin cookie, cualquier ruta salvo status responde 401.
  - El login correcto crea la cookie con sus atributos (revisa las cabeceras).
  - El login incorrecto da 401 y, tras 5 intentos, 429.
  - Con debe_cambiar_password, el resto de las rutas responde 403 hasta cambiarla.
  - Un observador recibe 403 al crear una sesión y un operador recibe 403 al borrar.
  - No se puede degradar al último admin.
  - Logout invalida la cookie.
  - Las rutas funcionan con /api y sin /api.
- En el navegador integrado (backend en el 4000 y Vite en el 5173): login, cambio forzado de contraseña, iniciar y detener un barrido corto en simulación, historial, logout. Revisa que la consola no tenga errores.
- Borra los usuarios, las sesiones de login y las sesiones de medición de prueba que crees, salvo el admin si te digo que lo deje. Detén los procesos.

AL TERMINAR
- Actualiza CLAUDE.md: la sección 6 (Fase 2 hecha, con un resumen), la API de la sección 3 con las rutas nuevas y sus roles, el esquema y la estructura de carpetas.
- Actualiza COMANDOS.md con los pasos nuevos: la migración 002 y npm run crear-admin.
- Dame un resumen: qué cambió, cómo lo verificaste, qué queda pendiente y cualquier decisión que necesite de mí. No hagas commit.
```

---

## Fase 3 — Configuración del sistema, modos y simulador en el servidor

```text
Vas a implementar la Fase 3 (configuración, modo simulación o real, y simulador en el servidor) del proyecto SAVD/TMS.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial las secciones 2, 3, 4 y 7.2. La Fase 2 (login) ya debe estar hecha; confírmalo en la sección 6 y en el código. Si no lo está, detente y avísame.
2. Revisa el estado actual del código y avísame de cualquier cambio sin commitear que no esperes.

REGLAS
- No hagas commits; yo los hago. No toques nginx/tms.conf. Los routers nuevos se montan en /api y en /.
- No agregues dependencias. La física, el generador de números aleatorios y el ruido se escriben a mano.
- Mantén el MVC y el español. Respóndeme en prosa completa.

BACKEND
1. Migración 003_configuracion.sql:
   - Crea la tabla configuracion(clave PK, valor JSON, actualizado_en, actualizado_por FK a usuarios NULL) con los valores por defecto de CLAUDE.md 7.2.
   - Agrega a sesiones la columna origen ENUM('sim','hw') NOT NULL DEFAULT 'sim'. Todas las sesiones existentes son simuladas.
   - Agrega a sesiones paso_mm y medio como en CLAUDE.md 7.0 (las existentes quedan con 5 mm y campo magnético), con índices para filtrar.
   - Actualiza setup_db.sql.
2. models/Configuracion.js y services/configuracion.js:
   - Carga la configuración al arrancar, antes del app.listen.
   - Expone obtener(clave) y actualizar(clave, valor, usuarioId).
   - Al cambiar algo, difunde por SSE el evento configuracion.
   - Valida cada clave a mano:
     - El rango del sensor debe ser una de las 8 ganancias del HMC5883L, y lsb_por_ga se fija según la tabla. No se acepta un valor libre.
     - barrido: grid_size_mm y z_max_mm múltiplos de 20; paso_predeterminado_mm uno de 5, 10 o 20.
     - ms_por_punto entre 20 y 10000.
     - Probabilidades entre 0 y 1.
3. config/barrido.js deja de exportar constantes fijas: lee del servicio de configuración. Ajusta validarMedicion para que use la configuración vigente.
4. controllers y routes de configuracion:
   - GET /configuracion para cualquier usuario con sesión.
   - PUT /configuracion/:clave solo para admin.
   - Si se intenta cambiar modo_operacion, barrido o sensor con una sesión abierta, responde 409 con un mensaje que explique que primero hay que detener la sesión.
5. Saca el SSE del controlador a services/tiempoReal.js (clientes, broadcast y ping) y úsalo desde todos los controladores y servicios.
6. services/ingesta.js: una única función registrarMedicion(...) que valida contra la configuración, calcula |B|, inserta con el modelo y difunde. La usan el controlador de POST /mediciones y el simulador. Más adelante la usará también la ingesta de la Pico.
7. Reglas de sesión:
   - POST /sesiones {modo, paso_mm?, medio?} (CLAUDE.md 7.0): 422 si el paso o el medio no son válidos. La sesión guarda los tres.
   - Solo una sesión abierta a la vez: POST /sesiones responde 409 si ya hay otra.
   - La sesión se crea con origen 'sim' o 'hw' según modo_operacion.
   - Al crear o cerrar una sesión se difunde el evento sesion {tipo:'iniciada'|'finalizada', sesion}.
   - Al arrancar el servidor, si quedó una sesión abierta de una ejecución anterior, se cierra y se registra en el log.
8. services/simulador.js:
   - Arranca al crear una sesión en modo simulación, con setTimeout encadenado (no setInterval) a ms_por_punto[modo]. Recorre x, luego y, luego z con la malla que da el paso de la sesión y llama a registrarMedicion.
   - Al terminar los puntos, cierra la sesión solo. Si alguien cierra la sesión con PUT, se detiene.
   - Física: campo de una espira circular de radio R en el plano z = 0, con integrales elípticas completas K(m) y E(m) calculadas por el método AGM. Usa las componentes Bz y Bρ de la forma estándar en coordenadas cilíndricas. Normaliza para que |B| en el centro con z = 0 sea campo_centro_ut. Usa z_real = zMM + standoff_mm y el centro de la placa en grid_size_mm/2. Documenta las fórmulas en comentarios.
   - Ruido gaussiano (Box–Muller) con σ igual a ruido_sigma_ut, y un generador mulberry32 sembrado con la semilla. Misma semilla, mismos datos.
   - Con prob_hueco omite el punto. Con prob_saturacion manda el punto con un valor fuera de rango para probar la detección; documenta qué valor eliges.
   - Guarda en la sesión la semilla usada. Si todavía no existe la columna, déjalo anotado para la Fase 5 en CLAUDE.md.
9. POST /mediciones en modo simulación responde 409 ("el sistema está en modo simulación"). En modo real, por ahora lo pueden usar operador y admin, y la Fase 4 lo cambia por la ingesta del dispositivo.
10. GET /status agrega modo_operacion.
11. GET /sesiones devuelve origen, paso_mm y medio, y acepta filtros opcionales ?modo=&paso_mm=&medio=&origen= (422 si un valor no es válido).

FRONTEND (lo mínimo funcional; el menú y el diseño llegan en las Fases 6 y 7)
1. Quita la simulación del navegador: generarMuestra y el setInterval de useAcquisition.js. Iniciar es POST /api/sesiones y Detener es PUT. Todo lo que se dibuja llega por SSE (eventos medicion y sesion), así que todas las personas conectadas ven lo mismo. Mantén las cinco vistas, con los mismos datos.
2. Descarta los eventos medicion de una sesión que no sea la activa. Evita el doble inicio con un estado "iniciando" que desactive el botón.
3. Barra de configuración de la medición en el panel de control: paso (0,5 / 1 / 2 cm), DC o AC y medio (campo magnético o solución salina con voltaje). Se envían en POST /api/sesiones.
4. La geometría (malla, planos Z, total de puntos) sale del paso de la sesión activa y de GET /api/configuracion, no de constants/system.js. La barra de progreso, los KPI, el mapa 3D y la superficie usan esa geometría.
5. Historial: muestra el paso, el medio y el origen de cada sesión y agrega filtros por paso y por medio (además del modo y la fecha que ya existen).
6. Muestra de forma provisional el modo actual (por ejemplo, una etiqueta SIMULACIÓN o REAL junto al estado del servidor) y, solo para admin, un selector provisional para cambiar el modo. El menú definitivo llega en la Fase 6.

TESTS (adelanta esta parte de la Fase 8)
- server/tests/simulador.test.js con node:test:
  - En el eje (ρ = 0), Bz coincide con la fórmula analítica μ0·I·R²/(2(R²+z²)^{3/2}) normalizada, con un error relativo menor que 1e-9.
  - Bρ vale 0 en el eje.
  - El campo es simétrico ante x → −x.
  - La misma semilla produce la misma secuencia.
  - La σ empírica de 100 000 muestras de ruido está a menos del 2 % de la configurada.
- Agrega "test": "node --test tests/" a server/package.json.

VERIFICACIÓN
- Pídeme que ejecute la migración 003 o ejecútala si te lo confirmo.
- Con curl:
  - Crear una sesión mientras hay otra abierta da 409.
  - Cambiar el modo con una sesión abierta da 409.
  - Un PUT de configuración con valores inválidos da 422, y como no admin, 403.
  - En modo simulación, POST /mediciones da 409.
  - La simulación completa genera 845 puntos con paso de 5 mm (147 con 1 cm y 32 con 2 cm) y se cierra sola. Para no esperar, baja ms_por_punto temporalmente y restáuralo al terminar.
- En el navegador, con dos pestañas abiertas: las dos ven el mismo barrido en vivo. Al recargar una pestaña a mitad del barrido, sigue recibiendo los puntos nuevos; los anteriores llegan en la Fase 5.
- npm test pasa.
- Deja la configuración con sus valores por defecto, borra las sesiones de prueba y detén los procesos.

AL TERMINAR
- Actualiza CLAUDE.md: la sección 6, la API, el esquema y el recorrido de una medición (la simulación ya no corre en el navegador). Actualiza COMANDOS.md con la migración 003 y npm test.
- Dame un resumen con lo que cambió, cómo lo verificaste y lo pendiente. No hagas commit.
```

---

## Fase 4 — Pico W como cliente del servidor

```text
Vas a implementar la Fase 4 (la Raspberry Pi Pico W como cliente que envía sus lecturas al servidor, con un indicador de conexión) del proyecto SAVD/TMS.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial las secciones 1 (hardware y datos del HMC5883L), 2, 4 y 7.3. Las Fases 2 y 3 deben estar hechas; si no, detente y avísame.
2. Revisa el código actual y avísame de cambios sin commitear que no esperes.

REGLAS
- No hagas commits. No toques nginx/tms.conf. Los routers nuevos se montan en /api y en /.
- No agregues dependencias. Mantén el MVC y el español. Respóndeme en prosa completa.
- El sensor HMC5883L es de prueba: no discutas si sirve para la bobina TMS.
- Supuesto vigente: la Pico W manda la posición (xMM, yMM, zMM) con cada lectura. Si al revisar ves que esto choca con algo, pregúntame.

BACKEND
1. Migración 004_dispositivo.sql:
   - Crea la tabla dispositivos como en CLAUDE.md 7.3, con un registro inicial 'pico-w-1' sin token.
   - Agrega a mediciones: seq INT NULL, raw_x/raw_y/raw_z SMALLINT NULL, saturado BOOL NOT NULL DEFAULT 0, ts_dispositivo DATETIME(3) NULL, y UNIQUE(sesion_id, seq).
   - Actualiza setup_db.sql.
2. Haz que el simulador (Fase 3) numere seq desde 1 en cada sesión, a través de services/ingesta.js.
3. middleware/auth.js → requiereDispositivo: lee Authorization: Bearer <token>, busca su SHA-256 en dispositivos con activo = 1 y deja req.dispositivo. Si no lo encuentra, responde 401. Este middleware es independiente del login de usuarios.
4. Rutas solo para admin:
   - POST /dispositivo/token: genera 32 bytes aleatorios en base64url, guarda el hash y devuelve el token UNA sola vez.
   - PATCH /dispositivo {activo}.
5. GET /dispositivo/estado, para cualquier usuario con sesión: {enLinea, ultimoLatido, firmware, rssi, ip, uptime_s, tieneToken}.
6. POST /dispositivo/latido (requiereDispositivo), con cuerpo {firmware, rssi, uptime_s, ts_dispositivo_ms}:
   - Actualiza el estado en memoria y en la BD, sin escribir en la BD más de una vez cada 30 s si nada cambió.
   - Responde {ok, modo_operacion, sesion_activa: {id, modo, paso_mm, medio, barrido, sensor} | null, servidor_ts_ms}.
   - Calcula y registra el desfase entre el reloj de la Pico y el del servidor.
7. services/dispositivo.js:
   - Un temporizador de 1 s compara el último latido con dispositivo.umbral_desconexion_s.
   - Al cambiar de en línea a sin señal, o al revés, difunde el evento dispositivo con el estado.
   - En modo simulación el estado se sigue calculando, pero la interfaz no lo muestra.
8. POST /dispositivo/mediciones (requiereDispositivo), con cuerpo {sesionId, lecturas:[{seq, xMM, yMM, zMM, raw:{x,y,z}, ts_ms}]} y máximo 200 lecturas por lote:
   - Si el modo no es real o la sesión no está abierta, responde 409. Si la sesión es de origen 'sim', también 409.
   - Valida cada lectura con las mismas reglas de posición (los planos Z de la sesión según su paso) y además: raw entero entre −4096 y 2047, y seq entero positivo.
   - Conversión: µT = raw / lsb_por_ga × 100 − offset_ut del eje. Si algún eje vale −4096, la lectura se marca saturado = 1, ese eje no se convierte (se guarda NULL o se documenta la decisión) y se guarda el crudo.
   - Inserta con INSERT IGNORE, o con ON DUPLICATE KEY sin efecto, a través de services/ingesta.js. Difunde solo las nuevas.
   - Responde {ok, aceptadas, duplicadas, rechazadas:[{seq, error}]}.
   - ts_ms se guarda en ts_dispositivo, y timestamp sigue siendo la hora de recepción del servidor.
9. El POST /mediciones antiguo, en modo real, se reemplaza por el endpoint del dispositivo. Elimínalo o deja que responda 410 con un mensaje que indique la ruta nueva; elige lo más simple y documéntalo.
10. Las bx, by y bz pueden ser NULL cuando hay saturación. Revisa que |B|, MAX y MIN no se rompan: una lectura saturada no cuenta para MAX ni MIN, y lo documentas.

HERRAMIENTAS Y DOCUMENTACIÓN
1. server/scripts/emular-pico.js. Recibe las opciones --url, --token, --lote, --perdida (probabilidad de no enviar un lote para forzar reintentos), --duplicar y --sin-latido-a-los N segundos.
   - Manda el latido. Cuando hay una sesión activa, recorre la malla con lecturas raw verosímiles y las envía por lotes con reintento, reenviando los mismos seq.
   - Agrega a package.json el script "emular-pico".
2. docs/firmware-pico-w.md, que debe cubrir:
   - El protocolo completo, con ejemplos de JSON.
   - Cómo obtener el token y dónde guardarlo en la Pico.
   - NTP al arrancar.
   - El orden de registros X, Z, Y del HMC5883L y el −4096 de desborde.
   - Cómo verificar el chip con un escaneo I2C (0x1E para el HMC5883L, 0x0D si es un QMC5883L).
   - Cómo validar los ejes con un imán.
   - Guardar lecturas en un búfer mientras no haya red, reintentar con el mismo seq y el tamaño de lote recomendado.
   - Que el hotspot del iPhone cambia de IP, y cómo encontrar el servidor (IP fija en la configuración o mDNS con el nombre de host de la Raspberry Pi 5).
3. firmware/pico_w_cliente_ejemplo.py: un ejemplo en MicroPython (network, urequests, ntptime, machine.I2C) que implementa ese protocolo. Es una referencia, no hace falta probarlo en hardware. Indica al principio que es un ejemplo y qué constantes hay que ajustar.

FRONTEND (mínimo; el diseño final llega en las Fases 6 y 7)
1. src/hooks/useDispositivo.js: carga GET /api/dispositivo/estado y escucha el evento dispositivo del SSE. Recalcula cada segundo el texto "hace N s" sin pedirle nada al servidor.
2. En la Navbar, solo cuando modo_operacion sea 'real': un indicador "Pico W en línea · hace 2 s", "Pico W sin señal hace 40 s" o "Pico W nunca conectada", con el punto de color más el texto (nunca solo el color) y aria-live="polite".
3. Una sección provisional para admin (puede ir en la misma pantalla provisional de configuración de la Fase 3) para generar el token: muestra el token una sola vez, con un botón para copiarlo y el aviso de que no se volverá a mostrar.

TESTS
- server/tests/conversion.test.js con node:test:
  - Conversión de cuentas a µT para varias ganancias.
  - Detección de −4096.
  - Resta del offset.
  - Rechazo de raw fuera de rango.
- server/tests/ingesta-dispositivo.test.js, si puedes probar la lógica de idempotencia sin BD separando la función pura. Si no, documenta en CLAUDE.md que va en la Fase 8.

VERIFICACIÓN
- Pídeme que ejecute la migración 004 o ejecútala si te lo confirmo.
- Con curl y el emulador, en modo real:
  - Sin token responde 401.
  - El latido devuelve la sesión activa cuando existe.
  - Un lote con duplicados devuelve aceptadas y duplicadas correctas, y la BD no tiene filas duplicadas.
  - Con --perdida 0.3, al final están todos los seq, sin huecos ni duplicados.
  - Una lectura con −4096 queda marcada como saturada.
  - Al cortar el emulador, el evento dispositivo pasa a sin señal dentro del umbral.
  - En modo simulación, el endpoint del dispositivo responde 409.
- En el navegador: el indicador cambia a en línea y a sin señal al arrancar y detener el emulador, y no aparece en modo simulación.
- npm test pasa.
- Restaura el modo a simulación, revoca el token de prueba, borra las sesiones de prueba y detén los procesos.

AL TERMINAR
- Actualiza CLAUDE.md (secciones 3, 6 y 7.3 si algo cambió) y COMANDOS.md (migración 004, cómo generar el token y cómo usar el emulador).
- Dame un resumen con lo que cambió, cómo lo verificaste, lo pendiente y las preguntas para mí, por ejemplo sobre quién informa la posición o cómo se mueve el eje Z. No hagas commit.
```

---

## Fase 5 — Datos y trazabilidad

```text
Vas a implementar la Fase 5 (datos crudos, metadatos de reproducibilidad, CSV con metadatos, borrado lógico y SSE recuperable) del proyecto SAVD/TMS.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial las secciones 2, 4 y 7.4. Las Fases 2 a 4 deben estar hechas; si no, detente y avísame.
2. Revisa el código actual y avísame de cambios sin commitear que no esperes.

REGLAS
- No hagas commits. No toques nginx/tms.conf. No agregues dependencias. Mantén el MVC y el español. Respóndeme en prosa completa.
- Cada cambio de esquema va en una migración numerada y también en setup_db.sql.

BACKEND
1. Migración 005_trazabilidad.sql:
   - En mediciones, x_mm, y_mm, z_mm, bx, by, bz y magnitud pasan de FLOAT a DOUBLE. Ojo: los valores ya guardados conservan su error de float32; documéntalo.
   - Índice (sesion_id, seq).
   - En sesiones: usuario_id (FK a usuarios, NULL en las antiguas), notas TEXT, puntos_esperados INT, puntos_recibidos INT, huecos JSON, config_barrido JSON, config_sensor JSON, config_simulacion JSON, version_software VARCHAR, version_firmware VARCHAR NULL, eliminada_en DATETIME NULL e índice en eliminada_en.
2. services/version.js: al arrancar, lee la versión de server/package.json y, si existe .git, el commit actual con git rev-parse --short HEAD mediante child_process (sin depender de que funcione: si falla, usa 'desconocido'). Expón la versión en GET /status. Corrige la versión 3.0.0 que está fija en el controlador.
3. Al crear una sesión, guarda usuario_id, las copias de la configuración vigente (barrido, sensor y, en simulación, simulacion, incluida la semilla), version_software, puntos_esperados (grid_n² × número de planos, según el paso de la sesión) y, en modo real, version_firmware tomada del último latido.
4. Al cerrar una sesión, ya sea manualmente, al completarse o por el arranque del servidor: calcula puntos_recibidos y la lista de huecos (las posiciones de la malla sin lectura válida, como [{xMM, yMM, zMM}], hasta 1000) y guárdalos. Difunde el evento sesion con esos datos.
5. Borrado lógico:
   - DELETE /sesiones/:id pone eliminada_en (solo admin).
   - POST /sesiones/:id/restaurar la quita (solo admin).
   - Las listas y las exportaciones excluyen las eliminadas, salvo GET /sesiones?incluir_eliminadas=1 para admin.
   - Si te parece necesario, propón un borrado definitivo solo por SQL y documentado, pero no lo expongas en la API.
6. PATCH /sesiones/:id {notas}: lo puede hacer un admin, o el operador que inició la sesión. Máximo 5000 caracteres.
7. GET /sesiones/activa devuelve {sesion, mediciones} de la sesión abierta, o null.
8. SSE recuperable en services/tiempoReal.js:
   - Cada evento lleva un id: monotónico del proceso.
   - Un búfer circular guarda los últimos 2000 eventos.
   - Al conectarse con la cabecera Last-Event-ID, se reenvían los eventos posteriores. Si el id ya no está en el búfer, se envía el evento resincronizar para que el cliente vuelva a cargar /sesiones/activa.
   - Se envía retry: 3000.
   - Si res.write devuelve false, se espera el evento drain. Si un cliente acumula más de unos 1000 eventos pendientes, se cierra su conexión y se registra.
9. GET /sesiones/:id/csv, generado en el servidor:
   - Content-Type text/csv; charset=utf-8 y Content-Disposition con el nombre tms_sesion_<id>_<fechaUTC>.csv.
   - Encabezado con líneas "# clave: valor": id, modo, paso_mm, medio, origen, iniciada y terminada en UTC, usuario, versión de software y firmware, puntos esperados y recibidos, cantidad de huecos, configuración de barrido y sensor (y de simulación si aplica), unidades y notas. Escapa los saltos de línea.
   - Columnas: timestamp_utc, ts_dispositivo_utc, seq, x_mm, y_mm, z_mm, bx_uT, by_uT, bz_uT, magnitud_uT, raw_x, raw_y, raw_z, saturado, sin redondear.
   - Ordenado por seq y luego por id.
   - Para sesiones grandes, escríbelo en streaming.
10. Actualiza GET /sesiones para devolver los campos nuevos que el historial necesita, y GET /sesiones/:id/mediciones para incluir seq, raw y saturado.

FRONTEND (mínimo; el diseño llega en las Fases 6 y 7)
1. Al conectarse, el dashboard carga GET /api/sesiones/activa y dibuja lo ya medido. Después aplica los eventos del SSE y atiende el evento resincronizar.
2. HistorialPage:
   - El botón Exportar CSV usa el endpoint del servidor, con un enlace de descarga.
   - Muestra el id real de la sesión (no el índice de la lista), el origen (simulación o real), los puntos recibidos sobre los esperados y los huecos.
   - Las notas se pueden editar según los permisos.
   - Eliminar pide confirmación con un modal que explique que es un borrado lógico.
   - Si eres admin, un filtro "ver eliminadas" con el botón Restaurar.
3. Corrige las condiciones de borde: max o min que valgan 0 no deben mostrar "—".

TESTS
- Funciones puras de server/tests/: cálculo de huecos y puntos esperados, generación del encabezado CSV (con escapes) y el búfer circular del SSE (reenvío desde un id, id ya fuera del búfer).

VERIFICACIÓN
- Pídeme que ejecute la migración 005 o ejecútala si te lo confirmo.
- Con curl:
  - Una sesión simulada completa tiene puntos_recibidos = 845 (paso de 5 mm; 147 o 32 con 1 o 2 cm), ningún hueco y las copias de configuración y versión.
  - Con prob_hueco 0.05 aparecen huecos y se listan bien.
  - El CSV tiene el encabezado y las columnas correctas y no muestra artefactos de float32 en las sesiones nuevas.
  - Borrado lógico y restauración funcionan con los roles correctos.
  - Una reconexión del SSE con Last-Event-ID recibe lo que faltaba.
- En el navegador: recargar a mitad del barrido muestra todos los puntos anteriores. Exportar CSV descarga el archivo. Editar notas y eliminar o restaurar funcionan.
- npm test pasa. Borra lo que hayas creado, restaura la configuración y detén los procesos.

AL TERMINAR
- Actualiza CLAUDE.md (secciones 3, 6 y 7.4) y COMANDOS.md (migración 005 y la consulta SQL de borrado definitivo si la propones).
- Dame un resumen. No hagas commit.
```

---

## Fase 6 — Frontend funcional: menú, configuración, indicadores, tema y gráficas

```text
Vas a implementar la Fase 6 del proyecto SAVD/TMS: el menú lateral, las páginas de configuración y de usuarios, el modo claro u oscuro, los indicadores, la reorganización de los hooks, las correcciones de las gráficas y el rendimiento.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial las secciones 2 (restricciones: colores del modo oscuro intocables, las cinco gráficas se quedan, sin tecnologías nuevas), 7.5 y 7.6. Las Fases 2 a 5 deben estar hechas; si no, detente y avísame.
2. Revisa todo frontend/src y la API real del backend (rutas y respuestas) antes de diseñar el código.

REGLAS
- No hagas commits. No agregues dependencias. Excepción aprobada: cambiar plotly.js por plotly.js-gl3d-dist-min y usar el factory createPlotlyComponent de react-plotly.js. No uses react-router.
- No cambies ningún color del tema oscuro: los valores de :root en global.css se quedan.
- Mantén las cinco vistas de datos (LineChart, Canvas3D, Superficie3D, DataTable y KpiCards) y el historial. Puedes reordenarlas o ajustar su forma y sus ejes, pero no quitarlas ni dejar de mostrar sus datos.
- Español en los nombres y los textos. Respóndeme en prosa completa.
- La pasada de accesibilidad y diseño con las skills es la Fase 7. Aquí construye con buena base (botones reales, etiquetas, foco visible), pero sin la revisión completa.

ESTRUCTURA
1. Reorganiza:
   - src/pages/: LoginPage, CambiarPasswordPage, DashboardPage, HistorialPage y ConfiguracionPage.
   - src/components/layout/: MenuLateral y Navbar.
   - src/context/: AuthContext y ConfigContext (configuración del sistema, preferencias del usuario y tema).
   - src/hooks/: useStream (un único EventSource compartido que reparte los eventos medicion, sesion, configuracion, dispositivo y resincronizar), useSesionActiva, useDispositivo y useServerStatus.
   - Elimina useAcquisition o déjalo como una envoltura delgada.
2. Navegación en la URL con la History API: ?vista=dashboard|historial|configuracion&seccion=barrido|sensor|simulacion|dispositivo|visualizacion|usuarios. Funcionan el botón de atrás y los enlaces directos. Un usuario sin permiso que entra a una sección de admin ve un mensaje claro.
3. Quita los globales window.__startModalShow y window.__stopModalShow: usa refs o estado. Los modales siguen siendo de Bootstrap (bootstrap/js/dist/modal).

MENÚ LATERAL (se abre con el botón ☰ en la Navbar)
- Es un panel con role="dialog" y aria-modal: mientras está abierto, el foco queda dentro; se cierra con Esc, con el botón ✕ y al tocar fuera; al cerrar, el foco vuelve al botón ☰.
- Contenido, en este orden:
  1. el usuario y su rol;
  2. Modo de operación: radios Simulación / Real (Pico W → servidor), solo para admin; los demás lo ven como texto. Desactivado con una sesión abierta, explicando por qué;
  3. Tema: Oscuro / Claro / Sistema;
  4. la navegación (Dashboard en vivo, Mediciones pasadas, Configuración);
  5. Cerrar sesión.
- Ver el ASCII de referencia en CLAUDE.md 7.5.

NAVBAR
- El botón ☰ con aria-label, el nombre del sistema, una etiqueta SIMULACIÓN muy visible cuando el modo es simulación, el estado del servidor y, solo en modo real, el estado de la Pico W (de la Fase 4). Siempre texto más punto de color, con aria-live="polite". En un teléfono se compacta sin perder la información.

CONFIGURACIÓN (ConfiguracionPage)
- Las secciones Barrido, Sensor, Simulación, Dispositivo, Visualización y Usuarios usan GET y PUT /api/configuracion/:clave y las rutas de usuarios y dispositivo.
- Barrido incluye el paso predeterminado (0,5, 1 o 2 cm). La barra de configuración de la medición del dashboard (paso, DC/AC y medio, CLAUDE.md 7.0) se mantiene y se pule.
- Formularios con <label> asociados, el error junto a cada campo, un botón "Guardar cambios" por sección que se desactiva solo mientras se guarda, y confirmación de guardado con aria-live.
- Para quien no es admin, todo es de solo lectura.
- Contenido de cada sección:
  - Sensor: un select con las 8 ganancias del HMC5883L (lsb_por_ga se muestra calculado), lecturas por punto y offset. Un botón "Medir cero" solo si el backend lo soporta; si no, déjalo anotado como pendiente en CLAUDE.md.
  - Dispositivo: el estado, generar o regenerar el token (se muestra una sola vez, con botón de copiar), el intervalo de latido y el umbral.
  - Visualización: ventana de la gráfica, filas de la tabla, decimales, escala de color de la superficie (Jet por defecto o Viridis), rotación automática del 3D y reducir animaciones.
  - Usuarios: crear, editar rol, activar o desactivar y restablecer contraseña, con los errores 409 del backend explicados (por ejemplo, el último admin).
- Cambios con una sesión abierta: muestra el 409 del backend en lenguaje claro.

TEMA CLARO Y OSCURO
- Las variables CSS del tema oscuro se quedan como están, en :root. Agrega [data-theme="light"] con los tokens claros de CLAUDE.md 7.5. Si al combinarlos algún valor no alcanza un contraste AA de 4,5:1 para texto, ajusta solo el valor claro y documéntalo.
- Pon data-theme en <html>, más data-bs-theme para Bootstrap y color-scheme. "Sistema" sigue a prefers-color-scheme en vivo.
- Persistencia: en el usuario (PATCH /api/auth/preferencias) y en localStorage para evitar el parpadeo al cargar, con try/catch.
- Chart.js (colores de ejes y rejilla), el fondo de Three.js y el layout y las fuentes de Plotly leen los tokens actuales y se actualizan al cambiar de tema.

GRÁFICAS (se quedan todas, con estos ajustes)
- LineChart:
  - tension 0, puntos pequeños visibles y spanGaps false, con null en los huecos para que se vean.
  - Título "Componentes Bx · By · Bz a lo largo del barrido" y una descripción que diga que cada punto es otra posición.
  - Eje y con su unidad (µT); el eje x muestra la posición del barrido o el seq, no la hora como categoría.
  - El tamaño de la ventana sale de la configuración de visualización.
  - Fuera de la vista, una alternativa accesible: aria-label con un resumen o una tabla oculta.
- Superficie3D:
  - Rango de color (cmin y cmax) fijo para toda la sesión, de modo que los planos sean comparables.
  - Escala de color según la configuración (Jet o Viridis); etiqueta del eje z "|B| (µT)".
  - Usa ?? en lugar de || para que x = 0 no se pierda.
  - useMemo con las dependencias correctas.
  - Actualizaciones limitadas a como máximo 2 a 4 por segundo.
  - Usa plotly.js-gl3d-dist-min.
  - Mantén el selector de plano y la "Huella máxima total", con una aclaración de que esta última es el máximo entre alturas.
- Canvas3D:
  - Pointer Events en lugar de los eventos de ratón, para que funcione en teléfonos; la rueda hace zoom sin desplazar la página.
  - Controles alternativos con botones para rotar y hacer zoom, también con teclado.
  - Longitud de las flechas relativa al |B| máximo de la sesión, con una leyenda de escala.
  - Corrige el espejo de ejes, de modo que la orientación sea diestra y coincida con la del laboratorio; documenta el mapeo.
  - Rotación automática según la configuración y desactivada con prefers-reduced-motion.
  - Al desmontar, forceContextLoss y liberar los materiales sin liberar las geometrías compartidas de ArrowHelper.
  - role="img" y aria-label.
- KpiCards: la posición mostrada es la de la última lectura recibida, no la siguiente (corrige el desfase). Números con tabular-nums e Intl.NumberFormat según los decimales configurados.
- DataTable: muestra seq, la marca de saturado y los valores con sus unidades. El número de filas sale de la configuración.

RENDIMIENTO Y CONDICIONES DE CARRERA
- React.memo en las vistas pesadas, actualizaciones agrupadas por cuadro con requestAnimationFrame, y el bucle de Three.js en pausa cuando no hay cambios ni interacción.
- Un único EventSource. Descarta los eventos de otras sesiones. Usa el estado "iniciando" para evitar el doble inicio.

VERIFICACIÓN
- npm run build sin errores (con --outDir a un directorio temporal). Anota el tamaño del bundle antes y después.
- En el navegador integrado, con el backend y Vite levantados:
  - login, menú (Esc, foco, ☰), cambio de tema en las tres opciones, persistencia al recargar;
  - modo simulación y modo real con el emulador de la Pico (indicador en línea y sin señal);
  - un barrido completo con las cinco vistas, con cada paso (0,5, 1 y 2 cm) y con los dos medios;
  - los filtros del historial por modo, paso, medio y origen;
  - recarga a mitad del barrido;
  - historial y CSV;
  - todas las secciones de configuración como admin y como observador;
  - en una ventana de 375 px de ancho: menú, 3D con arrastre y sin desplazamiento horizontal de la página;
  - consola sin errores.
- Mide con React Profiler o la pestaña Performance que una sesión de 845 puntos no atrase la interfaz.
- Restaura la configuración, borra lo que crees y detén los procesos.

AL TERMINAR
- Actualiza CLAUDE.md (secciones 3, 6 y 7.5 con lo que se haya decidido) y dame un resumen con capturas de pantalla de los dos temas. No hagas commit.
```

---

## Fase 7 — Accesibilidad y diseño con las skills web-design-guidelines y frontend-design

```text
Vas a hacer la Fase 7 del proyecto SAVD/TMS: una revisión completa de la interfaz con mi skill web-design-guidelines y la corrección con mi skill frontend-design.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo, en especial la sección 2 (restricciones) y la 7.5. La Fase 6 debe estar hecha; si no, detente y avísame.

REGLAS (prevalecen sobre cualquier sugerencia de las skills)
- No cambies los colores del tema oscuro (los valores de :root). Si una skill sugiere otra paleta, adapta la sugerencia a los tokens existentes o al tema claro.
- No quites gráficas ni datos. Puedes reordenar y ajustar.
- No agregues frameworks ni librerías. Excepción permitida: instalar las fuentes que ya usa el proyecto (Rajdhani, Share Tech Mono e Inter) con @fontsource para no depender del CDN de Google. Pregúntame antes de cambiar de familia tipográfica.
- No hagas commits. Respóndeme en español y en prosa completa.

PASO 1 — REVISIÓN
- Invoca la skill web-design-guidelines sobre frontend/src/**/*.jsx, frontend/src/styles/*.css y frontend/index.html, y guarda su salida completa en el formato archivo:línea.
- Problemas que ya se encontraron en la revisión anterior y que deben quedar resueltos si siguen ahí:
  - Elementos <div onClick> en lugar de <button>: tarjetas de modo y encabezados de sesión.
  - Selects e inputs sin <label>.
  - Falta de aria-pressed en los botones de modo, role="progressbar" en la barra, aria-live en los estados y aria-hidden en los iconos de Bootstrap.
  - Falta de <main>, del enlace para saltar al contenido y de encabezados h1 y h2.
  - Ningún :focus-visible, y uso de transition: all.
  - Animaciones (parpadeo, pulso, fade-in, rotación 3D, scroll-behavior) que no respetan prefers-reduced-motion.
  - --text-dim (#505568) usado en texto que hay que leer: contraste de 2,34:1 sobre #1a1a20. Se resuelve usando --text-secondary para ese texto, sin cambiar el color.
  - Texto de 9 a 10 px.
  - Falta tabular-nums en las cifras.
  - Uso de alert() en lugar de avisos en la página.
  - Falta de color-scheme y meta theme-color.
  - El canvas sin alternativa accesible.
  - El historial sin confirmación de borrado.
  - Formatos de fecha y número escritos a mano.

PASO 2 — CORRECCIÓN
- Invoca la skill frontend-design. Antes de escribir código, preséntame un plan breve:
  - tokens (el oscuro sin cambios y el claro ajustado);
  - la escala tipográfica (tamaño mínimo de 12 px, papel de cada familia: Rajdhani para los títulos, Inter para las etiquetas en minúscula normal sin mayúsculas con espaciado ni el prefijo "//", Share Tech Mono solo para las cifras);
  - la jerarquía del dashboard y qué movimiento queda (uno solo con sentido, por ejemplo la fila nueva de la tabla).
  Espera mi aprobación.
- Aplica el plan aprobado y todas las correcciones del Paso 1. Verifica el contraste AA de todos los pares texto/fondo en los dos temas y documenta los valores.

VERIFICACIÓN
- Vuelve a correr web-design-guidelines: no deben quedar hallazgos, o deben quedar justificados uno por uno.
- En el navegador integrado:
  - recorre todo solo con el teclado (login, menú, dashboard, modales, historial, configuración) y comprueba que el foco siempre se ve y nunca queda tapado;
  - prueba con prefers-reduced-motion activado;
  - prueba los dos temas;
  - prueba a 375 px y a 1440 px de ancho;
  - consola sin errores;
  - toma capturas.
- Si puedes, pasa Lighthouse o axe y anota el resultado.
- npm run build sin errores.

AL TERMINAR
- Actualiza CLAUDE.md (secciones 6 y 7.5 con los tokens finales del tema claro y las decisiones de diseño) y dame un resumen con las capturas antes y después. No hagas commit.
```

---

## Fase 8 — Tests, documentación y despliegue en la Raspberry Pi 5

```text
Vas a hacer la Fase 8 del proyecto SAVD/TMS: completar los tests automáticos, ordenar la documentación y dejar lista la guía y los archivos de despliegue para la Raspberry Pi 5. Esta carpeta no es la Raspberry: yo descargaré el proyecto ahí y lo levantaré siguiendo tu guía.

ANTES DE EMPEZAR
1. Lee CLAUDE.md completo. Las Fases 2 a 7 deben estar hechas; si no, detente y avísame.

REGLAS
- No toques nginx/tms.conf: la guía lo copia tal cual. No hagas commits. No agregues dependencias: usa node:test y node:assert. Respóndeme en español y en prosa completa.

TESTS (server/tests/, todos con npm test)
1. Completa los tests unitarios de lo que falte: validadores (todos los casos 400 y 422), passwords (hash y verificación, formato), límite de intentos de login, conversión de cuentas a µT, física del simulador, huecos, CSV y búfer del SSE.
2. Tests de integración contra una base de prueba separada, tms_db_test:
   - Crea server/tests/setup_test_db.sql (como root, a partir de setup_db.sql) y un helper que levante la app en un puerto aleatorio con DB_NAME=tms_db_test. Exporta la app de Express desde un módulo separado de app.listen, sin romper server.js.
   - Casos de extremo a extremo:
     - login → crear sesión simulada con semilla fija y ms_por_punto mínimo → esperar el cierre → comparar el CSV con los valores que genera el simulador con la misma semilla (tolerancia de 1e-9);
     - emulador de la Pico en modo real con pérdida y duplicados → ningún seq duplicado ni faltante;
     - roles (401, 403);
     - borrado lógico;
     - 409 por sesión doble y por cambio de modo.
   - Pídeme que cree tms_db_test con sudo, o créala si te lo confirmo. Nunca uses tms_db para los tests.
3. Agrega "test:unit" y "test:integracion" a package.json, y documenta cuál necesita la base.

DOCUMENTACIÓN
1. Reescribe COMANDOS.md como guía completa y ordenada para una Raspberry Pi 5 limpia (Raspberry Pi OS):
   - Node 20 LTS, MariaDB y Nginx.
   - Clonar o copiar el proyecto en /opt/tms.
   - setup_db.sql con la contraseña propia y las migraciones en orden. Explica que en una instalación limpia, setup_db.sql ya incluye todo, y que las migraciones son solo para quien viene de una versión anterior. Incluye la 001 con su advertencia de @corte.
   - .env de producción a partir de .env.example (NODE_ENV=production y los orígenes de CORS).
   - npm ci --omit=dev en el servidor y npm run crear-admin.
   - Build del frontend: vite.config.js genera ../dist, es decir /opt/tms/dist, que es el root de Nginx. Verifica que la ruta coincida.
   - El certificado autofirmado con el comando que ya está en tms.conf, copiar tms.conf a sites-available, el enlace simbólico, nginx -t y reload.
   - El servicio de systemd.
   - Cómo acceder desde el hotspot: el nombre tms.ipn.local de tms.conf no se resuelve por mDNS porque tiene dos etiquetas. Explica las opciones sin tocar tms.conf: usar la IP de la Raspberry, agregar una entrada en hosts en las laptops, o usar el nombre de host .local, teniendo en cuenta que server_name no coincide y Nginx usaría el server por defecto. Verifica cómo se comporta y documenta la opción que funciona.
   - Cómo generar el token de la Pico y configurarla, con un enlace a docs/firmware-pico-w.md.
   - Comprobaciones finales con curl a https://<host>/api/status.
   - Solución de problemas: SSE detrás de Nginx, 401 por la cookie Secure sobre HTTP, el hotspot que cambia de IP.
   - Respaldo y restauración de la base con mysqldump.
2. deploy/tms-server.service: un unit de systemd con un usuario sin privilegios, WorkingDirectory=/opt/tms/server, EnvironmentFile=/opt/tms/server/.env, Restart=on-failure y After=mariadb.service.
3. Corrige el README.md: rutas reales, arquitectura real (MVC detrás de Nginx, modos simulación y real, login), sensor HMC5883L de prueba y Pico W. Quita las afirmaciones que el código no cumple.
4. Borra la carpeta sobrante mnt/ después de confirmar conmigo que no la necesito.
5. Revisa que .gitignore cubra dist/, .env y los certificados, y que no haya secretos versionados (busca contraseñas y tokens en el historial de git con git log -p -S y avísame si encuentras algo).

VERIFICACIÓN
- npm test completo en verde, más el resultado de los de integración.
- Sigue la guía de COMANDOS.md en esta máquina hasta donde sea posible sin systemd ni Nginx (BD de prueba, build y arranque en producción local con NODE_ENV=production) y corrige lo que falle.
- npm audit en server y frontend: anota lo que queda y por qué.

AL TERMINAR
- Actualiza CLAUDE.md: la sección 6 con todo hecho y una lista corta de lo pendiente o las mejoras futuras que hayas detectado.
- Dame un resumen final del proyecto: qué se resolvió de la auditoría original (por hallazgo), qué queda y los pasos exactos que debo seguir en la Raspberry. No hagas commit.
```
