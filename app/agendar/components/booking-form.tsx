"use client"

/**
 * Booking Form Component
 *
 * Main client component that orchestrates the booking flow.
 * Calendly-inspired 2-screen pattern:
 *   Screen 1: Date selection (auto-proceeds when date picked)
 *   Screen 2: Time selection with sticky header and scrollable slots
 *
 * IMPORTANT: Forces light mode for this public-facing page
 * to ensure consistent appearance regardless of user's system preferences.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useTheme } from "next-themes"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { BookingData, BookingSuccessProps } from "../types"
import { TimeSlot } from "@/lib/types"
import {
  getAvailableSlotsForBooking,
  getMedicoWorkDaysForBooking,
  getMedicoBlockedDatesForBooking,
  createBookingAppointment,
} from "../actions"
import { BookingSummary } from "./booking-summary"
import { BookingDateStep } from "./booking-date-step"
import { BookingTimeStep } from "./booking-time-step"
import { BookingSuccess } from "./booking-success"
import { formatDateToString } from "@/lib/utils/slot-calculator"

interface BookingFormProps {
  bookingData: BookingData
}

export function BookingForm({ bookingData }: BookingFormProps) {
  const { token, paciente, medico } = bookingData
  const { setTheme, resolvedTheme } = useTheme()
  const previousTheme = useRef(resolvedTheme)

  // Force light mode for this public booking page via next-themes API
  useEffect(() => {
    previousTheme.current = resolvedTheme
    setTheme("light")

    return () => {
      setTheme(previousTheme.current || "system")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Screen state: "date" or "time"
  const [currentScreen, setCurrentScreen] = useState<"date" | "time">("date")

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [workDays, setWorkDays] = useState<number[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isLoadingWorkDays, setIsLoadingWorkDays] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<BookingSuccessProps | null>(null)

  // Full names for display
  const pacienteNombre = `${paciente.nombre} ${paciente.apellido}`
  const medicoNombre = `${medico.nombre} ${medico.apellido}`

  // Load work days on mount
  useEffect(() => {
    async function loadWorkDaysAndBlocked() {
      setIsLoadingWorkDays(true)
      const [workDaysResult, blockedResult] = await Promise.all([
        getMedicoWorkDaysForBooking(medico.id),
        getMedicoBlockedDatesForBooking(medico.id),
      ])
      if (workDaysResult.error) {
        toast.error("Error al cargar los días de atención")
        console.error("Error loading work days:", workDaysResult.error)
      } else {
        setWorkDays(workDaysResult.data || [])
      }
      if (blockedResult.data) {
        setBlockedDates(blockedResult.data)
      }
      setIsLoadingWorkDays(false)
    }
    loadWorkDaysAndBlocked()
  }, [medico.id])

  // Load slots for selected date
  const loadSlots = useCallback(async (date: Date) => {
    setIsLoadingSlots(true)

    const dateStr = formatDateToString(date)
    const { data, error } = await getAvailableSlotsForBooking(medico.id, dateStr)

    if (error) {
      toast.error("Error al cargar los horarios")
      console.error("Error loading slots:", error)
      setSlots([])
    } else {
      setSlots(data?.slots || [])
    }

    setIsLoadingSlots(false)
  }, [medico.id])

  // Handle date selection - auto-proceed to time screen
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      setCurrentScreen("time")
      loadSlots(date)
    }
  }, [loadSlots])

  // Handle going back to date screen
  const handleBackToDate = useCallback(() => {
    setCurrentScreen("date")
    setSelectedDate(undefined) // Clear date selection
    setSelectedTime(null)
    setSlots([])
  }, [])

  // Handle time selection
  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
  }, [])

  // Handle booking submission
  const handleSubmit = useCallback(async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor, seleccioná un día y horario")
      return
    }

    setIsSubmitting(true)

    // Build ISO datetime string
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const appointmentDate = new Date(selectedDate)
    appointmentDate.setHours(hours, minutes, 0, 0)
    const fechaHora = appointmentDate.toISOString()

    const result = await createBookingAppointment(token.token, fechaHora)

    if (result.success) {
      setSuccessData({
        pacienteNombre,
        medicoNombre,
        fechaHora: result.fechaHora!,
      })
    } else {
      toast.error(result.error || "Error al crear el turno")
    }

    setIsSubmitting(false)
  }, [selectedDate, selectedTime, token.token, pacienteNombre, medicoNombre])

  // Show success screen if booking completed
  if (successData) {
    return <BookingSuccess {...successData} />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Fixed Header with patient/doctor info */}
      <div className="flex-shrink-0">
        <BookingSummary
          pacienteNombre={pacienteNombre}
          medicoNombre={medicoNombre}
        />
      </div>

      {/* Main Content - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        {isLoadingWorkDays ? (
          <div className="bg-white h-full px-4 py-12">
            <div className="max-w-md mx-auto flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
              <p className="text-gray-600">Cargando calendario...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Screen 1: Date Selection - scrollable */}
            {currentScreen === "date" && (
              <div className="h-full overflow-y-auto">
                <BookingDateStep
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                  workDays={workDays}
                  blockedDates={blockedDates}
                />
              </div>
            )}

            {/* Screen 2: Time Selection - with sticky header */}
            {currentScreen === "time" && selectedDate && (
              <BookingTimeStep
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onSelectTime={handleTimeSelect}
                slots={slots}
                isLoading={isLoadingSlots}
                onBack={handleBackToDate}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
