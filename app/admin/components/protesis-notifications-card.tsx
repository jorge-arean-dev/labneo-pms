"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateProtesisNotificationSettings } from "../actions"
import type { EmailConfig } from "@/lib/email/types"

interface ProtesisNotificationsCardProps {
  emailConfig: EmailConfig
}

export function ProtesisNotificationsCard({ emailConfig }: ProtesisNotificationsCardProps) {
  const router = useRouter()
  const [firstEnabled, setFirstEnabled] = useState(
    emailConfig.protesis_first_notification_enabled
  )
  const [subsequentEnabled, setSubsequentEnabled] = useState(
    emailConfig.protesis_subsequent_notification_enabled
  )
  const [isSavingFirst, setIsSavingFirst] = useState(false)
  const [isSavingSubsequent, setIsSavingSubsequent] = useState(false)

  const handleFirstChange = async (checked: boolean) => {
    // Optimistic update
    const previous = firstEnabled
    setFirstEnabled(checked)
    setIsSavingFirst(true)

    const { success, error } = await updateProtesisNotificationSettings(emailConfig.id, {
      protesis_first_notification_enabled: checked,
    })

    if (success) {
      toast.success(
        checked
          ? "Notificación de primera solicitud activada"
          : "Notificación de primera solicitud desactivada"
      )
      router.refresh()
    } else {
      setFirstEnabled(previous)
      toast.error(error || "Error al guardar el cambio")
    }

    setIsSavingFirst(false)
  }

  const handleSubsequentChange = async (checked: boolean) => {
    const previous = subsequentEnabled
    setSubsequentEnabled(checked)
    setIsSavingSubsequent(true)

    const { success, error } = await updateProtesisNotificationSettings(emailConfig.id, {
      protesis_subsequent_notification_enabled: checked,
    })

    if (success) {
      toast.success(
        checked
          ? "Notificación de solicitudes subsiguientes activada"
          : "Notificación de solicitudes subsiguientes desactivada"
      )
      router.refresh()
    } else {
      setSubsequentEnabled(previous)
      toast.error(error || "Error al guardar el cambio")
    }

    setIsSavingSubsequent(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones de Prótesis</CardTitle>
        <CardDescription>
          Controlá qué emails automáticos se envían al procesar solicitudes de prótesis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="first-toggle">
              Enviar email con credenciales al procesar la primera solicitud
            </Label>
            <p className="text-xs text-muted-foreground">
              Cuando un odontólogo es registrado en Vevi por primera vez, se le envía un email
              con su usuario y contraseña de acceso.
            </p>
          </div>
          <Switch
            id="first-toggle"
            checked={firstEnabled}
            onCheckedChange={handleFirstChange}
            disabled={isSavingFirst}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="subsequent-toggle">
              Enviar email de confirmación al procesar solicitudes subsiguientes
            </Label>
            <p className="text-xs text-muted-foreground">
              Para solicitudes posteriores (odontólogo ya registrado en Vevi), se le envía un
              email confirmando que su solicitud fue procesada.
            </p>
          </div>
          <Switch
            id="subsequent-toggle"
            checked={subsequentEnabled}
            onCheckedChange={handleSubsequentChange}
            disabled={isSavingSubsequent}
          />
        </div>
      </CardContent>
    </Card>
  )
}
