-- Migration: Create logo storage bucket
-- Description: Creates a public storage bucket for clinic logo with admin-only write access
-- Date: 2026-01-02

-- ============================================================================
-- CREATE LOGO BUCKET
-- ============================================================================

-- Create the logo bucket (public for reading, restricted writing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logo',
    'logo',
    true, -- Public bucket (logo needs to be accessible for PDF generation)
    2097152, -- 2MB file size limit (sufficient for a logo)
    ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR LOGO BUCKET
-- ============================================================================

-- Policy 1: Anyone can view the logo (public read)
-- Note: Since bucket is public, SELECT is allowed by default, but we add explicit policy for clarity
CREATE POLICY "anyone_can_view_logo"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'logo');

-- Policy 2: Only admins can upload logo
CREATE POLICY "admins_can_upload_logo"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'logo'
        AND public.is_admin(auth.uid())
    );

-- Policy 3: Only admins can update logo
CREATE POLICY "admins_can_update_logo"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'logo'
        AND public.is_admin(auth.uid())
    )
    WITH CHECK (
        bucket_id = 'logo'
        AND public.is_admin(auth.uid())
    );

-- Policy 4: Only admins can delete logo
CREATE POLICY "admins_can_delete_logo"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'logo'
        AND public.is_admin(auth.uid())
    );

