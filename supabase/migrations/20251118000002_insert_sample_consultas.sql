-- Migration: Insert sample consultas for testing
-- Description: Creates 3 sample consultas with different estados for testing the consultas detail page
-- Date: 2025-11-18

-- Insert sample consulta #1: Programada (scheduled for future)
INSERT INTO public.consultas (
  paciente_id,
  medico_id,
  fecha_hora,
  motivo,
  estado_id,
  tipo_consulta,
  created_by,
  updated_by
)
SELECT
  (SELECT id FROM public.pacientes ORDER BY created_at LIMIT 1) as paciente_id,
  (SELECT id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1) as medico_id,
  NOW() + INTERVAL '3 days' as fecha_hora,
  'Control de rutina - revisión de lunares' as motivo,
  (SELECT id FROM public.estados_consulta WHERE codigo = 'programada') as estado_id,
  'control' as tipo_consulta,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as created_by,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as updated_by
WHERE
  EXISTS (SELECT 1 FROM public.pacientes LIMIT 1)
  AND EXISTS (SELECT 1 FROM public.medicos WHERE deleted_at IS NULL LIMIT 1);

-- Insert sample consulta #2: Completada (with full medical data)
INSERT INTO public.consultas (
  paciente_id,
  medico_id,
  fecha_hora,
  motivo,
  estado_id,
  tipo_consulta,
  informe,
  diagnostico,
  tratamiento,
  receta,
  created_by,
  updated_by
)
SELECT
  (SELECT id FROM public.pacientes ORDER BY created_at LIMIT 1 OFFSET 0) as paciente_id,
  (SELECT id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1) as medico_id,
  NOW() - INTERVAL '7 days' as fecha_hora,
  'Consulta por mancha en la piel - brazo derecho' as motivo,
  (SELECT id FROM public.estados_consulta WHERE codigo = 'completada') as estado_id,
  'primera_vez' as tipo_consulta,
  'Paciente presenta lesión pigmentada de 5mm de diámetro en antebrazo derecho. Bordes irregulares. Realizamos dermatoscopía.' as informe,
  'Nevo melanocítico atípico - requiere seguimiento' as diagnostico,
  'Control dermatológico cada 6 meses. Protección solar SPF 50+. Evitar exposición solar entre 10-16hs.' as tratamiento,
  'Protector solar La Roche-Posay Anthelios SPF 50+ - aplicar cada 3 horas' as receta,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as created_by,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as updated_by
WHERE
  EXISTS (SELECT 1 FROM public.pacientes LIMIT 1)
  AND EXISTS (SELECT 1 FROM public.medicos WHERE deleted_at IS NULL LIMIT 1);

-- Insert sample consulta #3: En curso (currently ongoing)
INSERT INTO public.consultas (
  paciente_id,
  medico_id,
  fecha_hora,
  motivo,
  estado_id,
  tipo_consulta,
  informe,
  created_by,
  updated_by
)
SELECT
  (SELECT id FROM public.pacientes ORDER BY created_at LIMIT 1 OFFSET 1) as paciente_id,
  (SELECT id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1) as medico_id,
  NOW() - INTERVAL '30 minutes' as fecha_hora,
  'Dermatitis atópica - brote agudo' as motivo,
  (SELECT id FROM public.estados_consulta WHERE codigo = 'en_curso') as estado_id,
  'urgencia' as tipo_consulta,
  'Paciente presenta eritema y descamación en zonas de flexión. Prurito intenso.' as informe,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as created_by,
  (SELECT user_id FROM public.medicos WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1)::uuid as updated_by
WHERE
  EXISTS (SELECT 1 FROM public.pacientes LIMIT 1 OFFSET 1)
  AND EXISTS (SELECT 1 FROM public.medicos WHERE deleted_at IS NULL LIMIT 1);

-- Add comment
COMMENT ON TABLE public.consultas IS 'Stores appointments and medical consultations. Sample data added on 2025-11-18 for testing.';
