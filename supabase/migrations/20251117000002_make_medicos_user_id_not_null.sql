-- Migration: Make medicos.user_id NOT NULL
-- Description: Enforces that all médicos must have platform access (user_id required)
-- Date: 2025-11-17

-- Step 1: Delete any existing médicos with NULL user_id (mock data cleanup)
DELETE FROM public.medicos
WHERE user_id IS NULL;

-- Step 2: Verify no NULL values exist (safety check)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.medicos WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot apply NOT NULL constraint: médicos with NULL user_id still exist';
    END IF;
END $$;

-- Step 3: Make user_id NOT NULL
ALTER TABLE public.medicos
ALTER COLUMN user_id SET NOT NULL;

-- Update column comment to reflect new constraint
COMMENT ON COLUMN public.medicos.user_id IS 'Link to authentication user (auth.users) - REQUIRED for all médicos';
