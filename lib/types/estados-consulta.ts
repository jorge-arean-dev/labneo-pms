/**
 * Estado de Consulta Types
 *
 * This file contains all TypeScript types and utilities for managing
 * consultation statuses (estados_consulta).
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Estado Consulta - Database schema
 */
export interface EstadoConsulta {
  id: string
  codigo: CodigoEstadoConsulta
  nombre: string
  descripcion: string | null
  es_estado_final: boolean
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

/**
 * Valid status codes for consultations
 */
export type CodigoEstadoConsulta =
  | 'programada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'ausente'

/**
 * User roles in the system
 */
export type UserRole = 'Recepcionista' | 'Medico' | 'Administrador'

// ============================================================================
// TRANSITION RULES
// ============================================================================

/**
 * Allowed state transitions for each status
 *
 * Key: Current status
 * Value: Array of allowed next statuses
 */
export const TRANSICIONES_PERMITIDAS: Record<CodigoEstadoConsulta, CodigoEstadoConsulta[]> = {
  programada: ['programada', 'cancelada', 'ausente', 'en_curso'],
  en_curso: ['completada'],
  completada: [],  // Final state - cannot transition
  cancelada: [],   // Final state - cannot transition
  ausente: []      // Final state - cannot transition
}

/**
 * Role-based permissions for status transitions
 *
 * Recepcionista: Can only change to cancelada, ausente
 * Medico: Can change to any non-final state, plus completada from en_curso
 * Administrador: Can bypass all restrictions
 */
export const PERMISOS_TRANSICION: Record<UserRole, {
  puede_crear: CodigoEstadoConsulta[]
  puede_actualizar_a: CodigoEstadoConsulta[]
  puede_bypass_restricciones: boolean
}> = {
  Recepcionista: {
    puede_crear: ['programada'],
    puede_actualizar_a: ['cancelada', 'ausente'],
    puede_bypass_restricciones: false
  },
  Medico: {
    puede_crear: ['programada'],
    puede_actualizar_a: ['cancelada', 'ausente', 'en_curso', 'completada'],
    puede_bypass_restricciones: false
  },
  Administrador: {
    puede_crear: ['programada'],
    puede_actualizar_a: ['programada', 'cancelada', 'ausente', 'en_curso', 'completada'],
    puede_bypass_restricciones: true  // Admin can do anything
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a status is a final state (cannot transition from it)
 */
export function esEstadoFinal(codigo: CodigoEstadoConsulta): boolean {
  return TRANSICIONES_PERMITIDAS[codigo].length === 0
}

/**
 * Check if a transition is allowed based on current and target status
 */
export function puedeTransicionar(
  estadoActual: CodigoEstadoConsulta,
  estadoNuevo: CodigoEstadoConsulta
): boolean {
  return TRANSICIONES_PERMITIDAS[estadoActual].includes(estadoNuevo)
}

/**
 * Check if a user role can perform a specific status transition
 *
 * @param rol - User's role
 * @param estadoActual - Current consultation status
 * @param estadoNuevo - Target consultation status
 * @returns true if the role can perform the transition
 */
export function puedeTransicionarConRol(
  rol: UserRole,
  estadoActual: CodigoEstadoConsulta,
  estadoNuevo: CodigoEstadoConsulta
): boolean {
  const permisos = PERMISOS_TRANSICION[rol]

  // Administrador can bypass all restrictions
  if (permisos.puede_bypass_restricciones) {
    return true
  }

  // Check if role can update to the target status
  if (!permisos.puede_actualizar_a.includes(estadoNuevo)) {
    return false
  }

  // Check if the transition is logically allowed
  return puedeTransicionar(estadoActual, estadoNuevo)
}

/**
 * Get all allowed transitions for a given status and role
 *
 * @param estadoActual - Current consultation status
 * @param rol - User's role
 * @returns Array of allowed status codes
 */
export function obtenerTransicionesPermitidas(
  estadoActual: CodigoEstadoConsulta,
  rol: UserRole
): CodigoEstadoConsulta[] {
  const permisos = PERMISOS_TRANSICION[rol]

  // Administrador can bypass restrictions
  if (permisos.puede_bypass_restricciones) {
    return ['programada', 'en_curso', 'completada', 'cancelada', 'ausente']
  }

  // Get allowed transitions based on current status
  const transicionesLogicas = TRANSICIONES_PERMITIDAS[estadoActual]

  // Filter by role permissions
  return transicionesLogicas.filter(estado =>
    permisos.puede_actualizar_a.includes(estado)
  )
}

/**
 * Validate if a user can edit a completed consultation
 *
 * Only Medico and Administrador can edit medical details after completion
 */
export function puedeEditarConsultaCompletada(rol: UserRole): boolean {
  return rol === 'Medico' || rol === 'Administrador'
}

/**
 * Get editable fields for a completed consultation
 *
 * Even after completion, certain medical fields can be updated
 */
export const CAMPOS_EDITABLES_COMPLETADA = [
  'diagnostico',
  'tratamiento',
  'receta',
  'informe',
  'notas',
  'archivos_adjuntos',
  'proxima_consulta'
] as const

/**
 * Fields that cannot be changed once a consultation is completed
 */
export const CAMPOS_NO_EDITABLES_COMPLETADA = [
  'estado_id',
  'fecha_hora',
  'paciente_id',
  'medico_id',
  'duracion_minutos'
] as const

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Display names for each status (for UI)
 */
export const NOMBRES_ESTADOS: Record<CodigoEstadoConsulta, string> = {
  programada: 'Programada',
  en_curso: 'En Curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  ausente: 'Paciente Ausente'
}

/**
 * Descriptions for each status (for tooltips/help text)
 */
export const DESCRIPCIONES_ESTADOS: Record<CodigoEstadoConsulta, string> = {
  programada: 'Consulta agendada y pendiente de atención',
  en_curso: 'El médico está atendiendo al paciente',
  completada: 'Consulta completada con registro médico guardado',
  cancelada: 'Consulta cancelada con aviso previo',
  ausente: 'Paciente no se presentó a la consulta'
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Status codes that should NOT block the schedule (for conflict detection)
 *
 * When checking for scheduling conflicts, ignore consultations with these statuses
 */
export const ESTADOS_NO_BLOQUEAN_AGENDA: CodigoEstadoConsulta[] = [
  'cancelada',
  'ausente'
]

/**
 * Check if a status blocks the schedule for conflict detection
 */
export function bloqueaAgenda(codigo: CodigoEstadoConsulta): boolean {
  return !ESTADOS_NO_BLOQUEAN_AGENDA.includes(codigo)
}
