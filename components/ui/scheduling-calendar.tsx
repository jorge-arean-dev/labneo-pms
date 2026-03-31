"use client"

/**
 * Shared Scheduling Calendar Component
 *
 * Wraps the shadcn Calendar with availability-themed styling using --cal-* CSS variables.
 * Disables past dates and non-work-days automatically.
 * Includes "Disponible / No disponible" legend.
 *
 * Used by:
 * - Crear Consulta dialog (Step 2)
 * - /agendar public booking route
 */

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { isBefore, startOfDay } from "date-fns"
import { es } from "date-fns/locale"

interface SchedulingCalendarProps {
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
  /** Days of week the doctor works (0=Sunday, 6=Saturday) */
  workDays: number[]
  /** Specific dates that are blocked (YYYY-MM-DD strings) */
  blockedDates?: string[]
  /** Show "Cargando días de atención..." instead of legend */
  isLoadingWorkDays?: boolean
  /** Overlay with reduced opacity and disabled pointer events */
  isLoading?: boolean
  className?: string
}

export function SchedulingCalendar({
  selectedDate,
  onSelectDate,
  workDays,
  blockedDates = [],
  isLoadingWorkDays = false,
  isLoading = false,
  className,
}: SchedulingCalendarProps) {
  const isDateDisabled = (date: Date): boolean => {
    if (isBefore(date, startOfDay(new Date()))) {
      return true
    }
    if (workDays.length > 0 && !workDays.includes(date.getDay())) {
      return true
    }
    // Check if date is blocked
    if (blockedDates.length > 0) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`
      if (blockedDates.includes(dateStr)) {
        return true
      }
    }
    return false
  }

  return (
    <div className={cn(isLoading ? "opacity-50 pointer-events-none" : "", className)}>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        disabled={isDateDisabled}
        locale={es}
        className="rounded-md border [--cell-size:2.5rem]"
        classNames={{
          day_button:
            "h-[var(--cell-size)] w-[var(--cell-size)] mx-auto p-0 font-normal text-sm rounded-md inline-flex items-center justify-center transition-all bg-cal-available text-cal-available-fg hover:bg-cal-available-hover focus:outline-none focus:ring-2 focus:ring-cal-available-ring focus:ring-offset-1",
          selected:
            "!bg-cal-selected !text-cal-selected-fg hover:!bg-cal-selected-hover font-semibold !ring-0",
          today: "font-bold ring-2 ring-cal-today-ring ring-inset",
          disabled:
            "!text-cal-disabled-fg !bg-transparent hover:!bg-transparent cursor-not-allowed opacity-60 !ring-0",
          outside:
            "!text-muted-foreground opacity-40 !bg-transparent !ring-0",
        }}
      />

      {isLoadingWorkDays ? (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Cargando días de atención...
        </p>
      ) : (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded bg-cal-available ring-1 ring-cal-available-ring" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded bg-transparent ring-1 ring-border opacity-60" />
            <span>No disponible</span>
          </div>
        </div>
      )}
    </div>
  )
}
