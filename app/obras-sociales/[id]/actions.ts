"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ObraSocial } from "@/lib/types/entities"

/**
 * Fetch a single obra social by ID
 */
export async function fetchObraSocial(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("obras_sociales")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ObraSocial, error: null }
}

/**
 * Update an obra social
 */
export async function updateObraSocial(
  id: string,
  formData: Partial<ObraSocial>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("obras_sociales")
    .update({
      nombre: formData.nombre,
      codigo: formData.codigo,
      telefono: formData.telefono,
      email: formData.email,
      direccion: formData.direccion,
      sitio_web: formData.sitio_web,
      is_active: formData.is_active,
      notas: formData.notas,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/obras-sociales/[id]", "page")
  revalidatePath("/obras-sociales", "page")

  return { success: true, error: null }
}

/**
 * Delete an obra social
 */
export async function deleteObraSocial(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("obras_sociales")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/obras-sociales", "page")

  return { success: true, error: null }
}
