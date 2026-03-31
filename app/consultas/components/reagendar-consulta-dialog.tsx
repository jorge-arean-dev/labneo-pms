"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import { format, isBefore, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { getAvailableSlotsForDate, getMedicoWorkDays, reagendarConsulta } from "../actions"
import { fetchMedicoBlockedDates } from "@/lib/actions/medico-bloqueos"
import { SlotSelector } from "./slot-selector"
import { TimeSlot } from "@/lib/types"
import { formatDateToString } from "@/lib/utils/slot-calculator"

interface ReagendarConsultaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultaId: string
  medicoId: string
  medicoNombre: string
  medicoApellido: string
  pacienteNombre: string
  pacienteApellido: string
  currentFechaHora: string
  onSuccess?: () => void
}

export function ReagendarConsultaDialog({
  open,
  onOpenChange,
  consultaId,
  medicoId,
  medicoNombre,
  medicoApellido,
  pacienteNombre,
  pacienteApellido,
  currentFechaHora,
  onSuccess,
}: ReagendarConsultaDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Parse current fecha_hora to get initial date and time (memoized to avoid re-renders)
  const currentDate = useMemo(() => new Date(currentFechaHora), [currentFechaHora])
  const currentTimeStr = useMemo(() => format(currentDate, "HH:mm"), [currentDate])

  // Scheduling state
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [selectedTime, setSelectedTime] = useState<string | null>(currentTimeStr)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [medicoWorkDays, setMedicoWorkDays] = useState<number[]>([])
  const [medicoBlockedDates, setMedicoBlockedDates] = useState<string[]>([])
  const [isLoadingWorkDays, setIsLoadingWorkDays] = useState(false)

  // Load work days and blocked dates when dialog opens
  useEffect(() => {
    if (open && medicoId) {
      const fetchWorkDaysAndBlocked = async () => {
        setIsLoadingWorkDays(true)
        const [workDaysResult, blockedResult] = await Promise.all([
          getMedicoWorkDays(medicoId),
          fetchMedicoBlockedDates(medicoId),
        ])
        setIsLoadingWorkDays(false)

        if (workDaysResult.error) {
          toast.error("Error al cargar los días de atención del médico")
          console.error(workDaysResult.error)
        } else if (workDaysResult.data) {
          setMedicoWorkDays(workDaysResult.data)
        }

        if (blockedResult.data) {
          setMedicoBlockedDates(blockedResult.data)
        }
      }

      fetchWorkDaysAndBlocked()
    }
  }, [open, medicoId])

  // Fetch available slots when date changes
  useEffect(() => {
    if (open && medicoId && selectedDate) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true)
        setSelectedTime(null) // Reset selected time when date changes

        const dateStr = formatDateToString(selectedDate)
        const { data, error } = await getAvailableSlotsForDate(medicoId, dateStr)

        setIsLoadingSlots(false)

        if (error) {
          toast.error("Error al cargar los horarios disponibles")
          console.error(error)
          setAvailableSlots([])
        } else if (data) {
          setAvailableSlots(data.slots)

          // If it's the same date as current, pre-select the current time if available
          const isSameDate = formatDateToString(currentDate) === dateStr
          if (isSameDate) {
            const currentSlot = data.slots.find(slot => slot.time === currentTimeStr)
            if (currentSlot && currentSlot.isAvailable) {
              setSelectedTime(currentTimeStr)
            }
          }
        }
      }

      fetchSlots()
    }
  }, [open, medicoId, selectedDate, currentDate, currentTimeStr])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(currentDate)
      setSelectedTime(currentTimeStr)
    }
  }, [open, currentDate, currentTimeStr])

  // Calendar date disable logic
  const isDateDisabled = (date: Date): boolean => {
    // Disable past dates
    if (isBefore(date, startOfDay(new Date()))) {
      return true
    }
    // Disable days where doctor doesn't work (if we have work days loaded)
    if (medicoWorkDays.length > 0) {
      const dayOfWeek = date.getDay()
      if (!medicoWorkDays.includes(dayOfWeek)) return true
    }
    // Disable blocked dates
    if (medicoBlockedDates.length > 0) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`
      if (medicoBlockedDates.includes(dateStr)) return true
    }
    return false
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedTime) {
      toast.error("Debe seleccionar un horario")
      return
    }

    // Combine date and time into ISO datetime string
    const [hours, minutes] = selectedTime.split(":")
    const nuevaFechaHora = new Date(selectedDate)
    nuevaFechaHora.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    // Check if the date/time actually changed
    const isSameDateTime = nuevaFechaHora.getTime() === currentDate.getTime()
    if (isSameDateTime) {
      toast.error("Debe seleccionar una fecha u horario diferente")
      return
    }

    setIsLoading(true)

    try {
      const { success, error } = await reagendarConsulta(consultaId, nuevaFechaHora.toISOString())

      if (success) {
        toast.success("Consulta reagendada exitosamente")
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(error || "Error al reagendar la consulta")
      }
    } catch (error) {
      console.error("Error rescheduling consulta:", error)
      toast.error("Error inesperado al reagendar la consulta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reagendar Consulta</DialogTitle>
          <DialogDescription>
            Seleccione una nueva fecha y horario para la consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            {/* Selected consultation info summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Paciente:</span>{" "}
                  <span className="font-medium">{pacienteNombre} {pacienteApellido}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Médico:</span>{" "}
                  <span className="font-medium">{medicoNombre} {medicoApellido}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-muted">
                <span className="text-muted-foreground">Horario actual:</span>{" "}
                <span className="font-medium">
                  {format(currentDate, "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </span>
              </div>
            </div>

            {/* Calendar and Time Slots Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Calendar Section */}
              <Card className="p-6">
                <h4 className="mb-4 text-sm font-semibold">Seleccionar Nueva Fecha</h4>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date && !isDateDisabled(date)) {
                      setSelectedDate(date)
                    }
                  }}
                  disabled={isDateDisabled}
                  locale={es}
                  className="rounded-md border [--cell-size:2.5rem]"
                  classNames={{
                    day_button: "h-[var(--cell-size)] w-[var(--cell-size)] mx-auto p-0 font-normal text-sm rounded-md inline-flex items-center justify-center transition-all bg-cal-available text-cal-available-fg hover:bg-cal-available-hover focus:outline-none focus:ring-2 focus:ring-cal-available-ring focus:ring-offset-1",
                    selected: "!bg-cal-selected !text-cal-selected-fg hover:!bg-cal-selected-hover font-semibold !ring-0",
                    today: "font-bold ring-2 ring-cal-today-ring ring-inset",
                    disabled: "!text-cal-disabled-fg !bg-transparent hover:!bg-transparent cursor-not-allowed opacity-60 !ring-0",
                    outside: "!text-muted-foreground opacity-40 !bg-transparent !ring-0",
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
              </Card>

              {/* Time Slots Section */}
              <Card className="flex flex-col p-6 h-[460px]">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">Horarios Disponibles</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <SlotSelector
                    slots={availableSlots}
                    selectedTime={selectedTime}
                    onSelectTime={setSelectedTime}
                    isLoading={isLoadingSlots}
                    noScheduleMessage="El médico no atiende este día"
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedTime}>
            {isLoading ? "Reagendando..." : "Confirmar Reagendamiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
