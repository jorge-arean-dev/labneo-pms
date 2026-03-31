-- Migration: Setup RLS policies for avatars bucket
-- Description: Creates RLS policies for avatar storage with user and staff access controls
-- Date: 2025-11-13

-- ============================================================================
-- HELPER FUNCTION: Check if user is staff member
-- ============================================================================

-- Create function to check if user has staff role
CREATE OR REPLACE FUNCTION public.is_staff_member(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.usuarios_pms u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = user_id
        AND r.nombre IN ('Recepcionista', 'Medico', 'Administrador')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION public.is_staff_member(UUID) IS 'Checks if a user has any staff role (Recepcionista, Medico, or Administrador)';

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.usuarios_pms u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = user_id
        AND r.nombre = 'Administrador'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Checks if a user has the Administrador role';

-- ============================================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================================================

-- Policy 1: Users can upload their own avatar
CREATE POLICY "users_can_upload_own_avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'usuarios'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy 2: Users can update their own avatar
CREATE POLICY "users_can_update_own_avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'usuarios'
        AND (storage.foldername(name))[2] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'usuarios'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy 3: Users can delete their own avatar
CREATE POLICY "users_can_delete_own_avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'usuarios'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy 4: Users can view their own avatar
CREATE POLICY "users_can_view_own_avatar"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = 'usuarios'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy 5: Staff can view all avatars (usuarios and pacientes)
CREATE POLICY "staff_can_view_all_avatars"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND public.is_staff_member(auth.uid())
    );

-- Policy 6: Admins can upload any avatar (for user management)
CREATE POLICY "admins_can_upload_any_avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND public.is_admin(auth.uid())
    );

-- Policy 7: Admins can update any avatar
CREATE POLICY "admins_can_update_any_avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND public.is_admin(auth.uid())
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND public.is_admin(auth.uid())
    );

-- Policy 8: Admins can delete any avatar
CREATE POLICY "admins_can_delete_any_avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND public.is_admin(auth.uid())
    );
