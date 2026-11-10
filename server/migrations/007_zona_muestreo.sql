-- ─────────────────────────────────────────────────────────────
-- Migración 007 — Zona de muestreo por sesión y límites de la base
--
-- Antes la zona era siempre toda la placa (grid_size_mm × grid_size_mm,
-- y z de 0 a z_max_mm). Ahora el operador elige al iniciar cada sesión
-- el tamaño de la zona en X, Y y Z, sin pasar de los LÍMITES de la base
-- que fija un admin en Configuración › Barrido.
--
--   sesiones   + zona_x_mm, zona_y_mm, zona_z_mm  DECIMAL(5,1) UNSIGNED
--              (las sesiones existentes quedan con toda la placa de la
--               copia de configuración que se guardó con ellas, o 60 × 60 × 20)
--   configuracion 'barrido':
--              {grid_size_mm, z_max_mm, …} → {limite_x_mm, limite_y_mm, limite_z_mm, …}
--
-- Ejecutar como root, DESPUÉS de la 006:
--   sudo mysql tms_db < server/migrations/007_zona_muestreo.sql
-- Es idempotente: volver a ejecutarla no cambia nada.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS zona_x_mm DECIMAL(5,1) UNSIGNED NULL AFTER medio,
  ADD COLUMN IF NOT EXISTS zona_y_mm DECIMAL(5,1) UNSIGNED NULL AFTER zona_x_mm,
  ADD COLUMN IF NOT EXISTS zona_z_mm DECIMAL(5,1) UNSIGNED NULL AFTER zona_y_mm;

-- Sesiones existentes: toda la placa con la que se midieron
UPDATE sesiones
   SET zona_x_mm = COALESCE(JSON_VALUE(config_barrido, '$.grid_size_mm'), JSON_VALUE(config_barrido, '$.limite_x_mm'), 60),
       zona_y_mm = COALESCE(JSON_VALUE(config_barrido, '$.grid_size_mm'), JSON_VALUE(config_barrido, '$.limite_y_mm'), 60),
       zona_z_mm = COALESCE(JSON_VALUE(config_barrido, '$.z_max_mm'),     JSON_VALUE(config_barrido, '$.limite_z_mm'), 20)
 WHERE zona_x_mm IS NULL;

ALTER TABLE sesiones
  MODIFY COLUMN zona_x_mm DECIMAL(5,1) UNSIGNED NOT NULL,
  MODIFY COLUMN zona_y_mm DECIMAL(5,1) UNSIGNED NOT NULL,
  MODIFY COLUMN zona_z_mm DECIMAL(5,1) UNSIGNED NOT NULL;

-- Configuración: la placa cuadrada pasa a límites por eje
UPDATE configuracion
   SET valor = JSON_REMOVE(
         JSON_SET(valor,
           '$.limite_x_mm', JSON_EXTRACT(valor, '$.grid_size_mm'),
           '$.limite_y_mm', JSON_EXTRACT(valor, '$.grid_size_mm'),
           '$.limite_z_mm', JSON_EXTRACT(valor, '$.z_max_mm')),
         '$.grid_size_mm', '$.z_max_mm'),
       actualizado_en = UTC_TIMESTAMP()
 WHERE clave = 'barrido' AND JSON_EXISTS(valor, '$.grid_size_mm');

SELECT 'Migración 007 aplicada: zona de muestreo por sesión y límites de la base en la configuración.' AS resultado;
