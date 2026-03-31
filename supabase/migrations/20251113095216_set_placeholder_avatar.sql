-- Migration: Set placeholder avatar for existing user
-- Description: Sets a temporary placeholder avatar URL for the admin user
-- Date: 2025-11-13
-- Note: This will be replaced when the user uploads their actual avatar through the UI

-- Update the admin user with a placeholder avatar URL
UPDATE public.usuarios_pms
SET foto_perfil_url = '/default-avatar.svg'
WHERE id = '34688d2e-015d-4102-9a96-0bea86b443ee'
AND foto_perfil_url IS NULL;
