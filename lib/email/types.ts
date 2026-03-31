/**
 * Email system types
 */

// ============================================================================
// Clinic Info
// ============================================================================

export interface ClinicInfo {
  id: string
  nombre: string
  descripcion: string | null
  telefono: string | null
  email: string | null
  sitio_web: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  codigo_postal: string | null
  logo_url: string | null
  google_maps_url: string | null
  whatsapp_numero: string | null
  base_conocimientos: string | null
  agent_enabled: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface ClinicInfoUpdate {
  nombre: string
  descripcion?: string
  telefono?: string
  email?: string
  sitio_web?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigo_postal?: string
  google_maps_url?: string
  whatsapp_numero?: string
}

// ============================================================================
// Email Configuration
// ============================================================================

export interface EmailConfig {
  id: string
  enabled: boolean
  provider: "gmail" | "resend"
  smtp_host: string
  smtp_port: number
  smtp_user: string | null
  smtp_password_encrypted: string | null
  sender_name: string | null
  reminders_enabled: boolean
  reminder_hours_before: number
  last_test_at: string | null
  last_test_status: "success" | "failed" | null
  last_test_error: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface EmailConfigUpdate {
  enabled?: boolean
  smtp_user?: string
  smtp_password?: string // Plain text, will be encrypted before storage
  sender_name?: string
  reminders_enabled?: boolean
  reminder_hours_before?: number
}

// ============================================================================
// Email Reminders
// ============================================================================

export type EmailType =
  | "confirmacion"
  | "recordatorio_24h"
  | "cancelacion"
  | "reprogramacion"

export type EmailStatus = "pending" | "sent" | "cancelled" | "failed"

export interface EmailReminder {
  id: string
  consulta_id: string
  email_type: EmailType
  recipient_email: string
  recipient_name: string
  scheduled_for: string
  status: EmailStatus
  error_message: string | null
  retry_count: number
  sent_at: string | null
  provider: "gmail" | "resend"
  external_id: string | null
  metadata: EmailReminderMetadata
  created_at: string
  updated_at: string
}

export interface EmailReminderMetadata {
  fecha_consulta: string
  hora_consulta: string
  medico_nombre: string
  medico_especialidad?: string
  direccion_consultorio?: string
  telefono_consultorio?: string
  motivo_consulta?: string
}

export interface CreateEmailReminderData {
  consulta_id: string
  email_type: EmailType
  recipient_email: string
  recipient_name: string
  scheduled_for: Date
  metadata: EmailReminderMetadata
}

// ============================================================================
// Email Sending
// ============================================================================

export interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// Email Templates
// ============================================================================

export interface EmailTemplateData {
  paciente_nombre: string // First name only
  paciente_apellido: string // Last name only
  medico_nombre: string
  fecha_consulta: string // Formatted date
  hora_consulta: string // Formatted time
  direccion_consultorio?: string
  telefono_consultorio?: string
  motivo_consulta?: string
  clinica_nombre: string
  whatsapp_numero?: string // Clinic WhatsApp number
  google_maps_url?: string // Clinic Google Maps URL
  // Custom message from database template (HTML formatted)
  customMessageHtml?: string
}
