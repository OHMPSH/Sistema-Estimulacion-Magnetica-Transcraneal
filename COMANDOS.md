# Guía de instalación y operación — TMS en la Raspberry Pi 5

Esta guía deja el sistema funcionando en una **Raspberry Pi 5 limpia con Raspberry Pi OS** (64 bits): MariaDB, el backend de Node.js como servicio de systemd, el frontend compilado y Nginx con HTTPS. Al final están la Pico W, las comprobaciones, la solución de problemas y los respaldos.

Convenciones:
- El proyecto vive en **`/opt/tms`** (es la ruta que usa `nginx/tms.conf`).
- Los comandos con `sudo` se ejecutan en la Raspberry con tu usuario administrador (por ejemplo `pi`).
- Donde dice `<IP>`, es la IP de la Raspberry en el hotspot (`hostname -I`).

```
/opt/tms
├── server/       backend (Express + MariaDB)        → servicio tms-server, 127.0.0.1:4000
├── frontend/     código del dashboard (React + Vite) → se compila a /opt/tms/dist
├── dist/         lo que sirve Nginx (se genera)
├── nginx/        tms.conf (se copia tal cual)
├── deploy/       tms-server.service (systemd)
├── docs/         firmware de la Pico W, prompts, revisión de diseño
└── firmware/     ejemplo en MicroPython para la Pico W
```

---

## 1. Paquetes del sistema

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl mariadb-server nginx openssl avahi-daemon
```

**Node.js 20 LTS.** El de los repositorios de Raspberry Pi OS puede ser más viejo; se instala el de NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version      # v20.x
```

Servicios al arrancar:

```bash
sudo systemctl enable --now mariadb nginx
```

## 2. Copiar el proyecto a /opt/tms

Con git (si el repositorio está en GitHub):

```bash
sudo mkdir -p /opt/tms && sudo chown "$USER": /opt/tms
git clone <URL-del-repositorio> /opt/tms
```

O copiando la carpeta desde tu computadora (sin `node_modules` ni `.env`):

```bash
# en tu computadora, desde la carpeta que contiene PT/
rsync -av --exclude node_modules --exclude .env --exclude dist PT/ pi@<IP>:/opt/tms/
```

## 3. Base de datos

### 3.1 Instalación limpia

1. Elige una contraseña para el usuario de la base, **distinta de `tms_password`** (esa aparece en el historial de git del proyecto).
2. Ponla en el script (sin guardar el cambio en git) y ejecútalo como root:

```bash
cd /opt/tms/server
sed 's/CAMBIA_ESTA_CONTRASENA/tu_contraseña/' setup_db.sql | sudo mysql -u root
```

`setup_db.sql` crea `tms_db`, el usuario `tms_user` con permisos mínimos (`SELECT, INSERT, UPDATE, DELETE`) y **todas** las tablas en su versión final. En una instalación limpia **no hace falta ninguna migración**.

Comprobar:

```bash
mysql -u tms_user -p tms_db -e "SHOW TABLES;"
# configuracion, dispositivos, mediciones, sesiones, sesiones_login, usuarios
```

### 3.2 Si vienes de una versión anterior (migraciones)

Las migraciones están en `server/migrations/` y se ejecutan **una sola vez, en orden y como root**. Todas se pueden repetir sin duplicar nada, salvo la 001. Haz un respaldo antes (sección 13).

| Archivo | Qué hace |
|---|---|
| `001_sesiones_hora_local_a_utc.sql` | Pasa `iniciada_en` y `terminada_en` de hora local a UTC. ⚠ **Ajusta `@corte`** antes de ejecutarla (las sesiones posteriores a ese instante ya están en UTC) y **no la ejecutes dos veces**: restaría el desfase otra vez. Lee los comentarios del archivo. |
| `002_usuarios.sql` | Tablas `usuarios` y `sesiones_login` (login). |
| `003_configuracion.sql` | Tabla `configuracion`; `origen`, `paso_mm` y `medio` en `sesiones`. |
| `004_dispositivo.sql` | Tabla `dispositivos` (Pico W); `seq`, crudos, `saturado` y `ts_dispositivo` en `mediciones`. |
| `005_trazabilidad.sql` | FLOAT → DOUBLE en `mediciones` (las filas viejas conservan su error de float32); metadatos, huecos, notas y borrado lógico en `sesiones`. |
| `006_paso_libre.sql` | `sesiones.paso_mm` pasa a `DECIMAL(4,1)`: el paso de medición es libre (en mm, con un decimal). |
| `007_zona_muestreo.sql` | `sesiones.zona_x_mm/zona_y_mm/zona_z_mm` (zona de muestreo por sesión) y la configuración `barrido` pasa a límites de la base (`limite_x_mm`, `limite_y_mm`, `limite_z_mm`). |

```bash
cd /opt/tms/server/migrations
sudo mysql tms_db < 002_usuarios.sql
sudo mysql tms_db < 003_configuracion.sql
sudo mysql tms_db < 004_dispositivo.sql
sudo mysql tms_db < 005_trazabilidad.sql
sudo mysql tms_db < 006_paso_libre.sql
sudo mysql tms_db < 007_zona_muestreo.sql
```

Si la base vieja usaba la contraseña publicada o `ALL PRIVILEGES`, cámbiala y reduce los permisos:

```sql
-- sudo mysql -u root
ALTER USER 'tms_user'@'localhost' IDENTIFIED BY 'tu_contraseña_nueva';
REVOKE ALL PRIVILEGES ON tms_db.* FROM 'tms_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON tms_db.* TO 'tms_user'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Backend: `.env` de producción e instalación

```bash
cd /opt/tms/server
cp .env.example .env
nano .env
```

Valores para la Raspberry:

```ini
PORT=4000
HOST=127.0.0.1          # solo Nginx habla con el backend
NODE_ENV=production     # cookie Secure (solo HTTPS) y errores sin detalles internos
CORS_ORIGINS=http://localhost:5173   # el dashboard y la API comparten origen detrás de Nginx: CORS no interviene
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=tms_user
DB_PASSWORD=tu_contraseña
DB_NAME=tms_db
```

```bash
chmod 600 .env
npm ci --omit=dev            # solo dependencias de producción (sin nodemon)
```

## 5. Usuario administrador

```bash
cd /opt/tms/server
npm run crear-admin -- --predeterminado     # admin / admin, sin cambio obligatorio
```

> ⚠ Cualquiera conectado al hotspot que conozca admin/admin puede entrar como administrador.

Para una contraseña propia: `npm run crear-admin` (la pide dos veces; mínimo 8 caracteres). Los demás usuarios se crean en el dashboard: **☰ › Configuración › Usuarios**.

| Rol | Puede |
|---|---|
| admin | Todo: usuarios, configuración, modo de operación, token de la Pico, eliminar y restaurar sesiones |
| operador | Iniciar y detener barridos, editar las notas de sus sesiones, exportar |
| observador | Mirar y exportar |

## 6. Frontend: compilar a /opt/tms/dist

```bash
cd /opt/tms/frontend
npm ci                       # incluye Vite (dependencia de desarrollo, necesaria para compilar)
npm run build                # vite.config.js → outDir '../dist' = /opt/tms/dist
ls /opt/tms/dist             # index.html  assets/
```

`/opt/tms/dist` es exactamente el `root` de `nginx/tms.conf`. Las fuentes, Bootstrap y los iconos van empaquetados: el dashboard no necesita internet.

## 7. Certificado autofirmado

El mismo comando que documenta `tms.conf`:

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/tms.key \
  -out    /etc/nginx/ssl/tms.crt \
  -subj "/C=MX/ST=CDMX/L=CDMX/O=IPN/OU=ESIME/CN=tms.ipn.local"
sudo chmod 600 /etc/nginx/ssl/tms.key
```

Los navegadores mostrarán un aviso la primera vez («la conexión no es privada»): hay que aceptarlo en cada equipo.

## 8. Nginx

`nginx/tms.conf` se copia **tal cual** (no se edita):

```bash
sudo cp /opt/tms/nginx/tms.conf /etc/nginx/sites-available/tms.conf
sudo ln -s /etc/nginx/sites-available/tms.conf /etc/nginx/sites-enabled/tms.conf
sudo rm /etc/nginx/sites-enabled/default      # ver la sección 10
sudo nginx -t
sudo systemctl reload nginx
```

`tms.conf` sirve `/opt/tms/dist` y reenvía `/api/` al backend quitando el prefijo (`proxy_pass http://127.0.0.1:4000/;`). El backend responde en los dos prefijos, así que no hay nada que ajustar.

## 9. Servicio de systemd

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin tms
# El servicio (usuario tms) y tu usuario (para npm run crear-admin) deben poder leer el .env
sudo chown tms:"$(id -gn)" /opt/tms/server/.env && sudo chmod 640 /opt/tms/server/.env
sudo cp /opt/tms/deploy/tms-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tms-server
systemctl status tms-server
journalctl -u tms-server -f                    # log en vivo (Ctrl+C para salir)
```

Al arrancar, el log debe mostrar `[DB] ✓ Conexión a MariaDB establecida`, `[config] ✓ Configuración cargada` y `Servidor 3.0.0+<commit> escuchando en http://127.0.0.1:4000 (production)`.

Tras actualizar el código: `cd /opt/tms && git pull`, luego `npm ci --omit=dev` en `server/`, `npm ci && npm run build` en `frontend/`, las migraciones nuevas si las hay, y `sudo systemctl restart tms-server`.

## 10. Cómo entrar desde el hotspot del iPhone

`tms.conf` usa `server_name tms.ipn.local`. Ese nombre **no** se resuelve solo: mDNS (Avahi) solo anuncia un nombre de una etiqueta, como `raspberrypi.local`, y `tms.ipn.local` tiene dos. Comportamiento comprobado con Nginx y una copia de `tms.conf`:

- Por **HTTPS** funciona con cualquier nombre o IP: `tms.conf` es el único servidor en el 443, así que Nginx lo usa aunque el nombre no coincida.
- Por **HTTP** (puerto 80), con el sitio `default` de Raspberry Pi OS activo, `http://<IP>` muestra la página de bienvenida de Nginx. Sin ese sitio (paso 8), `tms.conf` atiende el 80 y redirige a `https://<IP>/`.

Opciones, de la más recomendable a la menos:

1. **Nombre `.local` con mDNS.** Cambia el nombre de la Raspberry a `tms` y entra a **`https://tms.local`** desde laptops (macOS, Windows 10+, Linux con Avahi) y desde iPhone o Android recientes. Sigue funcionando aunque el hotspot cambie la IP.
   ```bash
   sudo hostnamectl set-hostname tms
   sudo systemctl restart avahi-daemon
   ```
2. **IP directa:** `https://<IP>`. Lo más simple, pero hay que volver a buscar la IP si el hotspot la cambia.
3. **Entrada en `hosts`** de cada laptop (`<IP>  tms.ipn.local`): permite usar el nombre del certificado, pero hay que actualizarla en cada equipo cuando cambia la IP. No sirve en teléfonos.

## 11. Pico W

1. En el dashboard, como admin: **☰ › Modo de operación › Real**.
2. **☰ › Configuración › Dispositivo › Generar token.** Se muestra **una sola vez**: cópialo.
3. Ponlo en la Pico (`secretos.py`, junto con el Wi-Fi y `SERVIDOR = "https://tms.local"` o la IP). El protocolo, NTP, el orden de registros X, Z, Y del HMC5883L y el escaneo I2C están en [docs/firmware-pico-w.md](docs/firmware-pico-w.md); el ejemplo, en `firmware/pico_w_cliente_ejemplo.py`.
4. La barra superior mostrará «Pico W en línea · hace N s».

Probar sin hardware, desde la Raspberry o desde una laptop:

```bash
cd /opt/tms/server
npm run emular-pico -- --token <TOKEN> --url https://tms.local/api --insecure --perdida 0.3 --duplicar 0.2
```

## 12. Comprobaciones finales

```bash
curl -k https://tms.local/api/status
# {"ok":true,"version":"3.0.0","commit":"…","version_software":"3.0.0+…","modo_operacion":"simulacion",…}

# Login y una sesión simulada de 2 cm (32 puntos)
curl -k -c /tmp/c.txt -H 'Content-Type: application/json' -d '{"usuario":"admin","password":"admin"}' https://tms.local/api/auth/login
curl -k -b /tmp/c.txt -H 'Content-Type: application/json' -d '{"modo":"DC","paso_mm":20}' https://tms.local/api/sesiones
curl -k -b /tmp/c.txt https://tms.local/api/sesiones | head -c 300
```

Luego, en un navegador: `https://tms.local` → login → Iniciar medición → el progreso avanza en todas las pestañas abiertas → Mediciones pasadas → Exportar CSV.

## 13. Respaldo y restauración

```bash
# Respaldo (no detiene el servicio)
sudo mysqldump --single-transaction --routines tms_db | gzip > ~/tms_db_$(date +%F).sql.gz

# Restaurar (detén el backend mientras tanto)
sudo systemctl stop tms-server
gunzip -c ~/tms_db_2026-11-10.sql.gz | sudo mysql tms_db
sudo systemctl start tms-server
```

**Borrado definitivo.** `DELETE /api/sesiones/:id` es un borrado lógico (un admin restaura desde *Mediciones pasadas › Ver eliminadas*). Para liberar espacio de verdad, después de un respaldo:

```sql
-- sudo mysql tms_db
SELECT id, iniciada_en, eliminada_en FROM sesiones
 WHERE eliminada_en IS NOT NULL AND eliminada_en < UTC_TIMESTAMP() - INTERVAL 30 DAY;
DELETE FROM sesiones
 WHERE eliminada_en IS NOT NULL AND eliminada_en < UTC_TIMESTAMP() - INTERVAL 30 DAY;
```

## 14. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| El login «no se queda»: cada petición responde 401 | Con `NODE_ENV=production` la cookie lleva `Secure` y el navegador solo la envía por **HTTPS**. Entra por `https://`, no por `http://` ni directo al puerto 4000. |
| `http://<IP>` muestra «Welcome to nginx!» | Sigue activo el sitio `default`: `sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx`, o entra por `https://`. |
| El dashboard no recibe puntos en vivo (pero el historial sí) | El SSE necesita que Nginx no almacene la respuesta: `tms.conf` ya trae `proxy_buffering off` y el backend manda `X-Accel-Buffering: no`. Revisa que se esté usando `tms.conf` (`sudo nginx -T \| grep tms.ipn.local`). Si se corta, el navegador se reconecta solo a los 3 s y recupera lo perdido. |
| Ayer funcionaba `https://<IP>` y hoy no | El hotspot del iPhone cambió la IP. Usa `https://tms.local` (sección 10) o busca la nueva con `hostname -I`. La Pico W también necesita la IP nueva si no usa el nombre. |
| `[DB] ✗ Access denied for user 'tms_user'` | La contraseña de `.env` no coincide con la de MariaDB. Cámbiala con `ALTER USER` (sección 3.2). |
| `Falta una migración` al arrancar | La base es de una versión anterior: ejecuta las migraciones que falten (sección 3.2). |
| La Pico recibe 401 | Token revocado, regenerado o dispositivo desactivado: genera otro y cárgalo en la Pico. |
| La Pico recibe 409 | El sistema está en modo simulación o no hay una sesión real abierta. |
| Olvidé la contraseña del admin | `cd /opt/tms/server && npm run crear-admin -- --predeterminado` (vuelve a admin/admin y cierra sus sesiones). |
| `EADDRINUSE` en el puerto 4000 | Ya hay otro backend corriendo: `sudo systemctl stop tms-server` o `sudo lsof -i :4000`. |

## 15. Desarrollo en tu computadora

```bash
cd PT/server && cp .env.example .env    # NODE_ENV=development, CORS_ORIGINS=http://localhost:5173
npm install && npm run dev              # http://127.0.0.1:4000
cd PT/frontend && npm install && npm run dev    # http://localhost:5173 (proxy /api → 4000)
```

### Tests

```bash
cd PT/server
npm test                  # = npm run test:unit; no necesita base de datos (53 pruebas)
npm run test:integracion  # necesita la base de PRUEBAS tms_db_test (nunca usa tms_db)
```

La base de pruebas se crea una vez, como root, con la misma contraseña de `tms_user`:

```bash
sed 's/CAMBIA_ESTA_CONTRASENA/la_de_tu_.env/' server/tests/setup_test_db.sql | sudo mysql -u root
```

Los tests de integración levantan la app en un puerto aleatorio, vacían `tms_db_test`, y prueban de extremo a extremo: el CSV de una sesión simulada contra el simulador con la misma semilla (tolerancia 1e-9), la Pico emulada con pérdidas y duplicados, los roles (401 y 403), el borrado lógico y los 409. Sin la base, se marcan como omitidos con el comando para crearla. Las credenciales se pueden cambiar con `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`.
