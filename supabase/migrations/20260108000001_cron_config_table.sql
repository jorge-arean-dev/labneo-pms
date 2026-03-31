-- Create cron_config table to store pg_cron configuration
-- This replaces database parameters which require superuser access

CREATE TABLE IF NOT EXISTS public.cron_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.cron_config IS 'Stores configuration for pg_cron jobs (reminder_url, cron_secret)';

-- Enable RLS
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (pg_cron functions run as superuser)
CREATE POLICY "Service role can manage cron_config"
  ON public.cron_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also allow postgres role (for pg_cron function)
CREATE POLICY "Postgres role can read cron_config"
  ON public.cron_config
  FOR SELECT
  TO postgres
  USING (true);

-- Insert placeholder values (UPDATE these after deployment!)
INSERT INTO public.cron_config (key, value, description) VALUES
  ('reminder_url', 'https://your-app.vercel.app', 'Base URL of the deployed application'),
  ('cron_secret', 'replace-with-your-secret', 'Secret key for authenticating cron requests')
ON CONFLICT (key) DO NOTHING;

-- Update the send_appointment_reminders function to use the table
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
  -- Get configuration from cron_config table
  SELECT value INTO app_url FROM public.cron_config WHERE key = 'reminder_url';
  SELECT value INTO cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  -- Check if configuration exists
  IF app_url IS NULL OR app_url = '' OR app_url = 'https://your-app.vercel.app' THEN
    RAISE NOTICE 'reminder_url not configured in cron_config table. Skipping.';
    RETURN;
  END IF;

  IF cron_secret IS NULL OR cron_secret = '' OR cron_secret = 'replace-with-your-secret' THEN
    RAISE NOTICE 'cron_secret not configured in cron_config table. Skipping.';
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

-- Add helpful comment
COMMENT ON FUNCTION send_appointment_reminders() IS
'Calls the Next.js API to send 24-hour appointment reminder emails.
Configure by updating the cron_config table:
  UPDATE cron_config SET value = ''https://your-app.vercel.app'' WHERE key = ''reminder_url'';
  UPDATE cron_config SET value = ''your-secret'' WHERE key = ''cron_secret'';';
