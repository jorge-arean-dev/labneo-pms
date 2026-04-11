-- ============================================================================
-- Migration: Prótesis-specific estados + Vevi Dental acceptance columns
-- ============================================================================
-- Adds two prótesis-specific estados to estados_solicitud:
--   1. pendiente_protesis — auto-assigned when odontólogo creates a prótesis solicitud
--   2. registrado_vevi    — admin accepted and registered the odontólogo in Vevi Dental
--
-- Adds three columns to solicitudes for the Vevi Dental acceptance workflow:
--   - vevi_usuario        — Vevi Dental username (set by admin on acceptance)
--   - vevi_password        — Vevi Dental password (set by admin on acceptance)
--   - comentarios_admin    — Admin comments visible to the odontólogo after acceptance
-- ============================================================================

-- 1. Insert prótesis-specific estados
INSERT INTO estados_solicitud (codigo, nombre, tipo_solicitud, descripcion, orden, activo)
VALUES
  ('pendiente_protesis', 'Pendiente', 'protesis', 'Solicitud de prótesis creada por el odontólogo, pendiente de revisión', 1, true),
  ('registrado_vevi', 'Registrado en Vevi', 'protesis', 'Solicitud aceptada — odontólogo registrado en Vevi Dental con credenciales entregadas', 2, true);

-- 2. Add Vevi Dental acceptance columns to solicitudes
ALTER TABLE solicitudes
  ADD COLUMN vevi_usuario text,
  ADD COLUMN vevi_password text,
  ADD COLUMN comentarios_admin text;
