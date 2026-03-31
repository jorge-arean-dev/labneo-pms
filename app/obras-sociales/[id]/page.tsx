import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchObraSocial } from "./actions"
import { ObraSocialDetailPage } from "./components/obra-social-detail-page"

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

  const roleName = (userData?.roles as { nombre?: string })?.nombre

  // Convert role name to lowercase to match TypeScript types
  const role = roleName?.toLowerCase() as "administrador" | "medico" | "recepcionista"

  if (!role) {
    redirect("/")
  }

  // Fetch obra social data
  const { id } = await params
  const { data: obraSocial, error } = await fetchObraSocial(id)

  if (error || !obraSocial) {
    notFound()
  }

  return (
    <ObraSocialDetailPage
      obraSocial={obraSocial}
      role={role}
      userId={user.id}
    />
  )
}
