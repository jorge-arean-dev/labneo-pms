"use client"

/**
 * Booking Date Step Component
 *
 * Step 1 of the booking flow - Date selection.
 * Clean Calendly-inspired layout with calendar.
 * Automatically proceeds to time selection when date is picked.
 */

import { BookingCalendar } from "./booking-calendar"

interface BookingDateStepProps {
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
  workDays: number[]
  blockedDates?: string[]
  isLoading?: boolean
}

export function BookingDateStep({
  selectedDate,
  onSelectDate,
  workDays,
  blockedDates = [],
  isLoading = false,
}: BookingDateStepProps) {
  return (
    <BookingCalendar
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      workDays={workDays}
      blockedDates={blockedDates}
      isLoading={isLoading}
    />
  )
}
