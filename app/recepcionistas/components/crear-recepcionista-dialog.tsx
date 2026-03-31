"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { createRecepcionista, type Recepcionista } from "../actions"

interface CrearRecepcionistaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecepcionistaCreated?: (recepcionista: Recepcionista) => void
}

export function CrearRecepcionistaDialog({ open, onOpenChange, onRecepcionistaCreated }: CrearRecepcionistaDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    // Validate required fields
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }
    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio"
    }
    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio"
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "El formato del email no es válido"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit form data
    setIsLoading(true)

    try {
      const { success, error, data } = await createRecepcionista({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
      })

      if (success && data) {
        // Optimistically update parent component's state
        if (onRecepcionistaCreated) {
          onRecepcionistaCreated(data)
        }

        toast.success("Recepcionista creado exitosamente. Se ha enviado un email para configurar la contraseña.")

        // Close dialog and reset form
        onOpenChange(false)
        resetForm()

        // Refresh to ensure server and client are in sync
        router.refresh()
      } else {
        toast.error(error || "Error al crear el recepcionista")
      }
    } catch (error) {
      console.error("Error creating recepcionista:", error)
      toast.error("Error inesperado al crear el recepcionista")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      email: "",
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Recepcionista</DialogTitle>
          <DialogDescription>
            Complete los datos del nuevo recepcionista. Los campos marcados con * son obligatorios.
            Se enviará un email al recepcionista para que configure su contraseña.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Juan"
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
                placeholder="Ej: Pérez"
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

          <div className="grid gap-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="recepcionista@ejemplo.com"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creando..." : "Crear Recepcionista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
