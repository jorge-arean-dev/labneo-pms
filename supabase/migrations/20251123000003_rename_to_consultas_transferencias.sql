-- Rename table to match plural naming convention
ALTER TABLE consulta_transferencias RENAME TO consultas_transferencias;

-- Rename indexes to match new table name
ALTER INDEX idx_consulta_transferencias_consulta_id RENAME TO idx_consultas_transferencias_consulta_id;
ALTER INDEX idx_consulta_transferencias_medico_origen RENAME TO idx_consultas_transferencias_medico_origen;
ALTER INDEX idx_consulta_transferencias_medico_destino RENAME TO idx_consultas_transferencias_medico_destino;
