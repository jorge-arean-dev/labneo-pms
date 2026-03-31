"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Recepcionista } from "@/lib/types/entities"
import { getBaseUrl } from "@/lib/utils/get-base-url"

/**
 * Fetch a single recepcionista by ID
 */
export async function fetchRecepcionista(id: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data, error } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email, rol_id, foto_perfil_url, created_at, updated_at, activated_at")
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Verify this is actually a recepcionista by checking role
  const { data: roleData } = await supabase
    .from("roles")
    .select("nombre")
    .eq("id", data.rol_id)
    .single()

  if (roleData?.nombre?.toLowerCase() !== "recepcionista") {
    return { data: null, error: "Usuario no es recepcionista" }
  }

  // Fetch last_sign_in_at from auth.users using admin API (still needed for último acceso display)
  let lastSignInAt: string | null = null
  try {
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(id)
    if (!userError && user) {
      lastSignInAt = user.last_sign_in_at || null
    }
  } catch (error) {
    console.error(`Error fetching auth user for recepcionista ${id}:`, error)
  }

  return {
    data: {
      ...data,
      last_sign_in_at: lastSignInAt,
      activated_at: data.activated_at,
    } as Recepcionista,
    error: null
  }
}

/**
 * Update a recepcionista
 */
export async function updateRecepcionista(
  id: string,
  formData: Partial<Recepcionista>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("usuarios_pms")
    .update({
      nombre: formData.nombre,
      apellido: formData.apellido,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/recepcionistas/[id]", "page")
  revalidatePath("/recepcionistas", "page")

  return { success: true, error: null }
}

/**
 * Delete a recepcionista (Admin only)
 */
export async function deleteRecepcionista(id: string) {
  const adminClient = createAdminClient()

  // Hard delete: Delete auth user (cascade deletes usuarios_pms)
  const { error } = await adminClient.auth.admin.deleteUser(id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/recepcionistas", "page")

  return { success: true, error: null }
}

/**
 * Reset recepcionista password (Admin only)
 */
export async function resetRecepcionistaPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Re-send invitation to recepcionista who hasn't completed setup (Admin only)
 */
export async function resendRecepcionistaInvite(id: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Check if current user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  const { data: userRole } = await supabase.rpc("get_user_role")

  if (userRole !== "Administrador") {
    return { success: false, error: "No tiene permisos para reenviar invitaciones" }
  }

  // Get recepcionista email
  const { data: recepcionista, error: fetchError } = await supabase
    .from("usuarios_pms")
    .select("email")
    .eq("id", id)
    .single()

  if (fetchError || !recepcionista) {
    return { success: false, error: "No se pudo encontrar el recepcionista" }
  }

  // Re-send invitation using admin API
  const { error } = await adminClient.auth.admin.inviteUserByEmail(recepcionista.email, {
    redirectTo: `${getBaseUrl()}/auth/set-password`,
  })

  if (error) {
    // Fallback: if user already exists in auth, send password reset instead
    if (error.message?.includes("already been registered")) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(recepcionista.email, {
        redirectTo: `${getBaseUrl()}/auth/set-password`,
      })

      if (resetError) {
        console.error("Error sending password reset fallback:", resetError)
        return { success: false, error: resetError.message }
      }

      return { success: true, error: null }
    }

    console.error("Error resending invite email:", error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Change recepcionista email address (Admin only)
 * Updates auth.users and usuarios_pms tables.
 * Invalidates all sessions and sends a password setup email to the new address.
 */
export async function changeRecepcionistaEmail(recepcionistaId: string, newEmail: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  const { data: userRole } = await supabase.rpc("get_user_role")

  if (userRole !== "Administrador") {
    return { success: false, error: "No tiene permisos para cambiar el email" }
  }

  // 2. Get current email for potential revert
  const { data: currentRecepcionista, error: fetchError } = await supabase
    .from("usuarios_pms")
    .select("email")
    .eq("id", recepcionistaId)
    .single()

  if (fetchError || !currentRecepcionista) {
    return { success: false, error: "No se pudo encontrar el recepcionista" }
  }

  const normalizedEmail = newEmail.trim().toLowerCase()

  // 3. Check duplicate email in usuarios_pms (exclude current user)
  const { data: existingUser } = await supabase
    .from("usuarios_pms")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", recepcionistaId)
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: "Este email ya está registrado en el sistema" }
  }

  // 4. Update auth user email (with auto-confirm to skip confirmation flow)
  const { error: emailError } = await adminClient.auth.admin.updateUserById(
    recepcionistaId,
    {
      email: normalizedEmail,
      email_confirm: true,
    }
  )

  if (emailError) {
    console.error("Error updating auth user email:", emailError)
    return { success: false, error: "Error al actualizar el email en el sistema de autenticación" }
  }

  // 4b. Invalidate sessions by setting a random password (forces logout)
  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    recepcionistaId,
    {
      password: crypto.randomUUID(),
    }
  )

  if (passwordError) {
    console.error("Error invalidating sessions:", passwordError)
    // Non-fatal: email was changed but sessions weren't invalidated
  }

  // 5. Update usuarios_pms email + reset activation
  const { error: usuarioError } = await supabase
    .from("usuarios_pms")
    .update({
      email: normalizedEmail,
      activated_at: null,
    })
    .eq("id", recepcionistaId)

  if (usuarioError) {
    console.error("Error updating usuarios_pms email:", usuarioError)
    // Best-effort revert auth email
    await adminClient.auth.admin.updateUserById(recepcionistaId, { email: currentRecepcionista.email })
    return { success: false, error: "Error al actualizar el email del usuario" }
  }

  // 6. Send password setup email to new address
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${getBaseUrl()}/auth/set-password`,
  })

  if (resetError) {
    console.error("Error sending password reset to new email:", resetError)
    // Non-fatal: email was changed but invite didn't send. Admin can re-send manually.
  }

  revalidatePath("/recepcionistas/[id]", "page")
  revalidatePath("/recepcionistas", "page")

  return { success: true, error: null }
}
