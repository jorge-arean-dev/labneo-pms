"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { encryptPassword } from "@/lib/email/encryption"
import { testEmailConnection as testConnection, sendEmail, prepareEmailTemplateData } from "@/lib/email/service"
import { generateEmailContent } from "@/lib/email/templates"
import { uploadLogo, deleteLogo, extractFilenameFromUrl } from "@/lib/storage/logo-utils"
import type { EmailConfig, EmailType, ClinicInfo, ClinicInfoUpdate } from "@/lib/email/types"

// ============================================================================
// Fetch Email Configuration
// ============================================================================

export async function fetchEmailConfig(): Promise<{
  data: EmailConfig | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("email_config")
    .select("*")
    .single()

  if (error) {
    console.error("Error fetching email config:", error)
    return { data: null, error: error.message }
  }

  return { data: data as EmailConfig, error: null }
}

// ============================================================================
// Update SMTP Settings
// ============================================================================

interface UpdateSmtpSettingsData {
  enabled: boolean
  smtp_user: string
  smtp_password?: string // Only provided if changed
  sender_name: string
}

export async function updateSmtpSettings(
  configId: string,
  formData: UpdateSmtpSettingsData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    enabled: formData.enabled,
    smtp_user: formData.smtp_user || null,
    sender_name: formData.sender_name || null,
    updated_by: user.id,
  }

  // Only update password if a new one was provided
  if (formData.smtp_password && formData.smtp_password.trim() !== "") {
    updateData.smtp_password_encrypted = encryptPassword(formData.smtp_password)
  }

  const { error } = await supabase
    .from("email_config")
    .update(updateData)
    .eq("id", configId)

  if (error) {
    console.error("Error updating SMTP settings:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Update Reminder Settings
// ============================================================================

interface UpdateReminderSettingsData {
  reminders_enabled: boolean
  reminder_hours_before: number
}

export async function updateReminderSettings(
  configId: string,
  formData: UpdateReminderSettingsData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const { error } = await supabase
    .from("email_config")
    .update({
      reminders_enabled: formData.reminders_enabled,
      reminder_hours_before: formData.reminder_hours_before,
      updated_by: user.id,
    })
    .eq("id", configId)

  if (error) {
    console.error("Error updating reminder settings:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Test Email Connection
// ============================================================================

export async function testEmailConnection(): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Use the email service to test connection
  const result = await testConnection()

  revalidatePath("/admin", "page")

  return result
}

// ============================================================================
// Send Test Email
// ============================================================================

interface SendTestEmailData {
  recipient_email: string
  template_type: EmailType
}

export async function sendTestEmail(
  configId: string,
  formData: SendTestEmailData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.recipient_email)) {
    return { success: false, error: "El email de destino no es válido" }
  }

  // Create test data with placeholder values
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 30, 0, 0)

  // Prepare template data using ACTUAL templates from database
  // This fetches clinic info and processes the custom template from email_templates table
  const templateData = await prepareEmailTemplateData(
    {
      paciente_nombre: "Juan",
      paciente_apellido: "Pérez",
      medico_nombre: "Dr. María García",
      fecha_consulta: tomorrow.toISOString(),
      hora_consulta: "10:30 AM",
    },
    formData.template_type, // This triggers fetching the actual template from DB
    supabase
  )

  // Generate email content using the actual database template
  const emailContent = generateEmailContent(formData.template_type, templateData)

  // Send the test email using the email service
  const result = await sendEmail({
    to: formData.recipient_email,
    subject: `[PRUEBA] ${emailContent.subject}`,
    html: emailContent.html,
  })

  if (result.success) {
    // Update last test status
    await supabase
      .from("email_config")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "success",
        last_test_error: null,
      })
      .eq("id", configId)
  }

  revalidatePath("/admin", "page")

  return {
    success: result.success,
    error: result.error || null,
  }
}

// ============================================================================
// Clinic Info
// ============================================================================

export async function fetchClinicInfo(): Promise<{
  data: ClinicInfo | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("clinic_info")
    .select("*")
    .single()

  if (error) {
    console.error("Error fetching clinic info:", error)
    return { data: null, error: error.message }
  }

  return { data: data as ClinicInfo, error: null }
}

export async function updateClinicInfo(
  clinicId: string,
  formData: ClinicInfoUpdate
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const { error } = await supabase
    .from("clinic_info")
    .update({
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      telefono: formData.telefono || null,
      email: formData.email || null,
      sitio_web: formData.sitio_web || null,
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      provincia: formData.provincia || null,
      codigo_postal: formData.codigo_postal || null,
      google_maps_url: formData.google_maps_url || null,
      whatsapp_numero: formData.whatsapp_numero || null,
      updated_by: user.id,
    })
    .eq("id", clinicId)

  if (error) {
    console.error("Error updating clinic info:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Clinic Logo Upload
// ============================================================================

export async function uploadClinicLogo(
  formData: FormData
): Promise<{ success: boolean; publicUrl?: string; error: string | null }> {
  const supabase = await createClient()

  // Get current user for authorization
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Get file from form data
  const file = formData.get("file") as File | null

  if (!file) {
    return { success: false, error: "No se proporcionó ningún archivo" }
  }

  // Get current logo URL to delete old file after successful upload
  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("logo_url")
    .single()

  const oldLogoUrl = clinicInfo?.logo_url
  const oldFilename = oldLogoUrl ? extractFilenameFromUrl(oldLogoUrl) : null

  // Upload new logo to storage (creates new file with timestamp)
  const uploadResult = await uploadLogo(file)

  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error || "Error al subir el logo" }
  }

  // Add cache-busting timestamp to URL to prevent browser from serving old cached image
  const logoUrlWithCacheBuster = `${uploadResult.publicUrl}?t=${Date.now()}`

  // Update clinic_info with new logo URL
  const { error: updateError } = await supabase
    .from("clinic_info")
    .update({
      logo_url: logoUrlWithCacheBuster,
      updated_by: user.id,
    })
    .not("id", "is", null) // Update the singleton row

  if (updateError) {
    // Rollback: delete the newly uploaded file if database update fails
    const newFilename = extractFilenameFromUrl(uploadResult.publicUrl || "")
    if (newFilename) {
      await deleteLogo(newFilename)
    }
    console.error("Error updating clinic info with logo URL:", updateError)
    return { success: false, error: "Error al guardar el logo en la base de datos" }
  }

  // Delete old logo file after successful upload (cleanup)
  if (oldFilename) {
    await deleteLogo(oldFilename)
  }

  revalidatePath("/admin", "page")
  return { success: true, publicUrl: logoUrlWithCacheBuster, error: null }
}

// ============================================================================
// Clinic Logo Delete
// ============================================================================

export async function deleteClinicLogo(): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for authorization
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Get current logo URL to extract filename
  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("logo_url")
    .single()

  const currentLogoUrl = clinicInfo?.logo_url
  const filename = currentLogoUrl ? extractFilenameFromUrl(currentLogoUrl) : null

  // Delete logo from storage
  if (filename) {
    const deleteResult = await deleteLogo(filename)
    if (!deleteResult.success) {
      return { success: false, error: deleteResult.error || "Error al eliminar el logo" }
    }
  }

  // Update clinic_info to clear logo URL
  const { error: updateError } = await supabase
    .from("clinic_info")
    .update({
      logo_url: null,
      updated_by: user.id,
    })
    .not("id", "is", null) // Update the singleton row

  if (updateError) {
    console.error("Error clearing logo URL from clinic info:", updateError)
    return { success: false, error: "Error al actualizar la base de datos" }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// WhatsApp Agent - Knowledge Base
// ============================================================================

export async function updateBaseConocimientos(
  clinicId: string,
  content: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre

  if (roleName?.toLowerCase() !== "administrador") {
    return { success: false, error: "Solo los administradores pueden modificar la base de conocimientos" }
  }

  const { error } = await supabase
    .from("clinic_info")
    .update({
      base_conocimientos: content || null,
      updated_by: user.id,
    })
    .eq("id", clinicId)

  if (error) {
    console.error("Error updating base_conocimientos:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Update Agent Enabled Status
// ============================================================================

export async function updateAgentEnabled(
  clinicId: string,
  enabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre

  if (roleName?.toLowerCase() !== "administrador") {
    return { success: false, error: "Solo los administradores pueden modificar el estado del agente" }
  }

  const { error } = await supabase
    .from("clinic_info")
    .update({
      agent_enabled: enabled,
      updated_by: user.id,
    })
    .eq("id", clinicId)

  if (error) {
    console.error("Error updating agent_enabled:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Email Templates
// ============================================================================

export interface EmailTemplates {
  id: string
  confirmacion_turno: string
  recordatorio_consulta: string
  cancelacion_turno: string
  created_at: string
  updated_at: string
}

export async function fetchEmailTemplates(): Promise<{
  data: EmailTemplates | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .single()

  if (error) {
    console.error("Error fetching email templates:", error)
    return { data: null, error: error.message }
  }

  return { data: data as EmailTemplates, error: null }
}

export interface UpdateEmailTemplatesData {
  confirmacion_turno: string
  recordatorio_consulta: string
  cancelacion_turno: string
}

export async function updateEmailTemplates(
  templateId: string,
  formData: UpdateEmailTemplatesData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get current user for authorization
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre

  if (roleName?.toLowerCase() !== "administrador") {
    return { success: false, error: "Solo los administradores pueden modificar las plantillas" }
  }

  const { error } = await supabase
    .from("email_templates")
    .update({
      confirmacion_turno: formData.confirmacion_turno,
      recordatorio_consulta: formData.recordatorio_consulta,
      cancelacion_turno: formData.cancelacion_turno,
    })
    .eq("id", templateId)

  if (error) {
    console.error("Error updating email templates:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}
