-- Migration: Seed medicos_parametros_agenda for existing doctors
-- Description: Creates default scheduling parameters for all existing doctors
-- Date: 2025-12-12
-- Default values: duracion_consulta=30, duracion_buffer=0, max_consultas_concurrentes=1

-- Insert default parameters for all existing doctors that don't have parameters yet
-- This ensures every doctor has scheduling parameters available
INSERT INTO public.medicos_parametros_agenda (medico_id, duracion_consulta, duracion_buffer, max_consultas_concurrentes)
SELECT
    m.id AS medico_id,
    30 AS duracion_consulta,      -- 30 minutes per appointment
    0 AS duracion_buffer,         -- No buffer between appointments
    1 AS max_consultas_concurrentes  -- One appointment per slot
FROM public.medicos m
WHERE m.deleted_at IS NULL  -- Only active doctors
AND NOT EXISTS (
    -- Skip doctors that already have parameters
    SELECT 1
    FROM public.medicos_parametros_agenda mpa
    WHERE mpa.medico_id = m.id
);

-- Log how many records were inserted (visible in migration output)
DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO inserted_count
    FROM public.medicos_parametros_agenda;

    RAISE NOTICE 'Total medicos_parametros_agenda records: %', inserted_count;
END $$;
