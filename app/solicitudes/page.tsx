import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  fetchSolicitudes,
  fetchEstadosSolicitud,
  fetchOdontologoProfileForForm,
} from "./actions"
import { SolicitudesTable } from "./components/solicitudes-table"
import {
  isOdontologoProfileComplete,
  getMissingProfileFields,
} from "@/lib/odontologo-profile"

export const dynamic = "force-dynamic"

export default async function SolicitudesPage() {
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
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const userRole = roles?.nombre?.toLowerCase() || ""

  // Fetch data in parallel
  const [solicitudesResult, estadosResult, profileResult] = await Promise.all([
    fetchSolicitudes(),
    fetchEstadosSolicitud(),
    fetchOdontologoProfileForForm(),
  ])

  if (solicitudesResult.error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h2 className="font-semibold text-destructive">Error</h2>
          <p className="text-sm text-destructive/80">
            No se pudieron cargar las solicitudes: {solicitudesResult.error}
          </p>
        </div>
      </div>
    )
  }

  const isProfileComplete = isOdontologoProfileComplete(
    profileResult.usuario,
    profileResult.perfil
  )
  const missingFields = getMissingProfileFields(profileResult.perfil)

  return (
    <SolicitudesTable
      initialSolicitudes={solicitudesResult.data || []}
      userRole={userRole}
      estados={estadosResult.data || []}
      userProfile={profileResult.usuario}
      odontologoPerfil={profileResult.perfil}
      isProfileComplete={isProfileComplete}
      missingProfileFields={missingFields}
    />
  )
}
