import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConfiguracionPage } from "./components/configuracion-page"
import { fetchUsuarioPms, fetchOdontologoPerfil, fetchOdontologoHorarios, fetchLocalidades } from "./actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
import { getMissingProfileFields, PROFILE_FIELD_LABELS } from "@/lib/odontologo-profile"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ incompleto?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { incompleto } = await searchParams
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

  // Fetch usuario_pms data for all roles
  const { data: usuarioData, error: usuarioError } = await fetchUsuarioPms(user.id)

  if (usuarioError || !usuarioData) {
    console.error("Error fetching usuario data:", usuarioError)
    return notFound()
  }

  // Fetch odontologo-specific data
  let perfilData = null
  let horariosData = null
  let localidadesData = null

  if (role === "odontologo") {
    const [perfilResult, horariosResult, localidadesResult] = await Promise.all([
      fetchOdontologoPerfil(user.id),
      fetchOdontologoHorarios(user.id),
      fetchLocalidades(),
    ])

    perfilData = perfilResult.data
    horariosData = horariosResult.data || []
    localidadesData = localidadesResult.data || []
  }

  // Compute missing-field labels for the incomplete-banner (odontólogo only)
  let incompleteMissingLabels: string[] = []
  if (incompleto === "1" && role === "odontologo") {
    const missing = getMissingProfileFields(perfilData)
    incompleteMissingLabels = missing.map((f) => PROFILE_FIELD_LABELS[f])
  }

  return (
    <ConfiguracionPage
      role={role}
      userId={user.id}
      usuarioData={usuarioData}
      perfilData={perfilData}
      horariosData={horariosData}
      localidadesData={localidadesData}
      incompleteMissingLabels={incompleteMissingLabels}
    />
  )
}
