-- Migration: Create audit triggers
-- Description: Creates triggers to auto-populate created_by and updated_by fields
-- Date: 2025-11-14

-- Function to set created_by on INSERT
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_created_by() IS 'Automatically sets created_by to the current authenticated user on INSERT';

-- Function to set updated_by on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_by() IS 'Automatically sets updated_by to the current authenticated user on UPDATE';

-- Apply triggers to obras_sociales
CREATE TRIGGER set_obras_sociales_created_by
    BEFORE INSERT ON public.obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_obras_sociales_updated_by
    BEFORE UPDATE ON public.obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Apply triggers to pacientes
CREATE TRIGGER set_pacientes_created_by
    BEFORE INSERT ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_pacientes_updated_by
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Apply triggers to medicos
CREATE TRIGGER set_medicos_created_by
    BEFORE INSERT ON public.medicos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_medicos_updated_by
    BEFORE UPDATE ON public.medicos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Apply triggers to medicos_obras_sociales
CREATE TRIGGER set_medicos_obras_sociales_created_by
    BEFORE INSERT ON public.medicos_obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_medicos_obras_sociales_updated_by
    BEFORE UPDATE ON public.medicos_obras_sociales
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Apply triggers to consultas
CREATE TRIGGER set_consultas_created_by
    BEFORE INSERT ON public.consultas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_consultas_updated_by
    BEFORE UPDATE ON public.consultas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();

-- Apply triggers to medicos_horarios
CREATE TRIGGER set_medicos_horarios_created_by
    BEFORE INSERT ON public.medicos_horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by();

CREATE TRIGGER set_medicos_horarios_updated_by
    BEFORE UPDATE ON public.medicos_horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_by();
