-- Migration: Add soft delete to medicos table
-- Description: Adds deleted_at column and index for soft delete functionality
-- Date: 2025-11-17

-- Add deleted_at column to medicos table
ALTER TABLE public.medicos
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment to column
COMMENT ON COLUMN public.medicos.deleted_at IS 'Timestamp when the médico was soft-deleted (NULL = active)';

-- Create index for better query performance when filtering soft-deleted records
CREATE INDEX IF NOT EXISTS idx_medicos_deleted_at ON public.medicos(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Create partial index for active médicos (most common query)
CREATE INDEX IF NOT EXISTS idx_medicos_active ON public.medicos(id)
WHERE deleted_at IS NULL;
