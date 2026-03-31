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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createMedicoWithAccess, checkDeletedMedicoByEmail, type Medico, type DeletedMedicoInfo } from "../actions"
import { PhoneInput, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants/country-codes"
import { formatDate } from "@/lib/utils/date-format"

interface CrearMedicoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMedicoCreated?: (medico: Medico) => void
}

export function CrearMedicoDialog({ open, onOpenChange, onMedicoCreated }: CrearMedicoDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    matricula: "",
    phone: {
      countryCode: DEFAULT_COUNTRY_CODE,
      areaCode: "",
      phoneNumber: "",
    } as PhoneInputValue,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reactivation confirmation state
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [deletedMedicoInfo, setDeletedMedicoInfo] = useState<DeletedMedicoInfo | null>(null)

  const validateForm = (): boolean => {
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
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsChecking(true)

    try {
      // First check if email belongs to a soft-deleted médico
      const { exists, deletedMedico, error: checkError } = await checkDeletedMedicoByEmail(formData.email)

      if (checkError) {
        toast.error(checkError)
        setIsChecking(false)
        return
      }

      if (exists && deletedMedico) {
        // Show reactivation confirmation dialog
        setDeletedMedicoInfo(deletedMedico)
        setShowReactivateConfirm(true)
        setIsChecking(false)
        return
      }

      // No deleted médico found - proceed with normal creation
      setIsChecking(false)
      await createMedico()
    } catch (error) {
      console.error("Error checking email:", error)
      toast.error("Error al verificar el correo electrónico")
      setIsChecking(false)
    }
  }

  const createMedico = async () => {
    // Format phone number for database (removes + and spaces)
    const telefono = formatPhoneForDatabase(formData.phone)

    // Submit form data
    setIsLoading(true)

    try {
      const { success, error, data, reactivated } = await createMedicoWithAccess({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        matricula: formData.matricula,
        telefono: telefono || undefined,
      })

      if (success && data) {
        // Optimistically update parent component's state
        if (onMedicoCreated) {
          onMedicoCreated(data)
        }

        // Show different message for reactivation vs new creation
        if (reactivated) {
          toast.success("Médico reactivado exitosamente. Se ha enviado un email para configurar la contraseña.")
        } else {
          toast.success("Médico creado exitosamente. Se ha enviado un email para configurar la contraseña.")
        }

        // Close dialog and reset form
        onOpenChange(false)
        resetForm()

        // Refresh to ensure server and client are in sync
        router.refresh()
      } else {
        toast.error(error || "Error al crear el médico")
      }
    } catch (error) {
      console.error("Error creating médico:", error)
      toast.error("Error inesperado al crear el médico")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateConfirm = async () => {
    setShowReactivateConfirm(false)
    setDeletedMedicoInfo(null)
    await createMedico()
  }

  const handleReactivateCancel = () => {
    setShowReactivateConfirm(false)
    setDeletedMedicoInfo(null)
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      email: "",
      matricula: "",
      phone: {
        countryCode: DEFAULT_COUNTRY_CODE,
        areaCode: "",
        phoneNumber: "",
      },
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Médico</DialogTitle>
          <DialogDescription>
            Complete los datos del nuevo médico. Los campos marcados con * son obligatorios.
            Se enviará un email al médico para que configure su contraseña.
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
              placeholder="medico@ejemplo.com"
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
            <Label htmlFor="matricula">
              Matrícula
            </Label>
            <Input
              id="matricula"
              placeholder="Número de matrícula profesional (opcional)"
              value={formData.matricula}
              onChange={(e) => {
                setFormData({ ...formData, matricula: e.target.value })
                setErrors({ ...errors, matricula: "" })
              }}
              className={errors.matricula ? "border-destructive" : ""}
            />
            {errors.matricula && (
              <p className="text-sm text-destructive">{errors.matricula}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isChecking}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isChecking}>
            {isChecking ? "Verificando..." : isLoading ? "Creando..." : "Crear Médico"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Reactivation Confirmation Dialog */}
      <AlertDialog open={showReactivateConfirm} onOpenChange={setShowReactivateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar Médico</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  El correo electrónico <strong>{formData.email}</strong> pertenece a un médico que fue eliminado anteriormente:
                </p>
                {deletedMedicoInfo && (
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p><strong>Nombre:</strong> {deletedMedicoInfo.nombre} {deletedMedicoInfo.apellido}</p>
                    <p><strong>Eliminado:</strong> {formatDate(deletedMedicoInfo.deletedAt)}</p>
                  </div>
                )}
                <p>
                  ¿Desea reactivar este médico con los nuevos datos ingresados?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReactivateCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateConfirm}>Reactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
