-- Migration: Seed obras_sociales table with sample data
-- Description: Inserts 6 entries including 5 common Argentine insurance providers and 'Particular' for self-pay patients
-- Date: 2025-11-15

-- Insert sample obras sociales
INSERT INTO public.obras_sociales (
    nombre,
    codigo,
    telefono,
    email,
    direccion,
    sitio_web,
    estado,
    notas,
    created_by,
    updated_by
) VALUES
(
    'OSDE',
    'OS-001',
    '0810-555-6733',
    'atencion@osde.com.ar',
    'Av. Leandro N. Alem 1067, CABA',
    'https://www.osde.com.ar',
    'activa',
    'Prepaga líder en Argentina. Amplia red de prestadores. Planes premium.',
    NULL,
    NULL
),
(
    'Swiss Medical',
    'SM-001',
    '0810-333-7947',
    'info@swissmedical.com.ar',
    'Av. del Libertador 6650, CABA',
    'https://www.swissmedical.com.ar',
    'activa',
    'Mayor red médica nacional. Infraestructura propia. Más de 100,000 profesionales.',
    NULL,
    NULL
),
(
    'Galeno',
    'GAL-001',
    '0810-444-2253',
    'contacto@galeno.com.ar',
    'Av. Corrientes 880, CABA',
    'https://www.galeno.com.ar',
    'activa',
    'Mayor infraestructura de sanatorios propios. Planes con reintegros.',
    NULL,
    NULL
),
(
    'IOMA',
    'IOMA-001',
    '0221-429-9600',
    'consultas@ioma.gba.gob.ar',
    'Calle 46 N° 648, La Plata, Buenos Aires',
    'https://www.ioma.gba.gob.ar',
    'activa',
    'Obra social provincial de Buenos Aires. Empleados públicos provinciales.',
    NULL,
    NULL
),
(
    'PAMI',
    'PAMI-001',
    '138',
    'consultas@pami.org.ar',
    'Av. Corrientes 2032, CABA',
    'https://www.pami.org.ar',
    'activa',
    'Obra social nacional para jubilados y pensionados mayores de 60 años.',
    NULL,
    NULL
),
(
    'Particular',
    'PART-001',
    NULL,
    NULL,
    NULL,
    NULL,
    'activa',
    'Paciente sin cobertura de obra social. Pago particular de consulta.',
    NULL,
    NULL
)
ON CONFLICT (nombre) DO NOTHING;

-- Add comment about seed data
COMMENT ON TABLE public.obras_sociales IS 'Stores insurance provider information. Seeded with 5 common Argentine insurance providers plus Particular for self-pay patients.';
