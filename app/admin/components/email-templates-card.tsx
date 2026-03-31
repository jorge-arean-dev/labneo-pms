"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Mail, Bell, XCircle, Info } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { updateEmailTemplates, type EmailTemplates } from "../actions"

interface EmailTemplatesCardProps {
  emailTemplates: EmailTemplates | null
}

const AVAILABLE_PLACEHOLDERS = [
  { key: "{{paciente_nombre}}", description: "Nombre del paciente (solo nombre)" },
  { key: "{{paciente_apellido}}", description: "Apellido del paciente" },
  { key: "{{medico_nombre}}", description: "Nombre del médico" },
  { key: "{{fecha}}", description: "Fecha de la consulta" },
  { key: "{{hora}}", description: "Hora de la consulta" },
  { key: "{{direccion}}", description: "Dirección del consultorio" },
  { key: "{{telefono}}", description: "Teléfono de contacto" },
  { key: "{{whatsapp_numero}}", description: "WhatsApp del consultorio" },
  { key: "{{google_maps_url}}", description: "Enlace de Google Maps" },
]

const TEMPLATE_INFO = [
  {
    id: "confirmacion_turno",
    name: "Confirmación de Turno",
    description: "Se envía cuando se agenda una nueva consulta",
    icon: Mail,
  },
  {
    id: "recordatorio_consulta",
    name: "Recordatorio de Consulta",
    description: "Se envía automáticamente según la configuración de anticipación",
    icon: Bell,
  },
  {
    id: "cancelacion_turno",
    name: "Cancelación de Turno",
    description: "Se envía cuando se cancela una consulta",
    icon: XCircle,
  },
]

type TemplateFieldName = "confirmacion_turno" | "recordatorio_consulta" | "cancelacion_turno"

export function EmailTemplatesCard({ emailTemplates }: EmailTemplatesCardProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  // State for each template
  const [templates, setTemplates] = useState({
    confirmacion_turno: emailTemplates?.confirmacion_turno || "",
    recordatorio_consulta: emailTemplates?.recordatorio_consulta || "",
    cancelacion_turno: emailTemplates?.cancelacion_turno || "",
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<TemplateFieldName, string | null>>({
    confirmacion_turno: null,
    recordatorio_consulta: null,
    cancelacion_turno: null,
  })

  // Sync state when emailTemplates prop changes
  useEffect(() => {
    if (emailTemplates) {
      setTemplates({
        confirmacion_turno: emailTemplates.confirmacion_turno || "",
        recordatorio_consulta: emailTemplates.recordatorio_consulta || "",
        cancelacion_turno: emailTemplates.cancelacion_turno || "",
      })
    }
  }, [emailTemplates])

  const handleTemplateChange = (fieldName: TemplateFieldName, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [fieldName]: value,
    }))

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: null,
      }))
    }
  }

  const validateTemplates = (): boolean => {
    const newErrors: Record<TemplateFieldName, string | null> = {
      confirmacion_turno: null,
      recordatorio_consulta: null,
      cancelacion_turno: null,
    }

    let isValid = true

    // Check each template - strip HTML tags for validation
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim()

    if (!stripHtml(templates.confirmacion_turno)) {
      newErrors.confirmacion_turno = "El mensaje de confirmación es requerido"
      isValid = false
    }

    if (!stripHtml(templates.recordatorio_consulta)) {
      newErrors.recordatorio_consulta = "El mensaje de recordatorio es requerido"
      isValid = false
    }

    if (!stripHtml(templates.cancelacion_turno)) {
      newErrors.cancelacion_turno = "El mensaje de cancelación es requerido"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSave = async () => {
    if (!validateTemplates()) {
      toast.error("Por favor complete todos los campos requeridos")
      return
    }

    if (!emailTemplates?.id) {
      toast.error("No se encontró la configuración de plantillas")
      return
    }

    setIsSaving(true)

    const { success, error } = await updateEmailTemplates(emailTemplates.id, {
      confirmacion_turno: templates.confirmacion_turno,
      recordatorio_consulta: templates.recordatorio_consulta,
      cancelacion_turno: templates.cancelacion_turno,
    })

    if (success) {
      toast.success("Plantillas de email guardadas exitosamente")
      router.refresh()
    } else {
      toast.error(error || "Error al guardar las plantillas")
    }

    setIsSaving(false)
  }

  if (!emailTemplates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Email</CardTitle>
          <CardDescription>
            Personalice los mensajes enviados a los pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              No se encontraron las plantillas de email. Por favor, contacte al soporte técnico.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas de Email</CardTitle>
        <CardDescription>
          Personalice los mensajes enviados a los pacientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Placeholders */}
        <div className="rounded-md bg-muted p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Variables disponibles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PLACEHOLDERS.map((placeholder) => (
              <Badge
                key={placeholder.key}
                variant="secondary"
                className="font-mono text-xs cursor-help"
                title={placeholder.description}
              >
                {placeholder.key}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Utilice estas variables en sus mensajes. Se reemplazarán con los datos reales al enviar el email.
          </p>
        </div>

        {/* Template Editors */}
        <Accordion type="single" collapsible className="w-full" defaultValue="confirmacion_turno">
          {TEMPLATE_INFO.map((template) => {
            const Icon = template.icon
            const fieldName = template.id as TemplateFieldName
            return (
              <AccordionItem key={template.id} value={template.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="space-y-2">
                    <Label htmlFor={template.id}>Mensaje</Label>
                    <RichTextEditor
                      id={template.id}
                      value={templates[fieldName]}
                      onChange={(value) => handleTemplateChange(fieldName, value)}
                      rows={8}
                      placeholder="Escriba el mensaje de la plantilla..."
                    />
                    {errors[fieldName] && (
                      <p className="text-xs text-destructive">
                        {errors[fieldName]}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Plantillas"}
        </Button>
      </CardFooter>
    </Card>
  )
}
