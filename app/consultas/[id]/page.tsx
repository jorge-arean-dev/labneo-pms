import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchConsulta, fetchEstados } from "./actions"
import { ConsultaDetailPage } from "./components/consulta-detail-page"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  // Get current user and role
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Get user role and medico_id (if user is a doctor)
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("rol_id, roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre
  const role = roleName?.toLowerCase() as "administrador" | "medico" | "recepcionista"

  if (!role) {
    redirect("/")
  }

  // Get medico_id if user is a doctor (for ownership check)
  let medicoId: string | null = null
  if (role === "medico") {
    const { data: medicoData } = await supabase
      .from("medicos")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single()

    medicoId = medicoData?.id || null
  }

  // Fetch consulta data
  const { id } = await params
  const { data: consulta, error } = await fetchConsulta(id)

  if (error) {
    console.error("Error fetching consulta:", error)
  }

  if (error || !consulta) {
    notFound()
  }

  // Fetch estados for dropdown
  const { data: estados } = await fetchEstados()

  return (
    <ConsultaDetailPage
      consulta={consulta}
      estados={estados || []}
      role={role}
      userId={user.id}
      medicoId={medicoId}
    />
  )
}
