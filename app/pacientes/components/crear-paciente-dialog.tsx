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
import { CalendarIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { fetchObrasSociales, createPaciente, type ObraSocial } from "../actions"

interface CrearPacienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPatientCreated?: () => void
}

export function CrearPacienteDialog({ open, onOpenChange, onPatientCreated }: CrearPacienteDialogProps) {
  const router = useRouter()
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    apellido: "",
    fechaNacimiento: undefined as Date | undefined,
    genero: "",
    telefono: "",
    correo: "",
    direccion: "",
    obraSocial: "",
    plan: "",
    nroAfiliado: "",
  })
  const [dateInput, setDateInput] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch obras sociales when dialog opens
  useEffect(() => {
    if (open) {
      loadObrasSociales()
    }
  }, [open])

  const loadObrasSociales = async () => {
    const { data, error } = await fetchObrasSociales()
    if (error) {
      toast.error("Error al cargar las obras sociales")
      console.error(error)
    } else if (data) {
      setObrasSociales(data)
    }
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    // Validate required fields (only DNI, nombre, apellido are mandatory)
    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es obligatorio"
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }
    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit form data to Supabase
    setIsLoading(true)

    try {
      const { success, error } = await createPaciente({
        dni: formData.dni,
        nombre: formData.nombre,
        apellido: formData.apellido,
        fecha_nacimiento: formData.fechaNacimiento ? format(formData.fechaNacimiento, "yyyy-MM-dd") : undefined,
        genero: formData.genero || undefined,
        telefono: formData.telefono || undefined,
        email: formData.correo || undefined,
        domicilio: formData.direccion || undefined,
        obra_social_id: formData.obraSocial || undefined,
        plan: formData.plan || undefined,
        numero_afiliado: formData.nroAfiliado || undefined,
      })

      if (success) {
        toast.success("Paciente creado exitosamente")

        // Close dialog and reset form
        onOpenChange(false)
        resetForm()

        // Call callback if provided
        if (onPatientCreated) {
          onPatientCreated()
        }

        // Refresh the page data
        router.refresh()
      } else {
        toast.error(error || "Error al crear el paciente")
      }
    } catch (error) {
      console.error("Error creating paciente:", error)
      toast.error("Error inesperado al crear el paciente")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      dni: "",
      apellido: "",
      fechaNacimiento: undefined,
      genero: "",
      telefono: "",
      correo: "",
      direccion: "",
      obraSocial: "",
      plan: "",
      nroAfiliado: "",
    })
    setDateInput("")
    setErrors({})
  }

  const handleDateInputChange = (value: string) => {
    setDateInput(value)

    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date())
        if (!isNaN(parsedDate.getTime())) {
          setFormData({ ...formData, fechaNacimiento: parsedDate })
          setErrors({ ...errors, fechaNacimiento: "" })
        }
      } catch {
        // Invalid date
      }
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setFormData({ ...formData, fechaNacimiento: date })
    setErrors({ ...errors, fechaNacimiento: "" })
    if (date) {
      setDateInput(format(date, "dd/MM/yyyy"))
    }
  }

  const defaultYear = new Date().getFullYear() - 30
  const defaultMonth = new Date(defaultYear, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear paciente</DialogTitle>
          <DialogDescription>
            Complete los datos del nuevo paciente. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="dni">
              DNI <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dni"
              value={formData.dni}
              onChange={(e) => {
                setFormData({ ...formData, dni: e.target.value })
                setErrors({ ...errors, dni: "" })
              }}
              className={errors.dni ? "border-destructive" : ""}
            />
            {errors.dni && (
              <p className="text-sm text-destructive">{errors.dni}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => {
                  setFormData({ ...formData, nombre: e.target.value })
                  setErrors({ ...errors, nombre: "" })
                }}
                className={errors.nombre ? "border-destructive" : ""}
              />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellido">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => {
                  setFormData({ ...formData, apellido: e.target.value })
                  setErrors({ ...errors, apellido: "" })
                }}
                className={errors.apellido ? "border-destructive" : ""}
              />
              {errors.apellido && (
                <p className="text-sm text-destructive">{errors.apellido}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fechaNacimiento">
                Fecha de nacimiento
              </Label>
              <div className="flex gap-2">
                <Input
                  id="fechaNacimiento"
                  placeholder="DD/MM/YYYY"
                  value={dateInput}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  maxLength={10}
                  className={`flex-1 ${errors.fechaNacimiento ? "border-destructive" : ""}`}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formData.fechaNacimiento}
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
              {errors.fechaNacimiento && (
                <p className="text-sm text-destructive">{errors.fechaNacimiento}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="genero">Género</Label>
              <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                <SelectTrigger id="genero">
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="telefono">
              Teléfono
            </Label>
            <Input
              id="telefono"
              inputMode="numeric"
              maxLength={15}
              value={formData.telefono}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, "")
                setFormData({ ...formData, telefono: numericValue })
                setErrors({ ...errors, telefono: "" })
              }}
              placeholder="Número de teléfono"
            />
            {errors.telefono && (
              <p className="text-sm text-destructive">{errors.telefono}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="correo">Correo electrónico</Label>
            <Input
              id="correo"
              type="email"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="obraSocial">
                Obra Social
              </Label>
              <Select
                value={formData.obraSocial}
                onValueChange={(value) => {
                  setFormData({ ...formData, obraSocial: value })
                }}
              >
                <SelectTrigger id="obraSocial">
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
            <div className="grid gap-2">
              <Label htmlFor="plan">Plan</Label>
              <Input
                id="plan"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nroAfiliado">N° de afiliado</Label>
            <Input
              id="nroAfiliado"
              value={formData.nroAfiliado}
              onChange={(e) => setFormData({ ...formData, nroAfiliado: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
