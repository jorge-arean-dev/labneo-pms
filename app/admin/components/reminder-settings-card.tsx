"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateReminderSettings } from "../actions"
import type { EmailConfig } from "@/lib/email/types"

interface ReminderSettingsCardProps {
  emailConfig: EmailConfig
}

export function ReminderSettingsCard({ emailConfig }: ReminderSettingsCardProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [enabled, setEnabled] = useState(emailConfig.reminders_enabled)
  const [hoursBefore, setHoursBefore] = useState(
    emailConfig.reminder_hours_before.toString()
  )

  const handleSave = async () => {
    setIsSaving(true)

    const { success, error } = await updateReminderSettings(emailConfig.id, {
      reminders_enabled: enabled,
      reminder_hours_before: parseInt(hoursBefore, 10),
    })

    if (success) {
      toast.success("Configuración de recordatorios guardada exitosamente")
      router.refresh()
    } else {
      toast.error(error || "Error al guardar la configuración")
    }

    setIsSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recordatorios Automáticos</CardTitle>
        <CardDescription>
          Configure cuándo enviar recordatorios a los pacientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activar recordatorios automáticos</Label>
            <p className="text-xs text-muted-foreground">
              Enviar emails de recordatorio antes de cada consulta
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* Hours Before */}
        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-hours">Enviar recordatorio con anticipación</Label>
            <Select value={hoursBefore} onValueChange={setHoursBefore}>
              <SelectTrigger id="reminder-hours">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 horas antes</SelectItem>
                <SelectItem value="12">12 horas antes</SelectItem>
                <SelectItem value="24">24 horas antes (1 día)</SelectItem>
                <SelectItem value="48">48 horas antes (2 días)</SelectItem>
                <SelectItem value="72">72 horas antes (3 días)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo se enviarán recordatorios para consultas con estado &quot;Confirmada&quot;
            </p>
          </div>
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
