-- Migration: Update medicos RLS policies to exclude soft-deleted records
-- Description: Updates all medicos table RLS policies to filter out soft-deleted records
-- Date: 2025-11-17

-- Drop existing medicos policies
DROP POLICY IF EXISTS "medicos_select_all" ON public.medicos;
DROP POLICY IF EXISTS "medicos_insert_admin" ON public.medicos;
DROP POLICY IF EXISTS "medicos_update_own_or_admin" ON public.medicos;
DROP POLICY IF EXISTS "medicos_delete_admin" ON public.medicos;

-- ============================================================================
-- MEDICOS POLICIES (Updated with soft delete filter)
-- ============================================================================

-- READ: All authenticated users can read active médicos only
CREATE POLICY "medicos_select_all"
ON public.medicos
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- CREATE: Only Administrador
CREATE POLICY "medicos_insert_admin"
ON public.medicos
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- UPDATE: Medico (own data only) or Administrador, only active médicos
CREATE POLICY "medicos_update_own_or_admin"
ON public.medicos
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin() OR
    (public.is_medico() AND id = public.get_medico_id())
  )
)
WITH CHECK (
  deleted_at IS NULL AND (
    public.is_admin() OR
    (public.is_medico() AND id = public.get_medico_id())
  )
);

-- DELETE: Only Administrador (this is for hard delete, soft delete is via UPDATE)
-- Note: Soft delete is performed via UPDATE setting deleted_at timestamp
CREATE POLICY "medicos_delete_admin"
ON public.medicos
FOR DELETE
TO authenticated
USING (public.is_admin());
