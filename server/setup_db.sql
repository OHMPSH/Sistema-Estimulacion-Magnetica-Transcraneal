-- ═══════════════════════════════════════════════════════════════
-- setup_db.sql
-- Script de configuración de la base de datos TMS
--
-- Ejecutar UNA sola vez como root de MariaDB:
--   sudo mysql -u root < setup_db.sql
--
-- Crea:
--   • Base de datos: tms_db
--   • Usuario:       tms_user (la contraseña la eliges tú; ver abajo)
--   • Tabla:         sesiones   — un registro por proceso de medición
--   • Tabla:         mediciones — lecturas del sensor Hall
--   • Tabla:         usuarios       — personas que entran al dashboard
--   • Tabla:         sesiones_login — sesiones de usuario (cookie tms_sesion)
--   • Tabla:         configuracion  — parámetros del sistema (valores por defecto)
--
-- Después de ejecutarlo, crea el primer administrador:
--   cd server && npm run crear-admin -- --predeterminado   (admin / admin)
-- ═══════════════════════════════════════════════════════════════

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS tms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Crear usuario exclusivo para la aplicación
-- (nunca usar root en la app)
--
-- ⚠ ANTES DE EJECUTAR: reemplaza CAMBIA_ESTA_CONTRASENA por una
--   contraseña propia y pon la MISMA en DB_PASSWORD de server/.env.
--   No subas la contraseña real a Git.
CREATE USER IF NOT EXISTS 'tms_user'@'localhost'
  IDENTIFIED BY 'CAMBIA_ESTA_CONTRASENA';

-- Permisos mínimos sobre tms_db: la aplicación solo lee y escribe filas.
-- Los cambios de esquema (migraciones) se ejecutan como root.
GRANT SELECT, INSERT, UPDATE, DELETE ON tms_db.* TO 'tms_user'@'localhost';

-- Aplicar los cambios de permisos
FLUSH PRIVILEGES;

-- Usar la base de datos recién creada
USE tms_db;

-- ─────────────────────────────────────────────────────────────
-- TABLA: sesiones
-- Registra cada proceso de medición (inicio + fin + modo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones (
  id            INT          AUTO_INCREMENT PRIMARY KEY,  -- identificador único
  modo          ENUM('DC','AC') NOT NULL,                 -- velocidad: DC rápida, AC normal
  origen        ENUM('sim','hw') NOT NULL DEFAULT 'sim',  -- simulador del servidor o Pico W
  paso_mm       TINYINT UNSIGNED NOT NULL DEFAULT 5,      -- paso en X, Y y Z: 5, 10 o 20 mm
  medio         ENUM('campo_magnetico','solucion_salina') NOT NULL DEFAULT 'campo_magnetico',
  iniciada_en   DATETIME     NOT NULL,                    -- cuándo empezó
  terminada_en  DATETIME     NULL                         -- cuándo terminó (NULL si activa)
);

-- ─────────────────────────────────────────────────────────────
-- TABLA: mediciones
-- Almacena cada lectura vectorial del sensor Hall (Bx, By, Bz)
-- Una sesión completa tiene 13×13×5 = 845 filas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediciones (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  sesion_id   INT           NOT NULL,                   -- referencia a sesiones
  x_mm        FLOAT         NOT NULL,                   -- posición X en la placa (0..60 mm)
  y_mm        FLOAT         NOT NULL,                   -- posición Y en la placa (0..60 mm)
  z_mm        FLOAT         NOT NULL,                   -- altura del sensor (0,5,10,15,20 mm)
  `bx`        FLOAT         NOT NULL,                   -- componente X del campo (μT)
  `by`        FLOAT         NOT NULL,                   -- componente Y del campo (μT)
  `bz`        FLOAT         NOT NULL,                   -- componente Z del campo (μT)
  magnitud    FLOAT         NOT NULL,                   -- |B| = √(Bx²+By²+Bz²) en μT
  timestamp   DATETIME(3)   NOT NULL,                   -- fecha y hora con milisegundos

  -- Llave foránea: si se borra la sesión, se borran sus mediciones
  CONSTRAINT fk_sesion
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id)
    ON DELETE CASCADE
);

-- Índice para acelerar búsquedas por sesión
CREATE INDEX IF NOT EXISTS idx_mediciones_sesion
  ON mediciones(sesion_id);

-- ─────────────────────────────────────────────────────────────
-- TABLA: usuarios
-- Personas que entran al dashboard.
--   admin      — todo, incluidos los usuarios y la configuración
--   operador   — inicia y detiene barridos, exporta
--   observador — solo mira y exporta
-- (Igual que migrations/002_usuarios.sql)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                    INT           AUTO_INCREMENT PRIMARY KEY,
  usuario               VARCHAR(32)   NOT NULL,              -- nombre para entrar (en minúsculas)
  nombre                VARCHAR(100)  NOT NULL,              -- nombre para mostrar
  rol                   ENUM('admin','operador','observador') NOT NULL,
  hash_password         VARCHAR(255)  NOT NULL,              -- scrypt$N$r$p$salHex$hashHex (nunca la contraseña)
  activo                BOOLEAN       NOT NULL DEFAULT 1,    -- 0 = no puede entrar
  debe_cambiar_password BOOLEAN       NOT NULL DEFAULT 1,    -- 1 = debe cambiarla al entrar
  preferencias          JSON          NULL,                  -- por ejemplo {"tema":"oscuro"}
  creado_en             DATETIME      NOT NULL,              -- UTC
  ultimo_acceso         DATETIME      NULL,                  -- UTC, último login correcto

  CONSTRAINT uq_usuarios_usuario UNIQUE (usuario)
);

-- ─────────────────────────────────────────────────────────────
-- TABLA: sesiones_login
-- Una fila por cada sesión de usuario abierta en un navegador.
-- El id es el SHA-256 (en hexadecimal) del token de la cookie: si
-- alguien lee esta tabla, no obtiene tokens que pueda usar.
-- No confundir con `sesiones`, que son las sesiones de MEDICIÓN.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones_login (
  id          CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,  -- SHA-256 del token
  usuario_id  INT           NOT NULL,
  creada_en   DATETIME      NOT NULL,                        -- UTC
  expira_en   DATETIME      NOT NULL,                        -- UTC; se renueva con el uso
  ultimo_uso  DATETIME      NOT NULL,                        -- UTC
  ip          VARCHAR(45)   NULL,                            -- IPv4 o IPv6
  user_agent  VARCHAR(255)  NULL,

  -- Si se borra el usuario, se borran sus sesiones de login
  CONSTRAINT fk_sesion_login_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sesiones_login_usuario ON sesiones_login(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_login_expira  ON sesiones_login(expira_en);

-- ─────────────────────────────────────────────────────────────
-- TABLA: configuracion
-- Una fila por grupo de parámetros. El servidor la carga al arrancar
-- y la mantiene en memoria; solo un admin la cambia.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  clave           VARCHAR(40)  NOT NULL PRIMARY KEY,
  valor           JSON         NOT NULL,
  actualizado_en  DATETIME     NOT NULL,                     -- UTC
  actualizado_por INT          NULL,                         -- NULL = valor por defecto

  CONSTRAINT fk_configuracion_usuario
    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
    ON DELETE SET NULL
);

INSERT IGNORE INTO configuracion (clave, valor, actualizado_en) VALUES
  ('modo_operacion', '"simulacion"', UTC_TIMESTAMP()),
  ('barrido',        '{"grid_size_mm":60,"z_max_mm":20,"standoff_mm":5,"paso_predeterminado_mm":5}', UTC_TIMESTAMP()),
  ('sensor',         '{"modelo":"HMC5883L","rango_ga":1.9,"lsb_por_ga":820,"lecturas_por_punto":1,"offset_ut":{"x":0,"y":0,"z":0}}', UTC_TIMESTAMP()),
  ('simulacion',     '{"ms_por_punto":{"DC":60,"AC":120},"semilla":12345,"ruido_sigma_ut":0.25,"radio_bobina_mm":25,"campo_centro_ut":120,"prob_hueco":0,"prob_saturacion":0}', UTC_TIMESTAMP()),
  ('dispositivo',    '{"intervalo_latido_s":5,"umbral_desconexion_s":15}', UTC_TIMESTAMP()),
  ('visualizacion',  '{"ventana_grafica":80,"filas_tabla":60,"decimales":3,"escala_superficie":"Jet","rotacion_auto":true,"reducir_animaciones":false}', UTC_TIMESTAMP()),
  ('datos',          '{"zona_horaria":"America/Mexico_City"}', UTC_TIMESTAMP());

-- Índices para los filtros del historial
CREATE INDEX IF NOT EXISTS idx_sesiones_iniciada ON sesiones(iniciada_en);
CREATE INDEX IF NOT EXISTS idx_sesiones_filtros  ON sesiones(modo, paso_mm, medio, origen);

SELECT 'Base de datos TMS creada correctamente.' AS resultado;
