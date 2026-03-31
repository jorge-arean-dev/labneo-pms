-- Migration: Create avatars storage bucket
-- Description: Creates a private storage bucket for user and patient avatars with RLS policies
-- Date: 2025-11-13

-- Create the avatars bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    false, -- Private bucket
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
