-- Migration: Create consultas table
-- Description: Creates the consultas (appointments/consultations) table
-- Date: 2025-11-14

-- Create helper function to get default estado_id
CREATE OR REPLACE FUNCTION public.get_default_estado_programada()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM public.estados_consulta WHERE codigo = 'programada' LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_default_estado_programada() IS 'Returns the UUID of the "programada" status for default value in consultas table';

-- Create consultas table
CREATE TABLE IF NOT EXISTS public.consultas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMPTZ NOT NULL,
    duracion_minutos INTEGER DEFAULT 30,
    motivo TEXT,
    estado_id UUID NOT NULL REFERENCES public.estados_consulta(id) ON DELETE RESTRICT DEFAULT public.get_default_estado_programada(),
    tipo_consulta TEXT CHECK (tipo_consulta IN ('primera_vez', 'control', 'urgencia')),
    informe TEXT,
    diagnostico TEXT,
    tratamiento TEXT,
    receta TEXT,
    proxima_consulta DATE,
    archivos_adjuntos JSONB DEFAULT '[]',
    notas_privadas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.consultas IS 'Stores appointments and medical consultations';

-- Add comments to columns
COMMENT ON COLUMN public.consultas.id IS 'Primary key';
COMMENT ON COLUMN public.consultas.paciente_id IS 'Foreign key to pacientes.id';
COMMENT ON COLUMN public.consultas.medico_id IS 'Foreign key to medicos.id';
COMMENT ON COLUMN public.consultas.fecha_hora IS 'Appointment date and time';
COMMENT ON COLUMN public.consultas.duracion_minutos IS 'Appointment duration in minutes';
COMMENT ON COLUMN public.consultas.motivo IS 'Reason for consultation';
COMMENT ON COLUMN public.consultas.estado_id IS 'Foreign key to estados_consulta.id - Appointment status';
COMMENT ON COLUMN public.consultas.tipo_consulta IS 'Type of consultation (primera_vez, control, urgencia)';
COMMENT ON COLUMN public.consultas.informe IS 'Medical report written by doctor';
COMMENT ON COLUMN public.consultas.diagnostico IS 'Diagnosis';
COMMENT ON COLUMN public.consultas.tratamiento IS 'Treatment plan';
COMMENT ON COLUMN public.consultas.receta IS 'Prescription details';
COMMENT ON COLUMN public.consultas.proxima_consulta IS 'Next recommended appointment date';
COMMENT ON COLUMN public.consultas.archivos_adjuntos IS 'URLs to photos/documents (JSONB array, important for dermatology)';
COMMENT ON COLUMN public.consultas.notas_privadas IS 'Private notes (not shown to patient)';
COMMENT ON COLUMN public.consultas.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.consultas.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.consultas.created_by IS 'User who created record';
COMMENT ON COLUMN public.consultas.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultas_paciente_id ON public.consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_medico_id ON public.consultas(medico_id);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha_hora ON public.consultas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_consultas_estado_id ON public.consultas(estado_id);
CREATE INDEX IF NOT EXISTS idx_consultas_tipo_consulta ON public.consultas(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_consultas_medico_fecha ON public.consultas(medico_id, fecha_hora);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_consultas_updated_at
    BEFORE UPDATE ON public.consultas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
