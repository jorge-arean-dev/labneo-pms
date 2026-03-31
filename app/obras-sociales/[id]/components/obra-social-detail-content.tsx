"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ObraSocial } from "@/lib/types/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PhoneInput, parsePhoneFromDatabase, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"
import { canViewField, canEditField } from "@/lib/permissions"
import { formatDateTime } from "@/lib/utils/date-format"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema
const obraSocialSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  sitio_web: z.string().url("URL inválida").optional().or(z.literal("")),
  is_active: z.boolean(),
  notas: z.string().optional(),
})

type ObraSocialFormData = z.infer<typeof obraSocialSchema>

interface ObraSocialDetailContentProps {
  obraSocial: ObraSocial
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
  role: UserRole
}

export function ObraSocialDetailContent({
  obraSocial,
  isEditMode,
  onFormChange,
  role,
}: ObraSocialDetailContentProps) {
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(
    parsePhoneFromDatabase(obraSocial.telefono)
  )

  const form = useForm<ObraSocialFormData>({
    resolver: zodResolver(obraSocialSchema),
    defaultValues: {
      nombre: obraSocial.nombre,
      codigo: obraSocial.codigo || "",
      telefono: obraSocial.telefono || "",
      email: obraSocial.email || "",
      direccion: obraSocial.direccion || "",
      sitio_web: obraSocial.sitio_web || "",
      is_active: obraSocial.is_active,
      notas: obraSocial.notas || "",
    },
  })

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange(isDirty)
  }, [isDirty, onFormChange])

  // Get form values for external access
  const getFormValues = (): Partial<ObraSocial> => {
    const values = form.getValues()
    return {
      ...values,
      telefono: formatPhoneForDatabase(phoneValue),
    }
  }

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    if (isEditMode) {
      // Store getter in window for parent access
      ;(window as unknown as { __getObraSocialFormValues?: () => Partial<ObraSocial> }).__getObraSocialFormValues = getFormValues
    }
    return () => {
      delete (window as unknown as { __getObraSocialFormValues?: () => Partial<ObraSocial> }).__getObraSocialFormValues
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, phoneValue])

  // Reset form when edit mode is cancelled or after save
  // IMPORTANT: Always reset with updated entity data, not original defaultValues
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        nombre: obraSocial.nombre,
        codigo: obraSocial.codigo || "",
        telefono: obraSocial.telefono || "",
        email: obraSocial.email || "",
        direccion: obraSocial.direccion || "",
        sitio_web: obraSocial.sitio_web || "",
        is_active: obraSocial.is_active,
        notas: obraSocial.notas || "",
      })
      setPhoneValue(parsePhoneFromDatabase(obraSocial.telefono))
    }
  }, [isEditMode, obraSocial, form])

  const canEdit = (field: string) =>
    canEditField("obras_sociales", field, { role, userId: "", isOwner: false })

  const canView = (field: string) =>
    canViewField("obras_sociales", field, { role, userId: "", isOwner: false })

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
                  placeholder="Nombre de la obra social"
                />
              ) : (
                <p className="text-sm">{obraSocial.nombre}</p>
              )}
              {form.formState.errors.nombre && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nombre.message}
                </p>
              )}
            </div>
          )}

          {/* Código */}
          {canView("codigo") && (
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              {isEditMode && canEdit("codigo") ? (
                <Input
                  id="codigo"
                  {...form.register("codigo")}
                  placeholder="Código de la obra social"
                />
              ) : (
                <p className="text-sm">{obraSocial.codigo || "—"}</p>
              )}
            </div>
          )}

          {/* Estado */}
          {canView("is_active") && (
            <div className="space-y-2">
              <Label htmlFor="is_active">Estado *</Label>
              {isEditMode && canEdit("is_active") ? (
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={form.watch("is_active")}
                    onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.watch("is_active") ? "Activa" : "Inactiva"}
                  </span>
                </div>
              ) : (
                <p className="text-sm">
                  {obraSocial.is_active ? "Activa" : "Inactiva"}
                </p>
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
          {/* Teléfono */}
          {canView("telefono") && (
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              {isEditMode && canEdit("telefono") ? (
                <PhoneInput value={phoneValue} onChange={setPhoneValue} />
              ) : (
                <p className="text-sm">{obraSocial.telefono || "—"}</p>
              )}
            </div>
          )}

          {/* Email */}
          {canView("email") && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEditMode && canEdit("email") ? (
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="email@ejemplo.com"
                />
              ) : (
                <p className="text-sm">{obraSocial.email || "—"}</p>
              )}
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          {/* Dirección */}
          {canView("direccion") && (
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              {isEditMode && canEdit("direccion") ? (
                <Textarea
                  id="direccion"
                  {...form.register("direccion")}
                  placeholder="Dirección completa"
                  rows={2}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{obraSocial.direccion || "—"}</p>
              )}
            </div>
          )}

          {/* Sitio Web */}
          {canView("sitio_web") && (
            <div className="space-y-2">
              <Label htmlFor="sitio_web">Sitio Web</Label>
              {isEditMode && canEdit("sitio_web") ? (
                <Input
                  id="sitio_web"
                  type="url"
                  {...form.register("sitio_web")}
                  placeholder="https://ejemplo.com"
                />
              ) : (
                <p className="text-sm">
                  {obraSocial.sitio_web ? (
                    <a
                      href={obraSocial.sitio_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {obraSocial.sitio_web}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              )}
              {form.formState.errors.sitio_web && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sitio_web.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas (Admin Only) */}
      {canView("notas") && (
        <Card>
          <CardHeader>
            <CardTitle>Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              {isEditMode && canEdit("notas") ? (
                <Textarea
                  id="notas"
                  {...form.register("notas")}
                  placeholder="Notas internas (solo visibles para administradores)"
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{obraSocial.notas || "—"}</p>
              )}
            </div>
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
              <Label>Fecha de Creación</Label>
              <p className="text-muted-foreground">
                {formatDateTime(obraSocial.created_at)}
              </p>
            </div>
            <div>
              <Label>Última Actualización</Label>
              <p className="text-muted-foreground">
                {formatDateTime(obraSocial.updated_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
