-- ═══════════════════════════════════════════════════════════════
-- tests/setup_test_db.sql
-- Base de datos SEPARADA para los tests de integración (Fase 8).
-- Es setup_db.sql con el nombre tms_db_test: misma estructura, mismos
-- valores por defecto. Los tests NUNCA usan tms_db.
--
-- Ejecutar como root (una vez, y de nuevo si cambia el esquema):
--   sudo mysql -u root < server/tests/setup_test_db.sql
--
-- Da permisos sobre tms_db_test al mismo usuario de la aplicación
-- (tms_user), con su contraseña de server/.env. Si tms_user todavía no
-- existe, reemplaza CAMBIA_ESTA_CONTRASENA por la de DB_PASSWORD.
--
-- Para regenerarlo cuando cambie setup_db.sql:
--   (sed -n '1,/^-- Crear la base de datos/p' tests/setup_test_db.sql | head -n -1;
--    sed -n '/^-- Crear la base de datos/,$p' setup_db.sql | sed 's/tms_db/tms_db_test/g') > /tmp/x && mv /tmp/x tests/setup_test_db.sql
-- ═══════════════════════════════════════════════════════════════

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS tms_db_test
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

-- Permisos mínimos sobre tms_db_test: la aplicación solo lee y escribe filas.
-- Los cambios de esquema (migraciones) se ejecutan como root.
GRANT SELECT, INSERT, UPDATE, DELETE ON tms_db_test.* TO 'tms_user'@'localhost';

-- Aplicar los cambios de permisos
FLUSH PRIVILEGES;

-- Usar la base de datos recién creada
USE tms_db_test;

-- ─────────────────────────────────────────────────────────────
-- TABLA: usuarios
-- Personas que entran al dashboard.
--   admin      — todo, incluidos los usuarios y la configuración
--   operador   — inicia y detiene barridos, edita las notas de sus sesiones, exporta
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
-- TABLA: sesiones
-- Cada proceso de medición, con los parámetros elegidos (CLAUDE.md 7.0)
-- y los metadatos de reproducibilidad (Fase 5).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones (
  id                INT          AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT          NULL,                        -- quién la inició
  modo              ENUM('DC','AC') NOT NULL,                 -- velocidad: DC rápida, AC normal
  origen            ENUM('sim','hw') NOT NULL DEFAULT 'sim',  -- simulador del servidor o Pico W
  paso_mm           DECIMAL(4,1) UNSIGNED NOT NULL DEFAULT 5.0, -- paso en X, Y y Z, en mm (libre, migración 006)
  medio             ENUM('campo_magnetico','solucion_salina') NOT NULL DEFAULT 'campo_magnetico',
  zona_x_mm         DECIMAL(5,1) UNSIGNED NOT NULL,           -- zona de muestreo en X, Y y Z (mm, migración 007)
  zona_y_mm         DECIMAL(5,1) UNSIGNED NOT NULL,
  zona_z_mm         DECIMAL(5,1) UNSIGNED NOT NULL,
  iniciada_en       DATETIME     NOT NULL,                    -- UTC
  terminada_en      DATETIME     NULL,                        -- UTC (NULL si está abierta)
  notas             TEXT         NULL,                        -- texto libre (máx. 5000 por la API)
  puntos_esperados  INT          NULL,                        -- grid_n² × planos según el paso
  puntos_recibidos  INT          NULL,                        -- filas guardadas, calculado al cerrar
  huecos            JSON         NULL,                        -- {"total": n, "posiciones": [{xMM,yMM,zMM}…]} (≤ 1000)
  config_barrido    JSON         NULL,                        -- copias de la configuración al iniciar
  config_sensor     JSON         NULL,
  config_simulacion JSON         NULL,                        -- solo en simulación (incluye la semilla)
  version_software  VARCHAR(64)  NULL,                        -- versión del servidor + commit
  version_firmware  VARCHAR(40)  NULL,                        -- firmware de la Pico (modo real)
  eliminada_en      DATETIME     NULL,                        -- borrado lógico (NULL = visible)

  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
);

-- Índices para los filtros del historial y el borrado lógico
CREATE INDEX IF NOT EXISTS idx_sesiones_iniciada  ON sesiones(iniciada_en);
CREATE INDEX IF NOT EXISTS idx_sesiones_filtros   ON sesiones(modo, paso_mm, medio, origen);
CREATE INDEX IF NOT EXISTS idx_sesiones_eliminada ON sesiones(eliminada_en);

-- ─────────────────────────────────────────────────────────────
-- TABLA: mediciones
-- Cada lectura vectorial del magnetómetro (Bx, By, Bz).
-- Una sesión completa de 0,5 cm tiene 13×13×5 = 845 filas.
-- Números en DOUBLE (Fase 5): sin los artefactos de float32.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediciones (
  id             INT           AUTO_INCREMENT PRIMARY KEY,
  sesion_id      INT           NOT NULL,                 -- referencia a sesiones
  seq            INT           NULL,                     -- número de lectura en la sesión (Fase 4)
  x_mm           DOUBLE        NOT NULL,                 -- posición X en la placa (0..60 mm)
  y_mm           DOUBLE        NOT NULL,                 -- posición Y en la placa (0..60 mm)
  z_mm           DOUBLE        NOT NULL,                 -- altura del sensor (planos según el paso)
  `bx`           DOUBLE        NULL,                     -- componente X del campo (μT); NULL si ese eje saturó
  `by`           DOUBLE        NULL,                     -- componente Y del campo (μT)
  `bz`           DOUBLE        NULL,                     -- componente Z del campo (μT)
  magnitud       DOUBLE        NULL,                     -- |B| = √(Bx²+By²+Bz²) en μT; NULL si saturó
  raw_x          SMALLINT      NULL,                     -- cuentas crudas del HMC5883L (−4096 = desborde)
  raw_y          SMALLINT      NULL,
  raw_z          SMALLINT      NULL,
  saturado       BOOLEAN       NOT NULL DEFAULT 0,       -- 1 si algún eje se desbordó
  timestamp      DATETIME(3)   NOT NULL,                 -- hora de recepción en el servidor (UTC)
  ts_dispositivo DATETIME(3)   NULL,                     -- hora de la lectura según la Pico (UTC)

  -- Llave foránea: si se borra la sesión (solo por SQL), se borran sus mediciones
  CONSTRAINT fk_sesion
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id)
    ON DELETE CASCADE,
  -- Idempotencia: la Pico puede reenviar un lote sin duplicar filas.
  -- También es el índice (sesion_id, seq) con el que se ordena el CSV.
  CONSTRAINT uq_mediciones_sesion_seq UNIQUE (sesion_id, seq)
);

-- Índice para acelerar búsquedas por sesión
CREATE INDEX IF NOT EXISTS idx_mediciones_sesion ON mediciones(sesion_id);

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
  ('barrido',        '{"limite_x_mm":60,"limite_y_mm":60,"limite_z_mm":20,"standoff_mm":5,"paso_predeterminado_mm":5}', UTC_TIMESTAMP()),
  ('sensor',         '{"modelo":"HMC5883L","rango_ga":1.9,"lsb_por_ga":820,"lecturas_por_punto":1,"offset_ut":{"x":0,"y":0,"z":0}}', UTC_TIMESTAMP()),
  ('simulacion',     '{"ms_por_punto":{"DC":60,"AC":120},"semilla":12345,"ruido_sigma_ut":0.25,"radio_bobina_mm":25,"campo_centro_ut":120,"prob_hueco":0,"prob_saturacion":0}', UTC_TIMESTAMP()),
  ('dispositivo',    '{"intervalo_latido_s":5,"umbral_desconexion_s":15}', UTC_TIMESTAMP()),
  ('visualizacion',  '{"ventana_grafica":80,"filas_tabla":60,"decimales":3,"escala_superficie":"Jet","rotacion_auto":true,"reducir_animaciones":false}', UTC_TIMESTAMP()),
  ('datos',          '{"zona_horaria":"America/Mexico_City"}', UTC_TIMESTAMP());

-- ─────────────────────────────────────────────────────────────
-- TABLA: dispositivos
-- Una fila por cada Pico W autorizada; solo se guarda el SHA-256 del
-- token. (Igual que migrations/004_dispositivo.sql)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispositivos (
  id             INT          AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(40)  NOT NULL,
  token_hash     CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,   -- SHA-256 del token
  activo         BOOLEAN      NOT NULL DEFAULT 1,
  creado_en      DATETIME     NOT NULL,                                 -- UTC
  ultimo_latido  DATETIME(3)  NULL,                                     -- UTC
  ip             VARCHAR(45)  NULL,
  firmware       VARCHAR(40)  NULL,
  rssi           SMALLINT     NULL,                                     -- dBm
  uptime_s       INT UNSIGNED NULL,

  CONSTRAINT uq_dispositivos_nombre UNIQUE (nombre),
  CONSTRAINT uq_dispositivos_token  UNIQUE (token_hash)
);

INSERT IGNORE INTO dispositivos (nombre, creado_en) VALUES ('pico-w-1', UTC_TIMESTAMP());

SELECT 'Base de pruebas tms_db_test creada correctamente.' AS resultado;
