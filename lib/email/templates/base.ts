/**
 * Base email template wrapper
 *
 * Provides consistent styling and structure for all emails.
 */

import { getAppTimezone } from "@/lib/config/timezone"

interface BaseTemplateOptions {
  title: string
  preheader?: string
  content: string
  footerText?: string
}

/**
 * Wrap email content in a consistent base template
 */
export function baseTemplate(options: BaseTemplateOptions): string {
  const { title, preheader, content, footerText } = options

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${preheader ? `<!--[if !mso]><!--><meta name="x-apple-disable-message-reformatting"><!--<![endif]-->` : ""}
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f4f4f5;
    }
    /* Main styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background-color: #18181b;
      padding: 24px;
      text-align: center;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .email-body {
      padding: 32px 24px;
    }
    .email-footer {
      background-color: #f4f4f5;
      padding: 24px;
      text-align: center;
    }
    .email-footer p {
      color: #71717a;
      font-size: 12px;
      margin: 0;
    }
    /* Typography */
    h2 {
      color: #18181b;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    p {
      color: #3f3f46;
      font-size: 16px;
      line-height: 1.5;
      margin: 0 0 16px 0;
    }
    .highlight-box {
      background-color: #f4f4f5;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .highlight-box p {
      margin: 8px 0;
    }
    .highlight-box strong {
      color: #18181b;
    }
    .text-muted {
      color: #71717a;
      font-size: 14px;
    }
    .text-small {
      font-size: 14px;
    }
    /* Colors for different email types */
    .header-confirmacion { background-color: #2563eb; }
    .header-recordatorio { background-color: #f59e0b; }
    .header-cancelacion { background-color: #dc2626; }
    .box-confirmacion { background-color: #eff6ff; border-left: 4px solid #2563eb; }
    .box-recordatorio { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
    .box-cancelacion { background-color: #fef2f2; border-left: 4px solid #dc2626; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ""}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${content}
        </table>

        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 16px auto 0;">
          <tr>
            <td style="padding: 16px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                ${footerText || "Este es un mensaje automático del sistema de gestión de pacientes."}
              </p>
              <p style="color: #a1a1aa; font-size: 11px; margin: 8px 0 0 0; font-family: Arial, sans-serif;">
                Por favor no responda a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Format a date in Spanish using the application timezone.
 * This ensures consistent date display regardless of server location.
 */
export function formatDateSpanish(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: getAppTimezone(),
  })
}

/**
 * Format time in 12-hour format using the application timezone.
 * This ensures consistent time display regardless of server location.
 */
export function formatTimeSpanish(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: getAppTimezone(),
  })
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
