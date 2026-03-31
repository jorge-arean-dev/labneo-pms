-- Migration: Drop deprecated fields from consultas table
-- Description: Removes unused fields (duracion_minutos, proxima_consulta, archivos_adjuntos) from consultas table
-- Date: 2025-11-18
-- Reason: These fields are deprecated and not used in the application

-- Drop the deprecated columns
ALTER TABLE public.consultas
  DROP COLUMN IF EXISTS duracion_minutos,
  DROP COLUMN IF EXISTS proxima_consulta,
  DROP COLUMN IF EXISTS archivos_adjuntos;

-- Add comment documenting the change
COMMENT ON TABLE public.consultas IS 'Stores appointments and medical consultations. Deprecated fields (duracion_minutos, proxima_consulta, archivos_adjuntos) removed on 2025-11-18.';
