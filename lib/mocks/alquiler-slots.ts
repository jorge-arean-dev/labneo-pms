/**
 * Mocked availability layer for the alquiler-de-equipos slot picker.
 * Deterministic so the demo looks stable across refreshes. Replace with a
 * real backend (equipment + bookings tables) before going to production.
 */

import type { SubtipoServicio } from "@/lib/types/entities"

export interface TimeSlot {
  time: string
  available: boolean
}

// Day-of-week numbers follow Date.getDay() (0 = Sunday).
const WORK_DAYS: Record<SubtipoServicio, number[]> = {
  escaner_intraoral: [1, 2, 3, 4, 5],
  fotogrametria: [2, 4, 6],
}

// A handful of pretend holidays / blocked days per service.
const BLOCKED_DATES: Record<SubtipoServicio, string[]> = {
  escaner_intraoral: ["2026-04-22", "2026-05-01", "2026-05-25"],
  fotogrametria: ["2026-04-16", "2026-05-01", "2026-06-20"],
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17] as const

export function getMockWorkDaysForService(subtipo: SubtipoServicio): number[] {
  return WORK_DAYS[subtipo]
}

export function getMockBlockedDatesForService(subtipo: SubtipoServicio): string[] {
  return BLOCKED_DATES[subtipo]
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// djb2-style hash. Stable across runs so the demo feels consistent.
function seededHash(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return hash >>> 0
}

/**
 * Returns the 9 one-hour slots for a given date + service, with a
 * deterministic subset marked unavailable. Returns [] for past dates,
 * non-working days, or blocked dates.
 */
export function getMockSlotsForService(
  subtipo: SubtipoServicio,
  date: Date,
): TimeSlot[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  if (dayStart.getTime() < today.getTime()) return []

  if (!WORK_DAYS[subtipo].includes(dayStart.getDay())) return []
  if (BLOCKED_DATES[subtipo].includes(formatDateKey(dayStart))) return []

  const seed = seededHash(`${subtipo}:${formatDateKey(dayStart)}`)

  // Pick 2 or 3 slots to mark unavailable, deterministically from the seed.
  const unavailableCount = 2 + (seed % 2)
  const unavailableIndexes = new Set<number>()
  let cursor = seed
  while (unavailableIndexes.size < unavailableCount) {
    unavailableIndexes.add(cursor % HOURS.length)
    cursor = Math.floor(cursor / HOURS.length) + 1
    if (cursor === 0) cursor = seed + unavailableIndexes.size + 1
  }

  return HOURS.map((hour, idx) => ({
    time: `${String(hour).padStart(2, "0")}:00`,
    available: !unavailableIndexes.has(idx),
  }))
}
