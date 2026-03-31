"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Marks the current user's account as activated by setting activated_at timestamp.
 * This should be called after the user successfully sets their password.
 *
 * Unlike Supabase's email_confirmed_at (which is set when the invite link is clicked),
 * activated_at is only set when the user completes the password setup process.
 *
 * Note: Uses admin client to bypass RLS policies on usuarios_pms.
 */
export async function activateUserAccount(): Promise<{ success: boolean; error: string | null }> {
  console.log("[activateUserAccount] Function called")

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log("[activateUserAccount] User:", user?.id, "Auth error:", authError?.message)

  if (authError || !user) {
    console.log("[activateUserAccount] No user found, returning error")
    return {
      success: false,
      error: "No se pudo verificar la sesión del usuario"
    }
  }

  // Update the activated_at timestamp in usuarios_pms
  // Use admin client to bypass RLS policies
  const timestamp = new Date().toISOString()
  console.log("[activateUserAccount] Attempting to set activated_at =", timestamp, "for user", user.id)

  const { error: updateError, data: updateData } = await adminClient
    .from("usuarios_pms")
    .update({ activated_at: timestamp })
    .eq("id", user.id)
    .select()

  console.log("[activateUserAccount] Update result - Error:", updateError, "Data:", updateData)

  if (updateError) {
    console.error("[activateUserAccount] Error activating user account:", updateError)
    return {
      success: false,
      error: "No se pudo activar la cuenta"
    }
  }

  console.log("[activateUserAccount] Success!")
  return { success: true, error: null }
}
