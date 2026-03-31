SELECT 
  'Pacientes:' as type,
  id,
  nombre || ' ' || apellido as name
FROM pacientes
LIMIT 3;

SELECT 
  'Medicos:' as type,
  id,
  nombre || ' ' || apellido as name
FROM medicos
LIMIT 3;

SELECT 
  'Estados:' as type,
  id,
  codigo as name
FROM estados_consulta;
