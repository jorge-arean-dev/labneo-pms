import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchMedicos } from "./actions"
import { MedicosCards } from "./components/medicos-cards"

export const dynamic = 'force-dynamic'

export default async function MedicosPage() {

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

  const { data, error } = await fetchMedicos()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Error al cargar los médicos: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <MedicosCards initialMedicos={data || []} userRole={userRole} />
    </div>
  )
}
