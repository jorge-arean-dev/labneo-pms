"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { KeyRound, Mail } from "lucide-react"
import { Recepcionista } from "@/lib/types/entities"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { canViewField, canEditField } from "@/lib/permissions"
import { formatDateTime } from "@/lib/utils/date-format"
import { resetRecepcionistaPassword, resendRecepcionistaInvite, changeRecepcionistaEmail } from "../actions"
import { EmailChangeDialog } from "@/app/components/email-change-dialog"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema (email is read-only, not editable)
const recepcionistaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
})

type RecepcionistaFormData = z.infer<typeof recepcionistaSchema>

interface RecepcionistaDetailContentProps {
  recepcionista: Recepcionista
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
  role: UserRole
  userId: string
  isOwner: boolean
}

export function RecepcionistaDetailContent({
  recepcionista,
  isEditMode,
  onFormChange,
  role,
  userId,
  isOwner,
}: RecepcionistaDetailContentProps) {
  const router = useRouter()
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [isEmailChangeDialogOpen, setIsEmailChangeDialogOpen] = useState(false)

  const handleChangeEmail = async (newEmail: string) => {
    const result = await changeRecepcionistaEmail(recepcionista.id, newEmail)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  const form = useForm<RecepcionistaFormData>({
    resolver: zodResolver(recepcionistaSchema),
    defaultValues: {
      nombre: recepcionista.nombre,
      apellido: recepcionista.apellido,
    },
  })

  const handlePasswordReset = async () => {
    setIsResettingPassword(true)

    try {
      const { success, error } = await resetRecepcionistaPassword(recepcionista.email)

      if (success) {
        toast.success(`Email de restablecimiento enviado a ${recepcionista.email}`)
      } else {
        toast.error(error || "Error al enviar el email")
      }
    } catch {
      toast.error("Error inesperado al restablecer la contraseña")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleResendInvite = async () => {
    setIsResendingInvite(true)

    try {
      const { success, error } = await resendRecepcionistaInvite(recepcionista.id)

      if (success) {
        toast.success("Se ha reenviado la invitación al recepcionista")
      } else {
        toast.error(error || "Error al reenviar la invitación")
      }
    } catch {
      toast.error("Error inesperado al reenviar la invitación")
    } finally {
      setIsResendingInvite(false)
    }
  }

  const formatLastSignIn = (lastSignInAt: string | null, activatedAt: string | null | undefined) => {
    // If not activated, the user hasn't completed setup - don't show misleading data
    if (!activatedAt) {
      return "—"
    }
    if (!lastSignInAt) {
      return "Nunca ha iniciado sesión"
    }
    return formatDateTime(lastSignInAt)
  }

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange(isDirty)
  }, [isDirty, onFormChange])

  // Get form values for external access
  const getFormValues = (): Partial<Recepcionista> => {
    return form.getValues()
  }

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    if (isEditMode) {
      // Store getter in window for parent access
      (window as unknown as Record<string, () => Partial<Recepcionista>>).__getRecepcionistaFormValues = getFormValues
    }
    return () => {
      delete (window as unknown as Record<string, () => Partial<Recepcionista>>).__getRecepcionistaFormValues
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Reset form when edit mode is cancelled
  useEffect(() => {
    if (!isEditMode) {
      form.reset()
    }
  }, [isEditMode, form])

  const canEdit = (field: string) =>
    canEditField("recepcionistas", field, { role, userId, isOwner })

  const canView = (field: string) =>
    canViewField("recepcionistas", field, { role, userId, isOwner })

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre */}
          {canView("nombre") && (
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              {isEditMode && canEdit("nombre") ? (
                <Input
                  id="nombre"
                  {...form.register("nombre")}
                  placeholder="Nombre"
                />
              ) : (
                <p className="text-sm">{recepcionista.nombre}</p>
              )}
              {form.formState.errors.nombre && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nombre.message}
                </p>
              )}
            </div>
          )}

          {/* Apellido */}
          {canView("apellido") && (
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido *</Label>
              {isEditMode && canEdit("apellido") ? (
                <Input
                  id="apellido"
                  {...form.register("apellido")}
                  placeholder="Apellido"
                />
              ) : (
                <p className="text-sm">{recepcionista.apellido}</p>
              )}
              {form.formState.errors.apellido && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apellido.message}
                </p>
              )}
            </div>
          )}

          {/* Email (read-only, changed via dedicated dialog) */}
          {canView("email") && (
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <p className="text-sm text-muted-foreground flex-1">{recepcionista.email}</p>
                {role === "administrador" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isEditMode}
                    onClick={() => setIsEmailChangeDialogOpen(true)}
                    className="w-full sm:w-auto shrink-0"
                    title={isEditMode ? "No puede cambiar el email mientras está en modo de edición" : "Cambiar el email de este recepcionista"}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Cambiar email
                  </Button>
                )}
              </div>
            </div>
          )}
          <EmailChangeDialog
            open={isEmailChangeDialogOpen}
            onOpenChange={setIsEmailChangeDialogOpen}
            currentEmail={recepcionista.email}
            userName={`${recepcionista.nombre} ${recepcionista.apellido}`}
            onChangeEmail={handleChangeEmail}
          />
        </CardContent>
      </Card>

      {/* Password Reset / Resend Invite Card (Admin Only) */}
      {role === "administrador" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {recepcionista.activated_at ? "Gestión de Contraseña" : "Gestión de Invitación"}
            </CardTitle>
            <CardDescription>
              {recepcionista.activated_at
                ? "Envía un email al recepcionista con instrucciones para restablecer su contraseña"
                : "El recepcionista no ha completado la configuración de su cuenta. Reenvíe la invitación para que pueda establecer su contraseña."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recepcionista.activated_at ? (
              <Button
                onClick={handlePasswordReset}
                disabled={isResettingPassword || isEditMode}
                variant="outline"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isResettingPassword ? "Enviando..." : "Restablecer Contraseña"}
              </Button>
            ) : (
              <Button
                onClick={handleResendInvite}
                disabled={isResendingInvite || isEditMode}
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isResendingInvite ? "Enviando..." : "Re-enviar Invitación"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Fields (Admin Only) */}
      {role === "administrador" && (
        <Card>
          <CardHeader>
            <CardTitle>Información de Auditoría</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Estado de Cuenta</Label>
              <div className="mt-1">
                {recepcionista.activated_at ? (
                  <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                    Activa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                    Pendiente
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label>Fecha de Creación</Label>
              <p className="text-muted-foreground">
                {formatDateTime(recepcionista.created_at)}
              </p>
            </div>
            <div>
              <Label>Última Actualización</Label>
              <p className="text-muted-foreground">
                {formatDateTime(recepcionista.updated_at)}
              </p>
            </div>
            <div>
              <Label>Último Acceso</Label>
              <p className="text-muted-foreground">
                {formatLastSignIn(recepcionista.last_sign_in_at, recepcionista.activated_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
