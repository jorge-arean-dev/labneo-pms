/**
 * Email Service
 *
 * Main email service that provides a unified API for sending emails.
 * Currently supports Gmail SMTP, with future support for Resend.
 *
 * All database functions accept an optional Supabase client parameter
 * for dependency injection. This allows:
 * - User-triggered actions: use default client with RLS
 * - API routes/cron jobs: pass admin client that bypasses RLS
 */

import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { decryptPassword } from "./encryption"
import { sendEmailViaGmail, verifyGmailConnection } from "./providers/gmail"
import type {
  EmailConfig,
  ClinicInfo,
  SendEmailOptions,
  SendEmailResult,
  CreateEmailReminderData,
  EmailReminder,
  EmailTemplateData,
  EmailType,
} from "./types"
import {
  fetchDatabaseTemplates,
  replacePlaceholders,
  textToHtml,
} from "./templates/database"

// Type for Supabase client (can be user client or admin client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, any, any>

/**
 * Get the default Supabase client (user session based)
 */
async function getDefaultClient(): Promise<DbClient> {
  return await createClient()
}

// ============================================================================
// Email Configuration
// ============================================================================

/**
 * Get the current email configuration from the database
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function getEmailConfig(client?: DbClient): Promise<EmailConfig | null> {
  const supabase = client || (await getDefaultClient())

  const { data, error } = await supabase
    .from("email_config")
    .select("*")
    .single()

  if (error) {
    console.error("Error fetching email config:", error)
    return null
  }

  return data as EmailConfig
}

/**
 * Check if email sending is properly configured and enabled
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function isEmailConfigured(client?: DbClient): Promise<boolean> {
  const config = await getEmailConfig(client)

  if (!config) return false
  if (!config.enabled) return false
  if (!config.smtp_user) return false
  if (!config.smtp_password_encrypted) return false

  return true
}

// ============================================================================
// Clinic Info
// ============================================================================

/**
 * Get the clinic information from the database
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function getClinicInfo(client?: DbClient): Promise<ClinicInfo | null> {
  const supabase = client || (await getDefaultClient())

  const { data, error } = await supabase
    .from("clinic_info")
    .select("*")
    .single()

  if (error) {
    console.error("Error fetching clinic info:", error)
    return null
  }

  return data as ClinicInfo
}

/**
 * Build full clinic address from individual fields
 */
function buildClinicAddress(clinic: ClinicInfo): string {
  const parts: string[] = []

  if (clinic.direccion) parts.push(clinic.direccion)
  if (clinic.ciudad) parts.push(clinic.ciudad)
  if (clinic.provincia) parts.push(clinic.provincia)
  if (clinic.codigo_postal) parts.push(`CP ${clinic.codigo_postal}`)

  return parts.join(", ")
}

/**
 * Map email type to database template field
 */
function getTemplateFieldForType(emailType: EmailType): "confirmacion_turno" | "recordatorio_consulta" | "cancelacion_turno" | null {
  switch (emailType) {
    case "confirmacion":
    case "reprogramacion":
      return "confirmacion_turno"
    case "recordatorio_24h":
      return "recordatorio_consulta"
    case "cancelacion":
      return "cancelacion_turno"
    default:
      return null
  }
}

/**
 * Prepare email template data with clinic info automatically injected
 *
 * @param baseData - Basic appointment data (patient, doctor, date/time)
 * @param emailType - Type of email to prepare (for fetching custom template)
 * @param client - Optional Supabase client (uses default if not provided)
 * @returns Complete template data with clinic info merged in
 */
export async function prepareEmailTemplateData(
  baseData: Omit<EmailTemplateData, "clinica_nombre" | "direccion_consultorio" | "telefono_consultorio" | "whatsapp_numero" | "google_maps_url" | "customMessageHtml"> & {
    direccion_consultorio?: string
    telefono_consultorio?: string
    clinica_nombre?: string
    whatsapp_numero?: string
    google_maps_url?: string
  },
  emailType?: EmailType,
  client?: DbClient
): Promise<EmailTemplateData> {
  const clinicInfo = await getClinicInfo(client)

  // Build base template data
  const templateData: EmailTemplateData = {
    paciente_nombre: baseData.paciente_nombre,
    paciente_apellido: baseData.paciente_apellido,
    medico_nombre: baseData.medico_nombre,
    fecha_consulta: baseData.fecha_consulta,
    hora_consulta: baseData.hora_consulta,
    motivo_consulta: baseData.motivo_consulta,
    // Use provided values or fall back to clinic_info table
    clinica_nombre: baseData.clinica_nombre || clinicInfo?.nombre || "Consultorio",
    direccion_consultorio: baseData.direccion_consultorio || (clinicInfo ? buildClinicAddress(clinicInfo) : undefined),
    telefono_consultorio: baseData.telefono_consultorio || clinicInfo?.telefono || undefined,
    whatsapp_numero: baseData.whatsapp_numero || clinicInfo?.whatsapp_numero || undefined,
    google_maps_url: baseData.google_maps_url || clinicInfo?.google_maps_url || undefined,
  }

  // Fetch and process custom template from database if email type is provided
  if (emailType) {
    const templateField = getTemplateFieldForType(emailType)
    if (templateField) {
      const dbTemplates = await fetchDatabaseTemplates(client)
      if (dbTemplates) {
        const templateText = dbTemplates[templateField]
        if (templateText) {
          // Replace placeholders and convert to HTML
          const processedText = replacePlaceholders(templateText, templateData)
          templateData.customMessageHtml = textToHtml(processedText)
        }
      }
    }
  }

  return templateData
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Send an email using the configured provider
 * @param options - Email options (to, subject, html, etc.)
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function sendEmail(
  options: SendEmailOptions,
  client?: DbClient
): Promise<SendEmailResult> {
  const config = await getEmailConfig(client)

  if (!config) {
    return { success: false, error: "Configuración de email no encontrada" }
  }

  if (!config.enabled) {
    return { success: false, error: "El envío de emails está deshabilitado" }
  }

  if (!config.smtp_user || !config.smtp_password_encrypted) {
    return {
      success: false,
      error: "Configuración SMTP incompleta",
    }
  }

  // Decrypt password
  const password = decryptPassword(config.smtp_password_encrypted)
  if (!password) {
    return {
      success: false,
      error: "Error al descifrar las credenciales. Reconfigure la contraseña.",
    }
  }

  // Send via the appropriate provider
  if (config.provider === "gmail") {
    return sendEmailViaGmail(
      {
        user: config.smtp_user,
        password,
        senderName: config.sender_name || undefined,
      },
      options
    )
  }

  // Future: Add Resend support here
  // if (config.provider === "resend") {
  //   return sendEmailViaResend(config, options)
  // }

  return { success: false, error: `Proveedor no soportado: ${config.provider}` }
}

/**
 * Test the email connection without sending
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function testEmailConnection(client?: DbClient): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = client || (await getDefaultClient())
  const config = await getEmailConfig(supabase)

  if (!config) {
    return { success: false, error: "Configuración de email no encontrada" }
  }

  if (!config.smtp_user || !config.smtp_password_encrypted) {
    return {
      success: false,
      error: "Configure el email y contraseña antes de probar la conexión",
    }
  }

  // Decrypt password
  const password = decryptPassword(config.smtp_password_encrypted)
  if (!password) {
    return {
      success: false,
      error: "Error al descifrar las credenciales. Reconfigure la contraseña.",
    }
  }

  // Verify connection based on provider
  if (config.provider === "gmail") {
    const result = await verifyGmailConnection({
      user: config.smtp_user,
      password,
      senderName: config.sender_name || undefined,
    })

    // Update test status in database
    await supabase
      .from("email_config")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: result.success ? "success" : "failed",
        last_test_error: result.error,
      })
      .eq("id", config.id)

    return result
  }

  return { success: false, error: `Proveedor no soportado: ${config.provider}` }
}

// ============================================================================
// Email Reminders
// ============================================================================

/**
 * Schedule an email reminder for a consultation
 * @param data - Reminder data
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function scheduleReminder(
  data: CreateEmailReminderData,
  client?: DbClient
): Promise<{ success: boolean; error: string | null; reminderId?: string }> {
  const supabase = client || (await getDefaultClient())

  const { data: reminder, error } = await supabase
    .from("email_reminders")
    .insert({
      consulta_id: data.consulta_id,
      email_type: data.email_type,
      recipient_email: data.recipient_email,
      recipient_name: data.recipient_name,
      scheduled_for: data.scheduled_for.toISOString(),
      status: "pending",
      metadata: data.metadata,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error scheduling reminder:", error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null, reminderId: reminder.id }
}

/**
 * Cancel pending reminders for a consultation
 * @param consultaId - Consultation ID
 * @param emailTypes - Optional email types to cancel
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function cancelRemindersForConsulta(
  consultaId: string,
  emailTypes?: string[],
  client?: DbClient
): Promise<{ success: boolean; error: string | null; cancelledCount: number }> {
  const supabase = client || (await getDefaultClient())

  let query = supabase
    .from("email_reminders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("consulta_id", consultaId)
    .eq("status", "pending")

  if (emailTypes && emailTypes.length > 0) {
    query = query.in("email_type", emailTypes)
  }

  const { data, error } = await query.select("id")

  if (error) {
    console.error("Error cancelling reminders:", error)
    return { success: false, error: error.message, cancelledCount: 0 }
  }

  return {
    success: true,
    error: null,
    cancelledCount: data?.length || 0,
  }
}

/**
 * Get pending reminders that are ready to be sent
 * @param limit - Maximum number of reminders to fetch
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function getPendingReminders(
  limit: number = 50,
  client?: DbClient
): Promise<EmailReminder[]> {
  const supabase = client || (await getDefaultClient())

  const { data, error } = await supabase
    .from("email_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching pending reminders:", error)
    return []
  }

  return data as EmailReminder[]
}

/**
 * Mark a reminder as sent
 * @param reminderId - Reminder ID
 * @param messageId - Optional external message ID
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function markReminderSent(
  reminderId: string,
  messageId?: string,
  client?: DbClient
): Promise<void> {
  const supabase = client || (await getDefaultClient())

  await supabase
    .from("email_reminders")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      external_id: messageId || null,
    })
    .eq("id", reminderId)
}

/**
 * Mark a reminder as failed
 * @param reminderId - Reminder ID
 * @param errorMessage - Error message
 * @param client - Optional Supabase client (uses default if not provided)
 */
export async function markReminderFailed(
  reminderId: string,
  errorMessage: string,
  client?: DbClient
): Promise<void> {
  const supabase = client || (await getDefaultClient())

  // Get current retry count
  const { data: reminder } = await supabase
    .from("email_reminders")
    .select("retry_count")
    .eq("id", reminderId)
    .single()

  const newRetryCount = (reminder?.retry_count || 0) + 1
  const maxRetries = 3

  await supabase
    .from("email_reminders")
    .update({
      status: newRetryCount >= maxRetries ? "failed" : "pending",
      error_message: errorMessage,
      retry_count: newRetryCount,
    })
    .eq("id", reminderId)
}
