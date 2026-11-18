-- ─────────────────────────────────────────────────────────────
-- Migración 009 — Punto de inicio de la medición (2026-11-13)
--
-- La mesa real no tiene finales de carrera: al encender está en su
-- posición de descanso X = 0, Y = 562, Z = 88 mm (coordenadas de
-- máquina; X es el eje corto de 410 mm, Y el largo de 562 mm) y vuelve
-- ahí al terminar. El «punto de inicio de la medición» dice dónde, en
-- esas coordenadas, está el punto (0, 0, 0) de la zona de cada sesión.
-- La Pico lo recibe en el latido (sesion_activa.inicio_medicion), va ahí
-- y desde ahí recorre la zona en X+, Y+ y Z+ (docs/firmware-pico-w.md, 1.3).
--
-- Hace dos cosas:
--   1. Clave nueva de configuración "general":
--        {"inicio_medicion": {"x_mm": 0, "y_mm": 0, "z_mm": 0}}   (el origen)
--      (si ya existe, no la toca).
--   2. Columna sesiones.config_general (JSON NULL): la copia de "general"
--      guardada al iniciar cada sesión, como config_barrido y config_sensor.
--      Las sesiones anteriores quedan con NULL: para ellas el latido no
--      manda inicio_medicion y la Pico usa su predeterminado.
--
-- NO cambia ningún dato guardado. Las lecturas siguen en coordenadas
-- de la zona: el punto de inicio no cambia la ingesta ni el CSV de datos.
--
-- Ejecutar como root, DESPUÉS de la 008:
--   sudo mysql tms_db < server/migrations/009_inicio_medicion.sql
-- Es idempotente: se puede ejecutar más de una vez.
-- ⚠ El servidor de esta versión necesita la columna: sin la migración
-- falla al iniciar, cerrar o exportar sesiones.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS config_general JSON NULL AFTER config_simulacion;

INSERT IGNORE INTO configuracion (clave, valor, actualizado_en) VALUES
  ('general', '{"inicio_medicion":{"x_mm":0,"y_mm":0,"z_mm":0}}', UTC_TIMESTAMP());

SELECT 'Migración 009 aplicada: clave "general" y columna sesiones.config_general.' AS resultado;
