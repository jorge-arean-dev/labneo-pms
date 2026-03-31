-- Migration: Insert existing user into usuarios_pms
-- Description: Creates a usuarios_pms entry for the existing admin user Jorge Arean
-- Date: 2025-11-13

-- Insert the existing user into usuarios_pms
-- The email will be fetched from auth.users
INSERT INTO public.usuarios_pms (
    id,
    nombre,
    apellido,
    email,
    rol_id,
    created_at,
    updated_at
)
SELECT
    '34688d2e-015d-4102-9a96-0bea86b443ee'::uuid,
    'Jorge',
    'Arean',
    u.email,
    '0e5b82ec-271b-46c1-802b-ee959c26de8b'::uuid,
    NOW(),
    NOW()
FROM auth.users u
WHERE u.id = '34688d2e-015d-4102-9a96-0bea86b443ee'
ON CONFLICT (id) DO NOTHING;
