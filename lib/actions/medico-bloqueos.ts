"use server"

/**
 * Shared server actions for médico bloqueos de agenda
 * These are read-only operations used by /medicos/[id], /configuracion, and /bloqueos-agenda routes
 */

import { createClient } from "@/lib/supabase/server"
import { MedicoBloqueoAgenda } from "@/lib/types/entities"

/**
 * Fetch all bloqueos for a single médico
 */
export async function fetchMedicoBloqueosAgenda(medicoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("*")
    .eq("medico_id", medicoId)
    .order("fecha_inicio", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as MedicoBloqueoAgenda[], error: null }
}

/**
 * Fetch all bloqueos across all doctors, joined with doctor name
 * Used by the centralized /bloqueos-agenda page
 */
export async function fetchAllBloqueosAgenda() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .select(`
      *,
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

  return { data, error: null }
}

/**
 * Fetch blocked dates as an array of YYYY-MM-DD strings for calendar disabling.
 * Only returns future/current blocks.
 */
export async function fetchMedicoBlockedDates(medicoId: string): Promise<{
  data: string[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("fecha_inicio, fecha_fin")
    .eq("medico_id", medicoId)
    .gte("fecha_fin", today)

  if (error) {
    return { data: null, error: error.message }
  }

  // Expand date ranges into individual date strings
  const blockedDates: string[] = []
  for (const block of data || []) {
    const start = new Date(block.fecha_inicio + "T00:00:00")
    const end = new Date(block.fecha_fin + "T00:00:00")
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      if (!blockedDates.includes(dateStr)) {
        blockedDates.push(dateStr)
      }
    }
  }

  return { data: blockedDates, error: null }
}
