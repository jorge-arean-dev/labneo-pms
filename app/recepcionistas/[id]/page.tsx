import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchRecepcionista } from "./actions"
import { RecepcionistaDetailPage } from "./components/recepcionista-detail-page"

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

  // Get user role
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("rol_id, roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre

  // Convert role name to lowercase to match TypeScript types
  const role = roleName?.toLowerCase() as "administrador" | "medico" | "recepcionista"

  if (!role) {
    redirect("/")
  }

  // Fetch recepcionista data
  const { id } = await params
  const { data: recepcionista, error } = await fetchRecepcionista(id)

  if (error || !recepcionista) {
    notFound()
  }

  // If recepcionista is viewing their own profile, redirect to /configuracion
  if (role === "recepcionista" && recepcionista.id === user.id) {
    redirect("/configuracion")
  }

  return (
    <RecepcionistaDetailPage
      recepcionista={recepcionista}
      role={role}
      userId={user.id}
    />
  )
}
