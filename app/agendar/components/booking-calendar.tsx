"use client"

/**
 * Booking Calendar Component
 *
 * Wraps the shared SchedulingCalendar with the /agendar route's layout
 * (heading + centered container). The calendar styling, disabled-date logic,
 * and availability legend are all handled by the shared component.
 */

import { SchedulingCalendar } from "@/components/ui/scheduling-calendar"

interface BookingCalendarProps {
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
  workDays: number[] // Days of week doctor works (0=Sunday, 6=Saturday)
  blockedDates?: string[]
  isLoading?: boolean
}

export function BookingCalendar({
  selectedDate,
  onSelectDate,
  workDays,
  blockedDates = [],
  isLoading = false,
}: BookingCalendarProps) {
  return (
    <div className="bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Seleccioná un día
        </h2>

        <SchedulingCalendar
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          workDays={workDays}
          blockedDates={blockedDates}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
