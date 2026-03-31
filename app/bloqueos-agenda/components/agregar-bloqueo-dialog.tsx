"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react"
import { checkBloqueoConflicts, createBloqueoAgenda } from "@/app/medicos/[id]/actions"
import { formatDate, formatDateTime } from "@/lib/utils/date-format"
import { cn } from "@/lib/utils"

interface AgregarBloqueoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicos: Array<{ id: string; nombre: string; apellido: string }>
  onBloqueoCreated: () => void
}

export function AgregarBloqueoDialog({
  open,
  onOpenChange,
  medicos,
  onBloqueoCreated,
}: AgregarBloqueoDialogProps) {
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>("")
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined)
  const [fechaFin, setFechaFin] = useState<Date | undefined>(undefined)
  const [motivo, setMotivo] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    fecha_hora: string
    paciente_nombre: string
    paciente_apellido: string
  }>>([])
  const [hasChecked, setHasChecked] = useState(false)
  const [inicioPopoverOpen, setInicioPopoverOpen] = useState(false)
  const [finPopoverOpen, setFinPopoverOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedMedicoId("")
      setFechaInicio(undefined)
      setFechaFin(undefined)
      setMotivo("")
      setConflicts([])
      setHasChecked(false)
    }
  }, [open])

  // Check conflicts when all fields are set
  useEffect(() => {
    if (!selectedMedicoId || !fechaInicio || !fechaFin) {
      setConflicts([])
      setHasChecked(false)
      return
    }

    const check = async () => {
      setIsChecking(true)
      const inicio = formatDateForApi(fechaInicio)
      const fin = formatDateForApi(fechaFin)

      const result = await checkBloqueoConflicts(selectedMedicoId, inicio, fin)

      if (result.error) {
        toast.error(result.error)
      } else {
        setConflicts(result.consultas)
      }
      setHasChecked(true)
      setIsChecking(false)
    }

    check()
  }, [selectedMedicoId, fechaInicio, fechaFin])

  const handleSubmit = async () => {
    if (!selectedMedicoId || !fechaInicio || !fechaFin) return

    setIsSubmitting(true)

    const result = await createBloqueoAgenda(selectedMedicoId, {
      fecha_inicio: formatDateForApi(fechaInicio),
      fecha_fin: formatDateForApi(fechaFin),
      motivo: motivo.trim() || undefined,
      origen: "individual",
    })

    if (result.success) {
      toast.success("Bloqueo creado exitosamente")
      onOpenChange(false)
      onBloqueoCreated()
    } else {
      toast.error(result.error || "Error al crear el bloqueo")
    }

    setIsSubmitting(false)
  }

  const canSubmit = selectedMedicoId && fechaInicio && fechaFin && hasChecked && conflicts.length === 0 && !isChecking && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Agregar Bloqueo de Agenda</DialogTitle>
          <DialogDescription>
            Selecciona el médico y el período de no disponibilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor selector */}
          <div className="space-y-2">
            <Label>Médico *</Label>
            <Select value={selectedMedicoId} onValueChange={setSelectedMedicoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar médico..." />
              </SelectTrigger>
              <SelectContent>
                {medicos.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.apellido}, {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de inicio */}
          <div className="space-y-2">
            <Label>Fecha de inicio *</Label>
            <Popover open={inicioPopoverOpen} onOpenChange={setInicioPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaInicio ? formatDate(formatDateForApi(fechaInicio)) : "Seleccionar fecha..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={(date) => {
                    setFechaInicio(date)
                    if (date && fechaFin && fechaFin < date) {
                      setFechaFin(undefined)
                    }
                    setInicioPopoverOpen(false)
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de fin */}
          <div className="space-y-2">
            <Label>Fecha de fin *</Label>
            <Popover open={finPopoverOpen} onOpenChange={setFinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaFin && "text-muted-foreground"
                  )}
                  disabled={!fechaInicio}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFin ? formatDate(formatDateForApi(fechaFin)) : "Seleccionar fecha..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={(date) => {
                    setFechaFin(date)
                    setFinPopoverOpen(false)
                  }}
                  disabled={(date) => {
                    if (!fechaInicio) return true
                    return date < fechaInicio
                  }}
                  defaultMonth={fechaInicio}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Para un solo día, usa la misma fecha en ambos campos.
            </p>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Vacaciones, congreso médico, feriado..."
              maxLength={200}
              rows={2}
            />
          </div>

          {/* Conflict checking */}
          {isChecking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando consultas...
            </div>
          )}

          {/* Conflict warning */}
          {hasChecked && conflicts.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    No se puede crear este bloqueo
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Hay {conflicts.length} consulta{conflicts.length > 1 ? "s" : ""} programada{conflicts.length > 1 ? "s" : ""} en este período.
                  </p>
                  <ul className="space-y-1">
                    {conflicts.map(c => (
                      <li key={c.id} className="text-sm text-amber-700 dark:text-amber-300">
                        &bull; {c.paciente_apellido}, {c.paciente_nombre} — {formatDateTime(c.fecha_hora)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar Bloqueo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
