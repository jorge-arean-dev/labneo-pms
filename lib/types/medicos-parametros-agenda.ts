/**
 * Medico Parametros Agenda Types
 *
 * This file contains TypeScript types for the medicos_parametros_agenda table
 * which stores scheduling parameters for each doctor.
 */

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * MedicoParametrosAgenda - Database schema
 *
 * Represents scheduling parameters for a doctor (1:1 relationship with medicos)
 */
export interface MedicoParametrosAgenda {
  id: string
  medico_id: string
  duracion_consulta: number // Duration in minutes (must be > 0)
  duracion_buffer: number // Buffer in minutes after each appointment (can be 0)
  max_consultas_concurrentes: number // Max concurrent appointments per slot (must be > 0)
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

/**
 * Default values for scheduling parameters
 *
 * Used when a doctor doesn't have a record in medicos_parametros_agenda
 */
export const DEFAULT_PARAMETROS_AGENDA: Pick<
  MedicoParametrosAgenda,
  'duracion_consulta' | 'duracion_buffer' | 'max_consultas_concurrentes'
> = {
  duracion_consulta: 30, // 30 minutes per appointment
  duracion_buffer: 0, // No buffer between appointments
  max_consultas_concurrentes: 1 // One appointment per slot
}

// ============================================================================
// FORM/INPUT TYPES
// ============================================================================

/**
 * Data required to create scheduling parameters
 */
export interface CreateMedicoParametrosAgendaData {
  medico_id: string
  duracion_consulta?: number
  duracion_buffer?: number
  max_consultas_concurrentes?: number
}

/**
 * Data for updating scheduling parameters
 */
export interface UpdateMedicoParametrosAgendaData {
  duracion_consulta?: number
  duracion_buffer?: number
  max_consultas_concurrentes?: number
}

// ============================================================================
// SLOT CALCULATION TYPES
// ============================================================================

/**
 * Represents a time slot for appointment scheduling
 */
export interface TimeSlot {
  /** Slot start time in HH:mm format */
  time: string
  /** Number of appointments already scheduled for this slot */
  scheduledCount: number
  /** Maximum appointments allowed for this slot */
  maxConcurrent: number
  /** Whether the slot is available for booking */
  isAvailable: boolean
}

/**
 * Doctor's schedule for a specific day
 */
export interface MedicoHorario {
  id: string
  medico_id: string
  dia_semana: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  hora_inicio: string // HH:mm:ss format
  hora_fin: string // HH:mm:ss format
  activo: boolean
}

/**
 * Parameters needed for slot calculation
 */
export interface SlotCalculationParams {
  schedules: MedicoHorario[]
  parametros: Pick<
    MedicoParametrosAgenda,
    'duracion_consulta' | 'duracion_buffer' | 'max_consultas_concurrentes'
  >
  existingAppointments: Map<string, number> // time -> count mapping
}

/**
 * Result of slot calculation for a specific date
 */
export interface AvailableSlotsResult {
  date: string // YYYY-MM-DD format
  slots: TimeSlot[]
  hasAvailability: boolean
}
