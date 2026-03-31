-- Migration: Create obras_sociales table
-- Description: Creates the obras_sociales (insurance providers) table
-- Date: 2025-11-14

-- Create obras_sociales table
CREATE TABLE IF NOT EXISTS public.obras_sociales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    codigo TEXT UNIQUE,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    sitio_web TEXT,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add comments to table
COMMENT ON TABLE public.obras_sociales IS 'Stores insurance provider information';

-- Add comments to columns
COMMENT ON COLUMN public.obras_sociales.id IS 'Primary key';
COMMENT ON COLUMN public.obras_sociales.nombre IS 'Insurance provider name (e.g., OSDE, Swiss Medical)';
COMMENT ON COLUMN public.obras_sociales.codigo IS 'Insurance provider code';
COMMENT ON COLUMN public.obras_sociales.telefono IS 'Insurance provider contact phone';
COMMENT ON COLUMN public.obras_sociales.email IS 'Insurance provider contact email';
COMMENT ON COLUMN public.obras_sociales.direccion IS 'Insurance provider address';
COMMENT ON COLUMN public.obras_sociales.sitio_web IS 'Insurance provider website';
COMMENT ON COLUMN public.obras_sociales.estado IS 'Insurance provider status (activa/inactiva)';
COMMENT ON COLUMN public.obras_sociales.notas IS 'Additional notes about the provider';
COMMENT ON COLUMN public.obras_sociales.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.obras_sociales.updated_at IS 'Record update timestamp';
COMMENT ON COLUMN public.obras_sociales.created_by IS 'User who created record';
COMMENT ON COLUMN public.obras_sociales.updated_by IS 'User who last updated record';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_obras_sociales_nombre ON public.obras_sociales(nombre);
CREATE INDEX IF NOT EXISTS idx_obras_sociales_codigo ON public.obras_sociales(codigo);
CREATE INDEX IF NOT EXISTS idx_obras_sociales_estado ON public.obras_sociales(estado);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_obras_sociales_updated_at
    BEFORE UPDATE ON public.obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;
