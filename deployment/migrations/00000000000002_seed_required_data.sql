-- Migration: Seed Required Data
-- Description: Seeds essential data required for the app to function
-- This runs AFTER the schema is created
-- Date: 2025-01-29

-- =============================================================================
-- ROLES (Required for authentication/authorization)
-- =============================================================================
-- IMPORTANT: Role names must match RLS helper functions
-- (is_admin() checks 'Administracion', is_odontologo() checks 'Odontologo')
INSERT INTO public.roles (nombre, descripcion) VALUES
    ('Administracion', 'Administrador del sistema con acceso completo a todas las funcionalidades'),
    ('Odontologo', 'Odontologo con acceso al portal de solicitudes y perfil profesional')
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================================
-- ESTADOS CONSULTA (Required for appointment status management)
-- =============================================================================
INSERT INTO public.estados_consulta (codigo, nombre, descripcion, es_estado_final, orden) VALUES
    ('programada', 'Programada', 'Consulta agendada y pendiente de atención', false, 1),
    ('en_curso', 'En Curso', 'El médico está atendiendo al paciente', false, 2),
    ('completada', 'Completada', 'Consulta completada con registro médico guardado', true, 3),
    ('cancelada', 'Cancelada', 'Consulta cancelada con aviso previo', true, 4),
    ('ausente', 'Paciente Ausente', 'Paciente no se presentó a la consulta', true, 5)
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================================
-- EMAIL TEMPLATES (Required for email functionality - Singleton table)
-- =============================================================================
-- Only insert if table is empty (singleton pattern)
INSERT INTO public.email_templates (
    confirmacion_turno,
    recordatorio_consulta,
    cancelacion_turno
)
SELECT
    -- Confirmación de Turno
    E'Hola {{paciente_nombre}},\n\nSu turno ha sido confirmado con los siguientes datos:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nPor favor, llegue 10 minutos antes de su cita con su documento de identidad.\n\nSi necesita reprogramar o cancelar su turno, contáctenos al {{telefono}}.',

    -- Recordatorio de Consulta
    E'Hola {{paciente_nombre}},\n\nLe recordamos que tiene una consulta programada:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nRecuerde llegar 10 minutos antes de su cita y traer su documento de identidad.\n\nSi no puede asistir, por favor avísenos con anticipación llamando al {{telefono}}.',

    -- Cancelación de Turno
    E'Hola {{paciente_nombre}},\n\nLamentamos informarle que su turno ha sido cancelado:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\n\nPedimos disculpas por cualquier inconveniente que esto pueda causarle.\n\nPara reprogramar su consulta, puede contactarnos al {{telefono}} o visitarnos personalmente.\n\nAgradecemos su comprensión.'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates LIMIT 1);

-- =============================================================================
-- EMAIL CONFIG (Singleton - Required for email system)
-- =============================================================================
-- Only insert if table is empty (singleton pattern)
INSERT INTO public.email_config (
    enabled,
    provider,
    smtp_host,
    smtp_port,
    reminders_enabled,
    reminder_hours_before
)
SELECT
    false,
    'gmail',
    'smtp.gmail.com',
    587,
    true,
    24
WHERE NOT EXISTS (SELECT 1 FROM public.email_config LIMIT 1);

-- =============================================================================
-- CLINIC INFO (Singleton - Required for branding and emails)
-- =============================================================================
-- Only insert if table is empty (singleton pattern)
INSERT INTO public.clinic_info (
    nombre,
    descripcion
)
SELECT
    'Clínica Dermatológica',
    'Especialistas en dermatología clínica y estética'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_info LIMIT 1);

-- =============================================================================
-- CRON CONFIG (Required for email reminder cron job)
-- =============================================================================
-- NOTE: Update these values after deployment!
INSERT INTO public.cron_config (key, value, description) VALUES
    ('reminder_url', 'https://your-app.vercel.app', 'Base URL of the deployed application'),
    ('cron_secret', 'replace-with-your-secret', 'Secret key for authenticating cron requests')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After running this migration, verify with:
-- SELECT COUNT(*) FROM roles;           -- Should be 2
-- SELECT COUNT(*) FROM estados_consulta; -- Should be 5
-- SELECT COUNT(*) FROM email_templates;  -- Should be 1
-- SELECT COUNT(*) FROM email_config;     -- Should be 1
-- SELECT COUNT(*) FROM clinic_info;      -- Should be 1
-- SELECT COUNT(*) FROM cron_config;      -- Should be 2
