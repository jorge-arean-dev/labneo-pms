-- Migration: Create medicos_obras_sociales table
-- Description: Creates the medicos_obras_sociales (doctor-insurance relationships) table
-- Date: 2025-11-14

-- Create medicos_obras_sociales table
CREATE TABLE IF NOT EXISTS public.medicos_obras_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
    obra_social_id UUID NOT NULL REFERENCES public.obras_sociales(id) ON DELETE CASCADE,
    porcentaje_cobertura NUMERIC(5,2) CHECK (porcentaje_cobertura >= 0 AND porcentaje_cobertura <= 100),
    copago NUMERIC(10,2) CHECK (copago >= 0),
    requiere_autorizacion BOOLEAN NOT NULL DEFAULT false,
    numero_convenio TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(medico_id, obra_social_id)
);

-- Add comments to table
COMMENT ON TABLE public.medicos_obras_sociales IS 'Stores doctor-insurance provider relationships and coverage terms';

-- Add comments to columns
COMMENT ON COLUMN public.medicos_obras_sociales.id IS 'Primary key';
COMMENT ON COLUMN public.medicos_obras_sociales.medico_id IS 'Foreign key to medicos.id';
COMMENT ON COLUMN public.medicos_obras_sociales.obra_social_id IS 'Foreign key to obras_sociales.id';
COMMENT ON COLUMN public.medicos_obras_sociales.porcentaje_cobertura IS 'Coverage percentage (e.g., 100%, 80%)';
COMMENT ON COLUMN public.medicos_obras_sociales.copago IS 'Patient copay amount';
COMMENT ON COLUMN public.medicos_obras_sociales.requiere_autorizacion IS 'Whether prior authorization is required';
COMMENT ON COLUMN public.medicos_obras_sociales.numero_convenio IS 'Agreement/contract number';
COMMENT ON COLUMN public.medicos_obras_sociales.fecha_inicio IS 'Agreement start date';
COMMENT ON COLUMN public.medicos_obras_sociales.fecha_fin IS 'Agreement end date (null if ongoing)';
COMMENT ON COLUMN public.medicos_obras_sociales.notas IS 'Special conditions or notes';
COMMENT ON COLUMN public.medicos_obras_sociales.estado IS 'Agreement status (activo/inactivo/suspendido)';
COMMENT ON COLUMN public.medicos_obras_sociales.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.medicos_obras_sociales.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.medicos_obras_sociales.created_by IS 'User who created record';
COMMENT ON COLUMN public.medicos_obras_sociales.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medicos_obras_sociales_medico_id ON public.medicos_obras_sociales(medico_id);
CREATE INDEX IF NOT EXISTS idx_medicos_obras_sociales_obra_social_id ON public.medicos_obras_sociales(obra_social_id);
CREATE INDEX IF NOT EXISTS idx_medicos_obras_sociales_estado ON public.medicos_obras_sociales(estado);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_medicos_obras_sociales_updated_at
    BEFORE UPDATE ON public.medicos_obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.medicos_obras_sociales ENABLE ROW LEVEL SECURITY;
