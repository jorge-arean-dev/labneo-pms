/**
 * Types for the public booking page (/agendar)
 *
 * This page is accessed via WhatsApp booking links with secure tokens.
 * It's designed for patients (including elderly) so UX is prioritized.
 */

/**
 * Booking token from database
 */
export interface BookingToken {
  id: string
  token: string
  paciente_id: string
  medico_id: string
  phone_number: string | null
  expires_at: string
  used_at: string | null
  consulta_id: string | null
  created_at: string
}

/**
 * Patient summary for booking page header
 */
export interface BookingPaciente {
  id: string
  nombre: string
  apellido: string
}

/**
 * Doctor summary for booking page header
 */
export interface BookingMedico {
  id: string
  nombre: string
  apellido: string
}

/**
 * Combined data for a valid booking session
 */
export interface BookingData {
  token: BookingToken
  paciente: BookingPaciente
  medico: BookingMedico
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean
  error?: "invalid" | "expired" | "used"
  data?: BookingData
}

/**
 * Booking creation result
 */
export interface BookingResult {
  success: boolean
  error?: string
  consultaId?: string
  fechaHora?: string
}

/**
 * Error types for booking page
 */
export type BookingErrorType = "invalid" | "expired" | "used" | "server"

/**
 * Props for error component
 */
export interface BookingErrorProps {
  type: BookingErrorType
}

/**
 * Props for success component
 */
export interface BookingSuccessProps {
  pacienteNombre: string
  medicoNombre: string
  fechaHora: string
}

/**
 * Props for booking summary header
 */
export interface BookingSummaryProps {
  pacienteNombre: string
  medicoNombre: string
}

/**
 * Props for booking form
 */
export interface BookingFormProps {
  bookingData: BookingData
}
