"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Save, Eye, EyeOff, ExternalLink } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateSmtpSettings } from "../actions"
import type { EmailConfig } from "@/lib/email/types"

const smtpSchema = z.object({
  enabled: z.boolean(),
  smtp_user: z.string().email("Ingrese un email válido").or(z.literal("")),
  smtp_password: z.string().optional(),
  sender_name: z.string().optional(),
})

type SmtpFormData = z.infer<typeof smtpSchema>

interface SmtpSettingsCardProps {
  emailConfig: EmailConfig
}

export function SmtpSettingsCard({ emailConfig }: SmtpSettingsCardProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [enabled, setEnabled] = useState(emailConfig.enabled)

  const form = useForm<SmtpFormData>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      enabled: emailConfig.enabled,
      smtp_user: emailConfig.smtp_user || "",
      smtp_password: "", // Never show existing password
      sender_name: emailConfig.sender_name || "",
    },
  })

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked)
    form.setValue("enabled", checked)
  }

  const handleSave = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    setIsSaving(true)
    const values = form.getValues()

    const { success, error } = await updateSmtpSettings(emailConfig.id, {
      enabled: values.enabled,
      smtp_user: values.smtp_user,
      smtp_password: values.smtp_password,
      sender_name: values.sender_name || "",
    })

    if (success) {
      toast.success("Configuración SMTP guardada exitosamente")
      form.setValue("smtp_password", "") // Clear password field
      router.refresh()
    } else {
      toast.error(error || "Error al guardar la configuración")
    }

    setIsSaving(false)
  }

  const hasPassword = !!emailConfig.smtp_password_encrypted

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Servidor SMTP</CardTitle>
        <CardDescription>
          Configure los datos de conexión para enviar emails desde el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activar envío de emails</Label>
            <p className="text-xs text-muted-foreground">
              Habilitar o deshabilitar el servicio de email
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
        </div>

        {/* Only show fields when enabled */}
        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Email del remitente *</Label>
              <Input
                id="smtp_user"
                type="email"
                placeholder="clinica@gmail.com"
                {...form.register("smtp_user")}
              />
              {form.formState.errors.smtp_user && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.smtp_user.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">
                Contraseña de aplicación {hasPassword ? "(ya configurada)" : "*"}
              </Label>
              <div className="relative">
                <Input
                  id="smtp_password"
                  type={showPassword ? "text" : "password"}
                  placeholder={hasPassword ? "••••••••••••••••" : "Ingrese la contraseña"}
                  {...form.register("smtp_password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasPassword
                  ? "Deje en blanco para mantener la contraseña actual"
                  : "Use una contraseña de aplicación, no su contraseña principal"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_name">Nombre del remitente</Label>
              <Input
                id="sender_name"
                placeholder="Clínica Dermatológica"
                {...form.register("sender_name")}
              />
              <p className="text-xs text-muted-foreground">
                El nombre que aparecerá en los emails enviados
              </p>
            </div>

            {/* Help Link */}
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Para usar Gmail, necesita crear una contraseña de aplicación.{" "}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Ver instrucciones
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardFooter>
    </Card>
  )
}
