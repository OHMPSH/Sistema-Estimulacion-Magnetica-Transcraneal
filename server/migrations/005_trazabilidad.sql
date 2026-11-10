-- ═══════════════════════════════════════════════════════════════
-- Migración 005 — Datos y trazabilidad (Fase 5)
--
-- Qué hace:
--   1. En `mediciones`, x_mm, y_mm, z_mm, bx, by, bz y magnitud pasan de
--      FLOAT (float32) a DOUBLE.
--      ⚠ Los valores YA guardados conservan su error de float32: 2.341
--        guardado como FLOAT se lee como 2.3410000801086426 también en
--        DOUBLE, porque el dato original ya se perdió al guardarlo. Solo
--        las sesiones nuevas quedan sin ese artefacto.
--      El índice (sesion_id, seq) ya existe: es el UNIQUE de la 004
--      (uq_mediciones_sesion_seq), que sirve también para ordenar el CSV.
--   2. En `sesiones` agrega los metadatos de reproducibilidad:
--        usuario_id        quién la inició (NULL en las antiguas)
--        notas             texto libre (máx. 5000, lo valida la API)
--        puntos_esperados  grid_n² × planos, según el paso
--        puntos_recibidos  filas guardadas al cerrar
--        huecos            {"total": n, "posiciones": [{xMM,yMM,zMM}…]} (hasta 1000)
--        config_barrido / config_sensor / config_simulacion  copias de la
--                          configuración vigente al iniciar (incluida la semilla)
--        version_software  versión de server/package.json + commit de git
--        version_firmware  firmware de la Pico en modo real
--        eliminada_en      borrado lógico (NULL = visible)
--   3. Rellena puntos_esperados y puntos_recibidos de las sesiones
--      cerradas que ya existían (huecos queda NULL: no se calcularon).
--
-- Cómo ejecutarla (una sola vez, como root):
--
--   sudo mysql tms_db < server/migrations/005_trazabilidad.sql
--
-- En una instalación limpia NO hace falta: setup_db.sql ya lo incluye.
-- Se puede ejecutar dos veces sin duplicar nada.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- MEDICIONES: FLOAT → DOUBLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE mediciones
  MODIFY x_mm     DOUBLE NOT NULL,
  MODIFY y_mm     DOUBLE NOT NULL,
  MODIFY z_mm     DOUBLE NOT NULL,
  MODIFY `bx`     DOUBLE NULL,
  MODIFY `by`     DOUBLE NULL,
  MODIFY `bz`     DOUBLE NULL,
  MODIFY magnitud DOUBLE NULL;

-- ─────────────────────────────────────────────────────────────
-- SESIONES: metadatos de reproducibilidad y borrado lógico
-- ─────────────────────────────────────────────────────────────
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS usuario_id        INT          NULL AFTER id,
  ADD COLUMN IF NOT EXISTS notas             TEXT         NULL,
  ADD COLUMN IF NOT EXISTS puntos_esperados  INT          NULL,
  ADD COLUMN IF NOT EXISTS puntos_recibidos  INT          NULL,
  ADD COLUMN IF NOT EXISTS huecos            JSON         NULL,
  ADD COLUMN IF NOT EXISTS config_barrido    JSON         NULL,
  ADD COLUMN IF NOT EXISTS config_sensor     JSON         NULL,
  ADD COLUMN IF NOT EXISTS config_simulacion JSON         NULL,
  ADD COLUMN IF NOT EXISTS version_software  VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS version_firmware  VARCHAR(40)  NULL,
  ADD COLUMN IF NOT EXISTS eliminada_en      DATETIME     NULL;

-- La llave foránea se crea solo si no existe (MariaDB no tiene
-- ADD CONSTRAINT IF NOT EXISTS para llaves foráneas en todas las versiones)
SET @existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                 WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sesiones'
                   AND CONSTRAINT_NAME = 'fk_sesiones_usuario');
SET @sql := IF(@existe = 0,
  'ALTER TABLE sesiones ADD CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT ''fk_sesiones_usuario ya existía'' AS aviso');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

CREATE INDEX IF NOT EXISTS idx_sesiones_eliminada ON sesiones(eliminada_en);

-- ─────────────────────────────────────────────────────────────
-- Sesiones antiguas: puntos esperados (placa de 60 mm, z_max de 20 mm)
-- y recibidos
-- ─────────────────────────────────────────────────────────────
UPDATE sesiones
   SET puntos_esperados = POW(60 DIV paso_mm + 1, 2) * (20 DIV paso_mm + 1)
 WHERE puntos_esperados IS NULL;

UPDATE sesiones s
   SET s.puntos_recibidos = (SELECT COUNT(*) FROM mediciones m WHERE m.sesion_id = s.id)
 WHERE s.puntos_recibidos IS NULL AND s.terminada_en IS NOT NULL;

SELECT 'Migración 005 aplicada: DOUBLE en mediciones y metadatos de trazabilidad en sesiones.' AS resultado;
