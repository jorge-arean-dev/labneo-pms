"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Localidad } from "@/lib/types/entities"

interface SignUpData {
  nombre: string
  apellido: string
  email: string
  password: string
  telefono: string
  localidad_id: string
  cuit: string
  situacion_iva: string
  direccion_consultorio: string
}

export async function signUpOdontologo(data: SignUpData) {
  const supabase = await createClient()

  // Create auth user — the handle_new_user() trigger on auth.users
  // automatically creates the usuarios_pms row with Odontologo role
  // and the odontologos_perfil row with the professional fields,
  // using all data from raw_user_meta_data
  const { error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        is_odontologo_signup: true,
        telefono: data.telefono,
        localidad_id: data.localidad_id,
        cuit: data.cuit,
        situacion_iva: data.situacion_iva,
        direccion_consultorio: data.direccion_consultorio,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/confirm`,
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  return { error: null }
}

/**
 * Fetch active localidades for the signup form (unauthenticated context).
 * Uses the admin client to bypass RLS since there is no session.
 */
export async function fetchLocalidadesForSignup() {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("localidades")
    .select("id, nombre_display")
    .eq("activo", true)
    .order("nombre_display")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Pick<Localidad, "id" | "nombre_display">[], error: null }
}
