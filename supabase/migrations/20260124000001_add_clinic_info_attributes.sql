-- ============================================================================
-- Migration: Add additional attributes to clinic_info table
-- Description: Adds google_maps_url and whatsapp_numero columns for clinic location
--              and WhatsApp contact information
-- ============================================================================

-- Add Google Maps URL column
ALTER TABLE clinic_info
ADD COLUMN google_maps_url TEXT;

-- Add WhatsApp number column
ALTER TABLE clinic_info
ADD COLUMN whatsapp_numero TEXT;

-- Comments
COMMENT ON COLUMN clinic_info.google_maps_url IS 'Google Maps URL for clinic location';
COMMENT ON COLUMN clinic_info.whatsapp_numero IS 'WhatsApp contact number in format +5491XXXXXXXXX';
