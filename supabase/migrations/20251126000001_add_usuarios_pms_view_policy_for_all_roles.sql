-- Migration: Add usuarios_pms SELECT policy for all authenticated users
-- Description: Allows Médicos and Recepcionistas to view other users in usuarios_pms table
-- Reference: docs/entities-access/entities-access-per-role - recepcionistas.csv
-- Date: 2025-11-26
--
-- Problem: Currently only Admins can view all usuarios_pms records.
-- Médicos and Recepcionistas can only see their own profile.
-- According to the access rules, Médicos should be able to view recepcionistas (visible only).

-- ============================================================================
-- ADD SELECT POLICY FOR ALL AUTHENTICATED USERS
-- ============================================================================

-- Policy: All authenticated users can view all profiles (read-only)
-- This matches the pattern used for medicos, pacientes, obras_sociales tables
CREATE POLICY "authenticated_users_can_view_all_profiles"
    ON public.usuarios_pms
    FOR SELECT
    TO authenticated
    USING (true);

-- Add comment to policy
COMMENT ON POLICY "authenticated_users_can_view_all_profiles" ON public.usuarios_pms
    IS 'Allows all authenticated users to view user profiles. Write operations remain restricted by role.';
