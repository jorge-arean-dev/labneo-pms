"use server"

/**
 * Shared server actions for médico horarios and parametros
 * These are read-only operations used by both /medicos/[id] and /configuracion routes
 */

import { createClient } from "@/lib/supabase/server"
import { MedicoHorario } from "@/lib/types/entities"
import { MedicoParametrosAgenda, DEFAULT_PARAMETROS_AGENDA } from "@/lib/types"

/**
 * Fetch horarios for a médico
 */
export async function fetchMedicoHorarios(medicoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_horarios")
    .select("*")
    .eq("medico_id", medicoId)
    .order("dia_semana", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as MedicoHorario[], error: null }
}

/**
 * Fetch scheduling parameters for a médico
 * Returns default values if no record exists
 */
export async function fetchMedicoParametrosAgenda(medicoId: string): Promise<{
  data: Pick<MedicoParametrosAgenda, 'duracion_consulta' | 'duracion_buffer' | 'max_consultas_concurrentes'> | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_parametros_agenda")
    .select("duracion_consulta, duracion_buffer, max_consultas_concurrentes")
    .eq("medico_id", medicoId)
    .single()

  if (error) {
    // If no record found, return defaults (not an error condition)
    if (error.code === "PGRST116") {
      return { data: DEFAULT_PARAMETROS_AGENDA, error: null }
    }
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
