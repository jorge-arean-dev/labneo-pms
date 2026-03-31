-- Migration: Setup RLS policies
-- Description: Creates Row Level Security policies for all tables based on role permissions
-- Date: 2025-11-14
-- Reference: docs/db-schema/role-permissions.csv

-- ============================================================================
-- OBRAS_SOCIALES POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "obras_sociales_select_all"
ON public.obras_sociales
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Only Administrador
CREATE POLICY "obras_sociales_insert_admin"
ON public.obras_sociales
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- UPDATE: Only Administrador
CREATE POLICY "obras_sociales_update_admin"
ON public.obras_sociales
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE: Only Administrador
CREATE POLICY "obras_sociales_delete_admin"
ON public.obras_sociales
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================================
-- PACIENTES POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "pacientes_select_all"
ON public.pacientes
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Recepcionista, Medico, Administrador
CREATE POLICY "pacientes_insert_all_roles"
ON public.pacientes
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- UPDATE: Recepcionista, Medico, Administrador
CREATE POLICY "pacientes_update_all_roles"
ON public.pacientes
FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'))
WITH CHECK (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- DELETE: Only Administrador
CREATE POLICY "pacientes_delete_admin"
ON public.pacientes
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================================
-- MEDICOS POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "medicos_select_all"
ON public.medicos
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Only Administrador
CREATE POLICY "medicos_insert_admin"
ON public.medicos
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- UPDATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_update_own_or_admin"
ON public.medicos
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_medico() AND id = public.get_medico_id())
)
WITH CHECK (
  public.is_admin() OR
  (public.is_medico() AND id = public.get_medico_id())
);

-- DELETE: Only Administrador
CREATE POLICY "medicos_delete_admin"
ON public.medicos
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================================
-- MEDICOS_OBRAS_SOCIALES POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "medicos_obras_sociales_select_all"
ON public.medicos_obras_sociales
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_obras_sociales_insert_own_or_admin"
ON public.medicos_obras_sociales
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);

-- UPDATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_obras_sociales_update_own_or_admin"
ON public.medicos_obras_sociales
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
)
WITH CHECK (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);

-- DELETE: Medico (own data only) or Administrador
CREATE POLICY "medicos_obras_sociales_delete_own_or_admin"
ON public.medicos_obras_sociales
FOR DELETE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);

-- ============================================================================
-- CONSULTAS POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "consultas_select_all"
ON public.consultas
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Recepcionista, Medico, Administrador
CREATE POLICY "consultas_insert_all_roles"
ON public.consultas
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- UPDATE: Recepcionista, Medico, Administrador
CREATE POLICY "consultas_update_all_roles"
ON public.consultas
FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'))
WITH CHECK (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- DELETE: Recepcionista, Medico, Administrador (soft delete via estado)
CREATE POLICY "consultas_delete_all_roles"
ON public.consultas
FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- ============================================================================
-- MEDICOS_HORARIOS POLICIES
-- ============================================================================
-- READ: All authenticated users can read
CREATE POLICY "medicos_horarios_select_all"
ON public.medicos_horarios
FOR SELECT
TO authenticated
USING (true);

-- CREATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_horarios_insert_own_or_admin"
ON public.medicos_horarios
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);

-- UPDATE: Medico (own data only) or Administrador
CREATE POLICY "medicos_horarios_update_own_or_admin"
ON public.medicos_horarios
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
)
WITH CHECK (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);

-- DELETE: Medico (own data only) or Administrador
CREATE POLICY "medicos_horarios_delete_own_or_admin"
ON public.medicos_horarios
FOR DELETE
TO authenticated
USING (
  public.is_admin() OR
  (public.is_medico() AND medico_id = public.get_medico_id())
);
