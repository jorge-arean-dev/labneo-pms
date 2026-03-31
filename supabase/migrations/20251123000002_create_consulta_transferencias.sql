-- Create table to track consulta transfers between medicos
CREATE TABLE consulta_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medico_origen_id uuid NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
  medico_destino_id uuid NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
  transferido_por_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  motivo text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_consulta_transferencias_consulta_id ON consulta_transferencias(consulta_id);
CREATE INDEX idx_consulta_transferencias_medico_origen ON consulta_transferencias(medico_origen_id);
CREATE INDEX idx_consulta_transferencias_medico_destino ON consulta_transferencias(medico_destino_id);

-- Add RLS policies
ALTER TABLE consulta_transferencias ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view transfers
CREATE POLICY "Users can view consulta transfers"
  ON consulta_transferencias
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can create transfers (will be validated in app logic)
CREATE POLICY "Users can create consulta transfers"
  ON consulta_transferencias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE consulta_transferencias IS 'Audit trail for consulta transfers between medicos. Tracks who transferred, when, and optionally why.';
