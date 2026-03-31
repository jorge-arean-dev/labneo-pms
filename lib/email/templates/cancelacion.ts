/**
 * Appointment Cancellation Email Template
 *
 * Sent when an appointment is cancelled.
 */

import { baseTemplate, formatDateSpanish, formatTimeSpanish, capitalize } from "./base"
import type { EmailTemplateData } from "../types"

export function cancelacionTemplate(data: EmailTemplateData): {
  subject: string
  html: string
} {
  const {
    paciente_nombre,
    paciente_apellido,
    medico_nombre,
    fecha_consulta,
    hora_consulta,
    telefono_consultorio,
    clinica_nombre,
    customMessageHtml,
  } = data

  const fechaDate = new Date(fecha_consulta)
  const fechaFormateada = capitalize(formatDateSpanish(fechaDate))
  const horaFormateada = hora_consulta || formatTimeSpanish(fechaDate)

  const subject = `Turno cancelado - ${fechaFormateada}`

  // Use custom message from database if available, otherwise use default
  const messageContent = customMessageHtml || `
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Hola <strong>${paciente_nombre} ${paciente_apellido}</strong>,
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Lamentamos informarle que su turno ha sido cancelado:
        </p>

        <!-- Appointment Details Box -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">
                <strong style="color: #18181b;">Fecha:</strong> ${fechaFormateada}
              </p>
              <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">
                <strong style="color: #18181b;">Hora:</strong> ${horaFormateada}
              </p>
              <p style="color: #3f3f46; font-size: 15px; margin: 0;">
                <strong style="color: #18181b;">Profesional:</strong> ${medico_nombre}
              </p>
            </td>
          </tr>
        </table>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Pedimos disculpas por cualquier inconveniente que esto pueda causarle.
        </p>

        ${telefono_consultorio ? `
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Para reprogramar su consulta, puede contactarnos al <strong>${telefono_consultorio}</strong> o visitarnos personalmente.
        </p>
        ` : `
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Para reprogramar su consulta, puede contactarnos por teléfono o visitarnos personalmente.
        </p>
        `}

        <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin: 0;">
          Agradecemos su comprensión.
        </p>
  `

  const content = `
    <!-- Header -->
    <tr>
      <td style="background-color: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0; font-family: Arial, sans-serif;">
          ${clinica_nombre}
        </h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px; font-family: Arial, sans-serif;">
        <h2 style="color: #dc2626; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
          Turno Cancelado
        </h2>

        ${messageContent}
      </td>
    </tr>
  `

  return {
    subject,
    html: baseTemplate({
      title: subject,
      preheader: `Su turno del ${fechaFormateada} con ${medico_nombre} ha sido cancelado`,
      content,
      footerText: `${clinica_nombre} - Sistema de Gestión de Turnos`,
    }),
  }
}
