-- Migration: Enable replica identity full for consultas table
-- Description: Allows Realtime Postgres Changes to include old record values in UPDATE payloads
-- Required for: PatientArrivalBanner component to detect when paciente_llego_timestamp changes
-- Date: 2025-12-13

-- Set replica identity to FULL so that UPDATE events include the old row values
-- This is needed for the realtime subscription to properly detect field changes
ALTER TABLE public.consultas REPLICA IDENTITY FULL;

-- Add a comment to document this setting
COMMENT ON TABLE public.consultas IS 'Medical consultations/appointments. REPLICA IDENTITY FULL enabled for Realtime subscriptions.';
