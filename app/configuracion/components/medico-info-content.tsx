"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Medico } from "@/lib/types/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PhoneInput, parsePhoneFromDatabase, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"
import { formatDateTime } from "@/lib/utils/date-format"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"
import { resetOwnPassword } from "../actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema (email is read-only, not in form)
const medicoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  matricula: z.string().optional(),
  telefono: z.string().optional(),
})

type MedicoFormData = z.infer<typeof medicoSchema>

interface MedicoInfoContentProps {
  medico: Medico
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
  role: UserRole
  isSelfManagement?: boolean
}

export function MedicoInfoContent({
  medico,
  isEditMode,
  onFormChange,
  role,
  isSelfManagement = false,
}: MedicoInfoContentProps) {
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(
    parsePhoneFromDatabase(medico.telefono)
  )
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const handlePasswordReset = async () => {
    setIsResettingPassword(true)

    try {
      const { success, error } = await resetOwnPassword(medico.email)

      if (success) {
        toast.success("Se ha enviado un email con instrucciones para restablecer tu contraseña")
      } else {
        toast.error(error || "Error al enviar el email de restablecimiento")
      }
    } catch {
      toast.error("Error inesperado al restablecer la contraseña")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const form = useForm<MedicoFormData>({
    resolver: zodResolver(medicoSchema),
    defaultValues: {
      nombre: medico.nombre,
      apellido: medico.apellido,
      matricula: medico.matricula || "",
      telefono: medico.telefono || "",
    },
  })

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange(isDirty)
  }, [isDirty, onFormChange])

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    const getFormValues = () => {
      const values = form.getValues()
      return {
        ...values,
        telefono: formatPhoneForDatabase(phoneValue),
      }
    }

    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__getMedicoFormValues = getFormValues
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__getMedicoFormValues
    }
  }, [isEditMode, phoneValue, form])

  // Reset form when edit mode is cancelled
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        nombre: medico.nombre,
        apellido: medico.apellido,
        matricula: medico.matricula || "",
        telefono: medico.telefono || "",
      })
      setPhoneValue(parsePhoneFromDatabase(medico.telefono))
    }
  }, [isEditMode, medico, form])

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            {isEditMode ? (
              <Input
                id="nombre"
                {...form.register("nombre")}
                placeholder="Nombre"
              />
            ) : (
              <p className="text-sm">{medico.nombre}</p>
            )}
            {form.formState.errors.nombre && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>

          {/* Apellido */}
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido *</Label>
            {isEditMode ? (
              <Input
                id="apellido"
                {...form.register("apellido")}
                placeholder="Apellido"
              />
            ) : (
              <p className="text-sm">{medico.apellido}</p>
            )}
            {form.formState.errors.apellido && (
              <p className="text-sm text-destructive">
                {form.formState.errors.apellido.message}
              </p>
            )}
          </div>

          {/* Matrícula */}
          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula</Label>
            {isEditMode ? (
              <Input
                id="matricula"
                {...form.register("matricula")}
                placeholder="Número de matrícula profesional"
              />
            ) : (
              <p className="text-sm">{medico.matricula || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email (Read-Only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <p className="text-sm text-muted-foreground">{medico.email}</p>
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado desde aquí
            </p>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            {isEditMode ? (
              <PhoneInput value={phoneValue} onChange={setPhoneValue} />
            ) : (
              <p className="text-sm">{medico.telefono || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Reset - Self Management (always visible for self) */}
      {isSelfManagement && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Contraseña</CardTitle>
            <CardDescription>
              Se enviará un email a tu dirección de correo con instrucciones para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePasswordReset}
              disabled={isResettingPassword || isEditMode}
              variant="outline"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {isResettingPassword ? "Enviando..." : "Restablecer Contraseña"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Audit Fields (admin only) */}
      {role === "administrador" && (
        <Card>
          <CardHeader>
            <CardTitle>Información de Auditoría</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Fecha de Creación</Label>
              <p className="text-muted-foreground">
                {formatDateTime(medico.created_at)}
              </p>
            </div>
            <div>
              <Label>Última Actualización</Label>
              <p className="text-muted-foreground">
                {formatDateTime(medico.updated_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
