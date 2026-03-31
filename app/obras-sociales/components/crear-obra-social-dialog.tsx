"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createObraSocial, type ObraSocial } from "../actions"
import { PhoneInput, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants/country-codes"

interface CrearObraSocialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onObraSocialCreated?: (obraSocial: ObraSocial) => void
}

export function CrearObraSocialDialog({ open, onOpenChange, onObraSocialCreated }: CrearObraSocialDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    phone: {
      countryCode: DEFAULT_COUNTRY_CODE,
      areaCode: "",
      phoneNumber: "",
    } as PhoneInputValue,
    email: "",
    direccion: "",
    sitioWeb: "",
    notas: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    // Validate required fields
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }

    // Validate email format if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "El formato del email no es válido"
      }
    }

    // Validate URL format if provided
    if (formData.sitioWeb.trim()) {
      try {
        new URL(formData.sitioWeb)
      } catch {
        newErrors.sitioWeb = "El formato de la URL no es válido (debe incluir http:// o https://)"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Format phone number for database (removes + and spaces)
    const telefono = formatPhoneForDatabase(formData.phone)

    // Submit form data
    setIsLoading(true)

    try {
      const { success, error, data } = await createObraSocial({
        nombre: formData.nombre,
        codigo: formData.codigo || undefined,
        telefono: telefono || undefined,
        email: formData.email || undefined,
        direccion: formData.direccion || undefined,
        sitio_web: formData.sitioWeb || undefined,
        notas: formData.notas || undefined,
      })

      if (success && data) {
        // Optimistically update parent component's state
        if (onObraSocialCreated) {
          onObraSocialCreated(data)
        }

        toast.success("Obra social creada exitosamente")

        // Close dialog and reset form
        onOpenChange(false)
        resetForm()

        // Refresh to ensure server and client are in sync
        router.refresh()
      } else {
        toast.error(error || "Error al crear la obra social")
      }
    } catch (error) {
      console.error("Error creating obra social:", error)
      toast.error("Error inesperado al crear la obra social")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      codigo: "",
      phone: {
        countryCode: DEFAULT_COUNTRY_CODE,
        areaCode: "",
        phoneNumber: "",
      },
      email: "",
      direccion: "",
      sitioWeb: "",
      notas: "",
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear obra social</DialogTitle>
          <DialogDescription>
            Complete los datos de la nueva obra social. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: OSDE, Swiss Medical, Galeno"
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
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              placeholder="Código identificador de la obra social"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@obrasocial.com.ar"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                setErrors({ ...errors, email: "" })
              }}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Dirección de la obra social"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sitioWeb">Sitio Web</Label>
            <Input
              id="sitioWeb"
              type="url"
              placeholder="https://www.obrasocial.com.ar"
              value={formData.sitioWeb}
              onChange={(e) => {
                setFormData({ ...formData, sitioWeb: e.target.value })
                setErrors({ ...errors, sitioWeb: "" })
              }}
              className={errors.sitioWeb ? "border-destructive" : ""}
            />
            {errors.sitioWeb && (
              <p className="text-sm text-destructive">{errors.sitioWeb}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              placeholder="Notas adicionales sobre la obra social"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={4}
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
