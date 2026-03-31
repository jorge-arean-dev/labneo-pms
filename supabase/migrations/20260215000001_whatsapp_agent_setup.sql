-- ============================================================================
-- Phase 3: WhatsApp AI Agent Setup
-- ============================================================================

-- A1: Add base_conocimientos column to clinic_info
ALTER TABLE clinic_info
ADD COLUMN base_conocimientos TEXT;

COMMENT ON COLUMN clinic_info.base_conocimientos IS
  'Knowledge base content used by the WhatsApp AI receptionist agent';

-- A2: Create medicos_activos view (n8n needs doctor names from usuarios_pms)
CREATE VIEW medicos_activos AS
SELECT
  m.id,
  m.matricula,
  u.nombre,
  u.apellido,
  m.user_id
FROM medicos m
JOIN usuarios_pms u ON m.user_id = u.id
WHERE m.deleted_at IS NULL;

COMMENT ON VIEW medicos_activos IS
  'Active doctors with names from usuarios_pms, used by WhatsApp agent';

-- A3: Add default for booking_tokens.expires_at
ALTER TABLE booking_tokens
ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '24 hours';

-- A4: Create RPC function for booking token creation
CREATE OR REPLACE FUNCTION crear_booking_token(
  p_paciente_id UUID,
  p_medico_id UUID,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO booking_tokens (paciente_id, medico_id, phone_number)
  VALUES (p_paciente_id, p_medico_id, p_phone_number)
  RETURNING booking_tokens.token, booking_tokens.expires_at;
END;
$$;
