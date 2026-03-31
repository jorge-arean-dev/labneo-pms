-- Migration: Create RLS helper functions
-- Description: Creates helper functions to avoid RLS infinite recursion and improve performance
-- Date: 2025-11-14

-- Function to get the current user's role
-- Uses SECURITY DEFINER to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT r.nombre
  FROM public.usuarios_pms u
  JOIN public.roles r ON u.rol_id = r.id
  WHERE u.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role name (Recepcionista, Medico, Administrador) for the current authenticated user. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Function to get the medico.id for the current user (if they are a doctor)
-- Returns NULL if the user is not a doctor
CREATE OR REPLACE FUNCTION public.get_medico_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT id
  FROM public.medicos
  WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_medico_id() IS 'Returns the medico.id for the current authenticated user if they are a doctor, NULL otherwise. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Function to check if current user is an Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Administrador'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current authenticated user has the Administrador role. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Function to check if current user is a Medico
CREATE OR REPLACE FUNCTION public.is_medico()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Medico'
  );
$$;

COMMENT ON FUNCTION public.is_medico() IS 'Returns true if the current authenticated user has the Medico role. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Function to check if current user is a Recepcionista
CREATE OR REPLACE FUNCTION public.is_recepcionista()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Recepcionista'
  );
$$;

COMMENT ON FUNCTION public.is_recepcionista() IS 'Returns true if the current authenticated user has the Recepcionista role. Uses SECURITY DEFINER to avoid RLS recursion.';
