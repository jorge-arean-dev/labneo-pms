import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchCitas } from "./actions"
import { CitasTable } from "./components/citas-table"

export const dynamic = "force-dynamic"

export default async function FotogrametriaPage() {
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

  const { data, error } = await fetchCitas()

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h2 className="font-semibold text-destructive">Error</h2>
          <p className="text-sm text-destructive/80">
            No se pudieron cargar las citas: {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <CitasTable
      initialCitas={data || []}
      userRole={userRole}
    />
  )
}
