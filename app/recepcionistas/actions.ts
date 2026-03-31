"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { getBaseUrl } from "@/lib/utils/get-base-url"

// Types
export interface Recepcionista {
  id: string
  nombre: string
  apellido: string
  email: string
  last_sign_in_at: string | null
  activated_at: string | null
  created_at: string
}

export interface CreateRecepcionistaData {
  nombre: string
  apellido: string
  email: string
}

// Fetch all recepcionistas with user info
export async function fetchRecepcionistas(): Promise<{ data: Recepcionista[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get role ID for "Recepcionista"
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "Recepcionista")
      .single()

    if (roleError || !roleData) {
      console.error("Error fetching Recepcionista role:", roleError)
      return { data: null, error: "Error al obtener el rol de Recepcionista" }
    }

    // Fetch recepcionistas from usuarios_pms (including activated_at)
    const { data: recepcionistasData, error: recepcionistasError } = await supabase
      .from("usuarios_pms")
      .select("id, nombre, apellido, email, created_at, activated_at")
      .eq("rol_id", roleData.id)
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true })

    if (recepcionistasError) {
      console.error("Error fetching recepcionistas:", recepcionistasError)
      return { data: null, error: recepcionistasError.message }
    }

    if (!recepcionistasData || recepcionistasData.length === 0) {
      return { data: [], error: null }
    }

    // Fetch last_sign_in_at from auth.users using admin API (still needed for último acceso display)
    const adminClient = createAdminClient()

    const recepcionistasWithUserData: Recepcionista[] = await Promise.all(
      recepcionistasData.map(async (recepcionista) => {
        // Fetch last_sign_in_at using admin API
        let lastSignInAt: string | null = null
        try {
          const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(recepcionista.id)
          if (!userError && user) {
            lastSignInAt = user.last_sign_in_at || null
          }
        } catch (error) {
          console.error(`Error fetching auth user for recepcionista ${recepcionista.id}:`, error)
        }

        return {
          ...recepcionista,
          last_sign_in_at: lastSignInAt,
          activated_at: recepcionista.activated_at,
        }
      })
    )

    return { data: recepcionistasWithUserData, error: null }
  } catch (error) {
    console.error("Unexpected error fetching recepcionistas:", error)
    return { data: null, error: "Error inesperado al cargar los recepcionistas" }
  }
}

// Create new recepcionista with platform access
export async function createRecepcionista(
  formData: CreateRecepcionistaData
): Promise<{ success: boolean; error: string | null; data?: Recepcionista }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user for audit
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Check if current user is admin
    const { data: userRole } = await supabase.rpc("get_user_role")

    if (userRole !== "Administrador") {
      return { success: false, error: "No tiene permisos para crear recepcionistas" }
    }

    // Step 1: Create auth user and send invite email
    // inviteUserByEmail creates the user AND sends the invite email using the "Invite user" template
    const { data: authUser, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      formData.email,
      {
        redirectTo: `${getBaseUrl()}/auth/set-password`,
      }
    )

    if (authError || !authUser.user) {
      console.error("Error inviting user:", authError)
      // Handle specific error for duplicate email
      if (authError?.message?.includes("already been registered")) {
        return { success: false, error: "Ya existe un usuario con este correo electrónico" }
      }
      return { success: false, error: authError?.message || "Error al crear usuario de autenticación" }
    }

    // Step 2: Get role ID for "Recepcionista"
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "Recepcionista")
      .single()

    if (roleError || !roleData) {
      console.error("Error fetching Recepcionista role:", roleError)
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: "Error al obtener el rol de Recepcionista" }
    }

    // Step 3: Upsert into usuarios_pms (insert or update if exists)
    // Note: Database trigger may auto-create usuarios_pms entry, so we use upsert
    const { error: usuarioError } = await supabase.from("usuarios_pms").upsert({
      id: authUser.user.id,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      rol_id: roleData.id,
    })

    if (usuarioError) {
      console.error("Error creating usuario_pms:", usuarioError)
      // Rollback: delete auth user (cascade deletes usuarios_pms)
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: usuarioError.message }
    }

    // Note: Invite email was already sent by inviteUserByEmail() in Step 1

    // Revalidate the recepcionistas page
    revalidatePath("/recepcionistas", "page")

    return {
      success: true,
      error: null,
      data: {
        id: authUser.user.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        last_sign_in_at: null,
        activated_at: null, // New user, not yet activated
        created_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("Unexpected error creating recepcionista:", error)
    return { success: false, error: "Error inesperado al crear el recepcionista" }
  }
}

// Reset recepcionista password
export async function resetRecepcionistaPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: userRole } = await supabase.rpc("get_user_role")

    if (userRole !== "Administrador") {
      return { success: false, error: "No tiene permisos para restablecer contraseñas" }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/reset-password`,
    })

    if (error) {
      console.error("Error sending password reset email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error resetting password:", error)
    return { success: false, error: "Error inesperado al restablecer la contraseña" }
  }
}

// Re-send invitation to recepcionista who hasn't completed setup
export async function resendRecepcionistaInvite(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
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

    // Re-send invitation using admin API
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/set-password`,
    })

    if (error) {
      // If invite fails because user already clicked the link (email_exists),
      // fall back to password reset which will allow them to set their password
      if (error.code === "email_exists" || error.message?.includes("already been registered")) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getBaseUrl()}/auth/reset-password`,
        })

        if (resetError) {
          console.error("Error sending password reset email:", resetError)
          return { success: false, error: resetError.message }
        }

        // Password reset sent successfully
        return { success: true, error: null }
      }

      console.error("Error resending invite email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error resending invite:", error)
    return { success: false, error: "Error inesperado al reenviar la invitación" }
  }
}

// Hard delete recepcionista
export async function deleteRecepcionista(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Check if current user is admin
    const { data: userRole } = await supabase.rpc("get_user_role")

    if (userRole !== "Administrador") {
      return { success: false, error: "No tiene permisos para eliminar recepcionistas" }
    }

    // Hard delete: Delete auth user (cascade deletes usuarios_pms)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id)

    if (deleteError) {
      console.error("Error deleting recepcionista:", deleteError)
      return { success: false, error: deleteError.message }
    }

    // Revalidate the recepcionistas page
    revalidatePath("/recepcionistas")

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error deleting recepcionista:", error)
    return { success: false, error: "Error inesperado al eliminar el recepcionista" }
  }
}
