-- ─────────────────────────────────────────────────────────────
-- Migración 008 — El sensor real es un QMC5883P
--
-- El módulo magnético no es un HMC5883L: es un QMC5883P (I2C 0x2C,
-- cuentas de 16 bits con signo, rangos de 2, 8, 12 y 30 G con 15000,
-- 3750, 2500 y 1000 cuentas por gauss; la saturación llega como un bit
-- OVFL). El servidor entiende los dos modelos según sensor.modelo
-- (ver docs/sensor-qmc5883p.md, sección 6).
--
-- Esta migración solo cambia el valor de configuracion.sensor:
--   {modelo:'HMC5883L', rango_ga, lsb_por_ga, lecturas_por_punto, offset_ut}
--   → {modelo:'QMC5883P', rango_g: 30, cuentas_por_g: 1000, lecturas_por_punto, offset_ut}
-- Se conservan lecturas_por_punto y offset_ut. NO cambia ninguna tabla
-- ni ningún dato guardado: las sesiones viejas conservan su copia de
-- config_sensor del HMC5883L y sus µT ya calculados (raw_* ya es
-- SMALLINT, que cubre las cuentas de 16 bits del QMC5883P).
--
-- ⚠ El firmware del Hall 49E (firmware_hall_1d/) manda «cuentas HMC»:
-- para usarlo, pon antes el modelo HMC5883L en Configuración › Sensor.
--
-- Ejecutar como root, DESPUÉS de la 007:
--   sudo mysql tms_db < server/migrations/008_sensor_qmc5883p.sql
-- Es idempotente: si el modelo ya es QMC5883P, no cambia nada.
-- Sin esta migración el sistema sigue funcionando con el HMC5883L.
-- ─────────────────────────────────────────────────────────────

UPDATE configuracion
   SET valor = JSON_REMOVE(
         JSON_SET(valor,
           '$.modelo',        'QMC5883P',
           '$.rango_g',       30,
           '$.cuentas_por_g', 1000),
         '$.rango_ga', '$.lsb_por_ga'),
       actualizado_en = UTC_TIMESTAMP()
 WHERE clave = 'sensor'
   AND COALESCE(JSON_VALUE(valor, '$.modelo'), '') <> 'QMC5883P';

SELECT 'Migración 008 aplicada: el sensor configurado es el QMC5883P (30 G).' AS resultado;
