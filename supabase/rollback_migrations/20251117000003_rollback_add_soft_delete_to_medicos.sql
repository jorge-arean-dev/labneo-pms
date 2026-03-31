-- Rollback Migration: Remove soft delete from medicos table
-- Description: Reverses 20251117000001_add_soft_delete_to_medicos.sql
-- Date: 2025-11-17
-- WARNING: This will permanently delete soft-delete data. Only use if necessary.

-- Drop indexes
DROP INDEX IF EXISTS public.idx_medicos_active;
DROP INDEX IF EXISTS public.idx_medicos_deleted_at;

-- Remove deleted_at column
ALTER TABLE public.medicos
DROP COLUMN IF EXISTS deleted_at;
