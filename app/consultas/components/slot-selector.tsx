"use client"

import { cn } from "@/lib/utils"
import { TimeSlot } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { formatTimeForDisplay } from "@/lib/utils/date-format"

interface SlotSelectorProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onSelectTime: (time: string) => void
  isLoading?: boolean
  noScheduleMessage?: string
}

export function SlotSelector({
  slots,
  selectedTime,
  onSelectTime,
  isLoading = false,
  noScheduleMessage = "El médico no atiende este día",
}: SlotSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Cargando horarios...</span>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground text-center px-4">
          {noScheduleMessage}
        </p>
      </div>
    )
  }

  const hasAvailableSlots = slots.some((slot) => slot.isAvailable)

  return (
    <div className="space-y-2">
      {!hasAvailableSlots && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            No hay turnos disponibles para esta fecha. Todos los horarios están ocupados.
          </p>
        </div>
      )}

      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time
        const isFull = !slot.isAvailable

        return (
          <div key={slot.time} className="flex items-center gap-3 group">
            <button
              type="button"
              onClick={() => !isFull && onSelectTime(slot.time)}
              disabled={isFull}
              className={cn(
                "flex-shrink-0 w-28 py-2.5 px-2 rounded-md border text-sm font-medium transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : isFull
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600"
              )}
            >
              {formatTimeForDisplay(slot.time)}
            </button>

            <div
              className={cn(
                "flex items-center justify-center min-w-28 py-1 rounded-full border",
                isFull
                  ? "bg-red-50 border-red-200"
                  : slot.scheduledCount > 0
                    ? "bg-slate-100 border-slate-200"
                    : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              {isFull ? (
                <span className="text-xs font-medium text-red-600">
                  Lleno ({slot.scheduledCount}/{slot.maxConcurrent})
                </span>
              ) : slot.scheduledCount > 0 ? (
                <span className="text-xs font-medium text-slate-600">
                  {slot.scheduledCount}/{slot.maxConcurrent} {slot.scheduledCount === 1 ? "turno" : "turnos"}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/50 font-light">
                  Disponible
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
