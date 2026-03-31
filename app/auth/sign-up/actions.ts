"use server"

import { createClient } from "@/lib/supabase/server"

interface SignUpData {
  nombre: string
  apellido: string
  email: string
  password: string
}

export async function signUpOdontologo(data: SignUpData) {
  const supabase = await createClient()

  // Create auth user — the handle_new_user() trigger on auth.users
  // automatically creates the usuarios_pms row with Odontologo role,
  // using nombre/apellido from raw_user_meta_data
  const { error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/confirm`,
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  return { error: null }
}
