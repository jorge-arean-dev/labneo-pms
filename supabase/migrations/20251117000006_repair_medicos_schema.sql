-- Migration: Repair medicos schema after accidental rollback
-- Description: Re-applies soft delete and NOT NULL constraint that were rolled back
-- Date: 2025-11-17

-- ============================================================================
-- STEP 1: Re-add soft delete (if it was removed by rollback)
-- ============================================================================

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'medicos'
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.medicos ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

        -- Add comment to column
        COMMENT ON COLUMN public.medicos.deleted_at IS 'Timestamp when the médico was soft-deleted (NULL = active)';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_medicos_deleted_at ON public.medicos(deleted_at)
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_medicos_active ON public.medicos(id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 2: Re-apply NOT NULL constraint on user_id
-- ============================================================================

-- Delete any médicos with NULL user_id (mock data cleanup)
DELETE FROM public.medicos WHERE user_id IS NULL;

-- Verify no NULL values exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.medicos WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot apply NOT NULL constraint: médicos with NULL user_id still exist';
    END IF;
END $$;

-- Make user_id NOT NULL if it isn't already
DO $$
BEGIN
    -- Check if the column is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'medicos'
        AND column_name = 'user_id'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.medicos ALTER COLUMN user_id SET NOT NULL;

        -- Update column comment
        COMMENT ON COLUMN public.medicos.user_id IS 'Link to authentication user (auth.users) - REQUIRED for all médicos';
    END IF;
END $$;
