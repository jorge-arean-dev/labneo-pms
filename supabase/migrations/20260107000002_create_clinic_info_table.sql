-- ============================================================================
-- Migration: Create clinic_info table
-- Description: Stores clinic/business information for emails and branding
-- ============================================================================

CREATE TABLE clinic_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  nombre TEXT NOT NULL DEFAULT 'Clínica Dermatológica',
  descripcion TEXT,

  -- Contact
  telefono TEXT,
  email TEXT,
  sitio_web TEXT,

  -- Location
  direccion TEXT,
  ciudad TEXT,
  provincia TEXT,
  codigo_postal TEXT,

  -- Branding (future use)
  logo_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Singleton constraint: only one row allowed
CREATE UNIQUE INDEX clinic_info_singleton ON clinic_info ((true));

-- Comments
COMMENT ON TABLE clinic_info IS 'Clinic/business information (singleton) used in emails and branding';
COMMENT ON COLUMN clinic_info.nombre IS 'Clinic name displayed in emails';
COMMENT ON COLUMN clinic_info.direccion IS 'Full address for appointment reminders';
COMMENT ON COLUMN clinic_info.telefono IS 'Contact phone for rescheduling';

-- ============================================================================
-- Trigger: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_clinic_info_updated_at
  BEFORE UPDATE ON clinic_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE clinic_info ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view clinic info (needed for email templates)
CREATE POLICY "Authenticated users can view clinic_info"
  ON clinic_info
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify clinic info
CREATE POLICY "Admins can insert clinic_info"
  ON clinic_info
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update clinic_info"
  ON clinic_info
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- Insert default clinic info row (singleton)
-- ============================================================================

INSERT INTO clinic_info (
  nombre,
  descripcion
) VALUES (
  'Clínica Dermatológica',
  'Especialistas en dermatología clínica y estética'
);
