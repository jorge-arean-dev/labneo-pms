"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { UsuarioPms } from "@/lib/types/entities"
import { getBaseUrl } from "@/lib/utils/get-base-url"

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
