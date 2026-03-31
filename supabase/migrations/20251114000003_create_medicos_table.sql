-- Migration: Create medicos table
-- Description: Creates the medicos (doctors) table
-- Date: 2025-11-14

-- Create medicos table
CREATE TABLE IF NOT EXISTS public.medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    matricula TEXT UNIQUE NOT NULL,
    user_id UUID UNIQUE REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.medicos IS 'Stores doctor profiles and credentials';

-- Add comments to columns
COMMENT ON COLUMN public.medicos.id IS 'Primary key';
COMMENT ON COLUMN public.medicos.nombre IS 'Doctor first name';
COMMENT ON COLUMN public.medicos.apellido IS 'Doctor last name';
COMMENT ON COLUMN public.medicos.email IS 'Doctor email';
COMMENT ON COLUMN public.medicos.telefono IS 'Doctor phone number';
COMMENT ON COLUMN public.medicos.matricula IS 'Medical license number';
COMMENT ON COLUMN public.medicos.user_id IS 'Link to authentication user (auth.users)';
COMMENT ON COLUMN public.medicos.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.medicos.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.medicos.created_by IS 'User who created record';
COMMENT ON COLUMN public.medicos.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medicos_email ON public.medicos(email);
CREATE INDEX IF NOT EXISTS idx_medicos_matricula ON public.medicos(matricula);
CREATE INDEX IF NOT EXISTS idx_medicos_user_id ON public.medicos(user_id);
CREATE INDEX IF NOT EXISTS idx_medicos_nombre_apellido ON public.medicos(nombre, apellido);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_medicos_updated_at
    BEFORE UPDATE ON public.medicos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
