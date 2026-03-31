import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchRecepcionistas } from "./actions"
import { RecepcionistasCards } from "./components/recepcionistas-cards"

export const dynamic = 'force-dynamic'

export default async function RecepcionistasPage() {

  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Get user role
  const { data: userRole } = await supabase.rpc("get_user_role")

  const { data, error } = await fetchRecepcionistas()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Error al cargar los recepcionistas: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <RecepcionistasCards initialRecepcionistas={data || []} userRole={userRole} />
    </div>
  )
}
