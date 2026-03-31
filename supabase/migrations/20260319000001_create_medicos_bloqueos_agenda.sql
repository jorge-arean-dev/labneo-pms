-- Migration: Create medicos_bloqueos_agenda table
-- Description: Creates the medicos_bloqueos_agenda (doctor blocked dates) table
-- for vacations, holidays, and other unavailability periods.
-- Date: 2026-03-19

-- Create medicos_bloqueos_agenda table
CREATE TABLE IF NOT EXISTS public.medicos_bloqueos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT,
    origen TEXT NOT NULL DEFAULT 'individual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT fecha_fin_gte_fecha_inicio CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT origen_valid CHECK (origen IN ('individual', 'general')),
    CONSTRAINT unique_medico_bloqueo UNIQUE (medico_id, fecha_inicio, fecha_fin)
);

-- Add comments
COMMENT ON TABLE public.medicos_bloqueos_agenda IS 'Doctor blocked dates for vacations, holidays, and other unavailability periods. Full-day blocks only.';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.id IS 'Primary key';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.medico_id IS 'Foreign key to medicos.id';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.fecha_inicio IS 'Block start date (YYYY-MM-DD)';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.fecha_fin IS 'Block end date (YYYY-MM-DD), must be >= fecha_inicio';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.motivo IS 'Optional reason for the block (e.g., Vacaciones, Feriado)';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.origen IS 'Block origin: individual (single doctor) or general (all doctors / clinic-wide)';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.created_by IS 'User who created record';
COMMENT ON COLUMN public.medicos_bloqueos_agenda.updated_by IS 'User who last updated record';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medicos_bloqueos_agenda_medico_id
    ON public.medicos_bloqueos_agenda(medico_id);
CREATE INDEX IF NOT EXISTS idx_medicos_bloqueos_agenda_fechas
    ON public.medicos_bloqueos_agenda(medico_id, fecha_inicio, fecha_fin);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_medicos_bloqueos_agenda_updated_at
    BEFORE UPDATE ON public.medicos_bloqueos_agenda
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply audit triggers
CREATE TRIGGER set_medicos_bloqueos_agenda_created_by
    BEFORE INSERT ON public.medicos_bloqueos_agenda
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_medicos_bloqueos_agenda_updated_by
    BEFORE UPDATE ON public.medicos_bloqueos_agenda
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Enable Row Level Security
ALTER TABLE public.medicos_bloqueos_agenda ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- READ: All authenticated users can read
CREATE POLICY "medicos_bloqueos_agenda_select_all"
ON public.medicos_bloqueos_agenda
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Admin, Recepcionista, or Medico (own data only)
CREATE POLICY "medicos_bloqueos_agenda_insert_all_roles"
ON public.medicos_bloqueos_agenda
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR public.is_recepcionista()
    OR (public.is_medico() AND medico_id = public.get_medico_id())
);

-- UPDATE: Admin, Recepcionista, or Medico (own data only)
CREATE POLICY "medicos_bloqueos_agenda_update_all_roles"
ON public.medicos_bloqueos_agenda
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.is_recepcionista()
    OR (public.is_medico() AND medico_id = public.get_medico_id())
)
WITH CHECK (
    public.is_admin()
    OR public.is_recepcionista()
    OR (public.is_medico() AND medico_id = public.get_medico_id())
);

-- DELETE: Admin, Recepcionista, or Medico (own data only)
CREATE POLICY "medicos_bloqueos_agenda_delete_all_roles"
ON public.medicos_bloqueos_agenda
FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR public.is_recepcionista()
    OR (public.is_medico() AND medico_id = public.get_medico_id())
);
