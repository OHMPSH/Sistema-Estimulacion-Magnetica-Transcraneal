-- ═══════════════════════════════════════════════════════════════
-- setup_db.sql
-- Script de configuración de la base de datos TMS
--
-- Ejecutar UNA sola vez como root de MariaDB:
--   sudo mysql -u root < setup_db.sql
--
-- Crea:
--   • Base de datos: tms_db
--   • Usuario:       tms_user (con contraseña tms_password)
--   • Tabla:         sesiones   — un registro por proceso de medición
--   • Tabla:         mediciones — lecturas del sensor Hall
-- ═══════════════════════════════════════════════════════════════

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS tms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Crear usuario exclusivo para la aplicación
-- (nunca usar root en la app)
CREATE USER IF NOT EXISTS 'tms_user'@'localhost'
  IDENTIFIED BY 'tms_password';

-- Dar permisos solo sobre tms_db
GRANT ALL PRIVILEGES ON tms_db.* TO 'tms_user'@'localhost';

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
  modo          ENUM('DC','AC') NOT NULL,                 -- tipo de medición
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

SELECT 'Base de datos TMS creada correctamente.' AS resultado;