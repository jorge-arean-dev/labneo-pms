-- ============================================================================
-- Migration: Add anon read policy for clinic_info
-- Description: Allow unauthenticated users to read clinic branding info
-- ============================================================================

-- Allow anonymous users to view clinic info (needed for landing page branding)
CREATE POLICY "Anon users can view clinic_info"
  ON clinic_info
  FOR SELECT
  TO anon
  USING (true);
