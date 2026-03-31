-- Migration: Rename notas_privadas to notas in consultas table
-- Description: Renames the notas_privadas column to notas for simplicity
-- Date: 2025-11-15

-- Rename the column
ALTER TABLE public.consultas
RENAME COLUMN notas_privadas TO notas;

-- Update column comment
COMMENT ON COLUMN public.consultas.notas IS 'Notes about the consultation';
