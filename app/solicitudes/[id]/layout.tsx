import { redirect } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"

export default async function SolicitudDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  noStore()

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/")
  }

  const { data: usuarioPms, error: userError } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, email, foto_perfil_url, roles(nombre)")
    .eq("id", user.id)
    .single()

  if (userError || !usuarioPms) {
    redirect("/")
  }

  const roles = usuarioPms.roles as unknown as { nombre: string } | null
  const userRole = roles?.nombre || "Usuario"

  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("nombre")
    .single()

  const clinicName = clinicInfo?.nombre || "Portal Labneo"
  const fullName = `${usuarioPms.nombre} ${usuarioPms.apellido}`

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={fullName}
        userEmail={usuarioPms.email}
        userAvatar={usuarioPms.foto_perfil_url}
        userRole={userRole}
        clinicName={clinicName}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
