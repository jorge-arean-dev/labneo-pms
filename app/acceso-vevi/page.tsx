import { redirect } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { AccesoVeviPage } from "./components/acceso-vevi-page"

export const dynamic = "force-dynamic"

export default async function Page() {
  noStore()

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Only odontólogos have a Vevi registration; everyone else goes back to
  // their default landing.
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const userRole = roles?.nombre || ""

  if (userRole !== "Odontologo") {
    redirect("/solicitudes")
  }

  const { data: perfil } = await supabase
    .from("odontologos_perfil")
    .select("vevi_usuario, vevi_password, vevi_registrado_at, vevi_comentarios")
    .eq("usuario_id", user.id)
    .maybeSingle()

  return (
    <AccesoVeviPage
      usuario={perfil?.vevi_usuario ?? null}
      password={perfil?.vevi_password ?? null}
      registradoAt={perfil?.vevi_registrado_at ?? null}
      comentarios={perfil?.vevi_comentarios ?? null}
    />
  )
}
