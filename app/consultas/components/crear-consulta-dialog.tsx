"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Stepper } from "@/components/ui/stepper"
import { CalendarIcon, Check, ChevronsUpDown, Plus, X, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { searchPacientes, createConsulta, getAvailableSlotsForDate, getMedicoWorkDays, fetchMedicos } from "../actions"
import { fetchMedicoBlockedDates } from "@/lib/actions/medico-bloqueos"
import { fetchObrasSociales, createPaciente, type ObraSocial } from "@/app/pacientes/actions"
import { type MedicoOption, type PacienteSearchResult } from "../types"
import { TIPO_CONSULTA_OPTIONS, type TipoConsulta } from "@/lib/constants/consulta-types"
import { SlotSelector } from "./slot-selector"
import { SchedulingCalendar } from "@/components/ui/scheduling-calendar"
import { TimeSlot } from "@/lib/types"
import { formatDateToString } from "@/lib/utils/slot-calculator"

interface CrearConsultaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional list of médicos - if not provided, will be fetched when dialog opens */
  medicos?: MedicoOption[]
  /** Optional initial patient to preselect in the form */
  initialPaciente?: PacienteSearchResult | null
}

const TOTAL_STEPS = 2

export function CrearConsultaDialog({ open, onOpenChange, medicos: propMedicos, initialPaciente }: CrearConsultaDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Médicos state - use prop if provided, otherwise fetch when dialog opens
  const [fetchedMedicos, setFetchedMedicos] = useState<MedicoOption[]>([])
  const [isLoadingMedicos, setIsLoadingMedicos] = useState(false)
  const medicos = propMedicos ?? fetchedMedicos

  // Step 1: Main form state
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteSearchResult | null>(initialPaciente ?? null)
  const [selectedMedico, setSelectedMedico] = useState("")
  const [selectedTipo, setSelectedTipo] = useState<TipoConsulta | "">("")
  const [motivo, setMotivo] = useState("")

  // Step 2: Scheduling state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [medicoWorkDays, setMedicoWorkDays] = useState<number[]>([])
  const [medicoBlockedDates, setMedicoBlockedDates] = useState<string[]>([])
  const [isLoadingWorkDays, setIsLoadingWorkDays] = useState(false)

  // Paciente search state
  const [pacienteSearchOpen, setPacienteSearchOpen] = useState(false)
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState("")
  const [pacienteSearchResults, setPacienteSearchResults] = useState<PacienteSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Inline patient creation state
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([])
  const [inlineFormData, setInlineFormData] = useState({
    dni: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: undefined as Date | undefined,
    genero: "",
    telefono: "",
    email: "",
    obraSocial: "",
  })
  const [dateInput, setDateInput] = useState("")
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({})
  const [isCreatingPaciente, setIsCreatingPaciente] = useState(false)

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load médicos when dialog opens (only if not provided via props)
  useEffect(() => {
    if (open && !propMedicos && fetchedMedicos.length === 0) {
      const loadMedicos = async () => {
        setIsLoadingMedicos(true)
        const { data, error } = await fetchMedicos()
        setIsLoadingMedicos(false)

        if (error) {
          toast.error("Error al cargar los médicos")
          console.error(error)
        } else if (data) {
          setFetchedMedicos(data)
        }
      }
      loadMedicos()
    }
  }, [open, propMedicos, fetchedMedicos.length])

  // Set initial patient when dialog opens with initialPaciente
  useEffect(() => {
    if (open && initialPaciente) {
      setSelectedPaciente(initialPaciente)
    }
  }, [open, initialPaciente])

  // Load obras sociales when inline form is shown
  useEffect(() => {
    if (showInlineForm && obrasSociales.length === 0) {
      loadObrasSociales()
    }
  }, [showInlineForm, obrasSociales.length])

  const loadObrasSociales = async () => {
    const { data, error } = await fetchObrasSociales()
    if (error) {
      toast.error("Error al cargar las obras sociales")
      console.error(error)
    } else if (data) {
      setObrasSociales(data)
    }
  }

  // Debounced search effect
  useEffect(() => {
    if (pacienteSearchTerm.length < 3) {
      setPacienteSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      const { data, error } = await searchPacientes(pacienteSearchTerm)
      setIsSearching(false)

      if (error) {
        toast.error("Error al buscar pacientes")
        console.error(error)
      } else if (data) {
        setPacienteSearchResults(data)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [pacienteSearchTerm])

  // Fetch work days when moving to step 2 (or when medico changes in step 2)
  useEffect(() => {
    if (currentStep === 2 && selectedMedico) {
      const fetchWorkDaysAndBlocked = async () => {
        setIsLoadingWorkDays(true)
        const [workDaysResult, blockedResult] = await Promise.all([
          getMedicoWorkDays(selectedMedico),
          fetchMedicoBlockedDates(selectedMedico),
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
  }, [currentStep, selectedMedico])

  // Fetch available slots when date changes in step 2
  useEffect(() => {
    if (currentStep === 2 && selectedMedico && selectedDate) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true)
        setSelectedTime(null) // Reset selected time when date changes

        const dateStr = formatDateToString(selectedDate)
        const { data, error } = await getAvailableSlotsForDate(selectedMedico, dateStr)

        setIsLoadingSlots(false)

        if (error) {
          toast.error("Error al cargar los horarios disponibles")
          console.error(error)
          setAvailableSlots([])
        } else if (data) {
          setAvailableSlots(data.slots)
        }
      }

      fetchSlots()
    }
  }, [currentStep, selectedMedico, selectedDate])

  // Handle inline patient creation
  const handleCreatePacienteClick = () => {
    setShowInlineForm(true)
    setPacienteSearchOpen(false)
  }

  const handleCancelInlineForm = () => {
    setShowInlineForm(false)
    resetInlineForm()
  }

  const resetInlineForm = () => {
    setInlineFormData({
      dni: "",
      nombre: "",
      apellido: "",
      fechaNacimiento: undefined,
      genero: "",
      telefono: "",
      email: "",
      obraSocial: "",
    })
    setDateInput("")
    setInlineErrors({})
  }

  const handleSaveInlinePatient = async () => {
    const newErrors: Record<string, string> = {}

    // Validate required fields (only DNI, nombre, apellido are mandatory)
    if (!inlineFormData.dni.trim()) {
      newErrors.dni = "El DNI es obligatorio"
    }
    if (!inlineFormData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }
    if (!inlineFormData.apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio"
    }

    if (Object.keys(newErrors).length > 0) {
      setInlineErrors(newErrors)
      return
    }

    // Create patient
    setIsCreatingPaciente(true)

    try {
      const { success, error, data } = await createPaciente({
        dni: inlineFormData.dni,
        nombre: inlineFormData.nombre,
        apellido: inlineFormData.apellido,
        fecha_nacimiento: inlineFormData.fechaNacimiento ? format(inlineFormData.fechaNacimiento, "yyyy-MM-dd") : undefined,
        genero: inlineFormData.genero || undefined,
        telefono: inlineFormData.telefono || undefined,
        email: inlineFormData.email || undefined,
        obra_social_id: inlineFormData.obraSocial || undefined,
      })

      if (success && data) {
        toast.success("Paciente creado exitosamente")

        // Set as selected patient
        setSelectedPaciente({
          id: data.id,
          dni: data.dni,
          nombre: data.nombre,
          apellido: data.apellido,
        })

        // Reset and hide inline form
        setShowInlineForm(false)
        resetInlineForm()
      } else {
        toast.error(error || "Error al crear el paciente")
      }
    } catch {
      toast.error("Error inesperado al crear el paciente")
    } finally {
      setIsCreatingPaciente(false)
    }
  }

  const handleDateInputChange = (value: string) => {
    setDateInput(value)

    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date())
        if (!isNaN(parsedDate.getTime())) {
          setInlineFormData({ ...inlineFormData, fechaNacimiento: parsedDate })
          setInlineErrors({ ...inlineErrors, fechaNacimiento: "" })
        }
      } catch {
        // Invalid date - silently ignore
      }
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setInlineFormData({ ...inlineFormData, fechaNacimiento: date })
    setInlineErrors({ ...inlineErrors, fechaNacimiento: "" })
    if (date) {
      setDateInput(format(date, "dd/MM/yyyy"))
    }
  }

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedPaciente) {
      newErrors.paciente = "Debe seleccionar un paciente"
    }
    if (!selectedMedico) {
      newErrors.medico = "Debe seleccionar un medico"
    }
    if (!selectedTipo) {
      newErrors.tipo = "Debe seleccionar un tipo de consulta"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  // Navigate to next step
  const handleNextStep = () => {
    if (validateStep1()) {
      // Reset Step 2 state when moving forward
      setSelectedDate(new Date())
      setSelectedTime(null)
      setCurrentStep(2)
    }
  }

  // Navigate to previous step
  const handlePreviousStep = () => {
    setCurrentStep(1)
  }

  // Handle main form submission
  const handleSubmit = async () => {
    // Validate Step 2
    if (!selectedTime) {
      toast.error("Debe seleccionar un horario")
      return
    }

    // Combine date and time into ISO datetime string
    const [hours, minutes] = selectedTime.split(":")
    const fechaHora = new Date(selectedDate)
    fechaHora.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    setIsLoading(true)

    try {
      const { success, error } = await createConsulta({
        paciente_id: selectedPaciente!.id,
        medico_id: selectedMedico,
        tipo_consulta: selectedTipo as TipoConsulta,
        fecha_hora: fechaHora.toISOString(),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      })

      if (success) {
        toast.success("Consulta creada exitosamente")

        // Close dialog and reset form
        onOpenChange(false)
        resetForm()

        // Refresh the page data
        router.refresh()
      } else {
        toast.error(error || "Error al crear la consulta")
      }
    } catch (error) {
      console.error("Error creating consulta:", error)
      toast.error("Error inesperado al crear la consulta")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    // Reset to initial patient if provided, otherwise clear
    setSelectedPaciente(initialPaciente ?? null)
    setSelectedMedico("")
    setSelectedTipo("")
    setMotivo("")
    setSelectedDate(new Date())
    setSelectedTime(null)
    setAvailableSlots([])
    setMedicoWorkDays([])
    setPacienteSearchTerm("")
    setPacienteSearchResults([])
    setShowInlineForm(false)
    resetInlineForm()
    setErrors({})
    // Reset fetched médicos to allow refetch on next open
    if (!propMedicos) {
      setFetchedMedicos([])
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const defaultYear = new Date().getFullYear() - 30
  const defaultMonth = new Date(defaultYear, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Consulta</DialogTitle>
          <DialogDescription>
            Complete los datos para crear una nueva consulta. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="py-4 border-b">
          <Stepper totalSteps={TOTAL_STEPS} currentStep={currentStep} />
        </div>

        {/* Step 1: Informacion de la Consulta */}
        {currentStep === 1 && (
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-800 tracking-wide">
                  INFORMACION DE LA CONSULTA
                </h3>
              </div>

              {/* Paciente Combobox */}
              <div className="grid gap-2">
                <Label htmlFor="paciente">
                  Paciente <span className="text-destructive">*</span>
                </Label>
                <Popover open={pacienteSearchOpen} onOpenChange={setPacienteSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pacienteSearchOpen}
                      className={cn(
                        "w-full justify-between",
                        errors.paciente && "border-destructive"
                      )}
                    >
                      {selectedPaciente ? (
                        <span>
                          {selectedPaciente.nombre} {selectedPaciente.apellido} (DNI: {selectedPaciente.dni})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Buscar paciente (DNI o nombre)</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[600px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por DNI o nombre..."
                        value={pacienteSearchTerm}
                        onValueChange={setPacienteSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isSearching
                            ? "Buscando..."
                            : pacienteSearchTerm.length < 3
                              ? "Ingrese al menos 3 caracteres para buscar"
                              : "No se encontraron pacientes"}
                        </CommandEmpty>
                        {pacienteSearchResults.length > 0 && (
                          <CommandGroup>
                            {pacienteSearchResults.map((paciente) => (
                              <CommandItem
                                key={paciente.id}
                                value={paciente.id}
                                onSelect={() => {
                                  setSelectedPaciente(paciente)
                                  setPacienteSearchOpen(false)
                                  setErrors({ ...errors, paciente: "" })
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedPaciente?.id === paciente.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {paciente.nombre} {paciente.apellido} (DNI: {paciente.dni})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        <CommandGroup>
                          <CommandItem
                            onSelect={handleCreatePacienteClick}
                            className="border-t cursor-pointer text-blue-600"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear nuevo paciente
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.paciente && (
                  <p className="text-sm text-destructive">{errors.paciente}</p>
                )}
              </div>

              {/* Inline Patient Creation Form */}
              {showInlineForm && (
                <div className="border border-blue-200 border-l-4 border-l-blue-400 rounded-lg bg-blue-50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800">Informacion del nuevo paciente</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelInlineForm}
                      disabled={isCreatingPaciente}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="inline-dni">
                        DNI <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inline-dni"
                        value={inlineFormData.dni}
                        onChange={(e) => {
                          setInlineFormData({ ...inlineFormData, dni: e.target.value })
                          setInlineErrors({ ...inlineErrors, dni: "" })
                        }}
                        className={inlineErrors.dni ? "border-destructive" : ""}
                        disabled={isCreatingPaciente}
                      />
                      {inlineErrors.dni && (
                        <p className="text-sm text-destructive">{inlineErrors.dni}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="inline-nombre">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inline-nombre"
                        value={inlineFormData.nombre}
                        onChange={(e) => {
                          setInlineFormData({ ...inlineFormData, nombre: e.target.value })
                          setInlineErrors({ ...inlineErrors, nombre: "" })
                        }}
                        className={inlineErrors.nombre ? "border-destructive" : ""}
                        disabled={isCreatingPaciente}
                      />
                      {inlineErrors.nombre && (
                        <p className="text-sm text-destructive">{inlineErrors.nombre}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="inline-apellido">
                        Apellido <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="inline-apellido"
                        value={inlineFormData.apellido}
                        onChange={(e) => {
                          setInlineFormData({ ...inlineFormData, apellido: e.target.value })
                          setInlineErrors({ ...inlineErrors, apellido: "" })
                        }}
                        className={inlineErrors.apellido ? "border-destructive" : ""}
                        disabled={isCreatingPaciente}
                      />
                      {inlineErrors.apellido && (
                        <p className="text-sm text-destructive">{inlineErrors.apellido}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="inline-fechaNacimiento">
                        Fecha de nacimiento
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="inline-fechaNacimiento"
                          placeholder="DD/MM/YYYY"
                          value={dateInput}
                          onChange={(e) => handleDateInputChange(e.target.value)}
                          maxLength={10}
                          className="flex-1"
                          disabled={isCreatingPaciente}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" disabled={isCreatingPaciente}>
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={inlineFormData.fechaNacimiento}
                              onSelect={handleDateSelect}
                              locale={es}
                              captionLayout="dropdown"
                              fromYear={1900}
                              toYear={new Date().getFullYear()}
                              defaultMonth={defaultMonth}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="inline-genero">Genero</Label>
                      <Select
                        value={inlineFormData.genero}
                        onValueChange={(value) =>
                          setInlineFormData({ ...inlineFormData, genero: value })
                        }
                        disabled={isCreatingPaciente}
                      >
                        <SelectTrigger id="inline-genero">
                          <SelectValue placeholder="Seleccionar genero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="inline-telefono">
                        Telefono
                      </Label>
                      <Input
                        id="inline-telefono"
                        inputMode="numeric"
                        maxLength={15}
                        value={inlineFormData.telefono}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, "")
                          setInlineFormData({ ...inlineFormData, telefono: numericValue })
                        }}
                        placeholder="Número de teléfono"
                        disabled={isCreatingPaciente}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="inline-email">Email</Label>
                      <Input
                        id="inline-email"
                        type="email"
                        value={inlineFormData.email}
                        onChange={(e) =>
                          setInlineFormData({ ...inlineFormData, email: e.target.value })
                        }
                        disabled={isCreatingPaciente}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="inline-obraSocial">
                        Obra Social
                      </Label>
                      <Select
                        value={inlineFormData.obraSocial}
                        onValueChange={(value) => {
                          setInlineFormData({ ...inlineFormData, obraSocial: value })
                        }}
                        disabled={isCreatingPaciente}
                      >
                        <SelectTrigger id="inline-obraSocial">
                          <SelectValue placeholder="Seleccionar obra social" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {obrasSociales.map((os) => (
                            <SelectItem key={os.id} value={os.id}>
                              {os.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelInlineForm}
                      disabled={isCreatingPaciente}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveInlinePatient} disabled={isCreatingPaciente}>
                      {isCreatingPaciente ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Medico Select */}
              <div className="grid gap-2">
                <Label htmlFor="medico">
                  Medico <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedMedico}
                  onValueChange={(value) => {
                    setSelectedMedico(value)
                    setErrors({ ...errors, medico: "" })
                  }}
                  disabled={isLoadingMedicos}
                >
                  <SelectTrigger
                    id="medico"
                    className={errors.medico ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder={isLoadingMedicos ? "Cargando médicos..." : "Seleccionar medico"} />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((medico) => (
                      <SelectItem key={medico.id} value={medico.id}>
                        {medico.nombre} {medico.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.medico && (
                  <p className="text-sm text-destructive">{errors.medico}</p>
                )}
              </div>

              {/* Tipo de Consulta Select */}
              <div className="grid gap-2">
                <Label htmlFor="tipo">
                  Tipo de Consulta <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTipo}
                  onValueChange={(value) => {
                    setSelectedTipo(value as TipoConsulta)
                    setErrors({ ...errors, tipo: "" })
                  }}
                >
                  <SelectTrigger
                    id="tipo"
                    className={errors.tipo ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_CONSULTA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-sm text-destructive">{errors.tipo}</p>
                )}
              </div>

              {/* Motivo */}
              <div className="grid gap-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo de la consulta"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Programacion */}
        {currentStep === 2 && (
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-800 tracking-wide">
                  PROGRAMACION
                </h3>
              </div>

              {/* Selected consultation info summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-muted-foreground">Paciente:</span>{" "}
                    <span className="font-medium">{selectedPaciente?.nombre} {selectedPaciente?.apellido}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Medico:</span>{" "}
                    <span className="font-medium">
                      {medicos.find(m => m.id === selectedMedico)?.nombre} {medicos.find(m => m.id === selectedMedico)?.apellido}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>{" "}
                    <span className="font-medium">
                      {TIPO_CONSULTA_OPTIONS.find(t => t.value === selectedTipo)?.label}
                    </span>
                  </div>
                </div>
                {motivo.trim() && (
                  <div className="mt-2 pt-2 border-t border-muted">
                    <span className="text-muted-foreground">Motivo:</span>{" "}
                    <span className="font-medium">{motivo.trim()}</span>
                  </div>
                )}
              </div>

              {/* Calendar and Time Slots Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Calendar Section */}
                <Card className="p-6">
                  <h4 className="mb-4 text-sm font-semibold">Seleccionar Fecha</h4>
                  <SchedulingCalendar
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      if (date) setSelectedDate(date)
                    }}
                    workDays={medicoWorkDays}
                    blockedDates={medicoBlockedDates}
                    isLoadingWorkDays={isLoadingWorkDays}
                  />
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
        )}

        <DialogFooter>
          {currentStep === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNextStep} disabled={showInlineForm}>
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePreviousStep} disabled={isLoading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !selectedTime}>
                {isLoading ? "Creando..." : "Crear Consulta"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
