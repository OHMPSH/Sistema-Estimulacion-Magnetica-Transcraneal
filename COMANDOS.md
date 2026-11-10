# GUÍA DE ARRANQUE — TMS v3.0
## MariaDB + Node.js MVC + React + Nginx

---

## ESTRUCTURA FINAL

```
PT/
├── .gitignore
├── server/
│   ├── config/                  ← pool de MariaDB, barrido, roles
│   ├── controllers/             ← auth, usuarios, mediciones
│   ├── models/                  ← Medicion, Usuario, SesionLogin (todo el SQL)
│   ├── routes/                  ← auth, usuarios, mediciones
│   ├── services/                ← contraseñas, cookie de sesión, límite de intentos
│   ├── scripts/crear-admin.js   ← crea o restablece el usuario admin
│   ├── .env                     ← credenciales (no subir a Git)
│   ├── .env.example             ← plantilla del .env
│   ├── middleware/              ← CORS, validación y errores
│   ├── migrations/              ← cambios de esquema (ejecutar como root)
│   ├── package.json
│   ├── server.js                ← entry point Express
│   └── setup_db.sql             ← script inicial de MariaDB
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── Canvas3D.jsx     ← mapa vectorial 3D (flechas)
│   │   │   │   └── LineChart.jsx    ← gráfica Bx/By/Bz
│   │   │   ├── modals/
│   │   │   │   ├── StartModal.jsx
│   │   │   │   └── StopModal.jsx
│   │   │   ├── panels/
│   │   │   │   ├── ControlPanel.jsx
│   │   │   │   └── HistorialPage.jsx  ← carga desde MariaDB
│   │   │   └── ui/
│   │   │       ├── DataTable.jsx
│   │   │       ├── KpiCards.jsx
│   │   │       └── Navbar.jsx
│   │   ├── constants/
│   │   │   └── system.js            ← constantes físicas
│   │   ├── hooks/
│   │   │   ├── useAcquisition.js    ← lógica central + Fetch API
│   │   │   └── useServerStatus.js
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── api/cliente.js           ← fetch con cookie; 401 → login
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                   ← LoginPage, CambiarPasswordPage
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── nginx/
    └── tms.conf
```

---

## PASO 1 — Instalar MariaDB en la Raspberry Pi

```bash
# Instalar MariaDB
sudo apt update
sudo apt install -y mariadb-server

# Iniciar el servicio
sudo systemctl start mariadb
sudo systemctl enable mariadb   # que arranque automático al reiniciar

# Verificar que está corriendo
sudo systemctl status mariadb
# Debe mostrar: active (running)
```

---

## PASO 2 — Crear la base de datos y el usuario

Antes de ejecutar el script, elige una contraseña para el usuario de la
base y escríbela en dos lugares:

1. En `PT/server/setup_db.sql`, en lugar de `CAMBIA_ESTA_CONTRASENA`.
2. En `PT/server/.env`, en `DB_PASSWORD` (crea el `.env` copiando la plantilla).

```bash
cp PT/server/.env.example PT/server/.env
nano PT/server/.env          # completar DB_PASSWORD y revisar NODE_ENV
```

No subas a Git ni el `.env` ni el `setup_db.sql` con la contraseña real.

```bash
# Ejecutar el script SQL como root
# (este comando solo se corre UNA vez)
sudo mysql -u root < PT/server/setup_db.sql

# Deberías ver al final:
# +------------------------------------------+
# | resultado                                |
# +------------------------------------------+
# | Base de datos TMS creada correctamente.  |
# +------------------------------------------+
```

### Verificar que funcionó

```bash
# Entrar a MariaDB como el nuevo usuario
mysql -u tms_user -p tms_db
# Contraseña: la que pusiste en DB_PASSWORD

# Dentro de MariaDB, verificar las tablas:
SHOW TABLES;
# Debe mostrar: mediciones | sesiones | sesiones_login | usuarios

# Ver la estructura de la tabla mediciones:
DESCRIBE mediciones;

# Salir
EXIT;
```

### Si ya tenías la base de una versión anterior

Las versiones anteriores creaban el usuario con una contraseña publicada en
el repositorio y con todos los privilegios. Cámbiala y reduce los permisos
(pon la misma contraseña nueva en `DB_PASSWORD` del `.env`):

```sql
-- dentro de: sudo mysql -u root
ALTER USER 'tms_user'@'localhost' IDENTIFIED BY 'tu_contraseña_nueva';
REVOKE ALL PRIVILEGES ON tms_db.* FROM 'tms_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON tms_db.* TO 'tms_user'@'localhost';
FLUSH PRIVILEGES;
```

Las versiones anteriores también guardaban la hora de las sesiones en hora
local. Ahora todo se guarda en UTC. Para corregir las sesiones antiguas,
ejecuta **una sola vez** y **antes** de levantar el servidor nuevo (lee
primero los comentarios del archivo para ajustar el desfase):

```bash
sudo mysql tms_db < PT/server/migrations/001_sesiones_hora_local_a_utc.sql
```

Para agregar el login (Fase 2) a una base que ya existía, crea las tablas
`usuarios` y `sesiones_login`. No toca tus sesiones ni tus mediciones y
se puede repetir sin problema. En una instalación nueva no hace falta,
porque `setup_db.sql` ya las crea:

```bash
sudo mysql tms_db < PT/server/migrations/002_usuarios.sql
```

---

## PASO 2b — Crear el usuario administrador

Desde la Fase 2 el dashboard pide usuario y contraseña. Crea el primer
administrador (o restablece su contraseña si la olvidaste):

```bash
cd PT/server
npm install            # si todavía no instalaste las dependencias
npm run crear-admin
# Pide la contraseña dos veces sin mostrarla (mínimo 8 caracteres).
```

Si no tienes una terminal interactiva (por ejemplo, por SSH sin TTY), pásala
por variable de entorno. Es temporal: el dashboard te obliga a cambiarla al
entrar por primera vez.

```bash
ADMIN_PASSWORD='una-clave-temporal' npm run crear-admin
```

Después, desde el dashboard o con la API (`POST /api/usuarios`), el admin
crea a los demás con su rol:

| Rol | Puede |
|---|---|
| `admin` | Todo: usuarios, iniciar y detener barridos, eliminar sesiones |
| `operador` | Iniciar y detener barridos, exportar |
| `observador` | Solo mirar y exportar |

Cada usuario nuevo entra con una contraseña temporal y debe cambiarla.

> **En producción** (`NODE_ENV=production`) la cookie de sesión lleva
> `Secure`: el login solo funciona entrando por **https://**. Si entras por
> http:// verás que el login "no se queda" (cada petición responde 401).

---

## PASO 3 — Instalar dependencias del Backend

```bash
cd PT/server
npm install

# Paquetes que se instalan:
# express  — servidor web
# mysql2   — cliente MariaDB con async/await
# dotenv   — leer variables del .env
# cors     — permitir peticiones del frontend
# nodemon  — reinicio automático en desarrollo
```

---

## PASO 4 — Instalar dependencias del Frontend

```bash
# Abrir una nueva terminal
cd PT/frontend
npm install

# Paquetes principales:
# react, react-dom          — framework UI
# vite, @vitejs/plugin-react — compilador rápido
# chart.js, react-chartjs-2  — gráfica de líneas
# three                      — visualización 3D
```

---

## PASO 5 — Levantar el Backend

```bash
cd PT/server
npm run dev

# Salida esperada:
# [TMS] Servidor escuchando en http://127.0.0.1:4000
# [TMS] API disponible en /api
# [DB] ✓ Conexión a MariaDB establecida.

# Si ves [DB] ✗ ... verifica:
# 1. Que MariaDB esté corriendo: sudo systemctl status mariadb
# 2. Las credenciales en PT/server/.env
```

---

## PASO 6 — Levantar el Frontend

```bash
# En una segunda terminal
cd PT/frontend
npm run dev

# Salida esperada:
# VITE v5.x.x  ready in 800ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.x.x:5173/
```

---

## PASO 7 — Abrir el Dashboard

```
http://localhost:5173
```

Aparece la pantalla de login. Entra con `admin` y la contraseña de
`npm run crear-admin`; la primera vez te pide elegir una nueva. Después, el
badge superior derecho debe mostrar **"SERVIDOR EN LÍNEA"** en verde, junto a
tu nombre, tu rol y el botón **Salir**.

---

## PASO 8 — Pruebas completas

### 8.1 Health-check del servidor
```bash
curl http://localhost:4000/api/status
```
```json
{ "ok": true, "version": "3.0.0", "uptime": 5.2, "clientes": 1 }
```

### 8.1b Iniciar sesión con curl
Todas las rutas salvo `/api/status` exigen la cookie de sesión (sin ella
responden 401). Con curl se guarda en un archivo con `-c` y se envía con `-b`:
```bash
read -rs PW   # escribe la contraseña (no se muestra) y pulsa Enter
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"usuario\": \"admin\", \"password\": \"$PW\"}"
```
En los ejemplos siguientes agrega `-b cookies.txt` a cada `curl`. Para
cerrar la sesión: `curl -b cookies.txt -X POST http://localhost:4000/api/auth/logout`.
Tras 5 intentos fallidos con el mismo usuario desde la misma IP, el login
responde 429 durante 15 minutos.

### 8.2 Crear una sesión manualmente (operador o admin)
```bash
curl -b cookies.txt -X POST http://localhost:4000/api/sesiones \
  -H "Content-Type: application/json" \
  -d '{"modo": "DC"}'
```
```json
{ "ok": true, "sesionId": 1 }
```

### 8.3 Enviar una medición del sensor Hall
```bash
curl -b cookies.txt -X POST http://localhost:4000/api/mediciones \
  -H "Content-Type: application/json" \
  -d '{
    "sesionId": 1,
    "xMM":  30.0,
    "yMM":  30.0,
    "zMM":  0,
    "bx":   2.341,
    "by":  -1.205,
    "bz":   45.678
  }'
```
```json
{
  "ok": true,
  "data": {
    "sesionId": 1, "xMM": 30, "yMM": 30, "zMM": 0,
    "bx": 2.341, "by": -1.205, "bz": 45.678,
    "magnitud": 45.7647
  }
}
```
Cuando funcione, verás la flecha aparecer en el mapa 3D y
la fila en la tabla, en tiempo real, sin recargar el navegador.

### 8.4 Listar sesiones guardadas en MariaDB
```bash
curl -b cookies.txt http://localhost:4000/api/sesiones
```
```json
{
  "ok": true,
  "data": [
    {
      "id": 1, "modo": "DC",
      "iniciada_en": "2025-06-12T10:30:00",
      "terminada_en": null,
      "total_puntos": 1,
      "max_magnitud": 45.7647,
      "min_magnitud": 45.7647
    }
  ]
}
```

### 8.5 Cerrar una sesión
```bash
curl -b cookies.txt -X PUT http://localhost:4000/api/sesiones/1
```
```json
{ "ok": true }
```

### 8.6 Verificar datos directamente en MariaDB
```bash
mysql -u tms_user -p tms_db
# Contraseña: la que pusiste en DB_PASSWORD
```
```sql
-- Ver sesiones
SELECT * FROM sesiones;

-- Ver mediciones de la sesión 1
SELECT x_mm, y_mm, z_mm, bx, by, bz, magnitud
FROM mediciones
WHERE sesion_id = 1
LIMIT 10;

-- Estadísticas por sesión
SELECT
  s.id,
  s.modo,
  COUNT(m.id) AS total_puntos,
  ROUND(MAX(m.magnitud), 3) AS max_B,
  ROUND(AVG(m.magnitud), 3) AS avg_B
FROM sesiones s
LEFT JOIN mediciones m ON m.sesion_id = s.id
GROUP BY s.id;
```

### 8.7 Exportar CSV de una sesión
```bash
curl -b cookies.txt http://localhost:4000/api/sesiones/1/mediciones
# Devuelve JSON con todos los puntos de la sesión
```
También funciona desde el botón **"Exportar CSV"** en la pestaña
Mediciones Pasadas del Dashboard.

---

## PASO 9 — Prueba completa del Dashboard

1. Abre `http://localhost:5173` e inicia sesión como admin u operador
2. Elige **DC — Rápida** o **AC — Normal**
3. Clic en **Iniciar Medición** → confirma en el modal
4. Observa:
   - Barra de progreso: avanza de 0 a 100% (845 puntos)
   - Gráfica de líneas: Bx (cyan), By (magenta), Bz (verde)
   - Mapa 3D: **flechas** que crecen en cada punto medido
     - La dirección de la flecha indica hacia dónde apunta el campo
     - La longitud es proporcional a |B|
     - El color indica el plano Z (altura)
   - Tabla inferior: cada lectura en tiempo real
5. Al terminar el barrido (o al presionar **Detener**):
   - La sesión se guarda automáticamente en MariaDB
   - Ve a **Mediciones Pasadas** → aparece la sesión recién completada
6. Abre la sesión y haz clic en **Exportar CSV**

---

## PROBLEMAS COMUNES

### Olvidé la contraseña del admin
```bash
cd PT/server && npm run crear-admin   # la restablece y cierra sus sesiones
```

### "No existe la tabla de usuarios" al correr crear-admin
Falta la migración 002 (ver el PASO 2):
```bash
sudo mysql tms_db < PT/server/migrations/002_usuarios.sql
```

### "Access denied for user 'tms_user'"
```bash
# Volver a ejecutar el script SQL
sudo mysql -u root < PT/server/setup_db.sql
```

### MariaDB no arranca
```bash
sudo systemctl restart mariadb
sudo journalctl -u mariadb -n 20   # ver últimos errores
```

### El badge muestra "SIN CONEXIÓN"
El backend no está corriendo o hay un error de CORS.
```bash
# Verificar que el backend está activo
curl http://localhost:4000/api/status

# Si falla, revisar la terminal donde corre npm run dev
```

### Puerto 4000 en uso
```bash
sudo lsof -i :4000
kill -9 <PID>
```

### Reinstalar MariaDB desde cero
```bash
sudo apt remove --purge mariadb-server mariadb-client
sudo apt autoremove
sudo apt install -y mariadb-server
sudo systemctl start mariadb
sudo mysql -u root < PT/server/setup_db.sql
```

---

## RESUMEN DE TERMINALES

```
Terminal 1:  cd PT/server    → npm run dev    (puerto 4000 + MariaDB)
Terminal 2:  cd PT/frontend  → npm run dev    (puerto 5173)
Terminal 3:  curl ...        (pruebas de API, opcional)
Navegador:   http://localhost:5173
```


