-- Rollback Migration: Remove NOT NULL constraint from medicos.user_id
-- Description: Reverses 20251117000002_make_medicos_user_id_not_null.sql
-- Date: 2025-11-17
-- WARNING: This allows médicos without platform access again. Only use if necessary.

-- Remove NOT NULL constraint from user_id
ALTER TABLE public.medicos
ALTER COLUMN user_id DROP NOT NULL;

-- Revert column comment
COMMENT ON COLUMN public.medicos.user_id IS 'Link to authentication user (auth.users)';
