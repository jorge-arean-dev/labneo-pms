-- Migration: Create usuarios_pms table
-- Description: Creates the usuarios_pms table to store extended user data
-- Date: 2025-11-13

-- Create usuarios_pms table
CREATE TABLE IF NOT EXISTS public.usuarios_pms (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT NOT NULL,
    rol_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    foto_perfil_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.usuarios_pms IS 'Stores extended user profile data for PMS users';

-- Add comments to columns
COMMENT ON COLUMN public.usuarios_pms.id IS 'References auth.users.id - ensures 1:1 relationship';
COMMENT ON COLUMN public.usuarios_pms.nombre IS 'User first name';
COMMENT ON COLUMN public.usuarios_pms.apellido IS 'User last name';
COMMENT ON COLUMN public.usuarios_pms.email IS 'User email (synced from auth.users)';
COMMENT ON COLUMN public.usuarios_pms.rol_id IS 'Foreign key to roles table';
COMMENT ON COLUMN public.usuarios_pms.foto_perfil_url IS 'URL to user profile photo (optional)';
COMMENT ON COLUMN public.usuarios_pms.created_at IS 'Timestamp when the user profile was created';
COMMENT ON COLUMN public.usuarios_pms.updated_at IS 'Timestamp when the user profile was last updated';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_pms_rol_id ON public.usuarios_pms(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_pms_email ON public.usuarios_pms(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_pms_nombre_apellido ON public.usuarios_pms(nombre, apellido);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_usuarios_pms_updated_at
    BEFORE UPDATE ON public.usuarios_pms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
