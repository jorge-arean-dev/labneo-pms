"use client"

/**
 * Booking Slots Component
 *
 * Large, touch-friendly time slot buttons for elderly users.
 * Shows available slots in a grid layout for easy selection.
 */

import { Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TimeSlot } from "@/lib/types"
import { formatTimeForDisplay } from "@/lib/utils/date-format"

interface BookingSlotsProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onSelectTime: (time: string) => void
  isLoading?: boolean
  selectedDate: Date | undefined
}

export function BookingSlots({
  slots,
  selectedTime,
  onSelectTime,
  isLoading = false,
  selectedDate,
}: BookingSlotsProps) {
  // Format selected date for display
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null

  // Filter to only available slots for public booking
  const availableSlots = slots.filter(slot => slot.isAvailable)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Clock className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            2. Elegí el horario
          </h2>
          {formattedDate && (
            <p className="text-sm text-gray-500 capitalize">
              {formattedDate}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px]" aria-live="polite" aria-atomic="true">
        {/* No date selected */}
        {!selectedDate && (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Clock className="h-12 w-12 text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-lg text-gray-700">
              Primero seleccioná un día en el calendario
            </p>
          </div>
        )}

        {/* Loading state */}
        {selectedDate && isLoading && (
          <div className="flex flex-col items-center justify-center h-[200px]">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" aria-hidden="true" />
            <p className="text-lg text-gray-700">Cargando horarios...</p>
          </div>
        )}

        {/* No slots available */}
        {selectedDate && !isLoading && slots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <div className="p-4 bg-amber-50 rounded-full mb-4">
              <Clock className="h-10 w-10 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              El médico no atiende este día
            </p>
            <p className="text-base text-gray-700">
              Por favor, seleccioná otro día en el calendario
            </p>
          </div>
        )}

        {/* No available slots (all full) */}
        {selectedDate && !isLoading && slots.length > 0 && availableSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <div className="p-4 bg-red-50 rounded-full mb-4">
              <Clock className="h-10 w-10 text-red-500" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              No hay turnos disponibles
            </p>
            <p className="text-base text-gray-700">
              Todos los horarios están ocupados. Probá con otro día.
            </p>
          </div>
        )}

        {/* Available slots */}
        {selectedDate && !isLoading && availableSlots.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            role="radiogroup"
            aria-label="Horarios disponibles"
          >
            {availableSlots.map((slot) => {
              const isSelected = selectedTime === slot.time

              return (
                <button
                  key={slot.time}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTime(slot.time)}
                  className={cn(
                    "py-4 px-4 rounded-xl text-lg font-semibold transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    "active:scale-95",
                    isSelected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  {formatTimeForDisplay(slot.time)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selectedTime && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-center text-base text-gray-600">
            Horario seleccionado:{" "}
            <span className="font-semibold text-blue-600">
              {formatTimeForDisplay(selectedTime)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
