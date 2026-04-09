import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { canAccessTarifarios } from "@/lib/permissions"
import { fetchTarifarioConPrecios } from "../../actions"
import { ListaDetailPage } from "./components/lista-detail-page"

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
  if (!user) redirect("/")

  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const userRole = roles?.nombre || ""

  if (!canAccessTarifarios(userRole)) redirect("/")

  const result = await fetchTarifarioConPrecios(id)

  if (result.error || !result.tarifario) return notFound()

  return (
    <ListaDetailPage
      tarifario={result.tarifario}
      items={result.items || []}
      localidades={result.localidades || []}
    />
  )
}
