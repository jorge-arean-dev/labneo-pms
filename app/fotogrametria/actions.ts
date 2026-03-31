"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EstadoCita } from "@/lib/types/entities"

// ============================================================================
// Fetch citas
// ============================================================================

export async function fetchCitas() {
  const supabase = await createClient()

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
    .from("citas_fotogrametria")
    .select("*")
    .order("fecha_propuesta", { ascending: false })

  // Odontólogos only see their own citas
  if (role === "odontologo") {
    query = query.eq("odontologo_id", user.id)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  // For admin/tecnico, enrich with odontólogo names
  if (role !== "odontologo" && data && data.length > 0) {
    const odontologoIds = [...new Set(data.map((c) => c.odontologo_id))]
    const { data: usuarios } = await supabase
      .from("usuarios_pms")
      .select("id, nombre, apellido, email")
      .in("id", odontologoIds)

    const usuariosMap = new Map(
      (usuarios || []).map((u) => [u.id, u])
    )

    return {
      data: data.map((c) => ({
        ...c,
        odontologo: usuariosMap.get(c.odontologo_id) || null,
      })),
      error: null,
    }
  }

  return { data, error: null }
}

// ============================================================================
// Fetch single cita by ID
// ============================================================================

export async function fetchCitaById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("citas_fotogrametria")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Enrich with odontólogo info
  const { data: odontologo } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email")
    .eq("id", data.odontologo_id)
    .single()

  return {
    data: { ...data, odontologo: odontologo || null },
    error: null,
  }
}

// ============================================================================
// Create cita (odontólogo)
// ============================================================================

interface CreateCitaData {
  direccion_consultorio: string
  tipo_servicio: string | null
  fecha_propuesta: string
  observaciones: string | null
}

export async function createCita(formData: CreateCitaData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autenticado", data: null }
  }

  const { data, error } = await supabase
    .from("citas_fotogrametria")
    .insert({
      odontologo_id: user.id,
      direccion_consultorio: formData.direccion_consultorio,
      tipo_servicio: formData.tipo_servicio || null,
      fecha_propuesta: formData.fecha_propuesta,
      observaciones: formData.observaciones || null,
      estado: "pendiente",
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  revalidatePath("/fotogrametria", "page")
  return { success: true, error: null, data }
}

// ============================================================================
// Update cita estado (admin / tecnico)
// ============================================================================

export async function updateCitaEstado(
  id: string,
  estado: EstadoCita,
  notas_tecnico?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado }
  if (notas_tecnico !== undefined) {
    updateData.notas_tecnico = notas_tecnico
  }

  const { error } = await supabase
    .from("citas_fotogrametria")
    .update(updateData)
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/fotogrametria", "page")
  revalidatePath(`/fotogrametria/${id}`, "page")
  return { success: true, error: null }
}

// ============================================================================
// Delete cita (admin only)
// ============================================================================

export async function deleteCita(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("citas_fotogrametria")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/fotogrametria", "page")
  return { success: true, error: null }
}
