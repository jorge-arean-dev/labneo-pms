/**
 * Timezone Utilities
 *
 * Centralized timezone handling using the application's configured timezone.
 * All server-side date operations should use these utilities to ensure
 * consistent behavior regardless of where the server runs (local dev vs Vercel).
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { getAppTimezone } from '@/lib/config/timezone'

/**
 * Get the current date/time in the application timezone.
 * Use this instead of `new Date()` for "now" operations on the server.
 */
export function nowInAppTimezone(): Date {
  return toZonedTime(new Date(), getAppTimezone())
}

/**
 * Get today's date at midnight in the application timezone.
 * Returns a Date object representing 00:00:00 in the app timezone.
 */
export function todayInAppTimezone(): Date {
  const now = nowInAppTimezone()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Get the day of week (0-6) for a date in the application timezone.
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * This matches PostgreSQL's EXTRACT(DOW FROM date) behavior.
 */
export function getDayOfWeekInAppTimezone(date: Date): number {
  const zonedDate = toZonedTime(date, getAppTimezone())
  return zonedDate.getDay()
}

/**
 * Get hours and minutes from a date in the application timezone.
 * Use this to extract time components for slot matching.
 */
export function getTimeInAppTimezone(date: Date): { hours: number; minutes: number } {
  const zonedDate = toZonedTime(date, getAppTimezone())
  return {
    hours: zonedDate.getHours(),
    minutes: zonedDate.getMinutes(),
  }
}

/**
 * Format a time string (HH:mm) from a Date in the application timezone.
 */
export function formatTimeInAppTimezone(date: Date): string {
  const { hours, minutes } = getTimeInAppTimezone(date)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Check if two dates are the same day in the application timezone.
 */
export function isSameDayInAppTimezone(date1: Date, date2: Date): boolean {
  const tz = getAppTimezone()
  const zoned1 = toZonedTime(date1, tz)
  const zoned2 = toZonedTime(date2, tz)
  return (
    zoned1.getFullYear() === zoned2.getFullYear() &&
    zoned1.getMonth() === zoned2.getMonth() &&
    zoned1.getDate() === zoned2.getDate()
  )
}

/**
 * Check if a date is today in the application timezone.
 */
export function isTodayInAppTimezone(date: Date): boolean {
  return isSameDayInAppTimezone(date, new Date())
}

/**
 * Check if a date is in the past (before today) in the application timezone.
 */
export function isDateInPastInAppTimezone(date: Date): boolean {
  const today = todayInAppTimezone()
  const tz = getAppTimezone()
  const checkDate = toZonedTime(date, tz)
  checkDate.setHours(0, 0, 0, 0)
  return checkDate < today
}

/**
 * Format a date to YYYY-MM-DD string in the application timezone.
 */
export function formatDateToStringInAppTimezone(date: Date): string {
  const zonedDate = toZonedTime(date, getAppTimezone())
  const year = zonedDate.getFullYear()
  const month = (zonedDate.getMonth() + 1).toString().padStart(2, '0')
  const day = zonedDate.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string to a Date object, treating it as the application timezone.
 * The returned Date represents midnight on that date in the app timezone.
 */
export function parseDateStringAsAppTimezone(dateStr: string): Date {
  // Parse as app timezone local time by appending time and converting
  return fromZonedTime(`${dateStr}T00:00:00`, getAppTimezone())
}

/**
 * Get date boundaries for "today" in the application timezone.
 * Returns UTC ISO strings suitable for database queries.
 */
export function getTodayBoundariesUTC(): { startISO: string; endISO: string } {
  const tz = getAppTimezone()

  // Get today at midnight in app timezone
  const todayZoned = todayInAppTimezone()
  const tomorrowZoned = new Date(todayZoned)
  tomorrowZoned.setDate(tomorrowZoned.getDate() + 1)

  // Convert app timezone times to UTC for database queries
  const startUTC = fromZonedTime(todayZoned, tz)
  const endUTC = fromZonedTime(tomorrowZoned, tz)

  return {
    startISO: startUTC.toISOString(),
    endISO: endUTC.toISOString(),
  }
}

/**
 * Get date boundaries for a date range in the application timezone.
 * Returns UTC ISO strings suitable for database queries.
 */
export function getDateRangeBoundariesUTC(
  daysBack: number,
  daysForward: number
): { startISO: string; endISO: string; todayEndISO: string } {
  const tz = getAppTimezone()
  const todayZoned = todayInAppTimezone()

  const startZoned = new Date(todayZoned)
  startZoned.setDate(startZoned.getDate() - daysBack)

  const endZoned = new Date(todayZoned)
  endZoned.setDate(endZoned.getDate() + daysForward + 1) // +1 for exclusive end

  const todayEndZoned = new Date(todayZoned)
  todayEndZoned.setDate(todayEndZoned.getDate() + 1)

  return {
    startISO: fromZonedTime(startZoned, tz).toISOString(),
    endISO: fromZonedTime(endZoned, tz).toISOString(),
    todayEndISO: fromZonedTime(todayEndZoned, tz).toISOString(),
  }
}

/**
 * Format a datetime for display in the application timezone (for datetime-local inputs).
 * Returns format: YYYY-MM-DDTHH:mm
 *
 * Use this when displaying a UTC timestamp in a datetime-local input.
 * Example: "2025-01-21T13:00:00Z" (UTC) → "2025-01-21T10:00" (for UTC-3 timezone)
 */
export function formatDateTimeForInputInAppTimezone(dateString: string): string {
  const date = new Date(dateString)
  const zonedDate = toZonedTime(date, getAppTimezone())
  const year = zonedDate.getFullYear()
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0')
  const day = String(zonedDate.getDate()).padStart(2, '0')
  const hours = String(zonedDate.getHours()).padStart(2, '0')
  const minutes = String(zonedDate.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parse a datetime-local input value (YYYY-MM-DDTHH:mm) as app timezone and convert to UTC ISO string.
 *
 * Use this when saving a datetime-local input value to the database.
 * This is the reverse of formatDateTimeForInputInAppTimezone.
 * Example: "2025-01-21T10:00" (app timezone) → "2025-01-21T13:00:00.000Z" (UTC)
 *
 * @param localDateTimeString - datetime-local input value in format YYYY-MM-DDTHH:mm
 * @returns UTC ISO string suitable for database storage
 */
export function parseDateTimeFromInputToUTC(localDateTimeString: string): string {
  // The input is in app timezone (e.g., "2025-01-21T10:00")
  // fromZonedTime converts a date that's in a specific timezone to UTC
  const utcDate = fromZonedTime(localDateTimeString, getAppTimezone())
  return utcDate.toISOString()
}
