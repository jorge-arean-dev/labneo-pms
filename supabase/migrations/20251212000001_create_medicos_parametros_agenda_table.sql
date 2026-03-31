-- Migration: Create medicos_parametros_agenda table
-- Description: Creates the medicos_parametros_agenda (doctor scheduling parameters) table
-- Date: 2025-12-12
-- Purpose: Store scheduling parameters per doctor (1:1 relationship with medicos)
--          - duracion_consulta: Duration of each appointment in minutes
--          - duracion_buffer: Buffer time after each appointment in minutes
--          - max_consultas_concurrentes: Maximum concurrent appointments per time slot

-- Create medicos_parametros_agenda table
CREATE TABLE IF NOT EXISTS public.medicos_parametros_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL UNIQUE REFERENCES public.medicos(id) ON DELETE CASCADE,
    duracion_consulta INTEGER NOT NULL DEFAULT 30 CHECK (duracion_consulta > 0),
    duracion_buffer INTEGER NOT NULL DEFAULT 0 CHECK (duracion_buffer >= 0),
    max_consultas_concurrentes INTEGER NOT NULL DEFAULT 1 CHECK (max_consultas_concurrentes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.medicos_parametros_agenda IS 'Stores scheduling parameters for each doctor (1:1 relationship with medicos)';

-- Add comments to columns
COMMENT ON COLUMN public.medicos_parametros_agenda.id IS 'Primary key';
COMMENT ON COLUMN public.medicos_parametros_agenda.medico_id IS 'Foreign key to medicos.id (unique constraint enforces 1:1)';
COMMENT ON COLUMN public.medicos_parametros_agenda.duracion_consulta IS 'Duration of each appointment in minutes (must be > 0)';
COMMENT ON COLUMN public.medicos_parametros_agenda.duracion_buffer IS 'Buffer time after each appointment in minutes (can be 0)';
COMMENT ON COLUMN public.medicos_parametros_agenda.max_consultas_concurrentes IS 'Maximum concurrent appointments allowed per time slot (must be > 0)';
COMMENT ON COLUMN public.medicos_parametros_agenda.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.medicos_parametros_agenda.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.medicos_parametros_agenda.created_by IS 'User who created record';
COMMENT ON COLUMN public.medicos_parametros_agenda.updated_by IS 'User who last updated record';

-- Create index for better query performance (medico_id already has unique index)
CREATE INDEX IF NOT EXISTS idx_medicos_parametros_agenda_medico_id
ON public.medicos_parametros_agenda(medico_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_medicos_parametros_agenda_updated_at
    BEFORE UPDATE ON public.medicos_parametros_agenda
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.medicos_parametros_agenda ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- READ: All authenticated users can read (needed for appointment scheduling)
CREATE POLICY "medicos_parametros_agenda_select_all"
ON public.medicos_parametros_agenda
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_parametros_agenda_insert_own_or_admin"
ON public.medicos_parametros_agenda
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin() OR
    (public.is_medico() AND medico_id = public.get_medico_id())
);

-- UPDATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_parametros_agenda_update_own_or_admin"
ON public.medicos_parametros_agenda
FOR UPDATE
TO authenticated
USING (
    public.is_admin() OR
    (public.is_medico() AND medico_id = public.get_medico_id())
)
WITH CHECK (
    public.is_admin() OR
    (public.is_medico() AND medico_id = public.get_medico_id())
);

-- DELETE: Only Administrador (should rarely be needed due to CASCADE)
CREATE POLICY "medicos_parametros_agenda_delete_admin"
ON public.medicos_parametros_agenda
FOR DELETE
TO authenticated
USING (public.is_admin());
