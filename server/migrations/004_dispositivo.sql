-- ═══════════════════════════════════════════════════════════════
-- Migración 004 — La Pico W como cliente del servidor (Fase 4)
--
-- Qué hace:
--   1. Crea la tabla `dispositivos` (CLAUDE.md 7.3) con un registro
--      inicial 'pico-w-1' SIN token: el admin lo genera desde el
--      dashboard (POST /api/dispositivo/token) y se muestra una sola vez.
--   2. Agrega a `mediciones`:
--        seq             número de lectura dentro de la sesión (la Pico
--                        lo reenvía igual al reintentar; el simulador
--                        también numera desde 1)
--        raw_x/y/z       cuentas crudas del HMC5883L (NULL en el simulador)
--        saturado        1 si algún eje se desbordó (−4096)
--        ts_dispositivo  hora de la lectura según la Pico (UTC, por NTP)
--      y UNIQUE(sesion_id, seq), que hace idempotente la ingesta.
--   3. bx, by, bz y magnitud pasan a admitir NULL: el eje desbordado
--      de una lectura saturada no se convierte, y sin él no hay |B|.
--
-- Las mediciones existentes quedan con seq NULL (UNIQUE admite varios
-- NULL), saturado = 0 y sin crudos. No se modifica ningún valor.
--
-- Cómo ejecutarla (una sola vez, como root):
--
--   sudo mysql tms_db < server/migrations/004_dispositivo.sql
--
-- En una instalación limpia NO hace falta: setup_db.sql ya lo incluye.
-- Se puede ejecutar dos veces sin duplicar nada (IF NOT EXISTS e
-- INSERT IGNORE).
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- TABLA: dispositivos
-- Una fila por cada Pico W autorizada. El token nunca se guarda: solo
-- su SHA-256 en hexadecimal.
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

-- ─────────────────────────────────────────────────────────────
-- MEDICIONES: seq, crudos, saturación y hora de la Pico
-- ─────────────────────────────────────────────────────────────
ALTER TABLE mediciones
  ADD COLUMN IF NOT EXISTS seq            INT         NULL AFTER sesion_id,
  ADD COLUMN IF NOT EXISTS raw_x          SMALLINT    NULL AFTER magnitud,
  ADD COLUMN IF NOT EXISTS raw_y          SMALLINT    NULL AFTER raw_x,
  ADD COLUMN IF NOT EXISTS raw_z          SMALLINT    NULL AFTER raw_y,
  ADD COLUMN IF NOT EXISTS saturado       BOOLEAN     NOT NULL DEFAULT 0 AFTER raw_z,
  ADD COLUMN IF NOT EXISTS ts_dispositivo DATETIME(3) NULL AFTER `timestamp`;

ALTER TABLE mediciones
  MODIFY `bx`     FLOAT NULL,
  MODIFY `by`     FLOAT NULL,
  MODIFY `bz`     FLOAT NULL,
  MODIFY magnitud FLOAT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mediciones_sesion_seq ON mediciones(sesion_id, seq);

SELECT 'Migración 004 aplicada: dispositivos y mediciones.seq/raw/saturado/ts_dispositivo.' AS resultado;
