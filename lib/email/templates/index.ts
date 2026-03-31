/**
 * Email Templates Index
 *
 * Exports all email templates and provides a unified interface
 * for generating email content based on type.
 */

import { confirmacionTemplate } from "./confirmacion"
import { recordatorioTemplate } from "./recordatorio"
import { cancelacionTemplate } from "./cancelacion"
import type { EmailTemplateData, EmailType } from "../types"

// Re-export individual templates
export { confirmacionTemplate } from "./confirmacion"
export { recordatorioTemplate } from "./recordatorio"
export { cancelacionTemplate } from "./cancelacion"

// Re-export base utilities
export {
  baseTemplate,
  formatDateSpanish,
  formatTimeSpanish,
  capitalize,
} from "./base"

/**
 * Generate email content for a given type
 */
export function generateEmailContent(
  type: EmailType,
  data: EmailTemplateData
): { subject: string; html: string } {
  switch (type) {
    case "confirmacion":
      return confirmacionTemplate(data)
    case "recordatorio_24h":
      return recordatorioTemplate(data)
    case "cancelacion":
      return cancelacionTemplate(data)
    case "reprogramacion":
      // Reprogramming uses confirmation template with modified subject
      const reprogramResult = confirmacionTemplate(data)
      return {
        subject: reprogramResult.subject.replace("Turno confirmado", "Turno reprogramado"),
        html: reprogramResult.html.replace(
          "Turno Confirmado",
          "Turno Reprogramado"
        ).replace(
          "Su turno ha sido confirmado",
          "Su turno ha sido reprogramado"
        ),
      }
    default:
      throw new Error(`Unknown email type: ${type}`)
  }
}

/**
 * Generate test email content with placeholder data
 */
export function generateTestEmailContent(
  type: EmailType,
  clinicaName: string = "Clínica Dermatológica"
): { subject: string; html: string } {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 30, 0, 0)

  const testData: EmailTemplateData = {
    paciente_nombre: "Juan",
    paciente_apellido: "Pérez",
    medico_nombre: "Dr. María García",
    fecha_consulta: tomorrow.toISOString(),
    hora_consulta: "10:30 AM",
    direccion_consultorio: "Av. Corrientes 1234, CABA",
    telefono_consultorio: "(011) 4567-8900",
    clinica_nombre: clinicaName,
    whatsapp_numero: "+5491112345678",
    google_maps_url: "https://maps.google.com/?q=ejemplo",
  }

  const result = generateEmailContent(type, testData)

  return {
    subject: `[PRUEBA] ${result.subject}`,
    html: result.html,
  }
}
