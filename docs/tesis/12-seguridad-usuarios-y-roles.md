# 12 — Seguridad, usuarios y roles

Este documento describe los mecanismos de seguridad del SAVD: los roles de usuario y su matriz de permisos, el almacenamiento de contraseñas con scrypt, la cookie de sesión y sus atributos, la expiración y la renovación de las sesiones, el límite de intentos fallidos, el token de la Raspberry Pi Pico W, la política CORS, HTTPS con Nginx y otras medidas. Todo se implementó con los módulos que trae Node.js (`node:crypto`), sin librerías de autenticación adicionales.

---

## 1. Roles y matriz de permisos

| Rol | Descripción |
|---|---|
| `admin` | Todo: usuarios, configuración, modo de operación, token de la Pico, eliminar y restaurar sesiones |
| `operador` | Inicia y detiene barridos, edita las notas de sus propias sesiones y exporta |
| `observador` | Solo mira y exporta |

| Operación (ruta) | admin | operador | observador | Sin sesión |
|---|---|---|---|---|
| `GET /status` | ✓ | ✓ | ✓ | ✓ |
| Ver configuración, sesiones, sesión activa, CSV, mediciones, estado de la Pico y SSE | ✓ | ✓ | ✓ | 401 |
| Iniciar (`POST /sesiones`) y cerrar (`PUT /sesiones/:id`) | ✓ | ✓ | 403 | 401 |
| Editar notas (`PATCH /sesiones/:id`) | ✓ (todas) | ✓ (las suyas; 403 en las demás) | 403 | 401 |
| Eliminar, restaurar y ver eliminadas | ✓ | 403 | 403 | 401 |
| Cambiar la configuración (`PUT /configuracion/:clave`) | ✓ | 403 | 403 | 401 |
| Token y activación de la Pico | ✓ | 403 | 403 | 401 |
| Administrar usuarios | ✓ | 403 | 403 | 401 |
| Cambiar su contraseña y su tema | ✓ | ✓ | ✓ | 401 |

Reglas adicionales:

- El **rol y el estado** (`activo`) del usuario se leen de la base en **cada petición**: degradar o desactivar a alguien tiene efecto inmediato, sin esperar a que expire su sesión.
- **No se puede desactivar ni degradar al último administrador activo** (409); la comprobación se hace dentro de una transacción con `FOR UPDATE` para evitar condiciones de carrera.
- Mientras un usuario tenga la obligación de cambiar su contraseña (primer acceso o contraseña restablecida), el servidor responde 403 a todo salvo `/auth/yo`, `/auth/cambiar-password` y `/auth/logout`, incluidas las rutas que se agreguen en el futuro.
- La Pico W no usa roles: se autentica con su propio token y solo puede usar sus dos rutas.

---

## 2. Contraseñas

| Aspecto | Implementación |
|---|---|
| Algoritmo | **scrypt** (`crypto.scrypt` de Node.js), una función de derivación de claves costosa en memoria y en cómputo, resistente a ataques con hardware especializado |
| Parámetros | $N = 16\,384$, $r = 8$, $p = 1$; sal aleatoria de 16 bytes; resultado de 32 bytes |
| Formato guardado | `scrypt$N$r$p$salHex$hashHex` en `usuarios.hash_password`. Los parámetros van dentro del texto para poder aumentarlos en el futuro sin invalidar las contraseñas existentes |
| Verificación | Se recalcula con los parámetros del propio hash y se compara en **tiempo constante** (`timingSafeEqual`). Un hash con formato desconocido o parámetros fuera de rango simplemente no coincide (nunca lanza un error) |
| Reglas | Mínimo 8 caracteres y máximo 200 (para que nadie haga trabajar a scrypt con textos enormes) |
| Usuarios inexistentes | Se verifica contra un **hash de relleno**, para que el tiempo de respuesta sea el mismo que con un usuario real y no delate qué nombres existen |
| Mensaje de error | Siempre el mismo («Usuario o contraseña incorrectos»): no dice si falló el usuario, la contraseña o si la cuenta está desactivada |
| Registro | La contraseña en claro nunca se guarda ni se escribe en el registro |

El cambio de contraseña exige la contraseña actual, no admite una igual a la anterior, apaga la obligación de cambiarla y **cierra las demás sesiones** del usuario. Cuando un administrador restablece la contraseña de alguien, se le obliga a cambiarla y se cierran todas sus sesiones.

---

## 3. Cookie de sesión

| Aspecto | Valor |
|---|---|
| Nombre | `tms_sesion` |
| Contenido | Token aleatorio de 32 bytes (`crypto.randomBytes`), codificado en base64url |
| En la base | Solo su **SHA-256** (`sesiones_login.id`): quien lea la tabla no obtiene tokens utilizables |
| `HttpOnly` | Sí: el JavaScript de la página no puede leerla (mitiga el robo por XSS) |
| `SameSite` | `Strict`: el navegador no la envía en peticiones iniciadas desde otros sitios (mitiga CSRF) |
| `Path` | `/` |
| `Secure` | Sí con `NODE_ENV=production`: solo viaja por HTTPS. Por eso, en producción el sistema solo funciona a través de Nginx con HTTPS |
| `Max-Age` | Ninguno: es una cookie de sesión del navegador, que se borra al cerrarlo |
| Lectura | A mano desde la cabecera `Cookie`, sin librerías |

Además, en la interfaz, cada pestaña nueva exige iniciar sesión aunque quede una cookie válida (marca por pestaña en `sessionStorage`), y al iniciar sesión el servidor cierra la sesión anterior de ese mismo navegador.

---

## 4. Expiración y renovación

- La sesión dura **12 h desde el último uso** (renovación deslizante), y la expiración la aplica el servidor (`sesiones_login.expira_en`), no el navegador.
- Para no escribir en la base en cada petición (durante un barrido llegan varias por segundo), la renovación solo se guarda si pasaron **más de 60 s** desde el último uso registrado.
- Una tarea **cada hora** (y al arrancar) borra las sesiones de login expiradas y los intentos fallidos viejos.
- Cerrar sesión borra la fila de `sesiones_login` y la cookie; desactivar a un usuario borra todas sus sesiones.

---

## 5. Límite de intentos fallidos

- **Cinco fallos** de la misma combinación usuario + dirección IP dentro de **15 minutos** bloquean esa combinación hasta que el fallo más antiguo de los cinco cumpla 15 minutos. El servidor responde **429** con la cabecera `Retry-After` y los segundos de espera en el cuerpo.
- Un acierto borra la cuenta de fallos.
- El cambio de contraseña tiene su propio contador con el mismo límite.
- El estado vive **en memoria** a propósito: se reinicia con el servidor, lo que es aceptable para un sistema de laboratorio con un solo proceso. Un tope de 10 000 combinaciones guardadas impide que un atacante llene la memoria.
- Detrás de Nginx, la IP real del navegador llega en la cabecera `X-Forwarded-For`. Express está configurado con `trust proxy = loopback`, de modo que solo confía en esa cabecera cuando la conexión viene del propio equipo (de Nginx); un cliente externo no puede falsificar su IP para eludir el límite.

---

## 6. Token de la Pico W

| Aspecto | Implementación |
|---|---|
| Generación | Solo un administrador (`POST /api/dispositivo/token`); 32 bytes aleatorios en base64url |
| Entrega | Se muestra **una sola vez**; si se pierde, se genera otro y el anterior deja de funcionar |
| Almacenamiento en el servidor | Solo su SHA-256 (`dispositivos.token_hash`, único) |
| Almacenamiento en la Pico | En `secretos.py`, excluido de git (junto con las credenciales del Wi-Fi y la dirección del servidor) |
| Uso | Cabecera `Authorization: Bearer <token>`; se aceptan de 20 a 128 caracteres base64url |
| Validación | El dispositivo con ese hash debe existir y estar **activo**; si no, 401 |
| Revocación | `DELETE /api/dispositivo/token` o desactivar el dispositivo (`PATCH /api/dispositivo {activo: false}`) |
| Alcance | Solo `POST /dispositivo/latido` y `POST /dispositivo/mediciones` |

---

## 7. CORS

- La lista de orígenes permitidos se lee de la variable `CORS_ORIGINS` de `server/.env` (por defecto, el servidor de desarrollo de Vite en el puerto 5173).
- Las peticiones **sin** cabecera `Origin` (curl, la Pico W) se aceptan.
- Los orígenes de la lista reciben las cabeceras CORS.
- Los demás orígenes **no** reciben cabeceras CORS (el navegador bloquea la respuesta), pero el servidor **no** responde con un error 500. Esto es importante detrás de Nginx: el dashboard y la API comparten origen, y el navegador envía la cabecera `Origin` en los POST, PUT y DELETE; la versión inicial respondía 500 en ese caso.

---

## 8. HTTPS con Nginx y otras medidas

- **HTTPS:** Nginx escucha en el puerto 443 con TLS 1.2 y 1.3 y cifrados fuertes, con un certificado autofirmado de 10 años (`openssl req -x509 … -days 3650`). El puerto 80 redirige a HTTPS con un 301. Los navegadores muestran un aviso la primera vez, que hay que aceptar en cada equipo.
- **Cabeceras de seguridad** (Nginx): `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection` y `Referrer-Policy: strict-origin-when-cross-origin`. Los archivos ocultos (que empiezan por punto) devuelven 404.
- **Aislamiento del backend:** Node.js solo escucha en 127.0.0.1; desde la red solo se llega a través de Nginx. Express desactiva la cabecera `X-Powered-By` y limita el cuerpo JSON a 100 kB.
- **Errores:** en producción nunca se envía la traza de un error al cliente.
- **Base de datos:** consultas preparadas con parámetros (sin inyección SQL); el usuario de la aplicación solo tiene `SELECT, INSERT, UPDATE, DELETE`; las credenciales solo en `server/.env` (permisos 640, excluido de git).
- **Servicio de systemd endurecido:** usuario de sistema sin *shell*, `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, `ProtectKernelTunables`, `ProtectControlGroups` y `RestrictSUIDSGID`.
- **Validación en el servidor de todas las entradas**, con 400 para los errores de forma y 422 para los de valor; los objetos de configuración rechazan campos desconocidos.

---

## 9. Cuenta de administrador predeterminada

Por decisión consciente del proyecto, el sistema incluye una **cuenta de administrador predeterminada sin cambio obligatorio de contraseña**, tanto en desarrollo como en la Raspberry Pi 5. Se crea o se restaura con el script de instalación (`npm run crear-admin -- --predeterminado`), que en ese único caso omite la longitud mínima de la contraseña, y facilita el acceso del equipo de trabajo en el laboratorio. El riesgo asumido es que cualquier persona conectada a la red que conozca esas credenciales podría entrar como administrador; la guía de instalación lo advierte y documenta cómo crear un administrador con una contraseña propia (`npm run crear-admin`, que la pide dos veces y exige un mínimo de 8 caracteres).

Por otra parte, la contraseña de la base de datos que se usó en desarrollo quedó en un commit antiguo del historial de git (se quitó del código en la Fase 1, pero el historial no se reescribió); la guía de instalación indica usar otra en la Raspberry Pi 5.

---

## 10. Verificación

| Verificación | Estado |
|---|---|
| Hash y verificación de contraseñas, formato, hashes mal formados, longitudes y límite de intentos (7 pruebas unitarias) | **Verificado** |
| Validadores de todas las rutas: 400, 422, 403 y 404 (16 pruebas unitarias) | **Verificado** |
| Roles: 401 sin sesión y 403 con un rol insuficiente (prueba de integración) | **Verificado** |
| 73 comprobaciones con `curl` de la Fase 2 (login, roles, cambio forzado, último administrador, límite de intentos) | **Verificado** |
| Cookie `Secure`, redirección HTTP → HTTPS y SSE a través de Nginx con una copia de la configuración en puertos altos | **Solo simulación/PC** (en la computadora de desarrollo) |
| Instalación en la Raspberry Pi 5 con el certificado y systemd | **Pendiente** |

---

## Fuentes en el proyecto

- `server/services/passwords.js`, `server/services/sesionUsuario.js`, `server/services/limiteIntentos.js`, `server/services/dispositivo.js`
- `server/middleware/auth.js`, `server/middleware/cors.js`, `server/middleware/errores.js`, `server/middleware/validar.js`
- `server/controllers/auth.controller.js`, `server/controllers/usuarios.controller.js`, `server/models/Usuario.js`
- `server/app.js`, `server/scripts/crear-admin.js`, `server/setup_db.sql`
- `nginx/tms.conf` (solo lectura), `deploy/tms-server.service`, `COMANDOS.md` (secciones 4, 5, 7 y 9)
- `frontend/src/context/AuthContext.jsx`
- `server/tests/passwords.test.js`, `server/tests/validadores.test.js`, `server/tests/integracion/api.integ.js`
