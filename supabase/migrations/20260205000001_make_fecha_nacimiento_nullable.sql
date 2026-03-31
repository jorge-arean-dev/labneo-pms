-- Migration: Make fecha_nacimiento nullable in pacientes table
-- Description: Changes fecha_nacimiento from NOT NULL to nullable to support
--              simplified patient creation with only DNI, nombre, apellido required
-- Date: 2026-02-05

-- Make fecha_nacimiento column nullable
ALTER TABLE public.pacientes
ALTER COLUMN fecha_nacimiento DROP NOT NULL;

-- Update column comment to reflect the change
COMMENT ON COLUMN public.pacientes.fecha_nacimiento IS 'Date of birth (optional)';
