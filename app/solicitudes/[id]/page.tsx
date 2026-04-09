import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchSolicitudById, fetchEstadosSolicitud } from "../actions"
import { SolicitudDetailPage } from "./components/solicitud-detail-page"

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

  const [solicitudResult, estadosResult] = await Promise.all([
    fetchSolicitudById(id),
    fetchEstadosSolicitud(),
  ])

  if (solicitudResult.error || !solicitudResult.data) {
    return notFound()
  }

  return (
    <SolicitudDetailPage
      solicitud={solicitudResult.data}
      userRole={userRole}
      estados={estadosResult.data || []}
    />
  )
}
