import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConfiguracionPage } from "./components/configuracion-page"
import { fetchMedicoByUserId, fetchUsuarioPms } from "./actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user role from usuarios_pms
  const { data: userData, error: userError } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email, rol_id, foto_perfil_url, created_at, updated_at, roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user data:", userError)
    redirect("/auth/login")
  }

  const roles = userData?.roles
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : (roles as { nombre?: string })?.nombre
  const role = roleName?.toLowerCase() as UserRole

  if (!role) {
    redirect("/auth/login")
  }

  // Fetch role-specific data
  if (role === "medico") {
    // Fetch médico record by user_id
    const { data: medico, error: medicoError } = await fetchMedicoByUserId(user.id)

    if (medicoError || !medico) {
      console.error("Error fetching medico data:", medicoError)
      return notFound()
    }

    return (
      <ConfiguracionPage
        role={role}
        userId={user.id}
        medicoData={medico}
        usuarioData={null}
      />
    )
  }

  // For recepcionista and administrador, use usuarios_pms data
  const { data: usuarioData, error: usuarioError } = await fetchUsuarioPms(user.id)

  if (usuarioError || !usuarioData) {
    console.error("Error fetching usuario data:", usuarioError)
    return notFound()
  }

  return (
    <ConfiguracionPage
      role={role}
      userId={user.id}
      medicoData={null}
      usuarioData={usuarioData}
    />
  )
}
