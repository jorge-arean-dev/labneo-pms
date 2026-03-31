-- ============================================================================
-- Migration: Create email configuration and reminders tables
-- Description: Tables for email system (SMTP config, scheduled reminders)
-- ============================================================================

-- ============================================================================
-- Table: email_config
-- Purpose: System-wide email configuration (singleton)
-- ============================================================================

CREATE TABLE email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SMTP Settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'gmail',
  smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT,
  smtp_password_encrypted TEXT,
  sender_name TEXT,

  -- Reminder Settings
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,

  -- Connection Test Status
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Singleton constraint: only one row allowed
CREATE UNIQUE INDEX email_config_singleton ON email_config ((true));

-- Comment on table
COMMENT ON TABLE email_config IS 'System-wide email configuration (SMTP settings, reminder preferences)';
COMMENT ON COLUMN email_config.smtp_password_encrypted IS 'AES-256-GCM encrypted Gmail app password';
COMMENT ON COLUMN email_config.provider IS 'Email provider: gmail, resend (future)';

-- ============================================================================
-- Table: email_reminders
-- Purpose: Track scheduled and sent email reminders
-- ============================================================================

CREATE TABLE email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,

  -- Email details
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,

  -- Provider info
  provider TEXT NOT NULL DEFAULT 'gmail',
  external_id TEXT,

  -- Appointment context (doctor name, time, address, etc.)
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT email_type_check CHECK (email_type IN ('confirmacion', 'recordatorio_24h', 'cancelacion', 'reprogramacion')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'sent', 'cancelled', 'failed'))
);

-- Index for cron job: find pending reminders ready to send
CREATE INDEX idx_email_reminders_pending
  ON email_reminders(scheduled_for)
  WHERE status = 'pending';

-- Index for consulta lookups: cancel reminders when appointment changes
CREATE INDEX idx_email_reminders_consulta
  ON email_reminders(consulta_id, status);

-- Index for audit/debugging
CREATE INDEX idx_email_reminders_status
  ON email_reminders(status, created_at DESC);

-- Comments
COMMENT ON TABLE email_reminders IS 'Tracks all scheduled and sent email reminders for appointments';
COMMENT ON COLUMN email_reminders.email_type IS 'Type: confirmacion, recordatorio_24h, cancelacion, reprogramacion';
COMMENT ON COLUMN email_reminders.status IS 'Status: pending, sent, cancelled, failed';
COMMENT ON COLUMN email_reminders.metadata IS 'JSON with appointment details for email template';
COMMENT ON COLUMN email_reminders.external_id IS 'External email ID (for providers like Resend that support cancellation)';

-- ============================================================================
-- Triggers: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_reminders_updated_at
  BEFORE UPDATE ON email_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- email_config: Only admins can read/write
CREATE POLICY "Admins can view email_config"
  ON email_config
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert email_config"
  ON email_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update email_config"
  ON email_config
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- email_reminders: Admins can manage, others can view their related consultas
CREATE POLICY "Admins can manage email_reminders"
  ON email_reminders
  FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view reminders for their consultas"
  ON email_reminders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultas c
      WHERE c.id = email_reminders.consulta_id
      AND (
        is_admin()
        OR (is_medico() AND c.medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
        OR is_recepcionista()
      )
    )
  );

-- ============================================================================
-- Insert default config row (singleton)
-- ============================================================================

INSERT INTO email_config (
  enabled,
  provider,
  smtp_host,
  smtp_port,
  reminders_enabled,
  reminder_hours_before
) VALUES (
  false,
  'gmail',
  'smtp.gmail.com',
  587,
  true,
  24
);
