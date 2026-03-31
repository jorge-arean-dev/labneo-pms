"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Save, Bot, Power } from "lucide-react"
import { updateBaseConocimientos, updateAgentEnabled } from "../actions"
import type { ClinicInfo } from "@/lib/email/types"

interface AgentTabContentProps {
  clinicInfo: ClinicInfo | null
}

const PLACEHOLDER_CONTENT = `# Información del Consultorio

## Servicios
- Dermatología clínica
- Dermatología estética
- Control de lunares

## Horarios de Atención
- Lunes a Viernes: 9:00 a 18:00
- Sábados: 9:00 a 13:00

## Ubicación
- Dirección: Av. Ejemplo 1234, CABA
- Cómo llegar: Subte línea B, estación...

## Preguntas Frecuentes

### ¿Necesito orden médica?
No, podés sacar turno directamente.

### ¿Qué obras sociales aceptan?
Aceptamos OSDE, Swiss Medical, Galeno...

### ¿Cuánto dura una consulta?
Aproximadamente 30 minutos.

## Políticas
- Cancelar con al menos 24 horas de anticipación
- Llegar 10 minutos antes del turno`

export function AgentTabContent({ clinicInfo }: AgentTabContentProps) {
  const router = useRouter()
  const [content, setContent] = useState(clinicInfo?.base_conocimientos || "")
  const [isSaving, setIsSaving] = useState(false)
  const [agentEnabled, setAgentEnabled] = useState(clinicInfo?.agent_enabled ?? true)
  const [isToggling, setIsToggling] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)

  const hasChanges = content !== (clinicInfo?.base_conocimientos || "")

  const handleSave = async () => {
    if (!clinicInfo) return

    setIsSaving(true)
    const { success, error } = await updateBaseConocimientos(clinicInfo.id, content)

    if (success) {
      toast.success("Base de conocimientos actualizada")
      router.refresh()
    } else {
      toast.error(error || "Error al guardar")
    }

    setIsSaving(false)
  }

  const handleToggleAgent = async (enabled: boolean) => {
    if (!clinicInfo) return

    setIsToggling(true)
    const { success, error } = await updateAgentEnabled(clinicInfo.id, enabled)

    if (success) {
      setAgentEnabled(enabled)
      toast.success(enabled ? "Agente activado" : "Agente desactivado")
      router.refresh()
    } else {
      toast.error(error || "Error al actualizar el estado del agente")
    }

    setIsToggling(false)
  }

  if (!clinicInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No se encontró la información del consultorio. Configure primero los datos en la pestaña &quot;Información del Consultorio&quot;.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Control Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Control del Agente</CardTitle>
          </div>
          <CardDescription>
            Administre el estado del agente de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Estado actual</p>
              {agentEnabled ? (
                <Badge variant="outline" className="border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                  Activado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  Desactivado
                </Badge>
              )}
            </div>

            {agentEnabled ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeactivateDialog(true)}
                disabled={isToggling}
              >
                {isToggling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                Desactivar Agente
              </Button>
            ) : (
              <Button
                onClick={() => handleToggleAgent(true)}
                disabled={isToggling}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isToggling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                Activar Agente
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {agentEnabled
              ? "El agente responde automáticamente a los mensajes de WhatsApp de los pacientes."
              : "El agente está desactivado. Los pacientes no recibirán respuestas automáticas por WhatsApp."
            }
          </p>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Agente de WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              El agente dejará de responder a todos los mensajes de WhatsApp. Los pacientes no recibirán respuestas automáticas hasta que se reactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleToggleAgent(false)}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Knowledge Base Card (existing) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle>Base de Conocimientos</CardTitle>
          </div>
          <CardDescription>
            Este contenido es consultado por el agente de WhatsApp para responder preguntas de los pacientes.
            Incluya información sobre servicios, horarios, ubicación, políticas y preguntas frecuentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER_CONTENT}
            className="min-h-[250px] md:min-h-[400px] font-mono text-sm"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Formato libre (Markdown soportado). El agente interpreta el contenido para responder consultas por WhatsApp.
            </p>

            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
