"use client"

/**
 * Shared component for médico horarios and scheduling parameters
 * Used by both /medicos/[id] and /configuracion routes
 *
 * Supports multiple shifts (turnos) per day (max 2)
 * Uses Google Calendar-style dropdowns with 30-min intervals
 */

import { useEffect, useState, useCallback } from "react"
import { useForm, useFieldArray, Control, FieldPath, UseFormSetValue } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Medico, MedicoHorario } from "@/lib/types/entities"
import { DEFAULT_PARAMETROS_AGENDA } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar, Settings, Info, Plus, Trash2 } from "lucide-react"
import { fetchMedicoHorarios, fetchMedicoParametrosAgenda } from "@/lib/actions/medico-horarios"
import { cn } from "@/lib/utils"

interface MedicoHorariosContentProps {
  medico: Medico
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
}

// Day configuration (Monday-Sunday)
const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

// Maximum number of shifts per day
const MAX_TURNOS_PER_DAY = 2

// Dropdown options for scheduling parameters
const DURACION_CONSULTA_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
const DURACION_BUFFER_OPTIONS = [0, 5, 10, 15, 20, 25, 30]
const MAX_CONSULTAS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

// Tooltip texts for scheduling parameters
const TOOLTIPS = {
  duracion_consulta: "Tiempo de cada consulta. Los turnos disponibles se calcularán en base a esta duración.",
  duracion_buffer: "Tiempo adicional entre consultas.",
  max_consultas_concurrentes: "Número máximo de consultas que pueden ser atendidas en un mismo horario.",
}

// ============================================================================
// TIME OPTIONS GENERATION (Google Calendar-style with 30-min intervals)
// ============================================================================

interface TimeOption {
  value: string      // 24h format: "09:00", "09:30", etc.
  label: string      // 12h format: "9:00am", "9:30am", etc.
}

/**
 * Generate all time options from 00:00 (midnight) to 23:30 (11:30 PM) in 30-min intervals
 */
function generateAllTimeOptions(): TimeOption[] {
  const options: TimeOption[] = []

  for (let hour = 0; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const label = formatTimeToAMPM(hour, minute)
      options.push({ value, label })
    }
  }

  return options
}

/**
 * Format hour and minute to 12-hour AM/PM format
 */
function formatTimeToAMPM(hour: number, minute: number): string {
  const period = hour >= 12 ? "pm" : "am"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const displayMinute = minute.toString().padStart(2, "0")
  return `${displayHour}:${displayMinute}${period}`
}

/**
 * Convert 24h time string to AM/PM display format
 */
function formatTimeForDisplay(time: string): string {
  if (!time || time.length < 5) return "—"
  const [hourStr, minuteStr] = time.split(":")
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  return formatTimeToAMPM(hour, minute)
}

// Pre-generate all time options
const ALL_TIME_OPTIONS = generateAllTimeOptions()

/**
 * Get filtered time options for "Hora Fin" based on selected "Hora Inicio"
 * Returns only times AFTER the start time
 */
function getEndTimeOptions(startTime: string | undefined): TimeOption[] {
  if (!startTime) return ALL_TIME_OPTIONS

  return ALL_TIME_OPTIONS.filter((option) => option.value > startTime)
}

/**
 * Get filtered time options for Turno 2's "Hora Inicio" based on Turno 1's "Hora Fin"
 * Returns only times >= Turno 1's end time
 */
function getTurno2StartOptions(turno1EndTime: string | undefined): TimeOption[] {
  if (!turno1EndTime) return ALL_TIME_OPTIONS

  return ALL_TIME_OPTIONS.filter((option) => option.value >= turno1EndTime)
}

// ============================================================================
// FORM SCHEMA AND TYPES
// ============================================================================

// Schema for a single turno with unique ID for stable React keys
const turnoSchema = z.object({
  id: z.string(), // Required unique ID for stable React keys
  hora_inicio: z.string().min(1, "Selecciona una hora de inicio"),
  hora_fin: z.string().min(1, "Selecciona una hora de fin"),
  activo: z.boolean(),
})

// Form validation schema - simplified since dropdowns prevent most invalid states
const horariosFormSchema = z.object({
  duracion_consulta: z
    .number()
    .min(15, "Mínimo 15 minutos")
    .max(60, "Máximo 60 minutos"),
  duracion_buffer: z
    .number()
    .min(0, "Mínimo 0 minutos")
    .max(30, "Máximo 30 minutos"),
  max_consultas_concurrentes: z
    .number()
    .min(1, "Mínimo 1 consulta")
    .max(8, "Máximo 8 consultas"),
  turnos_0: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_1: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_2: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_3: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_4: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_5: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
  turnos_6: z.array(turnoSchema).max(MAX_TURNOS_PER_DAY),
})

type HorariosFormValues = z.infer<typeof horariosFormSchema>
type TurnoValue = z.infer<typeof turnoSchema>

// Helper to convert time string (HH:MM:SS) to HH:MM for form
function formatTimeForInput(time: string): string {
  if (!time) return "09:00"
  return time.substring(0, 5)
}

// Helper to convert HH:MM to HH:MM:SS for database
function formatTimeForDatabase(time: string): string {
  if (!time) return "09:00:00"
  return `${time}:00`
}

// Generate unique ID for new turnos
function generateTurnoId(): string {
  return `turno-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// TURNO CARD COMPONENT
// ============================================================================

interface TurnoCardProps {
  turnoIndex: number
  diaSemana: number
  control: Control<HorariosFormValues>
  setValue: UseFormSetValue<HorariosFormValues>
  isEditMode: boolean
  onRemove: () => void
  turno: TurnoValue
  previousTurnoEndTime?: string // For Turno 2, this is Turno 1's end time
}

function TurnoCard({
  turnoIndex,
  diaSemana,
  control,
  setValue,
  isEditMode,
  onRemove,
  turno,
  previousTurnoEndTime,
}: TurnoCardProps) {
  const turnosFieldName = `turnos_${diaSemana}` as keyof HorariosFormValues
  const isActive = turno.activo
  const isTurno2 = turnoIndex === 1

  // Calculate available options based on context
  const startTimeOptions = isTurno2
    ? getTurno2StartOptions(previousTurnoEndTime)
    : ALL_TIME_OPTIONS

  const endTimeOptions = getEndTimeOptions(turno.hora_inicio)

  // When start time changes, auto-adjust end time if needed
  const handleStartTimeChange = (newStartTime: string, fieldOnChange: (value: string) => void) => {
    fieldOnChange(newStartTime)

    // If current end time is not valid anymore, reset it to first valid option
    if (turno.hora_fin && turno.hora_fin <= newStartTime) {
      const newEndOptions = getEndTimeOptions(newStartTime)
      if (newEndOptions.length > 0) {
        setValue(
          `${turnosFieldName}.${turnoIndex}.hora_fin` as FieldPath<HorariosFormValues>,
          newEndOptions[0].value
        )
      }
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg p-4 transition-all duration-200",
        isActive
          ? "border border-border bg-card shadow-sm"
          : "border border-dashed border-border/50 bg-muted/30 opacity-60"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Turno {turnoIndex + 1}
          </span>
          {!isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactivo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FormField
            control={control}
            name={`${turnosFieldName}.${turnoIndex}.activo` as FieldPath<HorariosFormValues>}
            render={({ field }) => (
              <FormItem className="flex items-center space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                    disabled={!isEditMode}
                    aria-label={`${isActive ? "Desactivar" : "Activar"} turno ${turnoIndex + 1}`}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {isEditMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8 p-0"
              aria-label={`Eliminar turno ${turnoIndex + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Time Dropdowns */}
      <div className="flex items-center gap-3">
        {/* Hora Inicio */}
        <FormField
          control={control}
          name={`${turnosFieldName}.${turnoIndex}.hora_inicio` as FieldPath<HorariosFormValues>}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                {isEditMode ? (
                  <Select
                    value={field.value as string}
                    onValueChange={(value) => handleStartTimeChange(value, field.onChange)}
                    disabled={!isActive}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-10",
                        !isActive && "bg-muted cursor-not-allowed"
                      )}
                    >
                      <SelectValue placeholder="Inicio" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {startTimeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={cn(
                    "h-10 px-3 flex items-center text-sm rounded-md border bg-background",
                    !isActive && "text-muted-foreground bg-muted/50"
                  )}>
                    {formatTimeForDisplay(field.value as string)}
                  </div>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Separator */}
        <span className="text-muted-foreground font-medium">—</span>

        {/* Hora Fin */}
        <FormField
          control={control}
          name={`${turnosFieldName}.${turnoIndex}.hora_fin` as FieldPath<HorariosFormValues>}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                {isEditMode ? (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                    disabled={!isActive}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-10",
                        !isActive && "bg-muted cursor-not-allowed"
                      )}
                    >
                      <SelectValue placeholder="Fin" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {endTimeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={cn(
                    "h-10 px-3 flex items-center text-sm rounded-md border bg-background",
                    !isActive && "text-muted-foreground bg-muted/50"
                  )}>
                    {formatTimeForDisplay(field.value as string)}
                  </div>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

// ============================================================================
// DAY SECTION COMPONENT
// ============================================================================

interface DaySectionProps {
  dia: { value: number; label: string }
  control: Control<HorariosFormValues>
  setValue: UseFormSetValue<HorariosFormValues>
  isEditMode: boolean
  turnos: TurnoValue[]
  onAddTurno: () => void
  onRemoveTurno: (index: number) => void
}

function DaySection({
  dia,
  control,
  setValue,
  isEditMode,
  turnos,
  onAddTurno,
  onRemoveTurno,
}: DaySectionProps) {
  const canAddTurno = turnos.length < MAX_TURNOS_PER_DAY

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      {/* Day Header */}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
        {dia.label}
      </h3>

      {/* Turnos */}
      <div className="space-y-3">
        {turnos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-3 px-4 bg-muted/30 rounded-lg">
            Sin turnos configurados
          </p>
        ) : (
          turnos.map((turno, index) => (
            <TurnoCard
              key={turno.id} // Use stable unique ID instead of index
              turnoIndex={index}
              diaSemana={dia.value}
              control={control}
              setValue={setValue}
              isEditMode={isEditMode}
              onRemove={() => onRemoveTurno(index)}
              turno={turno}
              previousTurnoEndTime={index > 0 ? turnos[index - 1]?.hora_fin : undefined}
            />
          ))
        )}
      </div>

      {/* Add Turno Button */}
      {isEditMode && canAddTurno && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddTurno}
          className="mt-3"
          aria-label={`Agregar nuevo turno para ${dia.label}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar turno
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MedicoHorariosContent({
  medico,
  isEditMode,
  onFormChange,
}: MedicoHorariosContentProps) {
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<HorariosFormValues>({
    resolver: zodResolver(horariosFormSchema),
    defaultValues: {
      duracion_consulta: DEFAULT_PARAMETROS_AGENDA.duracion_consulta,
      duracion_buffer: DEFAULT_PARAMETROS_AGENDA.duracion_buffer,
      max_consultas_concurrentes: DEFAULT_PARAMETROS_AGENDA.max_consultas_concurrentes,
      turnos_0: [],
      turnos_1: [],
      turnos_2: [],
      turnos_3: [],
      turnos_4: [],
      turnos_5: [],
      turnos_6: [],
    },
  })

  const fieldArrays = {
    0: useFieldArray({ control: form.control, name: "turnos_0" }),
    1: useFieldArray({ control: form.control, name: "turnos_1" }),
    2: useFieldArray({ control: form.control, name: "turnos_2" }),
    3: useFieldArray({ control: form.control, name: "turnos_3" }),
    4: useFieldArray({ control: form.control, name: "turnos_4" }),
    5: useFieldArray({ control: form.control, name: "turnos_5" }),
    6: useFieldArray({ control: form.control, name: "turnos_6" }),
  }

  const buildFormValues = useCallback(
    (
      horarios: MedicoHorario[],
      parametros: Pick<typeof DEFAULT_PARAMETROS_AGENDA, 'duracion_consulta' | 'duracion_buffer' | 'max_consultas_concurrentes'> | null
    ): HorariosFormValues => {
      const params = parametros || DEFAULT_PARAMETROS_AGENDA

      const turnosByDay: Record<number, TurnoValue[]> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
      }

      horarios.forEach((horario) => {
        turnosByDay[horario.dia_semana].push({
          id: horario.id || generateTurnoId(), // Use existing ID or generate new one
          hora_inicio: formatTimeForInput(horario.hora_inicio),
          hora_fin: formatTimeForInput(horario.hora_fin),
          activo: horario.activo,
        })
      })

      // Sort turnos by hora_inicio within each day
      Object.keys(turnosByDay).forEach((day) => {
        turnosByDay[parseInt(day)].sort((a, b) =>
          a.hora_inicio.localeCompare(b.hora_inicio)
        )
      })

      return {
        duracion_consulta: params.duracion_consulta,
        duracion_buffer: params.duracion_buffer,
        max_consultas_concurrentes: params.max_consultas_concurrentes,
        turnos_0: turnosByDay[0],
        turnos_1: turnosByDay[1],
        turnos_2: turnosByDay[2],
        turnos_3: turnosByDay[3],
        turnos_4: turnosByDay[4],
        turnos_5: turnosByDay[5],
        turnos_6: turnosByDay[6],
      }
    },
    []
  )

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)

      const [horariosResult, parametrosResult] = await Promise.all([
        fetchMedicoHorarios(medico.id),
        fetchMedicoParametrosAgenda(medico.id)
      ])

      const horarios = horariosResult.data || []
      const parametros = parametrosResult.data

      form.reset(buildFormValues(horarios, parametros))
      setIsLoading(false)
    }

    loadData()
  }, [medico.id, form, buildFormValues])

  // Re-fetch when exiting edit mode
  useEffect(() => {
    async function refetchData() {
      const [horariosResult, parametrosResult] = await Promise.all([
        fetchMedicoHorarios(medico.id),
        fetchMedicoParametrosAgenda(medico.id)
      ])

      const horarios = horariosResult.data || []
      const parametros = parametrosResult.data

      form.reset(buildFormValues(horarios, parametros))
    }

    if (!isEditMode) {
      refetchData()
    }
  }, [isEditMode, medico.id, form, buildFormValues])

  // Expose form values to parent
  useEffect(() => {
    if (isEditMode) {
      (window as Window & {
        __getMedicoHorariosFormValues?: () => {
          horarios: {
            horarios: Array<{
              dia_semana: number
              hora_inicio: string
              hora_fin: string
              activo: boolean
            }>
          }
          parametros: {
            duracion_consulta: number
            duracion_buffer: number
            max_consultas_concurrentes: number
          }
        }
      }).__getMedicoHorariosFormValues = () => {
        const values = form.getValues()

        const allHorarios: Array<{
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo: boolean
        }> = []

        DIAS_SEMANA.forEach((dia) => {
          const turnosFieldName = `turnos_${dia.value}` as keyof HorariosFormValues
          const turnos = values[turnosFieldName] as TurnoValue[]

          turnos.forEach((turno) => {
            if (turno.hora_inicio && turno.hora_fin) {
              allHorarios.push({
                dia_semana: dia.value,
                hora_inicio: formatTimeForDatabase(turno.hora_inicio),
                hora_fin: formatTimeForDatabase(turno.hora_fin),
                activo: turno.activo,
              })
            }
          })
        })

        return {
          horarios: { horarios: allHorarios },
          parametros: {
            duracion_consulta: values.duracion_consulta,
            duracion_buffer: values.duracion_buffer,
            max_consultas_concurrentes: values.max_consultas_concurrentes,
          },
        }
      }
    }

    return () => {
      delete (window as Window & {
        __getMedicoHorariosFormValues?: () => {
          horarios: {
            horarios: Array<{
              dia_semana: number
              hora_inicio: string
              hora_fin: string
              activo: boolean
            }>
          }
          parametros: {
            duracion_consulta: number
            duracion_buffer: number
            max_consultas_concurrentes: number
          }
        }
      }).__getMedicoHorariosFormValues
    }
  }, [isEditMode, form])

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      onFormChange(true)
    })
    return () => subscription.unsubscribe()
  }, [form, onFormChange])

  // Add new turno with default times based on context
  const handleAddTurno = (diaSemana: number) => {
    const fieldArray = fieldArrays[diaSemana as keyof typeof fieldArrays]
    const turnosFieldName = `turnos_${diaSemana}` as keyof HorariosFormValues
    const existingTurnos = form.getValues(turnosFieldName) as TurnoValue[]

    let defaultStart = "09:00"
    let defaultEnd = "17:00"

    // If there's already a turno, start the new one after it ends
    if (existingTurnos.length > 0) {
      const lastTurno = existingTurnos[existingTurnos.length - 1]
      if (lastTurno.hora_fin) {
        defaultStart = lastTurno.hora_fin
        // Set end time 4 hours after start, or 22:00 max
        const [hours] = defaultStart.split(":").map(Number)
        const endHour = Math.min(hours + 4, 22)
        defaultEnd = `${endHour.toString().padStart(2, "0")}:00`
      }
    }

    fieldArray.append({
      id: generateTurnoId(),
      hora_inicio: defaultStart,
      hora_fin: defaultEnd,
      activo: true,
    })
  }

  const handleRemoveTurno = (diaSemana: number, index: number) => {
    const fieldArray = fieldArrays[diaSemana as keyof typeof fieldArrays]
    fieldArray.remove(index)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Cargando horarios...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasActiveTurnos = DIAS_SEMANA.some((dia) => {
    const turnosFieldName = `turnos_${dia.value}` as keyof HorariosFormValues
    const turnos = form.watch(turnosFieldName) as TurnoValue[]
    return turnos.some((t) => t.activo)
  })

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Configuration Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Parámetros de Agenda</CardTitle>
            </div>
            <CardDescription>
              Configuración de duración y capacidad aplicable a todas las consultas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="duracion_consulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Duración de consulta
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>{TOOLTIPS.duracion_consulta}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Select
                            value={String(field.value)}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            disabled={!hasActiveTurnos}
                          >
                            <SelectTrigger className={!hasActiveTurnos ? "bg-muted" : ""}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURACION_CONSULTA_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option} minutos
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm py-2">{field.value} minutos</div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duracion_buffer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Tiempo de buffer
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>{TOOLTIPS.duracion_buffer}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Select
                            value={String(field.value)}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            disabled={!hasActiveTurnos}
                          >
                            <SelectTrigger className={!hasActiveTurnos ? "bg-muted" : ""}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURACION_BUFFER_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option} minutos
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm py-2">{field.value} minutos</div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_consultas_concurrentes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Cantidad de consultas por slot
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>{TOOLTIPS.max_consultas_concurrentes}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        {isEditMode ? (
                          <Select
                            value={String(field.value)}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            disabled={!hasActiveTurnos}
                          >
                            <SelectTrigger className={!hasActiveTurnos ? "bg-muted" : ""}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {MAX_CONSULTAS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm py-2">{field.value} {field.value === 1 ? "consulta" : "consultas"}</div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Schedule Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Horarios de Atención por Día</CardTitle>
            </div>
            <CardDescription>
              Define los horarios de disponibilidad para cada día de la semana. Puedes agregar hasta {MAX_TURNOS_PER_DAY} turnos por día.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {DIAS_SEMANA.map((dia) => {
                const turnosFieldName = `turnos_${dia.value}` as keyof HorariosFormValues
                const turnos = form.watch(turnosFieldName) as TurnoValue[]

                return (
                  <DaySection
                    key={dia.value}
                    dia={dia}
                    control={form.control}
                    setValue={form.setValue}
                    isEditMode={isEditMode}
                    turnos={turnos}
                    onAddTurno={() => handleAddTurno(dia.value)}
                    onRemoveTurno={(index) => handleRemoveTurno(dia.value, index)}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  )
}
