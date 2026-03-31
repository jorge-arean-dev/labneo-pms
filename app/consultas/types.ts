import { TipoConsulta } from "@/lib/constants/consulta-types"

/**
 * Consulta entity with joined patient and doctor data
 */
export interface Consulta {
  id: string
  paciente_id: string
  medico_id: string
  fecha_hora: string
  estado_id: string
  tipo_consulta: TipoConsulta | null
  motivo: string | null
  informe: string | null
  diagnostico: string | null
  tratamiento: string | null
  receta: string | null
  notas: string | null
  paciente_llego_timestamp: string | null
  created_at: string
  updated_at: string
  // Joined data
  paciente_nombre: string
  paciente_apellido: string
  paciente_dni: string
  paciente_email: string | null
  paciente_fecha_nacimiento: string
  paciente_plan: string | null
  paciente_numero_afiliado: string | null
  paciente_obra_social: { id: string; nombre: string } | null
  medico_nombre: string
  medico_apellido: string
  estado_nombre: string
  estado_codigo: string
}

/**
 * Médico option for filter dropdown and transfer dialog
 */
export interface MedicoOption {
  id: string
  nombre: string
  apellido: string
  deleted_at: string | null
}

/**
 * Estado option for filter dropdown
 */
export interface EstadoOption {
  id: string
  codigo: string
  nombre: string
}

/**
 * Paciente search result for combobox
 */
export interface PacienteSearchResult {
  id: string
  dni: string
  nombre: string
  apellido: string
}

/**
 * Consulta transfer audit record
 */
export interface ConsultaTransferencia {
  id: string
  consulta_id: string
  medico_origen_id: string
  medico_destino_id: string
  transferido_por_user_id: string
  motivo: string | null
  created_at: string
}

/**
 * Date filter type for consultas pagination
 */
export type DateFilterType = "hoy" | "semana" | "rango" | "todas"

/**
 * Sort options for consultas pagination
 */
export type SortOption =
  | "fecha_hora_desc"
  | "fecha_hora_asc"
  | "llegada_desc"
  | "llegada_asc"

/**
 * Filters for paginated consultas fetch
 */
export interface ConsultaPaginatedFilters {
  searchTerm?: string // Searches paciente DNI, nombre, apellido
  medicosIds?: string[] // Filter by medico IDs (empty = all)
  estadosIds?: string[] // Filter by estado IDs (empty = all)
  dateFilter?: DateFilterType
  fechaDesde?: string // ISO date string for range filter
  fechaHasta?: string // ISO date string for range filter
  onlyArrived?: boolean // Filter to show only consultas where patient has arrived
  sortBy?: SortOption // Sort option for server-side ordering
}

/**
 * Result of paginated consultas fetch
 */
export interface ConsultaPaginatedResult {
  data: Consulta[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}
