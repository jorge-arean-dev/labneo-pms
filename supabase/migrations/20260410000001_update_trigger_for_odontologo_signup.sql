-- Migration: Update handle_new_user() trigger for odontólogo self-signup
-- Description: The trigger now assigns the "Odontologo" role for self-signups
-- (detected via is_odontologo_signup metadata flag) and creates an
-- odontologos_perfil row with the 5 professional fields from metadata.
-- For admin-created users (no flag), it falls back to "Administracion".
-- Date: 2026-04-10

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
    is_odontologo BOOLEAN;
BEGIN
    is_odontologo := COALESCE((NEW.raw_user_meta_data->>'is_odontologo_signup')::boolean, false);

    IF is_odontologo THEN
        SELECT id INTO target_role_id FROM public.roles WHERE nombre = 'Odontologo' LIMIT 1;
    ELSE
        SELECT id INTO target_role_id FROM public.roles WHERE nombre = 'Administracion' LIMIT 1;
    END IF;

    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Target role not found in roles table';
    END IF;

    -- Create usuarios_pms record
    INSERT INTO public.usuarios_pms (
        id, nombre, apellido, email, rol_id, created_at, updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Pendiente'),
        COALESCE(NEW.raw_user_meta_data->>'apellido', 'Completar'),
        NEW.email,
        target_role_id,
        NOW(), NOW()
    );

    -- For odontólogo self-signups, also create the perfil row
    IF is_odontologo THEN
        INSERT INTO public.odontologos_perfil (
            usuario_id, telefono, localidad_id, cuit, situacion_iva, direccion_consultorio
        ) VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'telefono',
            NULLIF(NEW.raw_user_meta_data->>'localidad_id', '')::uuid,
            NEW.raw_user_meta_data->>'cuit',
            NEW.raw_user_meta_data->>'situacion_iva',
            NEW.raw_user_meta_data->>'direccion_consultorio'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates usuarios_pms record on auth.users INSERT. For odontólogo self-signups, also creates odontologos_perfil with professional data from metadata.';
