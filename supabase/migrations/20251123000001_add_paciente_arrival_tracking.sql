-- Add column to track patient arrival at consultorio
ALTER TABLE consultas
ADD COLUMN paciente_llego_timestamp timestamptz NULL;

-- Add comment for documentation
COMMENT ON COLUMN consultas.paciente_llego_timestamp IS 'Timestamp when receptionist marks patient as present at consultorio. Editable. Only relevant when estado = programada.';
