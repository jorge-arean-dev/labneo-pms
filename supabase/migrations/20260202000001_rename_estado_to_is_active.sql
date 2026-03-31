-- Migration: Rename estado columns to is_active (boolean)
-- Description: Standardizes estado TEXT columns to is_active BOOLEAN across 3 tables
-- Tables affected: obras_sociales, pacientes, medicos_obras_sociales
-- Date: 2026-02-02

-- ============================================================================
-- OBRAS_SOCIALES
-- ============================================================================

-- 1. Add new column
ALTER TABLE public.obras_sociales ADD COLUMN is_active BOOLEAN;

-- 2. Migrate data (activa → true, inactiva → false)
UPDATE public.obras_sociales SET is_active = (estado = 'activa');

-- 3. Set NOT NULL and default
ALTER TABLE public.obras_sociales
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;

-- 4. Drop old index
DROP INDEX IF EXISTS idx_obras_sociales_estado;

-- 5. Create new index
CREATE INDEX idx_obras_sociales_is_active ON public.obras_sociales(is_active);

-- 6. Drop old column and constraint
ALTER TABLE public.obras_sociales DROP COLUMN estado;

-- ============================================================================
-- PACIENTES
-- ============================================================================

-- 1. Add new column
ALTER TABLE public.pacientes ADD COLUMN is_active BOOLEAN;

-- 2. Migrate data (activo → true, inactivo → false)
UPDATE public.pacientes SET is_active = (estado = 'activo');

-- 3. Set NOT NULL and default
ALTER TABLE public.pacientes
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;

-- 4. Drop old index
DROP INDEX IF EXISTS idx_pacientes_estado;

-- 5. Create new index
CREATE INDEX idx_pacientes_is_active ON public.pacientes(is_active);

-- 6. Drop old column and constraint
ALTER TABLE public.pacientes DROP COLUMN estado;

-- ============================================================================
-- MEDICOS_OBRAS_SOCIALES
-- ============================================================================

-- 1. Add new column
ALTER TABLE public.medicos_obras_sociales ADD COLUMN is_active BOOLEAN;

-- 2. Migrate data (activo → true, inactivo/suspendido → false)
UPDATE public.medicos_obras_sociales SET is_active = (estado = 'activo');

-- 3. Set NOT NULL and default
ALTER TABLE public.medicos_obras_sociales
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;

-- 4. Drop old index
DROP INDEX IF EXISTS idx_medicos_obras_sociales_estado;

-- 5. Create new index
CREATE INDEX idx_medicos_obras_sociales_is_active ON public.medicos_obras_sociales(is_active);

-- 6. Drop old column and constraint
ALTER TABLE public.medicos_obras_sociales DROP COLUMN estado;

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.obras_sociales.is_active IS 'Whether the insurance provider is active (true) or inactive (false)';
COMMENT ON COLUMN public.pacientes.is_active IS 'Whether the patient is active (true) or inactive (false)';
COMMENT ON COLUMN public.medicos_obras_sociales.is_active IS 'Whether the doctor-insurance agreement is active (true) or inactive (false)';
