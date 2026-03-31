-- Setup pg_cron job to send appointment reminders
-- Runs every 30 minutes and calls the API route to process reminders

-- Note: This migration creates the cron job structure.
-- You must set the app URL and cron secret in Supabase Vault or as a database setting.

-- Create a function that will be called by pg_cron
CREATE OR REPLACE FUNCTION send_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url TEXT;
  cron_secret TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration from database settings
  -- These should be set via: ALTER DATABASE postgres SET app.reminder_url = 'https://your-app.vercel.app';
  -- And: ALTER DATABASE postgres SET app.cron_secret = 'your-secret-key';
  app_url := current_setting('app.reminder_url', true);
  cron_secret := current_setting('app.cron_secret', true);

  -- Check if configuration exists
  IF app_url IS NULL OR app_url = '' THEN
    RAISE NOTICE 'app.reminder_url not configured. Skipping reminder job.';
    RETURN;
  END IF;

  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE NOTICE 'app.cron_secret not configured. Skipping reminder job.';
    RETURN;
  END IF;

  -- Make HTTP request using pg_net
  SELECT net.http_post(
    url := app_url || '/api/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'Reminder job triggered, request_id: %', request_id;
END;
$$;

-- Schedule the cron job to run every 30 minutes
-- Note: pg_cron uses UTC timezone
SELECT cron.schedule(
  'send-appointment-reminders',  -- job name
  '*/30 * * * *',                -- every 30 minutes
  'SELECT send_appointment_reminders()'
);

-- Add comment for documentation
COMMENT ON FUNCTION send_appointment_reminders() IS
'Calls the Next.js API to send 24-hour appointment reminder emails.
Configure with:
  ALTER DATABASE postgres SET app.reminder_url = ''https://your-app.vercel.app'';
  ALTER DATABASE postgres SET app.cron_secret = ''your-secret-key'';';
