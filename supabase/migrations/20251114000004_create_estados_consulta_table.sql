-- Migration: Create estados_consulta table
-- Description: Creates the estados_consulta (consultation status) table with seed data
-- Date: 2025-11-14

-- Create estados_consulta table
CREATE TABLE IF NOT EXISTS public.estados_consulta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    es_estado_final BOOLEAN NOT NULL DEFAULT false,
    orden INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to table
COMMENT ON TABLE public.estados_consulta IS 'Stores available consultation statuses';

-- Add comments to columns
COMMENT ON COLUMN public.estados_consulta.id IS 'Primary key';
COMMENT ON COLUMN public.estados_consulta.codigo IS 'Unique status code (programada, en_curso, completada, cancelada, ausente)';
COMMENT ON COLUMN public.estados_consulta.nombre IS 'Display name for the status';
COMMENT ON COLUMN public.estados_consulta.descripcion IS 'Detailed description of the status';
COMMENT ON COLUMN public.estados_consulta.es_estado_final IS 'Indicates if this is a final state (cannot transition from it)';
COMMENT ON COLUMN public.estados_consulta.orden IS 'Sort order for UI display';
COMMENT ON COLUMN public.estados_consulta.activo IS 'Whether this status is currently active';
COMMENT ON COLUMN public.estados_consulta.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.estados_consulta.updated_at IS 'Record update timestamp';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_estados_consulta_codigo ON public.estados_consulta(codigo);
CREATE INDEX IF NOT EXISTS idx_estados_consulta_activo ON public.estados_consulta(activo);
CREATE INDEX IF NOT EXISTS idx_estados_consulta_orden ON public.estados_consulta(orden);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_estados_consulta_updated_at
    BEFORE UPDATE ON public.estados_consulta
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.estados_consulta ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read estados
CREATE POLICY "estados_consulta_select_all"
ON public.estados_consulta
FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Only Administrador can insert estados
CREATE POLICY "estados_consulta_insert_admin"
ON public.estados_consulta
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- RLS Policy: Only Administrador can update estados
CREATE POLICY "estados_consulta_update_admin"
ON public.estados_consulta
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- RLS Policy: Only Administrador can delete estados
CREATE POLICY "estados_consulta_delete_admin"
ON public.estados_consulta
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================================
-- SEED DATA: Insert initial consultation statuses
-- ============================================================================

INSERT INTO public.estados_consulta (codigo, nombre, descripcion, es_estado_final, orden) VALUES
('programada', 'Programada', 'Consulta agendada y pendiente de atención', false, 1),
('en_curso', 'En Curso', 'El médico está atendiendo al paciente', false, 2),
('completada', 'Completada', 'Consulta completada con registro médico guardado', true, 3),
('cancelada', 'Cancelada', 'Consulta cancelada con aviso previo', true, 4),
('ausente', 'Paciente Ausente', 'Paciente no se presentó a la consulta', true, 5);
