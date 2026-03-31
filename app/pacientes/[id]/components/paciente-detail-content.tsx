"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { PacienteWithObraSocial } from "@/lib/types/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { canViewField, canEditField } from "@/lib/permissions"
import { formatDate, formatDateTime, formatDateForInput, calculateAge } from "@/lib/utils/date-format"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

// Validation schema
const pacienteSchema = z.object({
  dni: z.string().min(1, "El DNI es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  genero: z.enum(["M", "F", "Otro"]).nullable().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  domicilio: z.string().optional(),
  obra_social_id: z.string().nullable().optional(),
  plan: z.string().optional(),
  numero_afiliado: z.string().optional(),
  foto_perfil_url: z.string().optional(),
  notas: z.string().optional(),
  is_active: z.boolean(),
  consentimiento_datos: z.boolean(),
})

type PacienteFormData = z.infer<typeof pacienteSchema>

interface PacienteDetailContentProps {
  paciente: PacienteWithObraSocial
  obrasSociales: Array<{ id: string; nombre: string }>
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
  role: UserRole
}

// Helper function to format date for display without timezone issues
function formatDateForDisplay(dateString: string): string {
  return formatDate(dateString)
}

// Helper to parse date string to Date object
function parseDateString(dateString: string): Date | undefined {
  if (!dateString) return undefined
  // Handle both YYYY-MM-DD and DD/MM/YYYY formats
  if (dateString.includes("-")) {
    const [year, month, day] = dateString.split("-").map(Number)
    return new Date(year, month - 1, day)
  }
  return undefined
}

export function PacienteDetailContent({
  paciente,
  obrasSociales,
  isEditMode,
  onFormChange,
  role,
}: PacienteDetailContentProps) {
  // Birth date state
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    parseDateString(paciente.fecha_nacimiento)
  )
  const [birthDateInput, setBirthDateInput] = useState(
    paciente.fecha_nacimiento ? format(parseDateString(paciente.fecha_nacimiento)!, "dd/MM/yyyy") : ""
  )

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      dni: paciente.dni,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      fecha_nacimiento: formatDateForInput(paciente.fecha_nacimiento),
      genero: paciente.genero || null,
      telefono: paciente.telefono || "",
      email: paciente.email || "",
      domicilio: paciente.domicilio || "",
      obra_social_id: paciente.obra_social_id || null,
      plan: paciente.plan || "",
      numero_afiliado: paciente.numero_afiliado || "",
      foto_perfil_url: paciente.foto_perfil_url || "",
      notas: paciente.notas || "",
      is_active: paciente.is_active,
      consentimiento_datos: paciente.consentimiento_datos,
    },
  })

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange(isDirty)
  }, [isDirty, onFormChange])

  // Get form values for external access
  const getFormValues = (): PacienteFormData => {
    return form.getValues()
  }

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    if (isEditMode) {
      ;(window as unknown as { __getPacienteFormValues?: () => PacienteFormData }).__getPacienteFormValues = getFormValues
    }
    return () => {
      delete (window as unknown as { __getPacienteFormValues?: () => PacienteFormData }).__getPacienteFormValues
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Reset form when edit mode is cancelled or after save
  // IMPORTANT: Always reset with updated entity data, not original defaultValues
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        dni: paciente.dni,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        fecha_nacimiento: formatDateForInput(paciente.fecha_nacimiento),
        genero: paciente.genero || null,
        telefono: paciente.telefono || "",
        email: paciente.email || "",
        domicilio: paciente.domicilio || "",
        obra_social_id: paciente.obra_social_id || null,
        plan: paciente.plan || "",
        numero_afiliado: paciente.numero_afiliado || "",
        foto_perfil_url: paciente.foto_perfil_url || "",
        notas: paciente.notas || "",
        is_active: paciente.is_active,
        consentimiento_datos: paciente.consentimiento_datos,
      })
      // Reset birth date state
      const parsedDate = parseDateString(paciente.fecha_nacimiento)
      setBirthDate(parsedDate)
      setBirthDateInput(parsedDate ? format(parsedDate, "dd/MM/yyyy") : "")
    }
  }, [isEditMode, paciente, form])

  // Birth date handlers
  const handleBirthDateInputChange = (value: string) => {
    setBirthDateInput(value)
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date())
        if (!isNaN(parsedDate.getTime())) {
          setBirthDate(parsedDate)
          form.setValue("fecha_nacimiento", format(parsedDate, "yyyy-MM-dd"), { shouldDirty: true })
        }
      } catch {
        // Invalid date format
      }
    }
  }

  const handleBirthDateSelect = (date: Date | undefined) => {
    setBirthDate(date)
    if (date) {
      setBirthDateInput(format(date, "dd/MM/yyyy"))
      form.setValue("fecha_nacimiento", format(date, "yyyy-MM-dd"), { shouldDirty: true })
    }
  }

  // Default month for birth date calendar (30 years ago)
  const defaultBirthYear = new Date().getFullYear() - 30
  const defaultBirthMonth = new Date(defaultBirthYear, 0)

  const canEdit = (field: string) =>
    canEditField("pacientes", field, { role, userId: "", isOwner: false })

  const canView = (field: string) =>
    canViewField("pacientes", field, { role, userId: "", isOwner: false })

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* DNI */}
          {canView("dni") && (
            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              {isEditMode && canEdit("dni") ? (
                <Input
                  id="dni"
                  {...form.register("dni")}
                  placeholder="DNI del paciente"
                />
              ) : (
                <p className="text-sm">{paciente.dni}</p>
              )}
              {form.formState.errors.dni && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.dni.message}
                </p>
              )}
            </div>
          )}

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
                <p className="text-sm">{paciente.nombre}</p>
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
                <p className="text-sm">{paciente.apellido}</p>
              )}
              {form.formState.errors.apellido && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apellido.message}
                </p>
              )}
            </div>
          )}

          {/* Fecha de Nacimiento */}
          {canView("fecha_nacimiento") && (
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              {isEditMode && canEdit("fecha_nacimiento") ? (
                <div className="flex gap-2">
                  <Input
                    id="fecha_nacimiento"
                    placeholder="DD/MM/YYYY"
                    value={birthDateInput}
                    onChange={(e) => handleBirthDateInputChange(e.target.value)}
                    maxLength={10}
                    className="flex-1"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={handleBirthDateSelect}
                        locale={es}
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        defaultMonth={birthDate || defaultBirthMonth}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <p className="text-sm">
                  {formatDateForDisplay(paciente.fecha_nacimiento)}
                  {calculateAge(paciente.fecha_nacimiento) !== null && (
                    <span className="text-muted-foreground"> ({calculateAge(paciente.fecha_nacimiento)} años)</span>
                  )}
                </p>
              )}
              {form.formState.errors.fecha_nacimiento && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fecha_nacimiento.message}
                </p>
              )}
            </div>
          )}

          {/* Género */}
          {canView("genero") && (
            <div className="space-y-2">
              <Label htmlFor="genero">Género</Label>
              {isEditMode && canEdit("genero") ? (
                <Select
                  value={form.watch("genero") || ""}
                  onValueChange={(value) => form.setValue("genero", value as "M" | "F" | "Otro", { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">
                  {paciente.genero === "M" ? "Masculino" : paciente.genero === "F" ? "Femenino" : paciente.genero === "Otro" ? "Otro" : "—"}
                </p>
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
                    {form.watch("is_active") ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ) : (
                <p className="text-sm">
                  {paciente.is_active ? "Activo" : "Inactivo"}
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
                <Input
                  id="telefono"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.watch("telefono") || ""}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "")
                    form.setValue("telefono", numericValue, { shouldDirty: true })
                  }}
                  placeholder="Número de teléfono"
                />
              ) : (
                <p className="text-sm">{paciente.telefono || "—"}</p>
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
                <p className="text-sm">{paciente.email || "—"}</p>
              )}
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          {/* Domicilio */}
          {canView("domicilio") && (
            <div className="space-y-2">
              <Label htmlFor="domicilio">Domicilio</Label>
              {isEditMode && canEdit("domicilio") ? (
                <Textarea
                  id="domicilio"
                  {...form.register("domicilio")}
                  placeholder="Dirección completa"
                  rows={2}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{paciente.domicilio || "—"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Obra Social */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Obra Social</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Obra Social */}
          {canView("obra_social_id") && (
            <div className="space-y-2">
              <Label htmlFor="obra_social_id">Obra Social</Label>
              {isEditMode && canEdit("obra_social_id") ? (
                <Select
                  value={form.watch("obra_social_id") || "none"}
                  onValueChange={(value) => form.setValue("obra_social_id", value === "none" ? null : value, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar obra social" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin obra social</SelectItem>
                    {obrasSociales.map((os) => (
                      <SelectItem key={os.id} value={os.id}>
                        {os.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{paciente.obra_social?.nombre || "—"}</p>
              )}
            </div>
          )}

          {/* Plan */}
          {canView("plan") && (
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              {isEditMode && canEdit("plan") ? (
                <Input
                  id="plan"
                  {...form.register("plan")}
                  placeholder="Nombre del plan"
                />
              ) : (
                <p className="text-sm">{paciente.plan || "—"}</p>
              )}
            </div>
          )}

          {/* Número de Afiliado */}
          {canView("numero_afiliado") && (
            <div className="space-y-2">
              <Label htmlFor="numero_afiliado">Número de Afiliado</Label>
              {isEditMode && canEdit("numero_afiliado") ? (
                <Input
                  id="numero_afiliado"
                  {...form.register("numero_afiliado")}
                  placeholder="Número de afiliado"
                />
              ) : (
                <p className="text-sm">{paciente.numero_afiliado || "—"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas y Consentimiento (Admin Only) */}
      {role === "administrador" && (
        <Card>
          <CardHeader>
            <CardTitle>Información Administrativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notas */}
            {canView("notas") && (
              <div className="space-y-2">
                <Label htmlFor="notas">Notas Internas</Label>
                {isEditMode && canEdit("notas") ? (
                  <Textarea
                    id="notas"
                    {...form.register("notas")}
                    placeholder="Notas internas (solo visibles para administradores)"
                    rows={4}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{paciente.notas || "—"}</p>
                )}
              </div>
            )}

            {/* Consentimiento de Datos */}
            {canView("consentimiento_datos") && (
              <div className="flex items-center space-x-2">
                {isEditMode && canEdit("consentimiento_datos") ? (
                  <>
                    <Checkbox
                      id="consentimiento_datos"
                      checked={form.watch("consentimiento_datos")}
                      onCheckedChange={(checked) =>
                        form.setValue("consentimiento_datos", checked as boolean, { shouldDirty: true })
                      }
                    />
                    <Label htmlFor="consentimiento_datos" className="font-normal">
                      Consentimiento de datos otorgado
                    </Label>
                  </>
                ) : (
                  <p className="text-sm">
                    Consentimiento de datos: {paciente.consentimiento_datos ? "Sí" : "No"}
                  </p>
                )}
              </div>
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
              <Label>Fecha de Creación</Label>
              <p className="text-muted-foreground">
                {formatDateTime(paciente.created_at)}
              </p>
            </div>
            <div>
              <Label>Última Actualización</Label>
              <p className="text-muted-foreground">
                {formatDateTime(paciente.updated_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
