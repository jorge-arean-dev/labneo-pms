/**
 * Gmail SMTP Provider using Nodemailer
 *
 * Uses Gmail's SMTP server with App Password authentication.
 * Requires 2FA enabled on Gmail account and an App Password generated.
 *
 * Limits:
 * - Personal Gmail: 500 emails/day
 * - Google Workspace: 2,000 emails/day
 */

import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import type { SendEmailOptions, SendEmailResult } from "../types"

interface GmailConfig {
  user: string
  password: string
  senderName?: string
}

/**
 * Create a Gmail SMTP transporter
 */
export function createGmailTransporter(config: GmailConfig): Transporter {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use TLS (STARTTLS)
    auth: {
      user: config.user,
      pass: config.password,
    },
  })
}

/**
 * Verify Gmail SMTP connection
 */
export async function verifyGmailConnection(
  config: GmailConfig
): Promise<{ success: boolean; error: string | null }> {
  try {
    const transporter = createGmailTransporter(config)
    await transporter.verify()
    return { success: true, error: null }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de conexión desconocido"

    // Provide user-friendly error messages
    if (message.includes("Invalid login")) {
      return {
        success: false,
        error:
          "Credenciales inválidas. Verifique el email y la contraseña de aplicación.",
      }
    }
    if (message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
      return {
        success: false,
        error:
          "No se pudo conectar al servidor SMTP. Verifique su conexión a internet.",
      }
    }
    if (message.includes("self signed certificate")) {
      return {
        success: false,
        error: "Error de certificado SSL. Contacte al soporte técnico.",
      }
    }

    return { success: false, error: message }
  }
}

/**
 * Send an email via Gmail SMTP
 */
export async function sendEmailViaGmail(
  config: GmailConfig,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  try {
    const transporter = createGmailTransporter(config)

    // Build the "from" address with optional sender name
    const fromAddress = config.senderName
      ? `"${config.senderName}" <${config.user}>`
      : config.user

    // Build the "to" address with optional recipient name
    const toAddress = options.toName
      ? `"${options.toName}" <${options.to}>`
      : options.to

    const result = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    })

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar el email"

    console.error("Gmail send error:", error)

    // Provide user-friendly error messages
    if (message.includes("Invalid login")) {
      return {
        success: false,
        error:
          "Credenciales inválidas. Verifique la configuración SMTP.",
      }
    }
    if (message.includes("Daily user sending quota exceeded")) {
      return {
        success: false,
        error:
          "Se alcanzó el límite diario de emails. Intente nuevamente mañana.",
      }
    }
    if (message.includes("Invalid recipient")) {
      return {
        success: false,
        error: "El email de destino no es válido.",
      }
    }

    return { success: false, error: message }
  }
}

/**
 * Simple HTML to plain text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
