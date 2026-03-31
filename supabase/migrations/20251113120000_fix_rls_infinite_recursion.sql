-- Migration: Fix RLS infinite recursion on usuarios_pms table
-- Description: Drops existing policies and recreates them using security definer functions to avoid infinite recursion
-- Date: 2025-11-13

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.usuarios_pms;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.usuarios_pms;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.usuarios_pms;
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.usuarios_pms;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.usuarios_pms;
DROP POLICY IF EXISTS "admins_can_delete_profiles" ON public.usuarios_pms;

-- ============================================================================
-- CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.usuarios_pms u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = auth.uid()
        AND r.nombre = 'Administrador'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's role_id (avoids recursion in UPDATE policy)
CREATE OR REPLACE FUNCTION public.get_user_rol_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT rol_id FROM public.usuarios_pms WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's email (avoids recursion in UPDATE policy)
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM public.usuarios_pms WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- CREATE NEW RLS POLICIES WITHOUT RECURSION
-- ============================================================================

-- Policy 1: Users can view their own profile
CREATE POLICY "users_can_view_own_profile"
    ON public.usuarios_pms
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (nombre, apellido, foto_perfil_url only)
CREATE POLICY "users_can_update_own_profile"
    ON public.usuarios_pms
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Prevent users from changing their own role or email using helper functions
        AND rol_id = public.get_user_rol_id(auth.uid())
        AND email = public.get_user_email(auth.uid())
    );

-- Policy 3: Administrators can view all profiles
CREATE POLICY "admins_can_view_all_profiles"
    ON public.usuarios_pms
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Policy 4: Administrators can insert new profiles
CREATE POLICY "admins_can_insert_profiles"
    ON public.usuarios_pms
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Policy 5: Administrators can update all profiles
CREATE POLICY "admins_can_update_all_profiles"
    ON public.usuarios_pms
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy 6: Administrators can delete profiles
CREATE POLICY "admins_can_delete_profiles"
    ON public.usuarios_pms
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.is_admin() IS 'Security definer function to check if current user is an administrator (avoids RLS recursion)';
COMMENT ON FUNCTION public.get_user_rol_id(UUID) IS 'Security definer function to get user role ID (avoids RLS recursion)';
COMMENT ON FUNCTION public.get_user_email(UUID) IS 'Security definer function to get user email (avoids RLS recursion)';

COMMENT ON POLICY "users_can_view_own_profile" ON public.usuarios_pms
    IS 'Allows users to view their own profile data';

COMMENT ON POLICY "users_can_update_own_profile" ON public.usuarios_pms
    IS 'Allows users to update their own nombre, apellido, and foto_perfil_url (but not rol_id or email)';

COMMENT ON POLICY "admins_can_view_all_profiles" ON public.usuarios_pms
    IS 'Allows administrators to view all user profiles';

COMMENT ON POLICY "admins_can_insert_profiles" ON public.usuarios_pms
    IS 'Allows administrators to create new user profiles';

COMMENT ON POLICY "admins_can_update_all_profiles" ON public.usuarios_pms
    IS 'Allows administrators to update any user profile';

COMMENT ON POLICY "admins_can_delete_profiles" ON public.usuarios_pms
    IS 'Allows administrators to delete user profiles';
