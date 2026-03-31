/**
 * Appointment Email Functions
 *
 * Handles sending confirmation, cancellation, and reminder emails
 * for appointments. These functions are designed to be "fire and forget" -
 * they won't throw errors that could break the appointment flow.
 *
 * All functions accept an optional Supabase client parameter for dependency injection:
 * - User-triggered actions: don't pass client (uses default with RLS)
 * - API routes/cron jobs: pass admin client that bypasses RLS
 */

import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getAppTimezone } from "@/lib/config/timezone"
import {
  isEmailConfigured,
  prepareEmailTemplateData,
  sendEmail,
} from "./service"
import { generateEmailContent } from "./templates"
import type { EmailType } from "./types"

// Type for Supabase client (can be user client or admin client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, any, any>

interface AppointmentEmailData {
  consultaId: string
  pacienteId: string
  medicoId: string
  fechaHora: string
  motivo?: string | null
}

interface EmailSendResult {
  sent: boolean
  error?: string
}

/**
 * Get the default Supabase client (user session based)
 */
async function getDefaultClient(): Promise<DbClient> {
  return await createClient()
}

/**
 * Get patient and doctor details for email
 * @param data - Appointment data
 * @param client - Supabase client to use for queries
 */
async function getAppointmentDetails(
  data: AppointmentEmailData,
  client: DbClient
): Promise<{
  pacienteEmail: string | null
  pacienteNombre: string // First name only
  pacienteApellido: string // Last name only
  pacienteNombreCompleto: string // Full name for email recipient
  medicoNombre: string
} | null> {
  // Fetch patient details
  const { data: paciente, error: pacienteError } = await client
    .from("pacientes")
    .select("nombre, apellido, email")
    .eq("id", data.pacienteId)
    .single()

  if (pacienteError || !paciente) {
    console.error("Error fetching patient for email:", pacienteError)
    return null
  }

  // Fetch medico details (nombre/apellido from usuarios_pms)
  const { data: medico, error: medicoError } = await client
    .from("medicos")
    .select(`
      user_id,
      usuarios_pms!inner (
        nombre,
        apellido
      )
    `)
    .eq("id", data.medicoId)
    .is("deleted_at", null)
    .single()

  if (medicoError || !medico) {
    console.error("Error fetching medico for email:", medicoError)
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuariosPms = medico.usuarios_pms as any
  const medicoNombre = `Dr. ${usuariosPms.nombre} ${usuariosPms.apellido}`

  return {
    pacienteEmail: paciente.email,
    pacienteNombre: paciente.nombre,
    pacienteApellido: paciente.apellido,
    pacienteNombreCompleto: `${paciente.nombre} ${paciente.apellido}`,
    medicoNombre,
  }
}

/**
 * Format time for display in email using the application timezone.
 * This ensures consistent time display regardless of server location.
 */
function formatTimeForEmail(fechaHora: string): string {
  const date = new Date(fechaHora)

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: getAppTimezone(),
  })
}

/**
 * Send an appointment email (confirmation, cancellation, or reminder)
 *
 * This function is designed to not throw errors - it returns a result
 * object indicating success or failure. This allows the calling code
 * to continue even if the email fails.
 *
 * @param emailType - Type of email to send
 * @param data - Appointment data
 * @param client - Optional Supabase client (uses default if not provided)
 */
async function sendAppointmentEmail(
  emailType: EmailType,
  data: AppointmentEmailData,
  client?: DbClient
): Promise<EmailSendResult> {
  try {
    const supabase = client || (await getDefaultClient())

    // Check if email is configured
    const configured = await isEmailConfigured(supabase)
    if (!configured) {
      return { sent: false, error: "Email no configurado" }
    }

    // Get appointment details
    const details = await getAppointmentDetails(data, supabase)
    if (!details) {
      return { sent: false, error: "No se pudieron obtener los datos de la cita" }
    }

    // Check if patient has email
    if (!details.pacienteEmail) {
      return { sent: false, error: "El paciente no tiene email registrado" }
    }

    // Format time (date formatting is handled by the template)
    const hora = formatTimeForEmail(data.fechaHora)

    // Prepare template data with clinic info and custom template
    const templateData = await prepareEmailTemplateData(
      {
        paciente_nombre: details.pacienteNombre,
        paciente_apellido: details.pacienteApellido,
        medico_nombre: details.medicoNombre,
        fecha_consulta: data.fechaHora,
        hora_consulta: hora,
        motivo_consulta: data.motivo || undefined,
      },
      emailType,
      supabase
    )

    // Generate email content
    const { subject, html } = generateEmailContent(emailType, templateData)

    // Send the email
    const result = await sendEmail(
      {
        to: details.pacienteEmail,
        toName: details.pacienteNombreCompleto,
        subject,
        html,
      },
      supabase
    )

    if (!result.success) {
      return { sent: false, error: result.error }
    }

    return { sent: true }
  } catch (error) {
    console.error(`Error sending ${emailType} email:`, error)
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Send appointment confirmation email
 *
 * Call this after successfully creating an appointment.
 * Silently fails if email cannot be sent.
 *
 * @param data - Appointment data
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function sendConfirmationEmail(
  data: AppointmentEmailData,
  client?: DbClient
): Promise<EmailSendResult> {
  const result = await sendAppointmentEmail("confirmacion", data, client)

  if (!result.sent) {
    console.log(`Confirmation email not sent for consulta ${data.consultaId}: ${result.error}`)
  }

  return result
}

/**
 * Send appointment cancellation email
 *
 * Call this after successfully cancelling an appointment.
 * Silently fails if email cannot be sent.
 *
 * @param data - Appointment data
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function sendCancellationEmail(
  data: AppointmentEmailData,
  client?: DbClient
): Promise<EmailSendResult> {
  const result = await sendAppointmentEmail("cancelacion", data, client)

  if (!result.sent) {
    console.log(`Cancellation email not sent for consulta ${data.consultaId}: ${result.error}`)
  }

  return result
}

/**
 * Send appointment reminder email (24h before)
 *
 * Called by the scheduled job for pending reminders.
 *
 * @param data - Appointment data
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function sendReminderEmail(
  data: AppointmentEmailData,
  client?: DbClient
): Promise<EmailSendResult> {
  const result = await sendAppointmentEmail("recordatorio_24h", data, client)

  if (!result.sent) {
    console.log(`Reminder email not sent for consulta ${data.consultaId}: ${result.error}`)
  }

  return result
}
