-- ═══════════════════════════════════════════════════════════════
-- Migración 002 — Usuarios y sesiones de login (Fase 2)
--
-- Qué hace:
--   Crea las tablas `usuarios` y `sesiones_login`. No toca las tablas
--   `sesiones` ni `mediciones`, así que no modifica ningún dato existente.
--
--   `sesiones_login` guarda las sesiones de usuario del dashboard (la
--   cookie tms_sesion). Se llama así para no confundirla con `sesiones`,
--   que son las sesiones de MEDICIÓN.
--
-- Cómo ejecutarla (una sola vez, como root, porque el usuario de la
-- aplicación no tiene permiso para crear tablas):
--
--   sudo mysql tms_db < server/migrations/002_usuarios.sql
--
-- Es segura de repetir: usa CREATE TABLE IF NOT EXISTS.
-- En una instalación limpia NO hace falta: setup_db.sql ya crea estas tablas.
--
-- Después de ejecutarla, crea el primer administrador:
--
--   cd server && npm run crear-admin
--
-- Tiempo: todas las fechas se guardan en UTC, como en el resto del esquema.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- TABLA: usuarios
-- Personas que entran al dashboard.
--   admin      — todo, incluidos los usuarios y la configuración
--   operador   — inicia y detiene barridos, exporta
--   observador — solo mira y exporta
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

SELECT 'Migración 002 aplicada: tablas usuarios y sesiones_login.' AS resultado;
