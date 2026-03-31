import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { fetchBloqueosWithMedicos, fetchActiveMedicos } from "./actions"
import { BloqueosAgendaPage } from "./components/bloqueos-agenda-page"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Get user role
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("rol_id, roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre
  const role = roleName?.toLowerCase() as "administrador" | "recepcionista"

  // Fetch data
  const [bloqueosResult, medicosResult] = await Promise.all([
    fetchBloqueosWithMedicos(),
    fetchActiveMedicos(),
  ])

  return (
    <BloqueosAgendaPage
      initialBloqueos={bloqueosResult.data || []}
      medicos={medicosResult.data || []}
      role={role}
    />
  )
}
