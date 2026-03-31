-- ============================================================================
-- PMS (Patient Management System) - Storage Setup
-- Consolidated from storage-related migrations for clean deployments
-- ============================================================================
--
-- This file creates storage buckets and their RLS policies.
-- Run this AFTER 00000000000000_initial_schema.sql
--
-- Prerequisites:
--   - Schema migration must be completed first
--   - Storage extension must be enabled (default in Supabase)
-- ============================================================================

-- ============================================================================
-- PART 1: AVATARS BUCKET
-- ============================================================================

-- Create avatars bucket for user profile pictures
-- PRIVATE bucket - only accessible via RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,  -- Private bucket
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: LOGO BUCKET
-- ============================================================================

-- Create logo bucket for clinic branding
-- PUBLIC bucket - accessible on landing page without auth
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logo',
  'logo',
  true,  -- Public bucket
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 3: STORAGE NOTES
-- ============================================================================
-- Avatar paths follow the pattern: usuarios/{user_id}/{filename}
-- The built-in storage.foldername(name) function is used to extract path parts
-- for ownership validation in RLS policies.

-- ============================================================================
-- PART 4: AVATARS STORAGE POLICIES
-- ============================================================================

-- Policy: Staff members can view all avatars (for profiles, lists, etc.)
CREATE POLICY "staff_can_view_all_avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.is_staff_member(auth.uid())
);

-- Policy: Users can view their own avatar
CREATE POLICY "users_can_view_own_avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'usuarios' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Users can upload their own avatar
CREATE POLICY "users_can_upload_own_avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'usuarios' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Admins can upload any avatar (for creating users)
CREATE POLICY "admins_can_upload_any_avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  public.is_admin(auth.uid())
);

-- Policy: Users can update their own avatar
CREATE POLICY "users_can_update_own_avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'usuarios' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Admins can update any avatar
CREATE POLICY "admins_can_update_any_avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.is_admin(auth.uid())
);

-- Policy: Users can delete their own avatar
CREATE POLICY "users_can_delete_own_avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'usuarios' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Admins can delete any avatar
CREATE POLICY "admins_can_delete_any_avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.is_admin(auth.uid())
);

-- ============================================================================
-- PART 5: LOGO STORAGE POLICIES
-- ============================================================================

-- Policy: Anyone can view the logo (public bucket for landing page)
CREATE POLICY "anyone_can_view_logo"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logo');

-- Policy: Only admins can upload logo
CREATE POLICY "admins_can_upload_logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logo' AND
  is_admin(auth.uid())
);

-- Policy: Only admins can update logo
CREATE POLICY "admins_can_update_logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logo' AND
  is_admin(auth.uid())
);

-- Policy: Only admins can delete logo
CREATE POLICY "admins_can_delete_logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'logo' AND
  is_admin(auth.uid())
);

-- ============================================================================
-- END OF STORAGE SETUP
-- ============================================================================
