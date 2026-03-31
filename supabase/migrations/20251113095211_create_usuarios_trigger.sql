-- Migration: Create trigger for auto-creating usuarios_pms records
-- Description: Creates a trigger that automatically creates a usuarios_pms record when a new user is created in auth.users
-- Date: 2025-11-13
-- Note: Since admins create users, the trigger will create a record with NULL values that need to be filled by the admin

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get the Recepcionista role ID as default (can be changed by admin later)
    SELECT id INTO default_role_id
    FROM public.roles
    WHERE nombre = 'Recepcionista'
    LIMIT 1;

    -- If no default role is found, raise an error
    IF default_role_id IS NULL THEN
        RAISE EXCEPTION 'Default role (Recepcionista) not found in roles table';
    END IF;

    -- Create usuarios_pms record with email from auth.users
    -- nombre and apellido will need to be set by admin after user creation
    INSERT INTO public.usuarios_pms (
        id,
        nombre,
        apellido,
        email,
        rol_id,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Pendiente'),
        COALESCE(NEW.raw_user_meta_data->>'apellido', 'Completar'),
        NEW.email,
        default_role_id,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a usuarios_pms record when a new user is added to auth.users';

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
