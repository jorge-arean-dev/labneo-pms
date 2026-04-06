-- ============================================================================
-- Portal Labneo — New roles and domain tables
-- ============================================================================

-- 1. Update roles for Labneo
-- Insert new roles first
INSERT INTO roles (nombre) VALUES
  ('Administracion'),
  ('Odontologo')
ON CONFLICT (nombre) DO NOTHING;

-- Migrate existing users from old roles to new roles
UPDATE usuarios_pms
  SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administracion')
  WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'Administrador');

UPDATE usuarios_pms
  SET rol_id = (SELECT id FROM roles WHERE nombre = 'Odontologo')
  WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'Recepcionista');

-- Now safe to delete old roles (no FK references)
DELETE FROM roles WHERE nombre IN ('Recepcionista', 'Medico', 'Administrador');

-- 2. Update RLS helper functions for new roles
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT r.nombre
  FROM public.roles r
  JOIN public.usuarios_pms u ON u.rol_id = r.id
  WHERE u.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.get_user_role() = 'Administracion'
$$;

CREATE OR REPLACE FUNCTION public.is_odontologo()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.get_user_role() = 'Odontologo'
$$;

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.is_medico();
DROP FUNCTION IF EXISTS public.is_recepcionista();

-- ============================================================================
-- 3. Create new domain tables
-- ============================================================================

-- SOLICITUDES — Dentist onboarding requests
CREATE TABLE IF NOT EXISTS public.solicitudes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  odontologo_id uuid NOT NULL REFERENCES auth.users(id),
  nombre text NOT NULL,
  apellido text NOT NULL,
  localidad text NOT NULL,
  telefono text NOT NULL,
  horarios_atencion text NOT NULL,
  cuit_iva text NOT NULL,
  email text NOT NULL,
  tipo_servicio text[] DEFAULT NULL,
  estado text NOT NULL DEFAULT 'enviada'
    CHECK (estado IN ('enviada', 'en_proceso', 'alta_generada')),
  notas_admin text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- Odontólogos can read their own solicitudes
CREATE POLICY "odontologo_read_own_solicitudes" ON public.solicitudes
  FOR SELECT USING (
    auth.uid() = odontologo_id
    OR public.is_admin()
  );

-- Odontólogos can create solicitudes
CREATE POLICY "odontologo_create_solicitudes" ON public.solicitudes
  FOR INSERT WITH CHECK (
    auth.uid() = odontologo_id
  );

-- Admin can update solicitudes (change estado, add notas)
CREATE POLICY "admin_update_solicitudes" ON public.solicitudes
  FOR UPDATE USING (public.is_admin());

-- Admin can delete solicitudes
CREATE POLICY "admin_delete_solicitudes" ON public.solicitudes
  FOR DELETE USING (public.is_admin());

-- TARIFARIOS — Price lists
CREATE TABLE IF NOT EXISTS public.tarifarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  moneda text NOT NULL DEFAULT 'ARS'
    CHECK (moneda IN ('ARS', 'USD')),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tarifarios ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active tarifarios
CREATE POLICY "authenticated_read_tarifarios" ON public.tarifarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin CRUD on tarifarios
CREATE POLICY "admin_insert_tarifarios" ON public.tarifarios
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_tarifarios" ON public.tarifarios
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_delete_tarifarios" ON public.tarifarios
  FOR DELETE USING (public.is_admin());

-- TARIFARIOS_ITEMS — Individual price list items
CREATE TABLE IF NOT EXISTS public.tarifarios_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tarifario_id uuid NOT NULL REFERENCES public.tarifarios(id) ON DELETE CASCADE,
  servicio text NOT NULL,
  precio numeric(12,2) NOT NULL,
  descripcion text DEFAULT NULL,
  is_active boolean DEFAULT true NOT NULL,
  orden integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tarifarios_items ENABLE ROW LEVEL SECURITY;

-- Same RLS as parent tarifarios
CREATE POLICY "authenticated_read_tarifarios_items" ON public.tarifarios_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_insert_tarifarios_items" ON public.tarifarios_items
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_tarifarios_items" ON public.tarifarios_items
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_delete_tarifarios_items" ON public.tarifarios_items
  FOR DELETE USING (public.is_admin());

-- LOCALIDADES_TARIFARIOS — Maps locality to price list
CREATE TABLE IF NOT EXISTS public.localidades_tarifarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  localidad text NOT NULL UNIQUE,
  tarifario_id uuid NOT NULL REFERENCES public.tarifarios(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.localidades_tarifarios ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read locality mappings
CREATE POLICY "authenticated_read_localidades_tarifarios" ON public.localidades_tarifarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin CRUD
CREATE POLICY "admin_insert_localidades_tarifarios" ON public.localidades_tarifarios
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_localidades_tarifarios" ON public.localidades_tarifarios
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_delete_localidades_tarifarios" ON public.localidades_tarifarios
  FOR DELETE USING (public.is_admin());

-- CITAS_FOTOGRAMETRIA — Photogrammetry appointments
CREATE TABLE IF NOT EXISTS public.citas_fotogrametria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  odontologo_id uuid NOT NULL REFERENCES auth.users(id),
  direccion_consultorio text NOT NULL,
  tipo_servicio text DEFAULT NULL,
  fecha_propuesta timestamptz NOT NULL,
  observaciones text DEFAULT NULL,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptada', 'finalizada', 'rechazada')),
  notas text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.citas_fotogrametria ENABLE ROW LEVEL SECURITY;

-- Odontólogos can read their own citas; admin can read all
CREATE POLICY "read_citas_fotogrametria" ON public.citas_fotogrametria
  FOR SELECT USING (
    auth.uid() = odontologo_id
    OR public.is_admin()
  );

-- Odontólogos can create citas
CREATE POLICY "odontologo_create_citas" ON public.citas_fotogrametria
  FOR INSERT WITH CHECK (
    auth.uid() = odontologo_id
  );

-- Admin can update citas (accept, reject, finalize)
CREATE POLICY "admin_update_citas" ON public.citas_fotogrametria
  FOR UPDATE USING (
    public.is_admin()
  );

-- Admin can delete citas
CREATE POLICY "admin_delete_citas" ON public.citas_fotogrametria
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- 4. Seed initial tarifarios (3 lists per PRD)
-- ============================================================================

INSERT INTO public.tarifarios (nombre, moneda) VALUES
  ('Lista A - Zona 1', 'ARS'),
  ('Lista B - Zona 2', 'ARS'),
  ('Lista C - Internacional', 'USD');

-- ============================================================================
-- 5. Updated_at triggers for new tables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solicitudes_updated_at
  BEFORE UPDATE ON public.solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarifarios_updated_at
  BEFORE UPDATE ON public.tarifarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarifarios_items_updated_at
  BEFORE UPDATE ON public.tarifarios_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_citas_fotogrametria_updated_at
  BEFORE UPDATE ON public.citas_fotogrametria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. Update clinic_info default name
-- ============================================================================

UPDATE public.clinic_info SET nombre = 'Labneo' WHERE nombre IS NOT NULL;
