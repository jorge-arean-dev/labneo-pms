-- Fix RLS policies for email_config and clinic_info tables
-- Allow all authenticated users to read (SELECT) these configs
-- This is needed so staff can trigger emails when creating/cancelling appointments

-- ============================================================================
-- email_config: Allow all authenticated users to read
-- ============================================================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Administrators can view email config" ON email_config;
DROP POLICY IF EXISTS "Authenticated users can view email config" ON email_config;

-- Create new policy allowing all authenticated users to read
CREATE POLICY "Authenticated users can view email config"
  ON email_config
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- clinic_info: Allow all authenticated users to read
-- ============================================================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Administrators can view clinic info" ON clinic_info;
DROP POLICY IF EXISTS "Authenticated users can view clinic info" ON clinic_info;

-- Create new policy allowing all authenticated users to read
CREATE POLICY "Authenticated users can view clinic info"
  ON clinic_info
  FOR SELECT
  TO authenticated
  USING (true);
