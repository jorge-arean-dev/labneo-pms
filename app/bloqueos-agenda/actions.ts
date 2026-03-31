"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Fetch all bloqueos across all doctors with doctor names
 */
export async function fetchBloqueosWithMedicos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .select(`
      id,
      medico_id,
      fecha_inicio,
      fecha_fin,
      motivo,
      origen,
      created_at,
      medicos!inner(
        id,
        user_id,
        deleted_at,
        usuarios_pms:user_id(nombre, apellido)
      )
    `)
    .is("medicos.deleted_at", null)
    .order("fecha_inicio", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to a flat structure
  const bloqueos = (data || []).map((b) => {
    const medico = b.medicos as unknown as {
      id: string
      user_id: string
      usuarios_pms: { nombre: string; apellido: string } | null
    } | null
    return {
      id: b.id as string,
      medico_id: b.medico_id as string,
      fecha_inicio: b.fecha_inicio as string,
      fecha_fin: b.fecha_fin as string,
      motivo: b.motivo as string | null,
      origen: b.origen as "individual" | "general",
      created_at: b.created_at as string,
      medico_nombre: medico?.usuarios_pms?.nombre || "",
      medico_apellido: medico?.usuarios_pms?.apellido || "",
    }
  })

  return { data: bloqueos, error: null }
}

export type BloqueoWithMedico = NonNullable<Awaited<ReturnType<typeof fetchBloqueosWithMedicos>>["data"]>[number]

/**
 * Fetch all active doctors for the doctor selector
 */
export async function fetchActiveMedicos() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos")
    .select(`
      id,
      user_id,
      usuarios_pms:user_id(nombre, apellido)
    `)
    .is("deleted_at", null)
    .order("user_id")

  if (error) {
    return { data: null, error: error.message }
  }

  const medicos = (data || []).map((m) => {
    const usuario = m.usuarios_pms as unknown as { nombre: string; apellido: string } | null
    return {
      id: m.id as string,
      nombre: usuario?.nombre || "",
      apellido: usuario?.apellido || "",
    }
  })

  return { data: medicos, error: null }
}
