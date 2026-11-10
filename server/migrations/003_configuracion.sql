-- ═══════════════════════════════════════════════════════════════
-- Migración 003 — Configuración del sistema y parámetros de sesión (Fase 3)
--
-- Qué hace:
--   1. Crea la tabla `configuracion` (clave → valor JSON) con los
--      valores por defecto de CLAUDE.md 7.2.
--   2. Agrega a `sesiones`:
--        origen   'sim' (simulador del servidor) o 'hw' (Pico W)
--        paso_mm  5, 10 o 20: paso de la malla en X, Y y Z (CLAUDE.md 7.0)
--        medio    'campo_magnetico' o 'solucion_salina'
--      Las sesiones existentes quedan como simuladas, de 5 mm y de
--      campo magnético, que es como se midieron.
--   3. Índices para los filtros del historial.
--
-- No modifica ninguna medición.
--
-- Cómo ejecutarla (una sola vez, como root):
--
--   sudo mysql tms_db < server/migrations/003_configuracion.sql
--
-- En una instalación limpia NO hace falta: setup_db.sql ya lo incluye.
-- Si se ejecuta dos veces, las columnas y la tabla no se duplican
-- (IF NOT EXISTS) y los valores de configuración ya guardados no se
-- sobrescriben (INSERT IGNORE).
-- ═══════════════════════════════════════════════════════════════

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

-- ─────────────────────────────────────────────────────────────
-- SESIONES: origen, paso y medio
-- ─────────────────────────────────────────────────────────────
ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS origen  ENUM('sim','hw') NOT NULL DEFAULT 'sim' AFTER modo,
  ADD COLUMN IF NOT EXISTS paso_mm TINYINT UNSIGNED NOT NULL DEFAULT 5 AFTER origen,
  ADD COLUMN IF NOT EXISTS medio   ENUM('campo_magnetico','solucion_salina') NOT NULL DEFAULT 'campo_magnetico' AFTER paso_mm;

CREATE INDEX IF NOT EXISTS idx_sesiones_iniciada ON sesiones(iniciada_en);
CREATE INDEX IF NOT EXISTS idx_sesiones_filtros  ON sesiones(modo, paso_mm, medio, origen);

SELECT 'Migración 003 aplicada: configuracion, sesiones.origen, paso_mm y medio.' AS resultado;
