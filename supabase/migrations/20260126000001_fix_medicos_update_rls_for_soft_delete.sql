-- Migration: Fix medicos UPDATE RLS policy for soft delete
-- Description: Updates the WITH CHECK clause to allow admins to set deleted_at (soft delete)
-- Date: 2026-01-26
-- Issue: The previous policy required deleted_at IS NULL in WITH CHECK, blocking soft delete operations

-- Drop existing update policy
DROP POLICY IF EXISTS "medicos_update_own_or_admin" ON public.medicos;

-- ============================================================================
-- MEDICOS UPDATE POLICY (Fixed for soft delete)
-- ============================================================================
--
-- USING clause: Controls which rows can be selected for update
--   - Row must be active (deleted_at IS NULL)
--   - User must be admin OR médico updating their own record
--
-- WITH CHECK clause: Controls what values the updated row can have
--   - Admin: Can update any field including deleted_at (for soft delete)
--   - Médico: Can only update their own record AND deleted_at must stay NULL
--
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
  public.is_admin() OR
  (
    deleted_at IS NULL AND
    public.is_medico() AND
    id = public.get_medico_id()
  )
);

COMMENT ON POLICY "medicos_update_own_or_admin" ON public.medicos IS
'UPDATE: Admin can update any field including deleted_at (soft delete). Médico can only update their own active record.';
