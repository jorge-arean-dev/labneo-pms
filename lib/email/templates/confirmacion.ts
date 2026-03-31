/**
 * Appointment Confirmation Email Template
 *
 * Sent when a new appointment is scheduled.
 */

import { baseTemplate, formatDateSpanish, formatTimeSpanish, capitalize } from "./base"
import type { EmailTemplateData } from "../types"

export function confirmacionTemplate(data: EmailTemplateData): {
  subject: string
  html: string
} {
  const {
    paciente_nombre,
    paciente_apellido,
    medico_nombre,
    fecha_consulta,
    hora_consulta,
    direccion_consultorio,
    telefono_consultorio,
    clinica_nombre,
    customMessageHtml,
  } = data

  const fechaDate = new Date(fecha_consulta)
  const fechaFormateada = capitalize(formatDateSpanish(fechaDate))
  const horaFormateada = hora_consulta || formatTimeSpanish(fechaDate)

  const subject = `Turno confirmado - ${fechaFormateada}`

  // Use custom message from database if available, otherwise use default
  const messageContent = customMessageHtml || `
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Hola <strong>${paciente_nombre} ${paciente_apellido}</strong>,
        </p>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
          Su turno ha sido confirmado con los siguientes datos:
        </p>

        <!-- Appointment Details Box -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">
                <strong style="color: #18181b;">Fecha:</strong> ${fechaFormateada}
              </p>
              <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">
                <strong style="color: #18181b;">Hora:</strong> ${horaFormateada}
              </p>
              <p style="color: #3f3f46; font-size: 15px; margin: 0 0 12px 0;">
                <strong style="color: #18181b;">Profesional:</strong> ${medico_nombre}
              </p>
              ${direccion_consultorio ? `
              <p style="color: #3f3f46; font-size: 15px; margin: 0;">
                <strong style="color: #18181b;">Dirección:</strong> ${direccion_consultorio}
              </p>
              ` : ""}
            </td>
          </tr>
        </table>

        <p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
          Por favor, llegue <strong>10 minutos antes</strong> de su cita con su documento de identidad.
        </p>

        ${telefono_consultorio ? `
        <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin: 0;">
          Si necesita reprogramar o cancelar su turno, contáctenos al <strong>${telefono_consultorio}</strong>.
        </p>
        ` : `
        <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin: 0;">
          Si necesita reprogramar o cancelar su turno, contáctenos lo antes posible.
        </p>
        `}
  `

  const content = `
    <!-- Header -->
    <tr>
      <td style="background-color: #2563eb; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0; font-family: Arial, sans-serif;">
          ${clinica_nombre}
        </h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px; font-family: Arial, sans-serif;">
        <h2 style="color: #2563eb; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
          Turno Confirmado
        </h2>

        ${messageContent}
      </td>
    </tr>
  `

  return {
    subject,
    html: baseTemplate({
      title: subject,
      preheader: `Su turno con ${medico_nombre} ha sido confirmado para el ${fechaFormateada}`,
      content,
      footerText: `${clinica_nombre} - Sistema de Gestión de Turnos`,
    }),
  }
}
