"use client"

import { useState } from "react"
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

interface CrearPacienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obrasSociales: string[]
}

export function CrearPacienteDialog({ open, onOpenChange, obrasSociales }: CrearPacienteDialogProps) {
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

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es obligatorio"
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }
    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio"
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onOpenChange(false)
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
        }
      } catch {
        // Invalid date
      }
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setFormData({ ...formData, fechaNacimiento: date })
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
              <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
              <div className="flex gap-2">
                <Input
                  id="fechaNacimiento"
                  placeholder="DD/MM/YYYY"
                  value={dateInput}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  maxLength={10}
                  className="flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
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
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => {
                setFormData({ ...formData, telefono: e.target.value })
                setErrors({ ...errors, telefono: "" })
              }}
              className={errors.telefono ? "border-destructive" : ""}
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
              <Label htmlFor="obraSocial">Obra Social</Label>
              <Select value={formData.obraSocial} onValueChange={(value) => setFormData({ ...formData, obraSocial: value })}>
                <SelectTrigger id="obraSocial">
                  <SelectValue placeholder="Seleccionar obra social" />
                </SelectTrigger>
                <SelectContent>
                  {obrasSociales.filter(os => os !== "Todas").map((os) => (
                    <SelectItem key={os} value={os}>
                      {os}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
