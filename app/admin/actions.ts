"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { encryptPassword } from "@/lib/email/encryption"
import { uploadLogo, deleteLogo, extractFilenameFromUrl } from "@/lib/storage/logo-utils"
import type { EmailConfig, ClinicInfo, ClinicInfoUpdate } from "@/lib/email/types"

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
  smtp_password?: string
  sender_name: string
}

export async function updateSmtpSettings(
  configId: string,
  formData: UpdateSmtpSettingsData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const updateData: Record<string, unknown> = {
    enabled: formData.enabled,
    smtp_user: formData.smtp_user || null,
    sender_name: formData.sender_name || null,
    updated_by: user.id,
  }

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
// Prótesis Notification Toggles
// ============================================================================

interface UpdateProtesisNotificationData {
  protesis_first_notification_enabled?: boolean
  protesis_subsequent_notification_enabled?: boolean
}

export async function updateProtesisNotificationSettings(
  configId: string,
  formData: UpdateProtesisNotificationData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (formData.protesis_first_notification_enabled !== undefined) {
    updateData.protesis_first_notification_enabled = formData.protesis_first_notification_enabled
  }
  if (formData.protesis_subsequent_notification_enabled !== undefined) {
    updateData.protesis_subsequent_notification_enabled = formData.protesis_subsequent_notification_enabled
  }

  const { error } = await supabase
    .from("email_config")
    .update(updateData)
    .eq("id", configId)

  if (error) {
    console.error("Error updating prótesis notification settings:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Lab Info (clinic_info table)
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
    console.error("Error fetching lab info:", error)
    return { data: null, error: error.message }
  }

  return { data: data as ClinicInfo, error: null }
}

export async function updateClinicInfo(
  clinicId: string,
  formData: ClinicInfoUpdate
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

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
    console.error("Error updating lab info:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}

// ============================================================================
// Logo Upload / Delete
// ============================================================================

export async function uploadClinicLogo(
  formData: FormData
): Promise<{ success: boolean; publicUrl?: string; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return { success: false, error: "No se proporcionó ningún archivo" }
  }

  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("logo_url")
    .single()

  const oldLogoUrl = clinicInfo?.logo_url
  const oldFilename = oldLogoUrl ? extractFilenameFromUrl(oldLogoUrl) : null

  const uploadResult = await uploadLogo(file)
  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error || "Error al subir el logo" }
  }

  const logoUrlWithCacheBuster = `${uploadResult.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from("clinic_info")
    .update({
      logo_url: logoUrlWithCacheBuster,
      updated_by: user.id,
    })
    .not("id", "is", null)

  if (updateError) {
    const newFilename = extractFilenameFromUrl(uploadResult.publicUrl || "")
    if (newFilename) await deleteLogo(newFilename)
    return { success: false, error: "Error al guardar el logo en la base de datos" }
  }

  if (oldFilename) await deleteLogo(oldFilename)

  revalidatePath("/admin", "page")
  return { success: true, publicUrl: logoUrlWithCacheBuster, error: null }
}

export async function deleteClinicLogo(): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autorizado" }
  }

  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("logo_url")
    .single()

  const currentLogoUrl = clinicInfo?.logo_url
  const filename = currentLogoUrl ? extractFilenameFromUrl(currentLogoUrl) : null

  if (filename) {
    const deleteResult = await deleteLogo(filename)
    if (!deleteResult.success) {
      return { success: false, error: deleteResult.error || "Error al eliminar el logo" }
    }
  }

  const { error: updateError } = await supabase
    .from("clinic_info")
    .update({
      logo_url: null,
      updated_by: user.id,
    })
    .not("id", "is", null)

  if (updateError) {
    return { success: false, error: "Error al actualizar la base de datos" }
  }

  revalidatePath("/admin", "page")
  return { success: true, error: null }
}
