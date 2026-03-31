-- ============================================================================
-- PMS (Patient Management System) - Consolidated Schema
-- Generated from reference database for clean deployments
-- Last updated: 2026-02-06
-- ============================================================================
--
-- This file creates ALL tables, functions, triggers, indexes, and RLS policies
-- needed for a new PMS deployment. Run this ONCE on a fresh Supabase project.
--
-- After running this schema:
--   1. Run 00000000000001_storage_setup.sql for storage buckets
--   2. Run 00000000000002_seed_required_data.sql for seed data
--   3. Create the admin user manually (see REPLICATION-GUIDE.md)
-- ============================================================================

-- ============================================================================
-- PART 1: CORE UTILITY FUNCTIONS
-- ============================================================================

-- Function: update_updated_at_column()
-- Purpose: Auto-updates updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: update_email_templates_updated_at()
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: ROLES TABLE
-- ============================================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'User roles for access control: Administrador, Medico, Recepcionista';

CREATE INDEX idx_roles_nombre ON roles(nombre);

-- ============================================================================
-- PART 3: USUARIOS_PMS TABLE (User Profiles)
-- ============================================================================

CREATE TABLE usuarios_pms (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  foto_perfil_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

COMMENT ON TABLE usuarios_pms IS 'PMS user profiles linked to Supabase auth.users';
COMMENT ON COLUMN usuarios_pms.activated_at IS 'Timestamp when user completed account activation by setting their password. NULL means account setup is pending.';

CREATE INDEX idx_usuarios_pms_email ON usuarios_pms(email);
CREATE INDEX idx_usuarios_pms_nombre_apellido ON usuarios_pms(nombre, apellido);
CREATE INDEX idx_usuarios_pms_rol_id ON usuarios_pms(rol_id);

CREATE TRIGGER update_usuarios_pms_updated_at
  BEFORE UPDATE ON usuarios_pms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: RLS HELPER FUNCTIONS
-- ============================================================================

-- Function: get_user_role()
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.nombre
  FROM public.usuarios_pms u
  JOIN public.roles r ON u.rol_id = r.id
  WHERE u.id = auth.uid();
$$;

-- Function: get_user_rol_id(user_id)
CREATE OR REPLACE FUNCTION get_user_rol_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT rol_id FROM public.usuarios_pms WHERE id = user_id);
END;
$$;

-- Function: get_user_email(user_id)
CREATE OR REPLACE FUNCTION get_user_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT email FROM public.usuarios_pms WHERE id = user_id);
END;
$$;

-- Function: is_admin() - no params
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Administrador'
  );
$$;

-- Function: is_admin(user_id) - with param
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.usuarios_pms u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = user_id
        AND r.nombre = 'Administrador'
    );
END;
$$;

-- Function: is_medico()
CREATE OR REPLACE FUNCTION is_medico()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Medico'
  );
$$;

-- Function: is_recepcionista()
CREATE OR REPLACE FUNCTION is_recepcionista()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_pms u
    JOIN public.roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre = 'Recepcionista'
  );
$$;

-- Function: is_staff_member(user_id)
CREATE OR REPLACE FUNCTION is_staff_member(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.usuarios_pms u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = user_id
        AND r.nombre IN ('Recepcionista', 'Medico', 'Administrador')
    );
END;
$$;

-- ============================================================================
-- PART 5: USER CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
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

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 6: OBRAS_SOCIALES TABLE (Insurance Providers)
-- ============================================================================

CREATE TABLE obras_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  sitio_web TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE obras_sociales IS 'Insurance providers/health plans that patients may have';
COMMENT ON COLUMN obras_sociales.is_active IS 'Whether the insurance provider is active (true) or inactive (false)';

CREATE INDEX idx_obras_sociales_is_active ON obras_sociales(is_active);
CREATE INDEX idx_obras_sociales_nombre ON obras_sociales(nombre);
CREATE INDEX idx_obras_sociales_codigo ON obras_sociales(codigo);

CREATE TRIGGER update_obras_sociales_updated_at
  BEFORE UPDATE ON obras_sociales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: PACIENTES TABLE (Patients)
-- ============================================================================

CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE,
  genero TEXT CHECK (genero IN ('M', 'F', 'Otro')),
  telefono TEXT,
  email TEXT,
  domicilio TEXT,
  obra_social_id UUID REFERENCES obras_sociales(id),
  plan TEXT,
  numero_afiliado TEXT,
  foto_perfil_url TEXT,
  notas TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  consentimiento_datos BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE pacientes IS 'Patient records with demographics and insurance information';
COMMENT ON COLUMN pacientes.is_active IS 'Whether the patient is active (true) or inactive (false)';

CREATE TRIGGER update_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for common searches
CREATE INDEX idx_pacientes_dni ON pacientes(dni);
CREATE INDEX idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX idx_pacientes_apellido ON pacientes(apellido);
CREATE INDEX idx_pacientes_nombre_apellido ON pacientes(nombre, apellido);
CREATE INDEX idx_pacientes_is_active ON pacientes(is_active);
CREATE INDEX idx_pacientes_email ON pacientes(email);
CREATE INDEX idx_pacientes_telefono ON pacientes(telefono);
CREATE INDEX idx_pacientes_obra_social_id ON pacientes(obra_social_id);

-- ============================================================================
-- PART 8: MEDICOS TABLE (Doctors)
-- ============================================================================

CREATE TABLE medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  matricula TEXT UNIQUE,
  user_id UUID NOT NULL UNIQUE REFERENCES usuarios_pms(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE medicos IS 'Doctor profiles linked to usuarios_pms (enables Supabase joins)';
COMMENT ON COLUMN medicos.deleted_at IS 'Soft delete timestamp - NULL means active';

CREATE TRIGGER update_medicos_updated_at
  BEFORE UPDATE ON medicos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_medicos_user_id ON medicos(user_id);
CREATE INDEX idx_medicos_email ON medicos(email);
CREATE INDEX idx_medicos_matricula ON medicos(matricula);
CREATE INDEX idx_medicos_active ON medicos(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_medicos_deleted_at ON medicos(deleted_at) WHERE deleted_at IS NOT NULL;

-- Function: get_medico_id()
CREATE OR REPLACE FUNCTION get_medico_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM medicos WHERE user_id = auth.uid() AND deleted_at IS NULL
$$;

-- ============================================================================
-- PART 9: ESTADOS_CONSULTA TABLE (Appointment Statuses)
-- ============================================================================

CREATE TABLE estados_consulta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_estado_final BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE estados_consulta IS 'Appointment status definitions: programada, en_curso, completada, cancelada, ausente';

CREATE INDEX idx_estados_consulta_codigo ON estados_consulta(codigo);
CREATE INDEX idx_estados_consulta_activo ON estados_consulta(activo);
CREATE INDEX idx_estados_consulta_orden ON estados_consulta(orden);

CREATE TRIGGER update_estados_consulta_updated_at
  BEFORE UPDATE ON estados_consulta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: get_default_estado_programada()
CREATE OR REPLACE FUNCTION get_default_estado_programada()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.estados_consulta WHERE codigo = 'programada' LIMIT 1;
$$;

-- ============================================================================
-- PART 10: MEDICOS_OBRAS_SOCIALES TABLE (Doctor-Insurance Junction)
-- ============================================================================

CREATE TABLE medicos_obras_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  obra_social_id UUID NOT NULL REFERENCES obras_sociales(id) ON DELETE CASCADE,
  porcentaje_cobertura NUMERIC CHECK (porcentaje_cobertura >= 0 AND porcentaje_cobertura <= 100),
  copago NUMERIC CHECK (copago >= 0),
  requiere_autorizacion BOOLEAN NOT NULL DEFAULT false,
  numero_convenio TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  notas TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(medico_id, obra_social_id)
);

COMMENT ON TABLE medicos_obras_sociales IS 'Doctor-insurance provider relationships';
COMMENT ON COLUMN medicos_obras_sociales.is_active IS 'Whether the doctor-insurance agreement is active (true) or inactive (false)';

CREATE INDEX idx_medicos_obras_sociales_is_active ON medicos_obras_sociales(is_active);
CREATE INDEX idx_medicos_obras_sociales_medico_id ON medicos_obras_sociales(medico_id);
CREATE INDEX idx_medicos_obras_sociales_obra_social_id ON medicos_obras_sociales(obra_social_id);

CREATE TRIGGER update_medicos_obras_sociales_updated_at
  BEFORE UPDATE ON medicos_obras_sociales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 11: CONSULTAS TABLE (Appointments/Consultations)
-- ============================================================================

CREATE TABLE consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  fecha_hora TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  estado_id UUID NOT NULL DEFAULT get_default_estado_programada() REFERENCES estados_consulta(id),
  tipo_consulta TEXT CHECK (tipo_consulta IN ('primera_vez', 'control', 'urgencia')),
  informe TEXT,
  diagnostico TEXT,
  tratamiento TEXT,
  receta TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  paciente_llego_timestamp TIMESTAMPTZ,
  origen TEXT NOT NULL DEFAULT 'web' CHECK (origen IN ('web', 'whatsapp'))
);

COMMENT ON TABLE consultas IS 'Appointments and medical consultations';
COMMENT ON COLUMN consultas.notas IS 'Private notes visible only to medicos and admins';
COMMENT ON COLUMN consultas.paciente_llego_timestamp IS 'Timestamp when patient arrived at the clinic';
COMMENT ON COLUMN consultas.origen IS 'Source of appointment: web (staff created), whatsapp (patient booking)';

CREATE TRIGGER update_consultas_updated_at
  BEFORE UPDATE ON consultas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for common queries
CREATE INDEX idx_consultas_paciente_id ON consultas(paciente_id);
CREATE INDEX idx_consultas_medico_id ON consultas(medico_id);
CREATE INDEX idx_consultas_fecha_hora ON consultas(fecha_hora);
CREATE INDEX idx_consultas_estado_id ON consultas(estado_id);
CREATE INDEX idx_consultas_medico_fecha ON consultas(medico_id, fecha_hora);
CREATE INDEX idx_consultas_tipo_consulta ON consultas(tipo_consulta);
CREATE INDEX idx_consultas_origen ON consultas(origen);

-- Enable realtime for consultas (for live updates)
ALTER TABLE consultas REPLICA IDENTITY FULL;

-- ============================================================================
-- PART 12: MEDICOS_HORARIOS TABLE (Doctor Schedules)
-- ============================================================================

CREATE TABLE medicos_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (hora_fin > hora_inicio)
);

COMMENT ON TABLE medicos_horarios IS 'Doctor weekly availability schedules (0=Sunday, 6=Saturday)';

CREATE TRIGGER update_medicos_horarios_updated_at
  BEFORE UPDATE ON medicos_horarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_medicos_horarios_medico_id ON medicos_horarios(medico_id);
CREATE INDEX idx_medicos_horarios_dia_semana ON medicos_horarios(dia_semana);
CREATE INDEX idx_medicos_horarios_medico_dia ON medicos_horarios(medico_id, dia_semana);
CREATE INDEX idx_medicos_horarios_activo ON medicos_horarios(activo);

-- ============================================================================
-- PART 13: CONSULTAS_TRANSFERENCIAS TABLE (Appointment Transfers)
-- ============================================================================

CREATE TABLE consultas_transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medico_origen_id UUID NOT NULL REFERENCES medicos(id),
  medico_destino_id UUID NOT NULL REFERENCES medicos(id),
  transferido_por_user_id UUID NOT NULL REFERENCES auth.users(id),
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE consultas_transferencias IS 'Tracks appointment transfers between doctors';

CREATE INDEX idx_consultas_transferencias_consulta_id ON consultas_transferencias(consulta_id);
CREATE INDEX idx_consultas_transferencias_medico_origen ON consultas_transferencias(medico_origen_id);
CREATE INDEX idx_consultas_transferencias_medico_destino ON consultas_transferencias(medico_destino_id);

-- ============================================================================
-- PART 14: MEDICOS_PARAMETROS_AGENDA TABLE (Scheduling Parameters)
-- ============================================================================

CREATE TABLE medicos_parametros_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL UNIQUE REFERENCES medicos(id) ON DELETE CASCADE,
  duracion_consulta INTEGER NOT NULL DEFAULT 30 CHECK (duracion_consulta > 0),
  duracion_buffer INTEGER NOT NULL DEFAULT 0 CHECK (duracion_buffer >= 0),
  max_consultas_concurrentes INTEGER NOT NULL DEFAULT 1 CHECK (max_consultas_concurrentes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE medicos_parametros_agenda IS 'Doctor scheduling configuration';
COMMENT ON COLUMN medicos_parametros_agenda.duracion_consulta IS 'Default appointment duration in minutes';
COMMENT ON COLUMN medicos_parametros_agenda.duracion_buffer IS 'Buffer time between appointments in minutes';
COMMENT ON COLUMN medicos_parametros_agenda.max_consultas_concurrentes IS 'Maximum concurrent appointments';

CREATE INDEX idx_medicos_parametros_agenda_medico_id ON medicos_parametros_agenda(medico_id);

CREATE TRIGGER update_medicos_parametros_agenda_updated_at
  BEFORE UPDATE ON medicos_parametros_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 14B: MEDICOS_BLOQUEOS_AGENDA TABLE (Doctor Blocked Dates)
-- ============================================================================

CREATE TABLE medicos_bloqueos_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  origen TEXT NOT NULL DEFAULT 'individual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT fecha_fin_gte_fecha_inicio CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT origen_valid CHECK (origen IN ('individual', 'general')),
  CONSTRAINT unique_medico_bloqueo UNIQUE (medico_id, fecha_inicio, fecha_fin)
);

COMMENT ON TABLE medicos_bloqueos_agenda IS 'Doctor blocked dates for vacations, holidays, and other unavailability periods. Full-day blocks only.';
COMMENT ON COLUMN medicos_bloqueos_agenda.fecha_inicio IS 'Block start date (YYYY-MM-DD)';
COMMENT ON COLUMN medicos_bloqueos_agenda.fecha_fin IS 'Block end date (YYYY-MM-DD), must be >= fecha_inicio';
COMMENT ON COLUMN medicos_bloqueos_agenda.motivo IS 'Optional reason for the block (e.g., Vacaciones, Feriado)';
COMMENT ON COLUMN medicos_bloqueos_agenda.origen IS 'Block origin: individual (single doctor) or general (all doctors / clinic-wide)';

CREATE INDEX idx_medicos_bloqueos_agenda_medico_id ON medicos_bloqueos_agenda(medico_id);
CREATE INDEX idx_medicos_bloqueos_agenda_fechas ON medicos_bloqueos_agenda(medico_id, fecha_inicio, fecha_fin);

CREATE TRIGGER update_medicos_bloqueos_agenda_updated_at
  BEFORE UPDATE ON medicos_bloqueos_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 15: EMAIL_CONFIG TABLE (Email System Configuration)
-- ============================================================================

CREATE TABLE email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'gmail',
  smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT,
  smtp_password_encrypted TEXT,
  sender_name TEXT,
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Singleton constraint
CREATE UNIQUE INDEX email_config_singleton ON email_config ((true));

COMMENT ON TABLE email_config IS 'System-wide email configuration (SMTP settings, reminder preferences)';

CREATE TRIGGER update_email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 16: EMAIL_REMINDERS TABLE (Scheduled Email Tracking)
-- ============================================================================

CREATE TABLE email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'gmail',
  external_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_type_check CHECK (email_type IN ('confirmacion', 'recordatorio_24h', 'cancelacion', 'reprogramacion')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'sent', 'cancelled', 'failed'))
);

COMMENT ON TABLE email_reminders IS 'Tracks all scheduled and sent email reminders for appointments';

CREATE INDEX idx_email_reminders_pending ON email_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_email_reminders_consulta ON email_reminders(consulta_id, status);
CREATE INDEX idx_email_reminders_status ON email_reminders(status, created_at DESC);

CREATE TRIGGER update_email_reminders_updated_at
  BEFORE UPDATE ON email_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 17: CLINIC_INFO TABLE (Business Information)
-- ============================================================================

CREATE TABLE clinic_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Clínica Dermatológica',
  descripcion TEXT,
  telefono TEXT,
  email TEXT,
  sitio_web TEXT,
  direccion TEXT,
  ciudad TEXT,
  provincia TEXT,
  codigo_postal TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  google_maps_url TEXT,
  whatsapp_numero TEXT,
  base_conocimientos TEXT,
  agent_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Singleton constraint
CREATE UNIQUE INDEX clinic_info_singleton ON clinic_info ((true));

COMMENT ON TABLE clinic_info IS 'Clinic/business information (singleton) used in emails and branding';
COMMENT ON COLUMN clinic_info.base_conocimientos IS 'Knowledge base content used by the WhatsApp AI receptionist agent';
COMMENT ON COLUMN clinic_info.agent_enabled IS 'Whether the WhatsApp AI receptionist agent is active';

CREATE TRIGGER update_clinic_info_updated_at
  BEFORE UPDATE ON clinic_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 18: CRON_CONFIG TABLE (pg_cron Configuration)
-- ============================================================================

CREATE TABLE cron_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cron_config IS 'Stores configuration for pg_cron jobs (reminder_url, cron_secret)';

CREATE TRIGGER update_cron_config_updated_at
  BEFORE UPDATE ON cron_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 19: BOOKING_TOKENS TABLE (WhatsApp Booking)
-- ============================================================================

CREATE TABLE booking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  phone_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  used_at TIMESTAMPTZ,
  consulta_id UUID REFERENCES consultas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE booking_tokens IS 'Secure booking tokens generated by WhatsApp agent';

CREATE INDEX idx_booking_tokens_token ON booking_tokens(token);
CREATE INDEX idx_booking_tokens_expires_at ON booking_tokens(expires_at);

-- ============================================================================
-- PART 19b: MEDICOS_ACTIVOS VIEW (WhatsApp Agent)
-- ============================================================================

CREATE VIEW medicos_activos AS
SELECT
  m.id,
  m.matricula,
  u.nombre,
  u.apellido,
  m.user_id
FROM medicos m
JOIN usuarios_pms u ON m.user_id = u.id
WHERE m.deleted_at IS NULL;

COMMENT ON VIEW medicos_activos IS 'Active doctors with names from usuarios_pms, used by WhatsApp agent';

-- ============================================================================
-- PART 19c: CREAR_BOOKING_TOKEN FUNCTION (WhatsApp Agent)
-- ============================================================================

CREATE OR REPLACE FUNCTION crear_booking_token(
  p_paciente_id UUID,
  p_medico_id UUID,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO booking_tokens (paciente_id, medico_id, phone_number)
  VALUES (p_paciente_id, p_medico_id, p_phone_number)
  RETURNING booking_tokens.token, booking_tokens.expires_at;
END;
$$;

-- ============================================================================
-- PART 20: EMAIL_TEMPLATES TABLE (Customizable Email Messages)
-- ============================================================================

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmacion_turno TEXT NOT NULL,
  recordatorio_consulta TEXT NOT NULL,
  cancelacion_turno TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE email_templates IS 'Stores customizable email template messages. Single-row table.';

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- ============================================================================
-- PART 21: AUDIT TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Apply audit triggers
CREATE TRIGGER set_pacientes_created_by BEFORE INSERT ON pacientes FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_pacientes_updated_by BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_medicos_created_by BEFORE INSERT ON medicos FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_medicos_updated_by BEFORE UPDATE ON medicos FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_consultas_created_by BEFORE INSERT ON consultas FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_consultas_updated_by BEFORE UPDATE ON consultas FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_obras_sociales_created_by BEFORE INSERT ON obras_sociales FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_obras_sociales_updated_by BEFORE UPDATE ON obras_sociales FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_medicos_horarios_created_by BEFORE INSERT ON medicos_horarios FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_medicos_horarios_updated_by BEFORE UPDATE ON medicos_horarios FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_medicos_obras_sociales_created_by BEFORE INSERT ON medicos_obras_sociales FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_medicos_obras_sociales_updated_by BEFORE UPDATE ON medicos_obras_sociales FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_medicos_parametros_agenda_created_by BEFORE INSERT ON medicos_parametros_agenda FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_medicos_parametros_agenda_updated_by BEFORE UPDATE ON medicos_parametros_agenda FOR EACH ROW EXECUTE FUNCTION set_updated_by();
CREATE TRIGGER set_medicos_bloqueos_agenda_created_by BEFORE INSERT ON medicos_bloqueos_agenda FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER set_medicos_bloqueos_agenda_updated_by BEFORE UPDATE ON medicos_bloqueos_agenda FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- ============================================================================
-- PART 22: EMAIL REMINDER CRON FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION send_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url TEXT;
  cron_secret TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration from cron_config table
  SELECT value INTO app_url FROM public.cron_config WHERE key = 'reminder_url';
  SELECT value INTO cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  -- Check if configuration exists
  IF app_url IS NULL OR app_url = '' OR app_url = 'https://your-app.vercel.app' THEN
    RAISE NOTICE 'reminder_url not configured in cron_config table. Skipping.';
    RETURN;
  END IF;

  IF cron_secret IS NULL OR cron_secret = '' OR cron_secret = 'replace-with-your-secret' THEN
    RAISE NOTICE 'cron_secret not configured in cron_config table. Skipping.';
    RETURN;
  END IF;

  -- Make HTTP request using pg_net
  SELECT net.http_post(
    url := app_url || '/api/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'Reminder job triggered, request_id: %', request_id;
END;
$$;

-- ============================================================================
-- PART 23: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_pms ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos_obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos_parametros_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos_bloqueos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- ROLES: Read-only for all authenticated
-- ----------------------------------------------------------------------------
CREATE POLICY "authenticated_users_can_view_roles" ON roles FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- USUARIOS_PMS: Complex policies for profile management
-- ----------------------------------------------------------------------------
CREATE POLICY "users_can_view_own_profile" ON usuarios_pms FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "authenticated_users_can_view_all_profiles" ON usuarios_pms FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins_can_view_all_profiles" ON usuarios_pms FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "users_can_update_own_profile" ON usuarios_pms FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK ((auth.uid() = id) AND (rol_id = get_user_rol_id(auth.uid())) AND (email = get_user_email(auth.uid())));
CREATE POLICY "admins_can_update_all_profiles" ON usuarios_pms FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_can_insert_profiles" ON usuarios_pms FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admins_can_delete_profiles" ON usuarios_pms FOR DELETE TO authenticated USING (is_admin());

-- ----------------------------------------------------------------------------
-- OBRAS_SOCIALES: All can read, admin can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "obras_sociales_select_all" ON obras_sociales FOR SELECT TO authenticated USING (true);
CREATE POLICY "obras_sociales_insert_admin" ON obras_sociales FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "obras_sociales_update_admin" ON obras_sociales FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "obras_sociales_delete_admin" ON obras_sociales FOR DELETE TO authenticated USING (is_admin());

-- ----------------------------------------------------------------------------
-- PACIENTES: All roles can view, staff can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "pacientes_select_all" ON pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacientes_insert_all_roles" ON pacientes FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));
CREATE POLICY "pacientes_update_all_roles" ON pacientes FOR UPDATE TO authenticated
  USING (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'))
  WITH CHECK (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));
CREATE POLICY "pacientes_delete_admin" ON pacientes FOR DELETE TO authenticated USING (is_admin());

-- ----------------------------------------------------------------------------
-- MEDICOS: View active, admin manages, own profile editable
-- ----------------------------------------------------------------------------
CREATE POLICY "medicos_select_all" ON medicos FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "medicos_insert_admin" ON medicos FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "medicos_update_own_or_admin" ON medicos FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR (is_medico() AND id = get_medico_id())))
  WITH CHECK (is_admin() OR ((deleted_at IS NULL) AND is_medico() AND id = get_medico_id()));
CREATE POLICY "medicos_delete_admin" ON medicos FOR DELETE TO authenticated USING (is_admin());

-- ----------------------------------------------------------------------------
-- ESTADOS_CONSULTA: All can read, admin manages
-- ----------------------------------------------------------------------------
CREATE POLICY "estados_consulta_select_all" ON estados_consulta FOR SELECT TO authenticated USING (true);
CREATE POLICY "estados_consulta_insert_admin" ON estados_consulta FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "estados_consulta_update_admin" ON estados_consulta FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "estados_consulta_delete_admin" ON estados_consulta FOR DELETE TO authenticated USING (is_admin());

-- ----------------------------------------------------------------------------
-- MEDICOS_OBRAS_SOCIALES: All can read, admin/owner can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "medicos_obras_sociales_select_all" ON medicos_obras_sociales FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicos_obras_sociales_insert_own_or_admin" ON medicos_obras_sociales FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_obras_sociales_update_own_or_admin" ON medicos_obras_sociales FOR UPDATE TO authenticated
  USING (is_admin() OR (is_medico() AND medico_id = get_medico_id()))
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_obras_sociales_delete_own_or_admin" ON medicos_obras_sociales FOR DELETE TO authenticated
  USING (is_admin() OR (is_medico() AND medico_id = get_medico_id()));

-- ----------------------------------------------------------------------------
-- CONSULTAS: Complex rules based on role
-- ----------------------------------------------------------------------------
CREATE POLICY "consultas_select_all" ON consultas FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultas_insert_all_roles" ON consultas FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));
CREATE POLICY "consultas_update_all_roles" ON consultas FOR UPDATE TO authenticated
  USING (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'))
  WITH CHECK (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));
CREATE POLICY "consultas_delete_all_roles" ON consultas FOR DELETE TO authenticated
  USING (get_user_role() IN ('Recepcionista', 'Medico', 'Administrador'));

-- ----------------------------------------------------------------------------
-- MEDICOS_HORARIOS: All can read, admin/owner can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "medicos_horarios_select_all" ON medicos_horarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicos_horarios_insert_own_or_admin" ON medicos_horarios FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_horarios_update_own_or_admin" ON medicos_horarios FOR UPDATE TO authenticated
  USING (is_admin() OR (is_medico() AND medico_id = get_medico_id()))
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_horarios_delete_own_or_admin" ON medicos_horarios FOR DELETE TO authenticated
  USING (is_admin() OR (is_medico() AND medico_id = get_medico_id()));

-- ----------------------------------------------------------------------------
-- CONSULTAS_TRANSFERENCIAS: All can read and create
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view consulta transfers" ON consultas_transferencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create consulta transfers" ON consultas_transferencias FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- MEDICOS_PARAMETROS_AGENDA: All can read, admin/owner can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "medicos_parametros_agenda_select_all" ON medicos_parametros_agenda FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicos_parametros_agenda_insert_own_or_admin" ON medicos_parametros_agenda FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_parametros_agenda_update_own_or_admin" ON medicos_parametros_agenda FOR UPDATE TO authenticated
  USING (is_admin() OR (is_medico() AND medico_id = get_medico_id()))
  WITH CHECK (is_admin() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_parametros_agenda_delete_admin" ON medicos_parametros_agenda FOR DELETE TO authenticated
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- MEDICOS_BLOQUEOS_AGENDA: All can read, admin/recepcionista/owner can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "medicos_bloqueos_agenda_select_all" ON medicos_bloqueos_agenda FOR SELECT TO authenticated USING (true);
CREATE POLICY "medicos_bloqueos_agenda_insert_all_roles" ON medicos_bloqueos_agenda FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_recepcionista() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_bloqueos_agenda_update_all_roles" ON medicos_bloqueos_agenda FOR UPDATE TO authenticated
  USING (is_admin() OR is_recepcionista() OR (is_medico() AND medico_id = get_medico_id()))
  WITH CHECK (is_admin() OR is_recepcionista() OR (is_medico() AND medico_id = get_medico_id()));
CREATE POLICY "medicos_bloqueos_agenda_delete_all_roles" ON medicos_bloqueos_agenda FOR DELETE TO authenticated
  USING (is_admin() OR is_recepcionista() OR (is_medico() AND medico_id = get_medico_id()));

-- ----------------------------------------------------------------------------
-- EMAIL_CONFIG: Authenticated can view, admin can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view email config" ON email_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert email_config" ON email_config FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update email_config" ON email_config FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- EMAIL_REMINDERS: Admin manages, staff can view related
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can manage email_reminders" ON email_reminders FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Users can view reminders for their consultas" ON email_reminders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM consultas c
    WHERE c.id = email_reminders.consulta_id
    AND (is_admin() OR (is_medico() AND c.medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid())) OR is_recepcionista())
  ));

-- ----------------------------------------------------------------------------
-- CLINIC_INFO: All can read, admin can manage
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view clinic info" ON clinic_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon users can view clinic_info" ON clinic_info FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can insert clinic_info" ON clinic_info FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update clinic_info" ON clinic_info FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- CRON_CONFIG: Service role and postgres only
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role can manage cron_config" ON cron_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Postgres role can read cron_config" ON cron_config FOR SELECT TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- BOOKING_TOKENS: Public read, service role manages
-- ----------------------------------------------------------------------------
CREATE POLICY "booking_tokens_public_read" ON booking_tokens FOR SELECT USING (true);
CREATE POLICY "booking_tokens_service_insert" ON booking_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "booking_tokens_service_update" ON booking_tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "booking_tokens_authenticated_read" ON booking_tokens FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- EMAIL_TEMPLATES: Authenticated can read/manage
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read email templates" ON email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update email templates" ON email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert email templates" ON email_templates FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
