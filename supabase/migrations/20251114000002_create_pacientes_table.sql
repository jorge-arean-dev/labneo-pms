-- Migration: Create pacientes table
-- Description: Creates the pacientes (patients) table
-- Date: 2025-11-14

-- Create pacientes table
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero TEXT CHECK (genero IN ('M', 'F', 'Otro')),
    telefono TEXT,
    email TEXT,
    domicilio TEXT,
    obra_social_id UUID REFERENCES public.obras_sociales(id) ON DELETE SET NULL,
    plan TEXT,
    numero_afiliado TEXT,
    foto_perfil_url TEXT,
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    consentimiento_datos BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.pacientes IS 'Stores patient information and demographics';

-- Add comments to columns
COMMENT ON COLUMN public.pacientes.id IS 'Primary key';
COMMENT ON COLUMN public.pacientes.dni IS 'Patient national ID (DNI)';
COMMENT ON COLUMN public.pacientes.nombre IS 'Patient first name';
COMMENT ON COLUMN public.pacientes.apellido IS 'Patient last name';
COMMENT ON COLUMN public.pacientes.fecha_nacimiento IS 'Date of birth';
COMMENT ON COLUMN public.pacientes.genero IS 'Gender (M, F, Otro)';
COMMENT ON COLUMN public.pacientes.telefono IS 'Phone number';
COMMENT ON COLUMN public.pacientes.email IS 'Email address';
COMMENT ON COLUMN public.pacientes.domicilio IS 'Home address';
COMMENT ON COLUMN public.pacientes.obra_social_id IS 'Foreign key to obras_sociales.id';
COMMENT ON COLUMN public.pacientes.plan IS 'Insurance plan name';
COMMENT ON COLUMN public.pacientes.numero_afiliado IS 'Insurance member number';
COMMENT ON COLUMN public.pacientes.foto_perfil_url IS 'Profile photo URL - points to storage bucket';
COMMENT ON COLUMN public.pacientes.notas IS 'General notes about patient';
COMMENT ON COLUMN public.pacientes.estado IS 'Patient status (activo/inactivo)';
COMMENT ON COLUMN public.pacientes.consentimiento_datos IS 'Data privacy consent';
COMMENT ON COLUMN public.pacientes.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.pacientes.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.pacientes.created_by IS 'User who created record';
COMMENT ON COLUMN public.pacientes.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pacientes_dni ON public.pacientes(dni);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre_apellido ON public.pacientes(nombre, apellido);
CREATE INDEX IF NOT EXISTS idx_pacientes_email ON public.pacientes(email);
CREATE INDEX IF NOT EXISTS idx_pacientes_obra_social_id ON public.pacientes(obra_social_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON public.pacientes(estado);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefono ON public.pacientes(telefono);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
