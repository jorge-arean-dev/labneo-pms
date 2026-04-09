"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OdontologoHorario } from "@/lib/types/entities"

// ============================================================================
// Types
// ============================================================================

interface TurnoData {
  tempId: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

interface OdontologoHorariosContentProps {
  horarios: OdontologoHorario[]
  isEditMode: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

const MAX_TURNOS_PER_DAY = 2

/**
 * Generate time options in 30-minute intervals (00:00 to 23:30)
 * Display: 12-hour AM/PM format
 * Value: HH:MM:SS format for database
 */
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const value = `${hh}:${mm}:00`

      // 12-hour format
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? "am" : "pm"
      const label = `${hour12}:${mm} ${ampm}`

      options.push({ value, label })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// ============================================================================
// Component
// ============================================================================

export function OdontologoHorariosContent({
  horarios,
  isEditMode,
}: OdontologoHorariosContentProps) {
  const [turnos, setTurnos] = useState<TurnoData[]>([])

  // Initialize turnos from horarios
  useEffect(() => {
    const initialTurnos = horarios.map((h) => ({
      tempId: h.id,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      activo: h.activo,
    }))
    setTurnos(initialTurnos)
  }, [horarios])

  // Reset turnos when leaving edit mode
  useEffect(() => {
    if (!isEditMode) {
      const resetTurnos = horarios.map((h) => ({
        tempId: h.id,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        activo: h.activo,
      }))
      setTurnos(resetTurnos)
    }
  }, [isEditMode, horarios])

  // Expose form values for parent access
  const getHorariosValues = useCallback(() => {
    return turnos.map((t) => ({
      dia_semana: t.dia_semana,
      hora_inicio: t.hora_inicio,
      hora_fin: t.hora_fin,
      activo: t.activo,
    }))
  }, [turnos])

  useEffect(() => {
    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__getOdontologoHorariosValues = getHorariosValues
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__getOdontologoHorariosValues
    }
  }, [isEditMode, getHorariosValues])

  const getTurnosForDay = (diaSemana: number) =>
    turnos.filter((t) => t.dia_semana === diaSemana)

  const addTurno = (diaSemana: number) => {
    const dayTurnos = getTurnosForDay(diaSemana)
    if (dayTurnos.length >= MAX_TURNOS_PER_DAY) return

    // Default: if first turno → 09:00-13:00, if second → after first turno ends
    let defaultStart = "09:00:00"
    let defaultEnd = "13:00:00"
    if (dayTurnos.length === 1) {
      defaultStart = dayTurnos[0].hora_fin
      // Add 1 hour to start for end
      const startHour = parseInt(defaultStart.split(":")[0]) + 4
      defaultEnd = `${String(Math.min(startHour, 23)).padStart(2, "0")}:00:00`
    }

    setTurnos([
      ...turnos,
      {
        tempId: `turno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dia_semana: diaSemana,
        hora_inicio: defaultStart,
        hora_fin: defaultEnd,
        activo: true,
      },
    ])
  }

  const removeTurno = (tempId: string) => {
    setTurnos(turnos.filter((t) => t.tempId !== tempId))
  }

  const updateTurno = (tempId: string, field: keyof TurnoData, value: string | boolean) => {
    setTurnos(
      turnos.map((t) => {
        if (t.tempId !== tempId) return t
        const updated = { ...t, [field]: value }

        // Auto-adjust end time if start >= end
        if (field === "hora_inicio" && typeof value === "string" && value >= t.hora_fin) {
          const startHour = parseInt(value.split(":")[0])
          const newEndHour = Math.min(startHour + 4, 23)
          const newEndMin = startHour + 4 > 23 ? "30" : "00"
          updated.hora_fin = `${String(newEndHour).padStart(2, "0")}:${newEndMin}:00`
        }

        return updated
      })
    )
  }

  /**
   * Filter end time options: must be after hora_inicio
   */
  const getEndTimeOptions = (horaInicio: string) =>
    TIME_OPTIONS.filter((opt) => opt.value > horaInicio)

  /**
   * Filter start time options for Turno 2: must be >= Turno 1 end
   */
  const getStartTimeOptions = (diaSemana: number, turnoIndex: number) => {
    if (turnoIndex === 0) return TIME_OPTIONS

    const dayTurnos = getTurnosForDay(diaSemana)
    if (dayTurnos.length < 1) return TIME_OPTIONS

    const firstTurnoEnd = dayTurnos[0].hora_fin
    return TIME_OPTIONS.filter((opt) => opt.value >= firstTurnoEnd)
  }

  return (
    <div className="space-y-4">
      {DIAS_SEMANA.map((dia) => {
        const dayTurnos = getTurnosForDay(dia.value)

        return (
          <Card key={dia.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                {dia.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayTurnos.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin horarios configurados</p>
              )}

              {dayTurnos.map((turno, idx) => (
                <div
                  key={turno.tempId}
                  className={`rounded-lg border p-4 space-y-3 ${
                    !turno.activo
                      ? "border-dashed border-muted-foreground/30 bg-muted/50 opacity-60"
                      : "border-border"
                  }`}
                >
                  {/* Turno header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Horario {idx + 1}</span>
                      {!turno.activo && (
                        <Badge variant="outline" className="text-xs">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {isEditMode && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`switch-${turno.tempId}`} className="text-xs text-muted-foreground">
                          {turno.activo ? "Activo" : "Inactivo"}
                        </Label>
                        <Switch
                          id={`switch-${turno.tempId}`}
                          checked={turno.activo}
                          onCheckedChange={(checked) => updateTurno(turno.tempId, "activo", checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeTurno(turno.tempId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Time selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hora Inicio</Label>
                      {isEditMode ? (
                        <Select
                          value={turno.hora_inicio}
                          onValueChange={(value) => updateTurno(turno.tempId, "hora_inicio", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getStartTimeOptions(dia.value, idx).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">
                          {TIME_OPTIONS.find((o) => o.value === turno.hora_inicio)?.label || turno.hora_inicio}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hora Fin</Label>
                      {isEditMode ? (
                        <Select
                          value={turno.hora_fin}
                          onValueChange={(value) => updateTurno(turno.tempId, "hora_fin", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getEndTimeOptions(turno.hora_inicio).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">
                          {TIME_OPTIONS.find((o) => o.value === turno.hora_fin)?.label || turno.hora_fin}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add turno button */}
              {isEditMode && dayTurnos.length < MAX_TURNOS_PER_DAY && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => addTurno(dia.value)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar horario
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
