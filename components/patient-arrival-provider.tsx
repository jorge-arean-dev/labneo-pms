"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PatientArrivalBanner } from "./patient-arrival-banner"

/**
 * Provider component that conditionally renders the PatientArrivalBanner
 * for users with the "Medico" role.
 *
 * Fetches auth status and medicoId client-side to enable realtime notifications.
 * Place this ONCE in app/layout.tsx to provide global patient arrival notifications.
 *
 * This component handles all auth checks internally, so it can be placed
 * at the root level without needing props from server components.
 */
export function PatientArrivalProvider() {
  const [medicoId, setMedicoId] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuthAndFetchMedicoId() {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check user role from usuarios_pms
      const { data: usuarioPms } = await supabase
        .from("usuarios_pms")
        .select("roles(nombre)")
        .eq("id", user.id)
        .single()

      if (!usuarioPms) return

      // Extract role name
      const roles = usuarioPms.roles as unknown as { nombre: string } | null
      const userRole = roles?.nombre

      // Only proceed for médicos
      if (userRole !== "Medico") return

      // Get médico record for this user
      const { data: medico } = await supabase
        .from("medicos")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single()

      if (medico) {
        setMedicoId(medico.id)
      }
    }

    checkAuthAndFetchMedicoId()

    // Listen for auth state changes to handle login/logout
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMedicoId(null)
      } else if (event === "SIGNED_IN") {
        checkAuthAndFetchMedicoId()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Only render banner for médicos with a valid medicoId
  if (!medicoId) {
    return null
  }

  return <PatientArrivalBanner medicoId={medicoId} />
}
