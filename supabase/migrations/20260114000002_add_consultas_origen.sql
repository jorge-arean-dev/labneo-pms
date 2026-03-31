-- Migration: Add origen column to consultas table
-- Purpose: Track the source of appointment creation (web staff vs WhatsApp patient booking)

-- Add origen column with default 'web' for existing records
ALTER TABLE consultas
ADD COLUMN origen TEXT NOT NULL DEFAULT 'web'
CHECK (origen IN ('web', 'whatsapp'));

-- Add column comment
COMMENT ON COLUMN consultas.origen IS 'Source of appointment: web (staff created), whatsapp (patient booking via agent)';

-- Create index for filtering/analytics by origen
CREATE INDEX idx_consultas_origen ON consultas(origen);
