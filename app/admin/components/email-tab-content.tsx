"use client"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { SmtpSettingsCard } from "./smtp-settings-card"
import type { EmailConfig } from "@/lib/email/types"

function getEmailStatus(emailConfig: EmailConfig | null) {
  if (!emailConfig) {
    return {
      label: "Sin configuración de email",
      icon: XCircle,
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    }
  }
  if (!emailConfig.enabled) {
    return {
      label: "Envío de emails desactivado",
      icon: AlertCircle,
      className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    }
  }
  if (!emailConfig.smtp_user || !emailConfig.smtp_password_encrypted) {
    return {
      label: "Falta completar la configuración",
      icon: AlertCircle,
      className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    }
  }
  return {
    label: "Emails activos",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  }
}

interface EmailTabContentProps {
  emailConfig: EmailConfig | null
}

export function EmailTabContent({ emailConfig }: EmailTabContentProps) {
  const status = getEmailStatus(emailConfig)
  const StatusIcon = status.icon

  if (!emailConfig) {
    return (
      <Alert className={status.className}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>{status.label}</AlertTitle>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Status */}
      <Alert className={status.className}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>{status.label}</AlertTitle>
      </Alert>

      {/* SMTP Settings */}
      <SmtpSettingsCard emailConfig={emailConfig} />
    </div>
  )
}
