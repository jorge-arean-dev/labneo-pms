"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { KeyRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { resetOwnPassword } from "../actions"
import type { UsuarioPms, Localidad, OdontologoPerfil } from "@/lib/types/entities"
import { SITUACIONES_IVA } from "@/lib/types/entities"

const odontologoInfoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  telefono: z.string().optional(),
  localidad_id: z.string().optional(),
  cuit: z.string().optional(),
  situacion_iva: z.string().optional(),
})

type OdontologoInfoFormData = z.infer<typeof odontologoInfoSchema>

interface OdontologoInfoContentProps {
  usuario: UsuarioPms
  perfil: (OdontologoPerfil & { localidades: Localidad | null }) | null
  localidades: Localidad[]
  isEditMode: boolean
}

export function OdontologoInfoContent({
  usuario,
  perfil,
  localidades,
  isEditMode,
}: OdontologoInfoContentProps) {
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const form = useForm<OdontologoInfoFormData>({
    resolver: zodResolver(odontologoInfoSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: perfil?.telefono || "",
      localidad_id: perfil?.localidad_id || "",
      cuit: perfil?.cuit || "",
      situacion_iva: perfil?.situacion_iva || "",
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

  // Handle CUIT input — numbers only
  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbersOnly = e.target.value.replace(/\D/g, "")
    form.setValue("cuit", numbersOnly, { shouldDirty: true })
  }

  // Expose form values for parent access
  useEffect(() => {
    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__getOdontologoInfoFormValues = () => form.getValues()
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__getOdontologoInfoFormValues
    }
  }, [isEditMode, form])

  // Reset form when edit mode is cancelled
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        telefono: perfil?.telefono || "",
        localidad_id: perfil?.localidad_id || "",
        cuit: perfil?.cuit || "",
        situacion_iva: perfil?.situacion_iva || "",
      })
    }
  }, [isEditMode, usuario, perfil, form])

  const localidadDisplay = perfil?.localidades?.nombre_display || "—"
  const situacionIvaDisplay = perfil?.situacion_iva || "—"

  return (
    <div className="space-y-6">
      {/* Datos Personales */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado desde aquí
            </p>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            {isEditMode ? (
              <Input
                id="telefono"
                {...form.register("telefono")}
                placeholder="(011) 4567-8901"
              />
            ) : (
              <p className="text-sm">{perfil?.telefono || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datos Fiscales */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Fiscales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Localidad */}
          <div className="space-y-2">
            <Label>Localidad</Label>
            {isEditMode ? (
              <Select
                value={form.watch("localidad_id") || ""}
                onValueChange={(value) => form.setValue("localidad_id", value, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná tu localidad" />
                </SelectTrigger>
                <SelectContent>
                  {localidades.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.nombre_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{localidadDisplay}</p>
            )}
          </div>

          {/* CUIT */}
          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT</Label>
            {isEditMode ? (
              <Input
                id="cuit"
                value={form.watch("cuit") || ""}
                onChange={handleCuitChange}
                placeholder="20123456789"
                inputMode="numeric"
                maxLength={11}
              />
            ) : (
              <p className="text-sm">{perfil?.cuit || "—"}</p>
            )}
          </div>

          {/* Situación frente al IVA */}
          <div className="space-y-2">
            <Label>Situación frente al IVA</Label>
            {isEditMode ? (
              <Select
                value={form.watch("situacion_iva") || ""}
                onValueChange={(value) => form.setValue("situacion_iva", value, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná tu situación" />
                </SelectTrigger>
                <SelectContent>
                  {SITUACIONES_IVA.map((sit) => (
                    <SelectItem key={sit} value={sit}>
                      {sit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{situacionIvaDisplay}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Contraseña */}
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
    </div>
  )
}
