-- Migration: Create roles table
-- Description: Creates the roles table to store user role definitions
-- Date: 2025-11-13

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.roles IS 'Stores user role definitions for the PMS system';

-- Add comments to columns
COMMENT ON COLUMN public.roles.id IS 'Unique identifier for the role';
COMMENT ON COLUMN public.roles.nombre IS 'Role name (e.g., Recepcionista, Medico, Administrador)';
COMMENT ON COLUMN public.roles.descripcion IS 'Optional description of the role';
COMMENT ON COLUMN public.roles.created_at IS 'Timestamp when the role was created';

-- Create index on nombre for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_nombre ON public.roles(nombre);

-- Seed initial roles
INSERT INTO public.roles (nombre, descripcion) VALUES
    ('Recepcionista', 'Personal de recepción encargado de la gestión de pacientes y citas'),
    ('Medico', 'Médico dermatólogo con acceso a historiales médicos y consultas'),
    ('Administrador', 'Administrador del sistema con acceso completo a todas las funcionalidades')
ON CONFLICT (nombre) DO NOTHING;
