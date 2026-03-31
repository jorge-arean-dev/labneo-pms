-- Migration: Drop deprecated fields from medicos_horarios
-- Description: Removes duracion_consulta and duracion_buffer columns from medicos_horarios
-- Date: 2025-12-12
-- Reason: These fields have been moved to the new medicos_parametros_agenda table
--         which provides a 1:1 relationship with medicos instead of per-schedule settings

-- Drop duracion_consulta column
ALTER TABLE public.medicos_horarios
DROP COLUMN IF EXISTS duracion_consulta;

-- Drop duracion_buffer column
ALTER TABLE public.medicos_horarios
DROP COLUMN IF EXISTS duracion_buffer;

-- Update table comment to reflect the change
COMMENT ON TABLE public.medicos_horarios IS 'Stores doctor weekly availability schedules (time blocks only). Scheduling parameters (duration, buffer, max concurrent) are now in medicos_parametros_agenda table.';
