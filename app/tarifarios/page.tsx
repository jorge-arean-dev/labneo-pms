import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { canAccessTarifarios } from "@/lib/permissions"
import { fetchItems, fetchTarifarios, fetchLocalidadesForTarifarios } from "./actions"
import { TarifariosTabs } from "./components/tarifarios-tabs"

export const dynamic = "force-dynamic"

export default async function TarifariosPage() {
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

  if (!canAccessTarifarios(userRole)) {
    redirect("/")
  }

  const [itemsResult, tarifariosResult, localidadesResult] = await Promise.all([
    fetchItems(),
    fetchTarifarios(),
    fetchLocalidadesForTarifarios(),
  ])

  const loadError =
    itemsResult.error || tarifariosResult.error || localidadesResult.error

  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h2 className="font-semibold text-destructive">Error</h2>
          <p className="text-sm text-destructive/80">
            No se pudo cargar la información de tarifarios: {loadError}
          </p>
        </div>
      </div>
    )
  }

  return (
    <TarifariosTabs
      initialItems={itemsResult.data || []}
      initialTarifarios={tarifariosResult.data || []}
      localidades={localidadesResult.data || []}
    />
  )
}
