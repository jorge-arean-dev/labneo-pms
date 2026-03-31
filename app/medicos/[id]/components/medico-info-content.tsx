"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Medico } from "@/lib/types/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { PhoneInput, parsePhoneFromDatabase, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"
import { canViewField, canEditField } from "@/lib/permissions"
import { formatDateTime } from "@/lib/utils/date-format"
import { KeyRound, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { resetMedicoPassword, resendMedicoInvite, changeMedicoEmail } from "../actions"
import { EmailChangeDialog } from "@/app/components/email-change-dialog"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema (email is changed via separate dialog, not the edit form)
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
}

export function MedicoInfoContent({
  medico,
  isEditMode,
  onFormChange,
  role,
}: MedicoInfoContentProps) {
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(
    parsePhoneFromDatabase(medico.telefono)
  )
  const router = useRouter()
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [isEmailChangeDialogOpen, setIsEmailChangeDialogOpen] = useState(false)

  const handleChangeEmail = async (newEmail: string) => {
    const result = await changeMedicoEmail(medico.id, newEmail)
    if (result.success) {
      router.refresh()
    }
    return result
  }

  const handlePasswordReset = async () => {
    setIsResettingPassword(true)

    try {
      const { success, error } = await resetMedicoPassword(medico.id)

      if (success) {
        toast.success("Se ha enviado un email al médico con instrucciones para restablecer su contraseña")
      } else {
        toast.error(error || "Error al enviar el email de restablecimiento")
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
      const { success, error } = await resendMedicoInvite(medico.id)

      if (success) {
        toast.success("Se ha reenviado la invitación al médico")
      } else {
        toast.error(error || "Error al reenviar la invitación")
      }
    } catch {
      toast.error("Error inesperado al reenviar la invitación")
    } finally {
      setIsResendingInvite(false)
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
    if (isEditMode) {
      const getFormValues = () => {
        const values = form.getValues()
        return {
          ...values,
          telefono: formatPhoneForDatabase(phoneValue),
        }
      }
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
      form.reset()
      setPhoneValue(parsePhoneFromDatabase(medico.telefono))
    }
  }, [isEditMode, medico, form])

  const canEdit = (field: string) =>
    canEditField("medicos", field, { role, userId: "", isOwner: false })

  const canView = (field: string) =>
    canViewField("medicos", field, { role, userId: "", isOwner: false })

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
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
                <p className="text-sm">{medico.nombre}</p>
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
                <p className="text-sm">{medico.apellido}</p>
              )}
              {form.formState.errors.apellido && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apellido.message}
                </p>
              )}
            </div>
          )}

          {/* Matrícula */}
          {canView("matricula") && (
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              {isEditMode && canEdit("matricula") ? (
                <Input
                  id="matricula"
                  {...form.register("matricula")}
                  placeholder="Número de matrícula profesional"
                />
              ) : (
                <p className="text-sm">{medico.matricula || "—"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email (read-only, changed via dedicated dialog) */}
          {canView("email") && (
            <div className="space-y-2">
              <Label>Email *</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <p className="text-sm flex-1">{medico.email}</p>
                {role === "administrador" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isEditMode}
                    onClick={() => setIsEmailChangeDialogOpen(true)}
                    className="w-full sm:w-auto shrink-0"
                    title={isEditMode ? "No puede cambiar el email mientras está en modo de edición" : "Cambiar el email de este médico"}
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
            currentEmail={medico.email}
            userName={`${medico.nombre} ${medico.apellido}`}
            onChangeEmail={handleChangeEmail}
          />

          {/* Teléfono */}
          {canView("telefono") && (
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              {isEditMode && canEdit("telefono") ? (
                <PhoneInput value={phoneValue} onChange={setPhoneValue} />
              ) : (
                <p className="text-sm">{medico.telefono || "—"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset / Resend Invite (Admin Only) */}
      {role === "administrador" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {medico.activated_at ? "Gestión de Contraseña" : "Gestión de Invitación"}
            </CardTitle>
            <CardDescription>
              {medico.activated_at
                ? "Envía un email al médico con instrucciones para restablecer su contraseña"
                : "El médico no ha completado la configuración de su cuenta. Reenvíe la invitación para que pueda establecer su contraseña."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {medico.activated_at ? (
              <Button
                onClick={handlePasswordReset}
                disabled={isResettingPassword || isEditMode}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isResettingPassword ? "Enviando..." : "Restablecer Contraseña"}
              </Button>
            ) : (
              <Button
                onClick={handleResendInvite}
                disabled={isResendingInvite || isEditMode}
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
                {medico.activated_at ? (
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
