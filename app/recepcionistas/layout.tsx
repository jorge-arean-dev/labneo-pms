import { redirect } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"

export default async function RecepcionistasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Disable caching to ensure fresh user data on each request
  noStore()

  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/")
  }

  // Fetch user data from usuarios_pms table with role
  const { data: usuarioPms, error: userError } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, email, foto_perfil_url, roles(nombre)")
    .eq("id", user.id)
    .single()

  if (userError || !usuarioPms) {
    // Log the error for debugging
    console.error("Error fetching user from usuarios_pms:", userError)
    console.error("User ID:", user.id)
    console.error("User email:", user.email)

    // If user doesn't exist in usuarios_pms, redirect to root
    redirect("/")
  }

  // Construct full name
  const fullName = `${usuarioPms.nombre} ${usuarioPms.apellido}`

  // Extract role name from the joined roles table
  // Note: roles is returned as an object (not array) due to single() foreign key relation
  const roles = usuarioPms.roles as unknown as { nombre: string } | null
  const userRole = roles?.nombre || "Usuario"

  // Fetch clinic name for sidebar branding
  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("nombre")
    .single()

  const clinicName = clinicInfo?.nombre || "Clínica Dermatológica"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={fullName}
        userEmail={usuarioPms.email}
        userAvatar={usuarioPms.foto_perfil_url}
        userRole={userRole}
        clinicName={clinicName}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
