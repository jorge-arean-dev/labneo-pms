"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Info } from "lucide-react"
import { ConsultaWithRelations, EstadoConsulta } from "@/lib/types/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { canViewField, canEditField } from "@/lib/permissions"
import { getEstadoColor } from "@/lib/constants/estado-colors"
import { formatDateTime, formatDateTimeForInput, calculateAge } from "@/lib/utils/date-format"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { parseDateTimeFromInputToUTC } from "@/lib/utils/timezone"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
import { PatientInfoPopover } from "@/app/components/patient-info-popover"

// Validation schema
const consultaSchema = z.object({
  fecha_hora: z.string().min(1, "La fecha y hora son requeridas"),
  motivo: z.string().optional(),
  estado_id: z.string().min(1, "El estado es requerido"),
  tipo_consulta: z.enum(["primera_vez", "control", "urgencia"]).nullable().optional(),
  informe: z.string().optional(),
  diagnostico: z.string().optional(),
  tratamiento: z.string().optional(),
  receta: z.string().optional(),
  notas: z.string().optional(),
})

type ConsultaFormData = z.infer<typeof consultaSchema>

interface ConsultaDetailContentProps {
  consulta: ConsultaWithRelations
  estados: EstadoConsulta[]
  isEditMode: boolean
  onFormChange: (hasChanges: boolean) => void
  role: UserRole
  isOwner: boolean
}

export function ConsultaDetailContent({
  consulta,
  estados,
  isEditMode,
  onFormChange,
  role,
  isOwner,
}: ConsultaDetailContentProps) {
  const form = useForm<ConsultaFormData>({
    resolver: zodResolver(consultaSchema),
    defaultValues: {
      fecha_hora: formatDateTimeForInput(consulta.fecha_hora),
      motivo: consulta.motivo || "",
      estado_id: consulta.estado_id,
      tipo_consulta: consulta.tipo_consulta || null,
      informe: consulta.informe || "",
      diagnostico: consulta.diagnostico || "",
      tratamiento: consulta.tratamiento || "",
      receta: consulta.receta || "",
      notas: consulta.notas || "",
    },
  })

  // Track form changes
  const { formState: { isDirty } } = form

  useEffect(() => {
    onFormChange(isDirty)
  }, [isDirty, onFormChange])

  // Get form values for external access
  // Converts fecha_hora from local datetime-local format back to UTC ISO string
  const getFormValues = (): ConsultaFormData => {
    const values = form.getValues()
    return {
      ...values,
      fecha_hora: parseDateTimeFromInputToUTC(values.fecha_hora),
    }
  }

  // Expose getFormValues via ref pattern (called by parent)
  useEffect(() => {
    if (isEditMode) {
      (window as Window & { __getConsultaFormValues?: () => ConsultaFormData }).__getConsultaFormValues = getFormValues
    }
    return () => {
      delete (window as Window & { __getConsultaFormValues?: () => ConsultaFormData }).__getConsultaFormValues
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Reset form when edit mode is cancelled or consulta data changes
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        fecha_hora: formatDateTimeForInput(consulta.fecha_hora),
        motivo: consulta.motivo || "",
        estado_id: consulta.estado_id,
        tipo_consulta: consulta.tipo_consulta || null,
        informe: consulta.informe || "",
        diagnostico: consulta.diagnostico || "",
        tratamiento: consulta.tratamiento || "",
        receta: consulta.receta || "",
        notas: consulta.notas || "",
      })
    }
  }, [isEditMode, consulta, form])

  const canEdit = (field: string) =>
    canEditField("consultas", field, { role, userId: "", isOwner })

  const canView = (field: string) =>
    canViewField("consultas", field, { role, userId: "", isOwner })

  return (
    <div className="space-y-6">
      {/* Patient & Doctor Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            <div className="flex items-center gap-2">
              <Link
                href={`/pacientes/${consulta.paciente.id}`}
                target="_blank"
                className="text-sm font-medium text-primary hover:underline"
              >
                {consulta.paciente.nombre} {consulta.paciente.apellido}
              </Link>
              {calculateAge(consulta.paciente.fecha_nacimiento) !== null && (
                <span className="text-sm text-muted-foreground">({calculateAge(consulta.paciente.fecha_nacimiento)} años)</span>
              )}
              <PatientInfoPopover paciente={consulta.paciente} />
            </div>
          </div>

          {/* Médico */}
          <div className="space-y-2">
            <Label>Médico</Label>
            <p className="text-sm font-medium">
              {consulta.medico.nombre} {consulta.medico.apellido}
            </p>
          </div>

          {/* Fecha y Hora */}
          {canView("fecha_hora") && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="fecha_hora">Fecha y Hora</Label>
                {/* Show tooltip icon for non-admin users in edit mode when estado is programada */}
                {isEditMode && role !== "administrador" && consulta.estado.codigo === "programada" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Usa &quot;Reagendar Consulta&quot; para cambiar la fecha y hora</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {isEditMode && canEdit("fecha_hora") ? (
                <Input
                  id="fecha_hora"
                  type="datetime-local"
                  {...form.register("fecha_hora")}
                />
              ) : (
                <p className="text-sm">
                  {formatDateTime(consulta.fecha_hora)}
                </p>
              )}
              {form.formState.errors.fecha_hora && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fecha_hora.message}
                </p>
              )}
            </div>
          )}

          {/* Estado */}
          {canView("estado_id") && (
            <div className="space-y-2">
              <Label htmlFor="estado_id">Estado *</Label>
              {isEditMode && canEdit("estado_id") ? (
                <Select
                  value={form.watch("estado_id")}
                  onValueChange={(value) => form.setValue("estado_id", value, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((estado) => (
                      <SelectItem key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={`border-transparent ${getEstadoColor(consulta.estado.codigo)}`}>
                  {consulta.estado.nombre}
                </Badge>
              )}
            </div>
          )}

          {/* Tipo de Consulta */}
          {canView("tipo_consulta") && (
            <div className="space-y-2">
              <Label htmlFor="tipo_consulta">Tipo de Consulta</Label>
              {isEditMode && canEdit("tipo_consulta") ? (
                <Select
                  value={form.watch("tipo_consulta") || ""}
                  onValueChange={(value) => form.setValue("tipo_consulta", (value as "primera_vez" | "control" | "urgencia") || null, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primera_vez">Primera Vez</SelectItem>
                    <SelectItem value="control">Control</SelectItem>
                    <SelectItem value="urgencia">Urgencia</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">
                  {consulta.tipo_consulta === "primera_vez" ? "Primera Vez" :
                   consulta.tipo_consulta === "control" ? "Control" :
                   consulta.tipo_consulta === "urgencia" ? "Urgencia" : "—"}
                </p>
              )}
            </div>
          )}

          {/* Motivo */}
          {canView("motivo") && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              {isEditMode && canEdit("motivo") ? (
                <Textarea
                  id="motivo"
                  {...form.register("motivo")}
                  placeholder="Motivo de la consulta"
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{consulta.motivo || "—"}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Information (Doctor only or Admin) */}
      {(role === "medico" || role === "administrador") && (
        <Card>
          <CardHeader>
            <CardTitle>Información Médica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Informe */}
            {canView("informe") && (
              <div className="space-y-2">
                <Label htmlFor="informe">Informe</Label>
                {isEditMode && canEdit("informe") ? (
                  <Textarea
                    id="informe"
                    {...form.register("informe")}
                    placeholder="Informe médico"
                    rows={4}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{consulta.informe || "—"}</p>
                )}
              </div>
            )}

            {/* Diagnóstico */}
            {canView("diagnostico") && (
              <div className="space-y-2">
                <Label htmlFor="diagnostico">Diagnóstico</Label>
                {isEditMode && canEdit("diagnostico") ? (
                  <Textarea
                    id="diagnostico"
                    {...form.register("diagnostico")}
                    placeholder="Diagnóstico"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{consulta.diagnostico || "—"}</p>
                )}
              </div>
            )}

            {/* Tratamiento */}
            {canView("tratamiento") && (
              <div className="space-y-2">
                <Label htmlFor="tratamiento">Tratamiento</Label>
                {isEditMode && canEdit("tratamiento") ? (
                  <Textarea
                    id="tratamiento"
                    {...form.register("tratamiento")}
                    placeholder="Plan de tratamiento"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{consulta.tratamiento || "—"}</p>
                )}
              </div>
            )}

            {/* Receta */}
            {canView("receta") && (
              <div className="space-y-2">
                <Label htmlFor="receta">Receta</Label>
                {isEditMode && canEdit("receta") ? (
                  <Textarea
                    id="receta"
                    {...form.register("receta")}
                    placeholder="Medicación prescrita"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{consulta.receta || "—"}</p>
                )}
              </div>
            )}

            {/* Notas */}
            {canView("notas") && (
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                {isEditMode && canEdit("notas") ? (
                  <Textarea
                    id="notas"
                    {...form.register("notas")}
                    placeholder="Notas internas sobre la consulta"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{consulta.notas || "—"}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
