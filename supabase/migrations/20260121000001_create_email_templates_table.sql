-- Create email_templates table for customizable email template messages
-- This is a single-row table (upsert pattern) that stores the editable message portions of email templates

CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmacion_turno TEXT NOT NULL,
    recordatorio_consulta TEXT NOT NULL,
    cancelacion_turno TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.email_templates IS 'Stores customizable email template messages. Single-row table.';
COMMENT ON COLUMN public.email_templates.confirmacion_turno IS 'Template message for appointment confirmation emails. Supports placeholders: {{paciente_nombre}}, {{medico_nombre}}, {{fecha}}, {{hora}}, {{direccion}}, {{telefono}}';
COMMENT ON COLUMN public.email_templates.recordatorio_consulta IS 'Template message for appointment reminder emails. Supports same placeholders.';
COMMENT ON COLUMN public.email_templates.cancelacion_turno IS 'Template message for appointment cancellation emails. Supports same placeholders.';

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read (for sending emails)
CREATE POLICY "Authenticated users can read email templates"
    ON public.email_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can update (via service role or explicit admin check)
-- For simplicity, we'll handle admin check in the application layer
CREATE POLICY "Authenticated users can update email templates"
    ON public.email_templates
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert email templates"
    ON public.email_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_templates_updated_at();

-- Insert default templates (single row)
INSERT INTO public.email_templates (
    confirmacion_turno,
    recordatorio_consulta,
    cancelacion_turno
) VALUES (
    -- Confirmación de Turno
    E'Hola {{paciente_nombre}},\n\nSu turno ha sido confirmado con los siguientes datos:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nPor favor, llegue 10 minutos antes de su cita con su documento de identidad.\n\nSi necesita reprogramar o cancelar su turno, contáctenos al {{telefono}}.',

    -- Recordatorio de Consulta
    E'Hola {{paciente_nombre}},\n\nLe recordamos que tiene una consulta programada:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\nDirección: {{direccion}}\n\nRecuerde llegar 10 minutos antes de su cita y traer su documento de identidad.\n\nSi no puede asistir, por favor avísenos con anticipación llamando al {{telefono}}.',

    -- Cancelación de Turno
    E'Hola {{paciente_nombre}},\n\nLamentamos informarle que su turno ha sido cancelado:\n\nFecha: {{fecha}}\nHora: {{hora}}\nProfesional: {{medico_nombre}}\n\nPedimos disculpas por cualquier inconveniente que esto pueda causarle.\n\nPara reprogramar su consulta, puede contactarnos al {{telefono}} o visitarnos personalmente.\n\nAgradecemos su comprensión.'
);
