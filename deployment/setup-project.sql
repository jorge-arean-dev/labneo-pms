-- ============================================================================
-- PMS - Project Setup Script
-- Run this AFTER the schema migration to configure extensions, realtime, cron
-- ============================================================================
--
-- This script configures:
--   1. Required database extensions
--   2. Realtime publication for consultas table
--   3. Cron job for email reminders
--   4. Storage bucket settings (file limits, MIME types)
--
-- Prerequisites:
--   - Run 00000000000000_initial_schema.sql first
--   - Run 00000000000001_storage_setup.sql first
--   - Run 00000000000002_seed_required_data.sql first
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================
-- Note: Some extensions may already be enabled by default in Supabase

-- pg_cron: Job scheduler for email reminders
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- pg_net: Async HTTP for calling API from cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- pgcrypto: Cryptographic functions (for password encryption, etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- uuid-ossp: UUID generation (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================================
-- PART 2: CONFIGURE REALTIME
-- ============================================================================
-- Enable realtime for consultas table (live appointment updates)

-- First, ensure the table has REPLICA IDENTITY FULL (required for realtime)
ALTER TABLE public.consultas REPLICA IDENTITY FULL;

-- Add consultas to the realtime publication
-- Note: This may fail if already added, which is fine
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.consultas;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table consultas already in supabase_realtime publication';
END;
$$;

-- ============================================================================
-- PART 3: CONFIGURE CRON JOB FOR EMAIL REMINDERS
-- ============================================================================
-- Schedule: Every 30 minutes
-- This calls the send_appointment_reminders() function which triggers the API

-- Remove existing job if it exists (to avoid duplicates)
SELECT cron.unschedule('send-appointment-reminders');

-- Schedule the new job
SELECT cron.schedule(
  'send-appointment-reminders',    -- job name
  '*/30 * * * *',                  -- every 30 minutes
  'SELECT send_appointment_reminders()'
);

-- Verify the job was created
-- SELECT * FROM cron.job WHERE jobname = 'send-appointment-reminders';

-- ============================================================================
-- PART 4: UPDATE STORAGE BUCKET SETTINGS
-- ============================================================================
-- Set file size limits and allowed MIME types

-- Avatars bucket: 5MB limit, image files only
UPDATE storage.buckets
SET
  file_size_limit = 5242880,  -- 5MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- Logo bucket: 2MB limit, image files only (no gif/webp for logo)
UPDATE storage.buckets
SET
  file_size_limit = 2097152,  -- 2MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png']
WHERE id = 'logo';

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================
-- Run these after setup to verify everything is configured correctly

-- Check extensions
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net', 'pgcrypto', 'uuid-ossp');

-- Check realtime publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check cron job
-- SELECT jobid, schedule, command, active FROM cron.job WHERE jobname = 'send-appointment-reminders';

-- Check storage buckets
-- SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;

-- ============================================================================
-- POST-SETUP: Manual Configuration Required
-- ============================================================================
-- After running this script, you MUST configure these in the Supabase Dashboard
-- or update the cron_config table:
--
-- 1. Update cron_config with your deployment URL:
--    UPDATE cron_config SET value = 'https://your-client-app.vercel.app' WHERE key = 'reminder_url';
--    UPDATE cron_config SET value = 'your-new-cron-secret' WHERE key = 'cron_secret';
--
-- 2. Configure Auth settings in Dashboard:
--    - Site URL
--    - Redirect URLs
--    - Email templates (optional - uses defaults)
--
-- 3. Configure email_config if using email reminders:
--    UPDATE email_config SET
--      enabled = true,
--      smtp_user = 'your-email@gmail.com',
--      smtp_password_encrypted = 'encrypted-app-password',
--      sender_name = 'Your Clinic Name'
--    WHERE id = (SELECT id FROM email_config LIMIT 1);
--
-- 4. Update clinic_info with client's business details:
--    UPDATE clinic_info SET
--      nombre = 'Clinic Name',
--      telefono = 'Phone',
--      email = 'contact@clinic.com',
--      direccion = 'Address',
--      ciudad = 'City',
--      provincia = 'Province'
--    WHERE id = (SELECT id FROM clinic_info LIMIT 1);
-- ============================================================================
