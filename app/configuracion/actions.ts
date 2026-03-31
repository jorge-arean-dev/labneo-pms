"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Medico, MedicoHorario, ObraSocialOption, UsuarioPms } from "@/lib/types/entities"
import { MedicoParametrosAgenda, DEFAULT_PARAMETROS_AGENDA } from "@/lib/types"
import { getBaseUrl } from "@/lib/utils/get-base-url"

// ============================================================================
// Usuario PMS Actions (for Recepcionista & Admin)
// ============================================================================

/**
 * Fetch usuario_pms data by user ID
 */
export async function fetchUsuarioPms(userId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data, error } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email, rol_id, foto_perfil_url, created_at, updated_at")
    .eq("id", userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Fetch last_sign_in_at from auth.users using admin API
  let lastSignInAt: string | null = null
  try {
    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId)
    if (!userError && user) {
      lastSignInAt = user.last_sign_in_at || null
    }
  } catch (err) {
    console.error(`Error fetching auth user for usuario ${userId}:`, err)
  }

  return {
    data: {
      ...data,
      last_sign_in_at: lastSignInAt,
    } as UsuarioPms,
    error: null,
  }
}

/**
 * Update usuario_pms data (nombre, apellido only - email is read-only)
 */
export async function updateUsuarioPms(userId: string, formData: { nombre: string; apellido: string }) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("usuarios_pms")
    .update({
      nombre: formData.nombre,
      apellido: formData.apellido,
    })
    .eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/configuracion", "page")

  return { success: true, error: null }
}

/**
 * Self password reset - sends email to current user's email
 */
export async function resetOwnPassword(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// ============================================================================
// Médico Actions (reusing from /medicos/[id]/actions.ts patterns)
// ============================================================================

/**
 * Fetch médico by user_id (not by medico.id)
 * Note: nombre/apellido come from usuarios_pms via user_id JOIN
 */
export async function fetchMedicoByUserId(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos")
    .select(`
      id,
      email,
      telefono,
      matricula,
      user_id,
      deleted_at,
      created_at,
      updated_at,
      created_by,
      updated_by,
      usuarios_pms!inner(nombre, apellido)
    `)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to include nombre/apellido at top level for backwards compatibility
  const dataWithUsuario = data as typeof data & { usuarios_pms: { nombre: string; apellido: string } }
  const medico: Medico = {
    id: data.id,
    email: data.email,
    telefono: data.telefono,
    matricula: data.matricula,
    user_id: data.user_id,
    deleted_at: data.deleted_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: data.created_by,
    updated_by: data.updated_by,
    nombre: dataWithUsuario.usuarios_pms.nombre,
    apellido: dataWithUsuario.usuarios_pms.apellido,
  }

  return { data: medico, error: null }
}

/**
 * Update médico profile (self-edit)
 * Note: nombre/apellido are updated in usuarios_pms table (single source of truth)
 */
export async function updateMedicoProfile(
  medicoId: string,
  formData: {
    nombre: string
    apellido: string
    matricula: string | null
    telefono: string | null
  }
) {
  const supabase = await createClient()

  // First, get the medico to find the user_id
  const { data: medico, error: fetchError } = await supabase
    .from("medicos")
    .select("user_id")
    .eq("id", medicoId)
    .single()

  if (fetchError || !medico) {
    return { success: false, error: "No se pudo encontrar el médico" }
  }

  // Update medicos table (only medico-specific fields)
  const { error: medicoError } = await supabase
    .from("medicos")
    .update({
      matricula: formData.matricula || null,
      telefono: formData.telefono || null,
      // Note: email is NOT updated here - it's read-only in the form
    })
    .eq("id", medicoId)

  if (medicoError) {
    return { success: false, error: medicoError.message }
  }

  // Update usuarios_pms table for nombre/apellido
  const { error: usuarioError } = await supabase
    .from("usuarios_pms")
    .update({
      nombre: formData.nombre,
      apellido: formData.apellido,
    })
    .eq("id", medico.user_id)

  if (usuarioError) {
    return { success: false, error: usuarioError.message }
  }

  revalidatePath("/configuracion", "page")
  revalidatePath("/medicos/[id]", "page")
  revalidatePath("/medicos", "page")

  return { success: true, error: null }
}

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
 * Update horarios for a médico
 * Replaces all existing schedules with new ones (both active and inactive)
 * Supports multiple turnos per day (max 2)
 * Note: duracion_consulta and duracion_buffer are stored in medicos_parametros_agenda
 */
export async function updateMedicoHorarios(
  medicoId: string,
  horariosData: {
    horarios: Array<{
      dia_semana: number
      hora_inicio: string
      hora_fin: string
      activo: boolean
    }>
  }
) {
  const supabase = await createClient()

  // Get current user for audit fields
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  // 1. Delete all existing schedules for this médico
  const { error: deleteError } = await supabase
    .from("medicos_horarios")
    .delete()
    .eq("medico_id", medicoId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // 2. Insert all schedules (both active and inactive)
  // This preserves inactive turnos in the database
  const schedulesToInsert = horariosData.horarios.map((h) => ({
    medico_id: medicoId,
    dia_semana: h.dia_semana,
    hora_inicio: h.hora_inicio,
    hora_fin: h.hora_fin,
    activo: h.activo,
    created_by: user.id,
    updated_by: user.id,
  }))

  if (schedulesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("medicos_horarios")
      .insert(schedulesToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath("/configuracion", "page")
  revalidatePath("/medicos/[id]", "page")

  return { success: true, error: null }
}

/**
 * Fetch all active obras sociales
 */
export async function fetchAllObrasSociales() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("obras_sociales")
    .select("id, nombre")
    .eq("is_active", true)
    .order("nombre", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as ObraSocialOption[], error: null }
}

/**
 * Fetch obras sociales linked to a médico
 */
export async function fetchMedicoObrasSociales(medicoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_obras_sociales")
    .select("obra_social_id, obras_sociales!inner(id, nombre)")
    .eq("medico_id", medicoId)
    .order("obras_sociales(nombre)", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to ObraSocialOption[]
  // Note: Supabase returns obras_sociales as an array even with !inner
  const obrasSociales = data.map((item) => {
    const obraSocial = Array.isArray(item.obras_sociales)
      ? item.obras_sociales[0]
      : item.obras_sociales
    return {
      id: (obraSocial as { id: string; nombre: string }).id,
      nombre: (obraSocial as { id: string; nombre: string }).nombre,
    }
  }) as ObraSocialOption[]

  return { data: obrasSociales, error: null }
}

/**
 * Update obras sociales for a médico
 */
export async function updateMedicoObrasSociales(medicoId: string, obrasSocialesIds: string[]) {
  const supabase = await createClient()

  // Get current user for audit fields
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  // 1. Fetch existing relationships
  const { data: existingRelations, error: fetchError } = await supabase
    .from("medicos_obras_sociales")
    .select("id, obra_social_id")
    .eq("medico_id", medicoId)

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const existingIds = existingRelations?.map((r) => r.obra_social_id) || []

  // 2. Determine which to delete and which to create
  const toDelete = existingRelations?.filter((r) => !obrasSocialesIds.includes(r.obra_social_id))
  const toCreate = obrasSocialesIds.filter((id) => !existingIds.includes(id))

  // 3. Delete removed relationships
  if (toDelete && toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("medicos_obras_sociales")
      .delete()
      .in(
        "id",
        toDelete.map((r) => r.id)
      )

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }
  }

  // 4. Create new relationships
  if (toCreate.length > 0) {
    const newRelations = toCreate.map((obraSocialId) => ({
      medico_id: medicoId,
      obra_social_id: obraSocialId,
      created_by: user.id,
      updated_by: user.id,
    }))

    const { error: insertError } = await supabase
      .from("medicos_obras_sociales")
      .insert(newRelations)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath("/configuracion", "page")
  revalidatePath("/medicos/[id]", "page")

  return { success: true, error: null }
}

// ============================================================================
// MEDICOS_PARAMETROS_AGENDA ACTIONS
// ============================================================================

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

/**
 * Update or create scheduling parameters for a médico
 * Uses upsert to handle both create and update cases
 */
export async function updateMedicoParametrosAgenda(
  medicoId: string,
  parametrosData: {
    duracion_consulta: number
    duracion_buffer: number
    max_consultas_concurrentes: number
  }
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user for audit fields
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  // Check if record exists
  const { data: existing } = await supabase
    .from("medicos_parametros_agenda")
    .select("id")
    .eq("medico_id", medicoId)
    .single()

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("medicos_parametros_agenda")
      .update({
        duracion_consulta: parametrosData.duracion_consulta,
        duracion_buffer: parametrosData.duracion_buffer,
        max_consultas_concurrentes: parametrosData.max_consultas_concurrentes,
        updated_by: user.id,
      })
      .eq("medico_id", medicoId)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from("medicos_parametros_agenda")
      .insert({
        medico_id: medicoId,
        duracion_consulta: parametrosData.duracion_consulta,
        duracion_buffer: parametrosData.duracion_buffer,
        max_consultas_concurrentes: parametrosData.max_consultas_concurrentes,
        created_by: user.id,
        updated_by: user.id,
      })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath("/configuracion", "page")
  revalidatePath("/medicos/[id]", "page")

  return { success: true, error: null }
}
