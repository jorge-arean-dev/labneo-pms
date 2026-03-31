"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EstadoSolicitud } from "@/lib/types/entities"

// ============================================================================
// Fetch solicitudes
// ============================================================================

export async function fetchSolicitudes() {
  const supabase = await createClient()

  // Get current user to determine role-based filtering
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "No autenticado" }
  }

  // Get user role
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | null
  const role = roles?.nombre?.toLowerCase() || ""

  let query = supabase
    .from("solicitudes")
    .select("*")
    .order("created_at", { ascending: false })

  // Odontólogos only see their own solicitudes
  if (role === "odontologo") {
    query = query.eq("odontologo_id", user.id)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ============================================================================
// Fetch single solicitud by ID
// ============================================================================

export async function fetchSolicitudById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("solicitudes")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ============================================================================
// Create solicitud (odontólogo)
// ============================================================================

interface CreateSolicitudData {
  nombre: string
  apellido: string
  localidad: string
  telefono: string
  horarios_atencion: string
  cuit_iva: string
  email: string
  tipo_servicio: string[] | null
}

export async function createSolicitud(formData: CreateSolicitudData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autenticado", data: null }
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .insert({
      odontologo_id: user.id,
      nombre: formData.nombre,
      apellido: formData.apellido,
      localidad: formData.localidad,
      telefono: formData.telefono,
      horarios_atencion: formData.horarios_atencion,
      cuit_iva: formData.cuit_iva,
      email: formData.email,
      tipo_servicio: formData.tipo_servicio,
      estado: "enviada",
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  revalidatePath("/solicitudes", "page")
  return { success: true, error: null, data }
}

// ============================================================================
// Update solicitud estado (admin only)
// ============================================================================

export async function updateSolicitudEstado(
  id: string,
  estado: EstadoSolicitud,
  notas_admin?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado }
  if (notas_admin !== undefined) {
    updateData.notas_admin = notas_admin
  }

  const { error } = await supabase
    .from("solicitudes")
    .update(updateData)
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/solicitudes", "page")
  revalidatePath(`/solicitudes/${id}`, "page")
  return { success: true, error: null }
}

// ============================================================================
// Delete solicitud (admin only)
// ============================================================================

export async function deleteSolicitud(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("solicitudes")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/solicitudes", "page")
  return { success: true, error: null }
}

// ============================================================================
// Tarifarios — fetch for locality display
// ============================================================================

export async function fetchLocalidades() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("localidades_tarifarios")
    .select("id, localidad, tarifario_id")
    .order("localidad")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function fetchTarifarioWithItems(tarifarioId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tarifarios")
    .select(`
      id, nombre, moneda, is_active,
      tarifarios_items (
        id, servicio, precio, descripcion, is_active, orden
      )
    `)
    .eq("id", tarifarioId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Fetch all active tarifarios with their items (for admin display or
 * when we need to show a tarifario by localidad)
 */
export async function fetchAllTarifarios() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tarifarios")
    .select(`
      id, nombre, moneda, is_active,
      tarifarios_items (
        id, servicio, precio, descripcion, is_active, orden
      )
    `)
    .eq("is_active", true)
    .order("nombre")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ============================================================================
// Fetch current user profile (for pre-filling the form)
// ============================================================================

export async function fetchCurrentUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "No autenticado" }
  }

  const { data, error } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, email")
    .eq("id", user.id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
