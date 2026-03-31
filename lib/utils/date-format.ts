/**
 * Centralized date/time formatting utilities for consistent display across the application.
 * All dates are formatted in 12-hour format (AM/PM) for Argentina (es-AR locale).
 */

import { formatDateTimeForInputInAppTimezone } from "@/lib/utils/timezone"

/**
 * Formats a date-time string to display in 12-hour format
 * Example output: "18/11/2025, 02:30 pm"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const formatted = new Date(dateString).toLocaleString("es-AR", {
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Replace "a. m." and "p. m." with "am" and "pm"
  return formatted.replace(/a\.\s*m\./gi, 'am').replace(/p\.\s*m\./gi, 'pm')
}

/**
 * Formats a date-time string to long-form Spanish date with 12-hour time
 * Example output: "20 de marzo de 2026, 4:30 pm"
 */
export function formatDateTimeLong(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const formatted = new Date(dateString).toLocaleString("es-AR", {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Replace "a. m." and "p. m." with "am" and "pm"
  return formatted.replace(/a\.\s*m\./gi, 'am').replace(/p\.\s*m\./gi, 'pm')
}

/**
 * Formats a date string to display without time
 * Example output: "18/11/2025"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  // Append T00:00:00 to date-only strings (YYYY-MM-DD) to force local time parsing.
  // Without this, JS parses YYYY-MM-DD as UTC midnight, which shifts to the previous
  // day in negative UTC offset timezones (e.g., Argentina UTC-3).
  const normalized = dateString.length === 10 && !dateString.includes("T")
    ? dateString + "T00:00:00"
    : dateString

  return new Date(normalized).toLocaleDateString("es-AR", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Formats a date string for datetime-local input (YYYY-MM-DDTHH:mm)
 * Used for form inputs.
 * Uses application timezone for consistent behavior across environments.
 */
export function formatDateTimeForInput(dateString: string): string {
  return formatDateTimeForInputInAppTimezone(dateString)
}

/**
 * Formats a date string for date input (YYYY-MM-DD)
 * Used for form inputs
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ""
  if (dateString.includes('T')) {
    return dateString.split('T')[0]
  }
  return dateString.substring(0, 10)
}

/**
 * Formats a date string to long-form Spanish date
 * Example output: "23 de diciembre de 2025"
 */
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const normalized = dateString.length === 10 && !dateString.includes("T")
    ? dateString + "T00:00:00"
    : dateString

  return new Date(normalized).toLocaleDateString("es-AR", {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Formats a date-time string to extract only the time in 12-hour format
 * Example output: "2:30 pm"
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  const formatted = new Date(dateString).toLocaleTimeString("es-AR", {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit'
  })

  // Replace "a. m." and "p. m." with "am" and "pm"
  return formatted.replace(/a\.\s*m\./gi, 'am').replace(/p\.\s*m\./gi, 'pm')
}

/**
 * Calculates age in years from a date of birth string.
 * Returns null if the date is missing or invalid.
 * Example: calculateAge("1990-11-18") → 35
 */
export function calculateAge(dateString: string | null | undefined): number | null {
  if (!dateString) return null

  const today = new Date()
  const birthDate = new Date(dateString + "T00:00:00")

  if (isNaN(birthDate.getTime())) return null

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Formats a time string (HH:MM or HH:MM:SS) to 12-hour format for display
 * Example input: "09:00" or "14:30"
 * Example output: "9:00 am" or "2:30 pm"
 */
export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return "—"

  // Extract hours and minutes from HH:MM or HH:MM:SS format
  const [hoursStr, minutesStr] = time.split(':')
  const hours = parseInt(hoursStr, 10)
  const minutes = minutesStr || '00'

  if (isNaN(hours)) return "—"

  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  return `${displayHours}:${minutes} ${period}`
}
