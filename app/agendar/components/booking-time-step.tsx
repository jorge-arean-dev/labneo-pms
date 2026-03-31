"use client"

/**
 * Booking Time Step Component
 *
 * Step 2 of the booking flow - Time selection.
 * Calendly-inspired design with:
 *   - Sticky header (back button, date, title)
 *   - Scrollable time slots area only
 *   - "Reservar" button appears next to selected time
 */

import { ArrowLeft, Loader2 } from "lucide-react"
import { TimeSlot } from "@/lib/types"
import { formatTimeForDisplay } from "@/lib/utils/date-format"

interface BookingTimeStepProps {
  selectedDate: Date
  selectedTime: string | null
  onSelectTime: (time: string) => void
  slots: TimeSlot[]
  isLoading?: boolean
  onBack: () => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function BookingTimeStep({
  selectedDate,
  selectedTime,
  onSelectTime,
  slots,
  isLoading = false,
  onBack,
  onSubmit,
  isSubmitting = false,
}: BookingTimeStepProps) {
  // Format selected date - Calendly style
  const formattedDate = selectedDate.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Filter to only available slots
  const availableSlots = slots.filter(slot => slot.isAvailable)

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Sticky Header - Back button, date, and title */}
      <div className="flex-shrink-0 border-b border-gray-200">
        {/* Back button and date */}
        <div className="px-4 py-4">
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
              aria-label="Volver a elegir otro día"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>

            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {formattedDate}
            </h2>
          </div>
        </div>

        {/* Section title */}
        <div className="px-4 pb-4">
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-semibold text-gray-900">
              Seleccioná una hora
            </h3>
          </div>
        </div>
      </div>

      {/* Scrollable Time Slots Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" aria-hidden="true" />
              <p className="text-gray-600">Cargando horarios...</p>
            </div>
          )}

          {/* No slots available */}
          {!isLoading && slots.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">
                El médico no atiende este día.
              </p>
              <p className="text-gray-500 text-sm">
                Por favor, seleccioná otro día.
              </p>
            </div>
          )}

          {/* All slots taken */}
          {!isLoading && slots.length > 0 && availableSlots.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">
                No hay turnos disponibles para este día.
              </p>
              <p className="text-gray-500 text-sm">
                Todos los horarios están ocupados. Probá con otro día.
              </p>
            </div>
          )}

          {/* Available time slots */}
          {!isLoading && availableSlots.length > 0 && (
            <div className="space-y-2 pb-4">
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot.time

                return (
                  <div key={slot.time} className="flex gap-2">
                    {/* Time button */}
                    <button
                      type="button"
                      onClick={() => onSelectTime(slot.time)}
                      className={`
                        flex-1 py-3 px-4 rounded-lg text-base font-semibold
                        border-2 transition-all duration-150
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        ${isSelected
                          ? "bg-gray-100 border-gray-300 text-gray-700"
                          : "bg-white border-blue-600 text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      aria-pressed={isSelected}
                    >
                      {formatTimeForDisplay(slot.time)}
                    </button>

                    {/* Reservar button - only shows when this slot is selected */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          "Reservar"
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
