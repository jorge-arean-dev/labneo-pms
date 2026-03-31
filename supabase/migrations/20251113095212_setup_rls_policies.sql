-- Migration: Setup Row Level Security policies
-- Description: Creates RLS policies for roles and usuarios_pms tables
-- Date: 2025-11-13

-- ============================================================================
-- ROLES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view roles (needed for dropdowns/forms)
CREATE POLICY "authenticated_users_can_view_roles"
    ON public.roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Add comment to policy
COMMENT ON POLICY "authenticated_users_can_view_roles" ON public.roles
    IS 'Allows all authenticated users to view roles for dropdowns and forms';

-- ============================================================================
-- USUARIOS_PMS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on usuarios_pms table
ALTER TABLE public.usuarios_pms ENABLE ROW LEVEL SECURITY;

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
        -- Prevent users from changing their own role or email
        AND rol_id = (SELECT rol_id FROM public.usuarios_pms WHERE id = auth.uid())
        AND email = (SELECT email FROM public.usuarios_pms WHERE id = auth.uid())
    );

-- Policy 3: Administrators can view all profiles
CREATE POLICY "admins_can_view_all_profiles"
    ON public.usuarios_pms
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_pms u
            JOIN public.roles r ON u.rol_id = r.id
            WHERE u.id = auth.uid()
            AND r.nombre = 'Administrador'
        )
    );

-- Policy 4: Administrators can insert new profiles
CREATE POLICY "admins_can_insert_profiles"
    ON public.usuarios_pms
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios_pms u
            JOIN public.roles r ON u.rol_id = r.id
            WHERE u.id = auth.uid()
            AND r.nombre = 'Administrador'
        )
    );

-- Policy 5: Administrators can update all profiles
CREATE POLICY "admins_can_update_all_profiles"
    ON public.usuarios_pms
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_pms u
            JOIN public.roles r ON u.rol_id = r.id
            WHERE u.id = auth.uid()
            AND r.nombre = 'Administrador'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios_pms u
            JOIN public.roles r ON u.rol_id = r.id
            WHERE u.id = auth.uid()
            AND r.nombre = 'Administrador'
        )
    );

-- Policy 6: Administrators can delete profiles
CREATE POLICY "admins_can_delete_profiles"
    ON public.usuarios_pms
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_pms u
            JOIN public.roles r ON u.rol_id = r.id
            WHERE u.id = auth.uid()
            AND r.nombre = 'Administrador'
        )
    );

-- Add comments to policies
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
