"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { UsuarioPms, OdontologoPerfil, OdontologoHorario, Localidad } from "@/lib/types/entities"
import { getBaseUrl } from "@/lib/utils/get-base-url"

// ============================================================================
// USUARIO PMS (shared across roles)
// ============================================================================

/**
 * Fetch usuario_pms data by user ID
 */
export async function fetchUsuarioPms(userId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data, error } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email, rol_id, foto_perfil_url, created_at, updated_at, activated_at")
    .eq("id", userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Fetch last_sign_in_at from auth.users using admin API
  let lastSignInAt: string | null = null
  try {
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId)
    if (!userError && user) {
      lastSignInAt = user.last_sign_in_at || null
    }
  } catch (err) {
    console.error(`Error fetching auth user for usuario ${userId}:`, err)
  }

  return {
    data: {
      ...data,
      last_sign_in_at: lastSignInAt,
    } as UsuarioPms,
    error: null,
  }
}

/**
 * Update usuario_pms data (nombre, apellido only - email is read-only)
 */
export async function updateUsuarioPms(userId: string, formData: { nombre: string; apellido: string }) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("usuarios_pms")
    .update({
      nombre: formData.nombre,
      apellido: formData.apellido,
    })
    .eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/configuracion", "page")

  return { success: true, error: null }
}

/**
 * Self password reset - sends email to current user's email
 */
export async function resetOwnPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// ============================================================================
// LOCALIDADES (lookup table)
// ============================================================================

/**
 * Fetch all active localidades for dropdown
 */
export async function fetchLocalidades() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("localidades")
    .select("id, codigo, nombre_display, provincia, activo, created_at, updated_at")
    .eq("activo", true)
    .order("nombre_display")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Localidad[], error: null }
}

// ============================================================================
// ODONTOLOGOS PERFIL
// ============================================================================

/**
 * Fetch odontologo perfil with localidad join
 */
export async function fetchOdontologoPerfil(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("odontologos_perfil")
    .select("id, usuario_id, localidad_id, telefono, cuit, situacion_iva, direccion_consultorio, created_at, updated_at, localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)")
    .eq("usuario_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found — not an error, just means profile doesn't exist yet
    return { data: null, error: error.message }
  }

  return { data: data as (OdontologoPerfil & { localidades: Localidad | null }) | null, error: null }
}

/**
 * Create or update odontologo perfil
 */
export async function upsertOdontologoPerfil(
  userId: string,
  formData: {
    localidad_id: string | null
    telefono: string | null
    cuit: string | null
    situacion_iva: string | null
    direccion_consultorio: string | null
  }
) {
  const supabase = await createClient()

  // Check if profile exists
  const { data: existing } = await supabase
    .from("odontologos_perfil")
    .select("id")
    .eq("usuario_id", userId)
    .single()

  if (existing) {
    // Update
    const { error } = await supabase
      .from("odontologos_perfil")
      .update({
        localidad_id: formData.localidad_id,
        telefono: formData.telefono,
        cuit: formData.cuit,
        situacion_iva: formData.situacion_iva,
        direccion_consultorio: formData.direccion_consultorio,
      })
      .eq("usuario_id", userId)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Insert
    const { error } = await supabase
      .from("odontologos_perfil")
      .insert({
        usuario_id: userId,
        localidad_id: formData.localidad_id,
        telefono: formData.telefono,
        cuit: formData.cuit,
        situacion_iva: formData.situacion_iva,
        direccion_consultorio: formData.direccion_consultorio,
      })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath("/configuracion", "page")

  return { success: true, error: null }
}

// ============================================================================
// ODONTOLOGOS HORARIOS
// ============================================================================

/**
 * Fetch all horarios for an odontologo
 */
export async function fetchOdontologoHorarios(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("odontologos_horarios")
    .select("id, usuario_id, dia_semana, hora_inicio, hora_fin, activo, created_at, updated_at")
    .eq("usuario_id", userId)
    .order("dia_semana")
    .order("hora_inicio")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as OdontologoHorario[], error: null }
}

/**
 * Replace all horarios for an odontologo (delete all + insert new)
 */
export async function updateOdontologoHorarios(
  userId: string,
  horarios: {
    dia_semana: number
    hora_inicio: string
    hora_fin: string
    activo: boolean
  }[]
) {
  const supabase = await createClient()

  // Delete all existing
  const { error: deleteError } = await supabase
    .from("odontologos_horarios")
    .delete()
    .eq("usuario_id", userId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Insert new ones (if any)
  if (horarios.length > 0) {
    const schedulesToInsert = horarios.map((h) => ({
      usuario_id: userId,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      activo: h.activo,
    }))

    const { error: insertError } = await supabase
      .from("odontologos_horarios")
      .insert(schedulesToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath("/configuracion", "page")

  return { success: true, error: null }
}
