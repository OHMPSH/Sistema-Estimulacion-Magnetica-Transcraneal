-- ═══════════════════════════════════════════════════════════════
-- 001_sesiones_hora_local_a_utc.sql
--
-- Las versiones anteriores guardaban sesiones.iniciada_en y
-- sesiones.terminada_en con NOW() en la hora local del servidor,
-- mientras que mediciones.timestamp ya se guardaba en UTC.
-- A partir de la versión con timezone 'Z', todo se guarda y se lee
-- en UTC. Este script pasa las sesiones antiguas a UTC.
--
-- Ejecutar UNA SOLA VEZ, ANTES de levantar el servidor nuevo:
--   sudo mysql tms_db < server/migrations/001_sesiones_hora_local_a_utc.sql
--
-- Desfase: la Ciudad de México está en UTC−6 todo el año desde
-- octubre de 2022 (se eliminó el horario de verano), por eso se
-- suman 6 horas. Si la Raspberry Pi estaba configurada en otra
-- zona horaria, cambia el 6 por la diferencia correcta.
-- Si tienes sesiones anteriores a octubre de 2022 con horario de
-- verano, esas tendrían 5 horas de diferencia.
--
-- Solo convierte sesiones creadas antes de la fecha de corte, para
-- no tocar las que ya se crearon en UTC si el script se repite.
-- Ajusta @corte a la fecha y hora (local) en que actualizaste el servidor.
-- ═══════════════════════════════════════════════════════════════

SET @desfase_horas = 6;
SET @corte = '2026-11-10 00:00:00';

UPDATE sesiones
   SET iniciada_en  = iniciada_en  + INTERVAL @desfase_horas HOUR,
       terminada_en = terminada_en + INTERVAL @desfase_horas HOUR
 WHERE iniciada_en < @corte;

SELECT ROW_COUNT() AS sesiones_convertidas;
