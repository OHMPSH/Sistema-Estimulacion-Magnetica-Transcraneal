-- ─────────────────────────────────────────────────────────────
-- Migración 006 — Paso de medición libre (en mm, con un decimal)
--
-- Antes el paso solo podía ser 5, 10 o 20 mm (TINYINT). Ahora el
-- operador escribe el paso del experimento (de 1 mm en adelante, con
-- hasta un decimal, p. ej. 2.5 o 7); 5, 10 y 20 mm quedan solo como
-- sugerencias en la interfaz.
--
--   sesiones.paso_mm  TINYINT UNSIGNED → DECIMAL(4,1) UNSIGNED
--
-- Los valores existentes (5, 10, 20) se conservan tal cual. El índice
-- idx_sesiones_filtros sigue sirviendo para filtrar por paso.
--
-- Ejecutar como root (el usuario de la aplicación no tiene ALTER):
--   sudo mysql tms_db < server/migrations/006_paso_libre.sql
-- Es idempotente: volver a ejecutarla no cambia nada.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sesiones
  MODIFY COLUMN paso_mm DECIMAL(4,1) UNSIGNED NOT NULL DEFAULT 5.0;

SELECT 'Migración 006 aplicada: sesiones.paso_mm acepta cualquier paso en mm con un decimal.' AS resultado;
