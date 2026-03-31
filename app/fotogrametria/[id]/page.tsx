import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchCitaById } from "../actions"
import { CitaDetailPage } from "./components/cita-detail-page"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
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

  const { data: cita, error } = await fetchCitaById(id)

  if (error || !cita) {
    return notFound()
  }

  return (
    <CitaDetailPage
      cita={cita}
      userRole={userRole}
    />
  )
}
