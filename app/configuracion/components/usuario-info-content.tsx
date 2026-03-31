"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { KeyRound } from "lucide-react"
import { UsuarioPms } from "@/lib/types/entities"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/utils/date-format"
import { resetOwnPassword } from "../actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema (email is read-only, not editable)
const usuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
})

type UsuarioFormData = z.infer<typeof usuarioSchema>

interface UsuarioInfoContentProps {
  usuario: UsuarioPms
  isEditMode: boolean
  onFormChange?: (hasChanges: boolean) => void
  role: UserRole
}

export function UsuarioInfoContent({
  usuario,
  isEditMode,
  onFormChange,
  role,
}: UsuarioInfoContentProps) {
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const isAdmin = role === "administracion"

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    },
  })

  const handlePasswordReset = async () => {
    setIsResettingPassword(true)

    try {
      const { success, error } = await resetOwnPassword(usuario.email)

      if (success) {
        toast.success("Se ha enviado un email con instrucciones para restablecer tu contraseña")
      } else {
        toast.error(error || "Error al enviar el email")
      }
    } catch {
      toast.error("Error inesperado al restablecer la contraseña")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const formatLastSignIn = (lastSignInAt: string | null) => {
    if (!lastSignInAt) {
      return "Nunca ha iniciado sesión"
    }
    return formatDateTime(lastSignInAt)
  }

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange?.(isDirty)
  }, [isDirty, onFormChange])

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    const getFormValues = (): Partial<UsuarioPms> => {
      return form.getValues()
    }

    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__getUsuarioFormValues = getFormValues
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__getUsuarioFormValues
    }
  }, [isEditMode, form])

  // Reset form when edit mode is cancelled
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      })
    }
  }, [isEditMode, usuario, form])

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
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
              <p className="text-sm">{usuario.nombre}</p>
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
              <p className="text-sm">{usuario.apellido}</p>
            )}
            {form.formState.errors.apellido && (
              <p className="text-sm text-destructive">
                {form.formState.errors.apellido.message}
              </p>
            )}
          </div>

          {/* Email (Read-Only for all) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado desde aquí
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Reset Card - Available to all roles for self-management */}
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

      {/* Audit Fields (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Información de Auditoría</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Fecha de Creación</Label>
              <p className="text-muted-foreground">
                {formatDateTime(usuario.created_at)}
              </p>
            </div>
            <div>
              <Label>Última Actualización</Label>
              <p className="text-muted-foreground">
                {formatDateTime(usuario.updated_at)}
              </p>
            </div>
            <div>
              <Label>Último Acceso</Label>
              <p className="text-muted-foreground">
                {formatLastSignIn(usuario.last_sign_in_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
