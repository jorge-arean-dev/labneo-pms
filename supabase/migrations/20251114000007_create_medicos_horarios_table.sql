-- Migration: Create medicos_horarios table
-- Description: Creates the medicos_horarios (doctor weekly schedules) table
-- Date: 2025-11-14

-- Create medicos_horarios table
CREATE TABLE IF NOT EXISTS public.medicos_horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
    duracion_consulta INTEGER NOT NULL DEFAULT 30 CHECK (duracion_consulta > 0),
    duracion_buffer INTEGER NOT NULL DEFAULT 5 CHECK (duracion_buffer >= 0),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.medicos_horarios IS 'Stores doctor weekly availability schedules';

-- Add comments to columns
COMMENT ON COLUMN public.medicos_horarios.id IS 'Primary key';
COMMENT ON COLUMN public.medicos_horarios.medico_id IS 'Foreign key to medicos.id';
COMMENT ON COLUMN public.medicos_horarios.dia_semana IS 'Day of week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)';
COMMENT ON COLUMN public.medicos_horarios.hora_inicio IS 'Start time (e.g., 10:00:00)';
COMMENT ON COLUMN public.medicos_horarios.hora_fin IS 'End time (e.g., 15:00:00)';
COMMENT ON COLUMN public.medicos_horarios.duracion_consulta IS 'Duration of appointment in minutes';
COMMENT ON COLUMN public.medicos_horarios.duracion_buffer IS 'Duration of buffer between appointments in minutes (can be 0)';
COMMENT ON COLUMN public.medicos_horarios.activo IS 'Whether this schedule is currently active';
COMMENT ON COLUMN public.medicos_horarios.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.medicos_horarios.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.medicos_horarios.created_by IS 'User who created record';
COMMENT ON COLUMN public.medicos_horarios.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medicos_horarios_medico_id ON public.medicos_horarios(medico_id);
CREATE INDEX IF NOT EXISTS idx_medicos_horarios_dia_semana ON public.medicos_horarios(dia_semana);
CREATE INDEX IF NOT EXISTS idx_medicos_horarios_activo ON public.medicos_horarios(activo);
CREATE INDEX IF NOT EXISTS idx_medicos_horarios_medico_dia ON public.medicos_horarios(medico_id, dia_semana);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_medicos_horarios_updated_at
    BEFORE UPDATE ON public.medicos_horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.medicos_horarios ENABLE ROW LEVEL SECURITY;
