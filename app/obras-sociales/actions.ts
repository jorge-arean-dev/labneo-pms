"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Types
export interface ObraSocial {
  id: string
  nombre: string
  codigo: string | null
  telefono: string | null
  email: string | null
  sitio_web: string | null
  is_active: boolean
  created_at: string
}

export interface CreateObraSocialData {
  nombre: string
  codigo?: string
  telefono?: string
  email?: string
  direccion?: string
  sitio_web?: string
  notas?: string
}

// Fetch all obras sociales
export async function fetchObrasSociales(): Promise<{ data: ObraSocial[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("obras_sociales")
      .select("id, nombre, codigo, telefono, email, sitio_web, is_active, created_at")
      .eq("is_active", true)
      .order("nombre", { ascending: true })

    if (error) {
      console.error("Error fetching obras sociales:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected error fetching obras sociales:", error)
    return { data: null, error: "Error inesperado al cargar las obras sociales" }
  }
}

// Create new obra social
export async function createObraSocial(
  formData: CreateObraSocialData
): Promise<{ success: boolean; error: string | null; data?: ObraSocial }> {
  try {
    const supabase = await createClient()

    // Get current user for audit fields
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data, error } = await supabase.from("obras_sociales").insert({
      nombre: formData.nombre,
      codigo: formData.codigo || null,
      telefono: formData.telefono || null,
      email: formData.email || null,
      direccion: formData.direccion || null,
      sitio_web: formData.sitio_web || null,
      notas: formData.notas || null,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    }).select("id, nombre, codigo, telefono, email, sitio_web, is_active, created_at").single()

    if (error) {
      console.error("Error creating obra social:", error)
      return { success: false, error: error.message }
    }

    // Revalidate the obras-sociales page to refresh data
    revalidatePath("/obras-sociales", "page")

    return { success: true, error: null, data }
  } catch (error) {
    console.error("Unexpected error creating obra social:", error)
    return { success: false, error: "Error inesperado al crear la obra social" }
  }
}

// Delete obra social
export async function deleteObraSocial(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Check if user is admin (RLS will also enforce this)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { error } = await supabase
      .from("obras_sociales")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting obra social:", error)
      return { success: false, error: error.message }
    }

    // Revalidate the obras-sociales page to refresh data
    revalidatePath("/obras-sociales")

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error deleting obra social:", error)
    return { success: false, error: "Error inesperado al eliminar la obra social" }
  }
}
