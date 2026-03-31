/**
 * Slot Calculator Utility
 *
 * Calculates available time slots for appointment scheduling based on:
 * - Doctor's weekly schedule (medicos_horarios)
 * - Scheduling parameters (medicos_parametros_agenda)
 * - Existing appointments (consultas)
 */

import {
  TimeSlot,
  MedicoHorario,
  MedicoParametrosAgenda,
  DEFAULT_PARAMETROS_AGENDA,
  AvailableSlotsResult,
} from '@/lib/types'
import {
  getDayOfWeekInAppTimezone,
  isTodayInAppTimezone,
  nowInAppTimezone,
  formatDateToStringInAppTimezone,
  parseDateStringAsAppTimezone,
  isDateInPastInAppTimezone,
} from '@/lib/utils/timezone'

/**
 * Parse time string (HH:mm:ss or HH:mm) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to HH:mm format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Get day of week from a date (0=Sunday, 1=Monday, ..., 6=Saturday)
 * This matches PostgreSQL's EXTRACT(DOW FROM date) behavior.
 * Uses application timezone for consistent behavior across environments.
 */
export function getDayOfWeek(date: Date): number {
  return getDayOfWeekInAppTimezone(date)
}

/**
 * Calculate all possible time slots for a single schedule block
 *
 * @param horaInicio - Start time (HH:mm:ss format)
 * @param horaFin - End time (HH:mm:ss format)
 * @param duracionConsulta - Duration of each appointment in minutes
 * @param duracionBuffer - Buffer time after each appointment in minutes
 * @returns Array of slot times in HH:mm format
 */
export function calculateSlotsForBlock(
  horaInicio: string,
  horaFin: string,
  duracionConsulta: number,
  duracionBuffer: number
): string[] {
  const slots: string[] = []

  const startMinutes = timeToMinutes(horaInicio)
  const endMinutes = timeToMinutes(horaFin)
  const slotDuration = duracionConsulta + duracionBuffer

  let currentMinutes = startMinutes

  // Last slot must complete before hora_fin
  // So the last valid slot start time is: hora_fin - duracion_consulta
  while (currentMinutes + duracionConsulta <= endMinutes) {
    slots.push(minutesToTime(currentMinutes))
    currentMinutes += slotDuration
  }

  return slots
}

/**
 * Calculate all available slots for a doctor on a specific date
 *
 * @param schedules - Doctor's active schedules for that day of week
 * @param parametros - Scheduling parameters (or defaults if not provided)
 * @param existingAppointments - Map of slot time -> count of existing appointments
 * @param selectedDate - The date being checked (for past time filtering)
 * @returns Array of TimeSlot objects with availability info
 */
export function calculateAvailableSlots(
  schedules: MedicoHorario[],
  parametros: Pick<MedicoParametrosAgenda, 'duracion_consulta' | 'duracion_buffer' | 'max_consultas_concurrentes'> | null,
  existingAppointments: Map<string, number>,
  selectedDate?: Date
): TimeSlot[] {
  // Use defaults if no parameters provided
  const params = parametros || DEFAULT_PARAMETROS_AGENDA

  // Collect all slots from all schedule blocks
  const allSlots: string[] = []

  for (const schedule of schedules) {
    if (!schedule.activo) continue

    const slotsForBlock = calculateSlotsForBlock(
      schedule.hora_inicio,
      schedule.hora_fin,
      params.duracion_consulta,
      params.duracion_buffer
    )

    allSlots.push(...slotsForBlock)
  }

  // Remove duplicates and sort
  const uniqueSlots = [...new Set(allSlots)].sort()

  // Check if we need to filter past times (if selected date is today)
  // Uses application timezone for consistent behavior across environments
  const isToday = selectedDate && isTodayInAppTimezone(selectedDate)
  const currentTimeMinutes = isToday
    ? (() => {
        const now = nowInAppTimezone()
        return now.getHours() * 60 + now.getMinutes()
      })()
    : 0

  // Build TimeSlot objects with availability info
  const timeSlots: TimeSlot[] = uniqueSlots
    .filter(slotTime => {
      // Filter out past times if today
      if (isToday) {
        const slotMinutes = timeToMinutes(slotTime)
        return slotMinutes > currentTimeMinutes
      }
      return true
    })
    .map(slotTime => {
      const scheduledCount = existingAppointments.get(slotTime) || 0
      const isAvailable = scheduledCount < params.max_consultas_concurrentes

      return {
        time: slotTime,
        scheduledCount,
        maxConcurrent: params.max_consultas_concurrentes,
        isAvailable,
      }
    })

  return timeSlots
}

/**
 * Build the result object for available slots
 */
export function buildAvailableSlotsResult(
  date: string,
  slots: TimeSlot[]
): AvailableSlotsResult {
  return {
    date,
    slots,
    hasAvailability: slots.some(slot => slot.isAvailable),
  }
}

/**
 * Format a date to YYYY-MM-DD string.
 * Uses application timezone for consistent behavior across environments.
 */
export function formatDateToString(date: Date): string {
  return formatDateToStringInAppTimezone(date)
}

/**
 * Parse YYYY-MM-DD string to Date object.
 * Uses application timezone for consistent behavior across environments.
 */
export function parseDateString(dateStr: string): Date {
  return parseDateStringAsAppTimezone(dateStr)
}

/**
 * Check if a date is in the past (before today).
 * Uses application timezone for consistent behavior across environments.
 */
export function isDateInPast(date: Date): boolean {
  return isDateInPastInAppTimezone(date)
}

/**
 * Get the days of week (0-6) that a doctor has active schedules
 */
export function getDoctorWorkDays(schedules: MedicoHorario[]): number[] {
  const workDays = new Set<number>()
  for (const schedule of schedules) {
    if (schedule.activo) {
      workDays.add(schedule.dia_semana)
    }
  }
  return [...workDays].sort()
}

/**
 * Check if a doctor works on a specific day of week
 */
export function doctorWorksOnDay(schedules: MedicoHorario[], dayOfWeek: number): boolean {
  return schedules.some(s => s.activo && s.dia_semana === dayOfWeek)
}
