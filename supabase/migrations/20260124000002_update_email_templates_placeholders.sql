-- ============================================================================
-- Migration: Update email templates to use separate nombre/apellido placeholders
-- Description: Updates the default email templates to use {{paciente_nombre}} for
--              first name only and adds {{paciente_apellido}} for last name.
--              Also documents new placeholders: {{whatsapp_numero}}, {{google_maps_url}}
-- ============================================================================

-- Update the default templates to use both nombre and apellido placeholders
UPDATE public.email_templates
SET
    -- Confirmación de Turno
    confirmacion_turno = E'Hola {{paciente_nombre}} {{paciente_apellido}},\n\nSu turno ha sido confirmado con los siguientes datos:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nPor favor, llegue 10 minutos antes de su cita con su documento de identidad.\n\nSi necesita reprogramar o cancelar su turno, contáctenos al {{telefono}}.',

    -- Recordatorio de Consulta
    recordatorio_consulta = E'Hola {{paciente_nombre}} {{paciente_apellido}},\n\nLe recordamos que tiene una consulta programada:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nRecuerde llegar 10 minutos antes de su cita y traer su documento de identidad.\n\nSi no puede asistir, por favor avísenos con anticipación llamando al {{telefono}}.',

    -- Cancelación de Turno
    cancelacion_turno = E'Hola {{paciente_nombre}} {{paciente_apellido}},\n\nLamentamos informarle que su turno ha sido cancelado:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\n\nPedimos disculpas por cualquier inconveniente que esto pueda causarle.\n\nPara reprogramar su consulta, puede contactarnos al {{telefono}} o visitarnos personalmente.\n\nAgradecemos su comprensión.',

    updated_at = NOW();

-- Update comments to document all supported placeholders
COMMENT ON COLUMN public.email_templates.confirmacion_turno IS 'Template message for appointment confirmation emails. Supported placeholders: {{paciente_nombre}} (first name), {{paciente_apellido}} (last name), {{medico_nombre}}, {{fecha}}, {{hora}}, {{direccion}}, {{telefono}}, {{whatsapp_numero}}, {{google_maps_url}}';
COMMENT ON COLUMN public.email_templates.recordatorio_consulta IS 'Template message for appointment reminder emails. Supports same placeholders as confirmacion_turno.';
COMMENT ON COLUMN public.email_templates.cancelacion_turno IS 'Template message for appointment cancellation emails. Supports same placeholders as confirmacion_turno.';
