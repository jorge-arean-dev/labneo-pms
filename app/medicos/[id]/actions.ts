"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Medico, MedicoHorario, MedicoBloqueoAgenda, ObraSocialOption } from "@/lib/types/entities"
import { MedicoParametrosAgenda, DEFAULT_PARAMETROS_AGENDA } from "@/lib/types"
import { deleteMedico as deleteMedicoAction } from "../actions"
import { getBaseUrl } from "@/lib/utils/get-base-url"

/**
 * Fetch a single médico by ID
 * Note: nombre/apellido come from usuarios_pms via user_id JOIN
 */
export async function fetchMedico(id: string) {
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
      usuarios_pms!inner(nombre, apellido, activated_at)
    `)
    .eq("id", id)
    .is("deleted_at", null) // Only fetch non-deleted médicos
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to include nombre/apellido at top level for backwards compatibility
  const medicoData = data as typeof data & {
    usuarios_pms: { nombre: string; apellido: string; activated_at: string | null }
  }

  const medico: Medico = {
    id: medicoData.id,
    email: medicoData.email,
    telefono: medicoData.telefono,
    matricula: medicoData.matricula,
    user_id: medicoData.user_id,
    deleted_at: medicoData.deleted_at,
    created_at: medicoData.created_at,
    updated_at: medicoData.updated_at,
    created_by: medicoData.created_by,
    updated_by: medicoData.updated_by,
    nombre: medicoData.usuarios_pms.nombre,
    apellido: medicoData.usuarios_pms.apellido,
    activated_at: medicoData.usuarios_pms.activated_at,
  }

  return { data: medico, error: null }
}

/**
 * Update a médico
 * Note: nombre/apellido are updated in usuarios_pms table (single source of truth)
 */
export async function updateMedico(
  id: string,
  formData: {
    nombre: string
    apellido: string
    matricula?: string | null
    telefono?: string | null
  }
) {
  const supabase = await createClient()

  // First, get the medico to find the user_id
  const { data: medico, error: fetchError } = await supabase
    .from("medicos")
    .select("user_id")
    .eq("id", id)
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
      // Note: email is stored in medicos but we don't update it here
      // as it's tied to the auth user
    })
    .eq("id", id)

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

  revalidatePath("/medicos/[id]", "page")
  revalidatePath("/medicos", "page")

  return { success: true, error: null }
}

// Note: deleteMedico is imported from ../actions to avoid duplication
// Wrapper function for backwards compatibility (required for "use server" files)
export async function deleteMedico(id: string) {
  return deleteMedicoAction(id)
}

/**
 * Reset médico password (sends password reset email)
 */
export async function resetMedicoPassword(id: string) {
  const supabase = await createClient()

  // Get médico email
  const { data: medico, error: fetchError } = await supabase
    .from("medicos")
    .select("email")
    .eq("id", id)
    .single()

  if (fetchError || !medico) {
    return { success: false, error: "No se pudo encontrar el médico" }
  }

  // Send password reset email
  const { error } = await supabase.auth.resetPasswordForEmail(medico.email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Re-send invitation to médico who hasn't completed setup
 */
export async function resendMedicoInvite(id: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Check if current user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  const { data: userRole } = await supabase.rpc("get_user_role")

  if (userRole !== "Administrador") {
    return { success: false, error: "No tiene permisos para reenviar invitaciones" }
  }

  // Get médico email
  const { data: medico, error: fetchError } = await supabase
    .from("medicos")
    .select("email")
    .eq("id", id)
    .single()

  if (fetchError || !medico) {
    return { success: false, error: "No se pudo encontrar el médico" }
  }

  // Re-send invitation using admin API
  const { error } = await adminClient.auth.admin.inviteUserByEmail(medico.email, {
    redirectTo: `${getBaseUrl()}/auth/set-password`,
  })

  if (error) {
    // Fallback: if user already exists in auth, send password reset instead
    if (error.message?.includes("already been registered")) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(medico.email, {
        redirectTo: `${getBaseUrl()}/auth/set-password`,
      })

      if (resetError) {
        console.error("Error sending password reset fallback:", resetError)
        return { success: false, error: resetError.message }
      }

      return { success: true, error: null }
    }

    console.error("Error resending invite email:", error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Change médico email address (Admin only)
 * Updates auth.users, usuarios_pms, and medicos tables.
 * Invalidates all sessions and sends a password setup email to the new address.
 */
export async function changeMedicoEmail(medicoId: string, newEmail: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  const { data: userRole } = await supabase.rpc("get_user_role")

  if (userRole !== "Administrador") {
    return { success: false, error: "No tiene permisos para cambiar el email" }
  }

  // 2. Get médico user_id
  const { data: medico, error: fetchError } = await supabase
    .from("medicos")
    .select("user_id, email")
    .eq("id", medicoId)
    .single()

  if (fetchError || !medico) {
    return { success: false, error: "No se pudo encontrar el médico" }
  }

  const normalizedEmail = newEmail.trim().toLowerCase()

  // 3. Check duplicate email in usuarios_pms (exclude current user)
  const { data: existingUser } = await supabase
    .from("usuarios_pms")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", medico.user_id)
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: "Este email ya está registrado en el sistema" }
  }

  // 4. Also check medicos table for soft-deleted records with same email
  const { data: existingMedico } = await supabase
    .from("medicos")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", medicoId)
    .maybeSingle()

  if (existingMedico) {
    return { success: false, error: "Este email ya está registrado en el sistema" }
  }

  // 5. Update auth user email (with auto-confirm to skip confirmation flow)
  const { error: emailError } = await adminClient.auth.admin.updateUserById(
    medico.user_id,
    {
      email: normalizedEmail,
      email_confirm: true,
    }
  )

  if (emailError) {
    console.error("Error updating auth user email:", emailError)
    return { success: false, error: "Error al actualizar el email en el sistema de autenticación" }
  }

  // 5b. Invalidate sessions by setting a random password (forces logout)
  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    medico.user_id,
    {
      password: crypto.randomUUID(),
    }
  )

  if (passwordError) {
    console.error("Error invalidating sessions:", passwordError)
    // Non-fatal: email was changed but sessions weren't invalidated
  }

  // 6. Update usuarios_pms email + reset activation
  const { error: usuarioError } = await supabase
    .from("usuarios_pms")
    .update({
      email: normalizedEmail,
      activated_at: null,
    })
    .eq("id", medico.user_id)

  if (usuarioError) {
    console.error("Error updating usuarios_pms email:", usuarioError)
    // Best-effort revert auth email
    await adminClient.auth.admin.updateUserById(medico.user_id, { email: medico.email })
    return { success: false, error: "Error al actualizar el email del usuario" }
  }

  // 7. Update medicos email
  const { error: medicoError } = await supabase
    .from("medicos")
    .update({ email: normalizedEmail })
    .eq("id", medicoId)

  if (medicoError) {
    console.error("Error updating medicos email:", medicoError)
    // Best-effort revert
    await adminClient.auth.admin.updateUserById(medico.user_id, { email: medico.email })
    await supabase
      .from("usuarios_pms")
      .update({ email: medico.email, activated_at: new Date().toISOString() })
      .eq("id", medico.user_id)
    return { success: false, error: "Error al actualizar el email del médico" }
  }

  // 8. Send password setup email to new address
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${getBaseUrl()}/auth/set-password`,
  })

  if (resetError) {
    console.error("Error sending password reset to new email:", resetError)
    // Non-fatal: email was changed but invite didn't send. Admin can re-send manually.
  }

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

  // Only insert if there are schedules to insert
  if (schedulesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("medicos_horarios")
      .insert(schedulesToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath("/medicos/[id]", "page")

  return { success: true, error: null }
}

/**
 * Fetch all active obras sociales (for multi-select dropdown)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obrasSociales = data.map((item: any) => {
    const obraSocial = Array.isArray(item.obras_sociales) ? item.obras_sociales[0] : item.obras_sociales
    return {
      id: obraSocial?.id || '',
      nombre: obraSocial?.nombre || '',
    }
  }) as ObraSocialOption[]

  return { data: obrasSociales, error: null }
}

/**
 * Update obras sociales for a médico
 * Hard deletes removed relationships and creates new ones
 */
export async function updateMedicoObrasSociales(
  medicoId: string,
  obrasSocialesIds: string[]
) {
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
  const toDelete = existingRelations?.filter(
    (r) => !obrasSocialesIds.includes(r.obra_social_id)
  )
  const toCreate = obrasSocialesIds.filter((id) => !existingIds.includes(id))

  // 3. Delete removed relationships (hard delete)
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

  // 4. Create new relationships (MVP: only medico_id, obra_social_id, audit fields)
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

  revalidatePath("/medicos/[id]", "page")

  return { success: true, error: null }
}

// ============================================================================
// BLOQUEOS DE AGENDA
// ============================================================================

/**
 * Check for appointment conflicts in a date range for a doctor
 */
export async function checkBloqueoConflicts(
  medicoId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<{
  hasConflicts: boolean
  consultas: Array<{
    id: string
    fecha_hora: string
    paciente_nombre: string
    paciente_apellido: string
  }>
  error: string | null
}> {
  const supabase = await createClient()

  // Get excluded estado IDs (cancelada, ausente)
  const { data: estadosData, error: estadosError } = await supabase
    .from("estados_consulta")
    .select("id")
    .in("codigo", ["cancelada", "ausente"])

  if (estadosError) {
    return { hasConflicts: false, consultas: [], error: estadosError.message }
  }

  const excludedEstadoIds = estadosData?.map(e => e.id) || []

  // Query consultas in the date range
  let query = supabase
    .from("consultas")
    .select(`
      id,
      fecha_hora,
      pacientes!inner(nombre, apellido)
    `)
    .eq("medico_id", medicoId)
    .gte("fecha_hora", `${fechaInicio}T00:00:00`)
    .lte("fecha_hora", `${fechaFin}T23:59:59`)

  if (excludedEstadoIds.length > 0) {
    query = query.not("estado_id", "in", `(${excludedEstadoIds.join(",")})`)
  }

  const { data, error } = await query.order("fecha_hora", { ascending: true })

  if (error) {
    return { hasConflicts: false, consultas: [], error: error.message }
  }

  const consultas = (data || []).map((c: Record<string, unknown>) => {
    const paciente = c.pacientes as { nombre: string; apellido: string } | null
    return {
      id: c.id as string,
      fecha_hora: c.fecha_hora as string,
      paciente_nombre: paciente?.nombre || "",
      paciente_apellido: paciente?.apellido || "",
    }
  })

  return {
    hasConflicts: consultas.length > 0,
    consultas,
    error: null,
  }
}

/**
 * Check for appointment conflicts across ALL active doctors
 * Used by the "Bloqueo General" feature
 */
export async function checkBloqueoGeneralConflicts(
  fechaInicio: string,
  fechaFin: string
): Promise<{
  hasConflicts: boolean
  conflictsByMedico: Array<{
    medicoId: string
    medicoNombre: string
    medicoApellido: string
    consultas: Array<{
      id: string
      fecha_hora: string
      paciente_nombre: string
      paciente_apellido: string
    }>
  }>
  error: string | null
}> {
  const supabase = await createClient()

  // Get excluded estado IDs
  const { data: estadosData, error: estadosError } = await supabase
    .from("estados_consulta")
    .select("id")
    .in("codigo", ["cancelada", "ausente"])

  if (estadosError) {
    return { hasConflicts: false, conflictsByMedico: [], error: estadosError.message }
  }

  const excludedEstadoIds = estadosData?.map(e => e.id) || []

  // Query all consultas in range across all doctors
  let query = supabase
    .from("consultas")
    .select(`
      id,
      fecha_hora,
      medico_id,
      pacientes!inner(nombre, apellido),
      medicos!inner(
        id,
        deleted_at,
        user_id,
        usuarios_pms:user_id(nombre, apellido)
      )
    `)
    .is("medicos.deleted_at", null)
    .gte("fecha_hora", `${fechaInicio}T00:00:00`)
    .lte("fecha_hora", `${fechaFin}T23:59:59`)

  if (excludedEstadoIds.length > 0) {
    query = query.not("estado_id", "in", `(${excludedEstadoIds.join(",")})`)
  }

  const { data, error } = await query.order("fecha_hora", { ascending: true })

  if (error) {
    return { hasConflicts: false, conflictsByMedico: [], error: error.message }
  }

  // Group by doctor
  const medicoMap = new Map<string, {
    medicoId: string
    medicoNombre: string
    medicoApellido: string
    consultas: Array<{
      id: string
      fecha_hora: string
      paciente_nombre: string
      paciente_apellido: string
    }>
  }>()

  for (const c of data || []) {
    const medicoId = c.medico_id as string
    const medico = c.medicos as unknown as { id: string; user_id: string; usuarios_pms: { nombre: string; apellido: string } | null } | null
    const paciente = c.pacientes as unknown as { nombre: string; apellido: string } | null
    const medicoUsuario = medico?.usuarios_pms

    if (!medicoMap.has(medicoId)) {
      medicoMap.set(medicoId, {
        medicoId,
        medicoNombre: medicoUsuario?.nombre || "",
        medicoApellido: medicoUsuario?.apellido || "",
        consultas: [],
      })
    }

    medicoMap.get(medicoId)!.consultas.push({
      id: c.id as string,
      fecha_hora: c.fecha_hora as string,
      paciente_nombre: paciente?.nombre || "",
      paciente_apellido: paciente?.apellido || "",
    })
  }

  const conflictsByMedico = Array.from(medicoMap.values())

  return {
    hasConflicts: conflictsByMedico.length > 0,
    conflictsByMedico,
    error: null,
  }
}

/**
 * Create a bloqueo de agenda for a single doctor
 */
export async function createBloqueoAgenda(
  medicoId: string,
  data: {
    fecha_inicio: string
    fecha_fin: string
    motivo?: string
    origen?: "individual" | "general"
  }
): Promise<{ success: boolean; error: string | null; data: MedicoBloqueoAgenda | null }> {
  const supabase = await createClient()

  // Server-side conflict recheck
  const { hasConflicts, consultas } = await checkBloqueoConflicts(
    medicoId,
    data.fecha_inicio,
    data.fecha_fin
  )

  if (hasConflicts) {
    const count = consultas.length
    return {
      success: false,
      error: `No se puede crear el bloqueo: hay ${count} consulta${count > 1 ? "s" : ""} programada${count > 1 ? "s" : ""} en este período.`,
      data: null,
    }
  }

  // Check for overlapping blocks
  const { data: overlapping, error: overlapError } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("id, fecha_inicio, fecha_fin")
    .eq("medico_id", medicoId)
    .lte("fecha_inicio", data.fecha_fin)
    .gte("fecha_fin", data.fecha_inicio)
    .limit(1)

  if (overlapError) {
    return { success: false, error: overlapError.message, data: null }
  }

  if (overlapping && overlapping.length > 0) {
    return {
      success: false,
      error: "Ya existe un bloqueo que se superpone con este período.",
      data: null,
    }
  }

  // Insert the block
  const { data: newBlock, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .insert({
      medico_id: medicoId,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      motivo: data.motivo || null,
      origen: data.origen || "individual",
    })
    .select("*")
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  revalidatePath("/medicos/[id]", "page")
  revalidatePath("/bloqueos-agenda", "page")
  revalidatePath("/configuracion", "page")

  return { success: true, error: null, data: newBlock as MedicoBloqueoAgenda }
}

/**
 * Create a general bloqueo for ALL active doctors
 */
export async function createBloqueoGeneral(data: {
  fecha_inicio: string
  fecha_fin: string
  motivo?: string
}): Promise<{
  success: boolean
  error: string | null
  createdCount: number
}> {
  const supabase = await createClient()

  // Fetch all active doctors
  const { data: medicos, error: medicosError } = await supabase
    .from("medicos")
    .select("id")
    .is("deleted_at", null)

  if (medicosError) {
    return { success: false, error: medicosError.message, createdCount: 0 }
  }

  if (!medicos || medicos.length === 0) {
    return { success: false, error: "No hay médicos activos.", createdCount: 0 }
  }

  // Build rows to insert, skipping doctors with overlapping blocks
  const rows = []
  for (const medico of medicos) {
    const { data: overlapping } = await supabase
      .from("medicos_bloqueos_agenda")
      .select("id")
      .eq("medico_id", medico.id)
      .lte("fecha_inicio", data.fecha_fin)
      .gte("fecha_fin", data.fecha_inicio)
      .limit(1)

    if (!overlapping || overlapping.length === 0) {
      rows.push({
        medico_id: medico.id,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        motivo: data.motivo || null,
        origen: "general" as const,
      })
    }
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: "Todos los médicos ya tienen bloqueos que se superponen con este período.",
      createdCount: 0,
    }
  }

  const { error } = await supabase
    .from("medicos_bloqueos_agenda")
    .insert(rows)

  if (error) {
    return { success: false, error: error.message, createdCount: 0 }
  }

  revalidatePath("/medicos/[id]", "page")
  revalidatePath("/bloqueos-agenda", "page")
  revalidatePath("/configuracion", "page")

  return { success: true, error: null, createdCount: rows.length }
}

/**
 * Delete a bloqueo de agenda
 */
export async function deleteBloqueoAgenda(
  bloqueoId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Verify the block exists and is a future block
  const { data: block, error: fetchError } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("id, fecha_fin")
    .eq("id", bloqueoId)
    .single()

  if (fetchError || !block) {
    return { success: false, error: "Bloqueo no encontrado." }
  }

  const today = new Date().toISOString().split("T")[0]
  if (block.fecha_fin < today) {
    return { success: false, error: "No se puede eliminar un bloqueo pasado." }
  }

  const { error } = await supabase
    .from("medicos_bloqueos_agenda")
    .delete()
    .eq("id", bloqueoId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/medicos/[id]", "page")
  revalidatePath("/bloqueos-agenda", "page")
  revalidatePath("/configuracion", "page")

  return { success: true, error: null }
}
