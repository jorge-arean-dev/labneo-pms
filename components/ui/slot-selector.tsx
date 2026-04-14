"use client"

import { CalendarDays, Check, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { TimeSlot } from "@/lib/mocks/alquiler-slots"

interface SlotSelectorProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onSelectTime: (time: string) => void
  isLoading?: boolean
  /** Shown when slots is empty because the day is not worked */
  noScheduleMessage?: string
  /** Shown before a date has been picked */
  hasDate: boolean
  /** Accessibility — name of the service for screen readers */
  serviceLabel?: string
}

export function SlotSelector({
  slots,
  selectedTime,
  onSelectTime,
  isLoading = false,
  noScheduleMessage = "Este día no tiene turnos disponibles para el servicio seleccionado. Probá con otra fecha.",
  hasDate,
  serviceLabel,
}: SlotSelectorProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando horarios disponibles"
        className="flex flex-1 flex-col"
      >
        <span className="sr-only">Cargando horarios disponibles…</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!hasDate) {
    return (
      <InnerState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Seleccioná una fecha"
        body="Hacé clic en un día disponible del calendario para ver los horarios."
      />
    )
  }

  if (slots.length === 0) {
    return (
      <InnerState
        icon={<Clock className="h-8 w-8" />}
        title="Sin horarios disponibles"
        body={noScheduleMessage}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        role="group"
        aria-label="Horarios disponibles"
        aria-live="polite"
        className="grid grid-cols-2 md:grid-cols-3 gap-2"
      >
        {slots.map((slot) => {
          const isSelected = selectedTime === slot.time
          const isUnavailable = !slot.available
          const ariaLabel = [
            `Horario ${slot.time}`,
            serviceLabel,
            isUnavailable
              ? "no disponible"
              : isSelected
                ? "seleccionado"
                : "disponible",
          ]
            .filter(Boolean)
            .join(", ")

          return (
            <button
              key={slot.time}
              type="button"
              onClick={() => !isUnavailable && onSelectTime(slot.time)}
              disabled={isUnavailable}
              aria-label={ariaLabel}
              aria-pressed={isUnavailable ? undefined : isSelected}
              aria-disabled={isUnavailable || undefined}
              tabIndex={isUnavailable ? -1 : 0}
              className={cn(
                "relative h-11 w-full rounded-md text-sm transition-colors duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                !isUnavailable &&
                  !isSelected && [
                    "border border-input bg-background font-medium text-foreground cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground hover:border-primary/40",
                  ],
                isSelected && [
                  "border-2 border-primary bg-primary/20 font-semibold text-primary dark:bg-primary/30",
                  "hover:bg-primary/25 dark:hover:bg-primary/35 cursor-pointer",
                ],
                isUnavailable && [
                  "border border-border bg-muted/40 font-medium text-muted-foreground dark:bg-muted/20",
                  "line-through opacity-60 cursor-not-allowed",
                ],
              )}
            >
              {slot.time}
              {isSelected && (
                <Check
                  className="absolute top-1 right-1 h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                  strokeWidth={3}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface InnerStateProps {
  icon: React.ReactNode
  title: string
  body: string
}

function InnerState({ icon, title, body }: InnerStateProps) {
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center"
    >
      <div className="text-muted-foreground/50" aria-hidden="true">
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="max-w-[220px] text-xs text-muted-foreground/70 leading-relaxed">
        {body}
      </p>
    </div>
  )
}
