"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, CheckCircle2, AlertCircle } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { sendTestEmail } from "../actions"
import { formatDateTime } from "@/lib/utils/date-format"
import type { EmailConfig } from "@/lib/email/types"

interface TestEmailCardProps {
  emailConfig: EmailConfig
}

export function TestEmailCard({ emailConfig }: TestEmailCardProps) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [templateType, setTemplateType] = useState<string>("confirmacion")
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleSendTest = async () => {
    if (!recipientEmail) {
      toast.error("Ingrese un email de destino")
      return
    }

    setIsSending(true)
    setTestResult(null)

    const { success, error } = await sendTestEmail(emailConfig.id, {
      recipient_email: recipientEmail,
      template_type: templateType as "confirmacion" | "recordatorio_24h" | "cancelacion",
    })

    if (success) {
      setTestResult({
        success: true,
        message: "Email de prueba enviado exitosamente",
      })
      toast.success("Email de prueba enviado")
      router.refresh()
    } else {
      setTestResult({
        success: false,
        message: error || "Error al enviar el email de prueba",
      })
      toast.error(error || "Error al enviar el email de prueba")
    }

    setIsSending(false)
  }

  const isConfigured = emailConfig.enabled &&
    emailConfig.smtp_user &&
    emailConfig.smtp_password_encrypted

  return (
    <Card>
      <CardHeader>
        <CardTitle>Probar Configuración</CardTitle>
        <CardDescription>
          Envíe un email de prueba para verificar que la configuración funciona correctamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuración incompleta</AlertTitle>
            <AlertDescription>
              Configure y habilite el servidor SMTP antes de enviar emails de prueba.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email de destino *</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="su.email@ejemplo.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={!isConfigured}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-template">Plantilla a probar</Label>
            <Select
              value={templateType}
              onValueChange={setTemplateType}
              disabled={!isConfigured}
            >
              <SelectTrigger id="test-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmacion">Confirmación de Turno</SelectItem>
                <SelectItem value="recordatorio_24h">Recordatorio de Consulta</SelectItem>
                <SelectItem value="cancelacion">Cancelación de Turno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {testResult.success ? "Email enviado" : "Error al enviar"}
            </AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Last Test Info */}
        {emailConfig.last_test_at && (
          <div className="text-xs text-muted-foreground">
            Última prueba: {formatDateTime(emailConfig.last_test_at)}
            {emailConfig.last_test_status === "success" ? (
              <span className="text-green-600 dark:text-green-400 ml-2">
                (exitosa)
              </span>
            ) : emailConfig.last_test_status === "failed" ? (
              <span className="text-red-600 dark:text-red-400 ml-2">
                (fallida: {emailConfig.last_test_error})
              </span>
            ) : null}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSendTest}
          disabled={isSending || !isConfigured}
        >
          <Send className="mr-2 h-4 w-4" />
          {isSending ? "Enviando..." : "Enviar Email de Prueba"}
        </Button>
      </CardFooter>
    </Card>
  )
}
