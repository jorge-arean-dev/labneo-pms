"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  Consulta,
  MedicoOption,
  EstadoOption,
  PacienteSearchResult,
  ConsultaPaginatedFilters,
  ConsultaPaginatedResult,
} from "./types"
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns"
import { TipoConsulta } from "@/lib/constants/consulta-types"
import { sendConfirmationEmail, sendCancellationEmail } from "@/lib/email"
import {
  MedicoParametrosAgenda,
  MedicoHorario,
  AvailableSlotsResult,
  DEFAULT_PARAMETROS_AGENDA,
} from "@/lib/types"
import {
  calculateAvailableSlots,
  buildAvailableSlotsResult,
  getDayOfWeek,
  parseDateString,
  formatDateToString,
} from "@/lib/utils/slot-calculator"
import { formatTimeInAppTimezone } from "@/lib/utils/timezone"

/**
 * Fetch all consultas with joined patient, doctor, and estado data
 * Sorted by most recent fecha_hora first
 */
export async function fetchConsultas(): Promise<{
  data: Consulta[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("consultas")
    .select(`
      id,
      paciente_id,
      medico_id,
      fecha_hora,
      estado_id,
      tipo_consulta,
      motivo,
      informe,
      diagnostico,
      tratamiento,
      receta,
      notas,
      paciente_llego_timestamp,
      created_at,
      updated_at,
      pacientes!inner (
        nombre,
        apellido,
        dni,
        email,
        fecha_nacimiento,
        plan,
        numero_afiliado,
        obra_social:obras_sociales(id, nombre)
      ),
      medicos!inner (
        user_id,
        usuarios_pms!inner (
          nombre,
          apellido
        )
      ),
      estados_consulta!inner (
        nombre,
        codigo
      )
    `)
    .order("fecha_hora", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform nested data to flat structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultas: Consulta[] = data.map((consulta: any) => ({
    id: consulta.id,
    paciente_id: consulta.paciente_id,
    medico_id: consulta.medico_id,
    fecha_hora: consulta.fecha_hora,
    estado_id: consulta.estado_id,
    tipo_consulta: consulta.tipo_consulta,
    motivo: consulta.motivo,
    informe: consulta.informe,
    diagnostico: consulta.diagnostico,
    tratamiento: consulta.tratamiento,
    receta: consulta.receta,
    notas: consulta.notas,
    paciente_llego_timestamp: consulta.paciente_llego_timestamp,
    created_at: consulta.created_at,
    updated_at: consulta.updated_at,
    paciente_nombre: consulta.pacientes.nombre,
    paciente_apellido: consulta.pacientes.apellido,
    paciente_dni: consulta.pacientes.dni,
    paciente_email: consulta.pacientes.email,
    paciente_fecha_nacimiento: consulta.pacientes.fecha_nacimiento,
    paciente_plan: consulta.pacientes.plan,
    paciente_numero_afiliado: consulta.pacientes.numero_afiliado,
    paciente_obra_social: consulta.pacientes.obra_social,
    medico_nombre: consulta.medicos.usuarios_pms.nombre,
    medico_apellido: consulta.medicos.usuarios_pms.apellido,
    estado_nombre: consulta.estados_consulta.nombre,
    estado_codigo: consulta.estados_consulta.codigo,
  }))

  return { data: consultas, error: null }
}

/**
 * Fetch all active médicos for filter dropdown
 * Only returns médicos that are not soft-deleted
 * Gets nombre/apellido from usuarios_pms via user_id JOIN
 */
export async function fetchMedicos(): Promise<{
  data: MedicoOption[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos")
    .select(`
      id,
      deleted_at,
      user_id,
      usuarios_pms!inner (
        nombre,
        apellido
      )
    `)
    .is("deleted_at", null)
    .order("usuarios_pms(apellido)")
    .order("usuarios_pms(nombre)")

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to MedicoOption format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const medicos: MedicoOption[] = (data || []).map((m: any) => {
    const usuariosPms = Array.isArray(m.usuarios_pms) ? m.usuarios_pms[0] : m.usuarios_pms
    return {
      id: m.id,
      nombre: usuariosPms?.nombre || '',
      apellido: usuariosPms?.apellido || '',
      deleted_at: m.deleted_at,
    }
  })

  return { data: medicos, error: null }
}

/**
 * Fetch all active estados for filter dropdown
 */
export async function fetchEstados(): Promise<{
  data: EstadoOption[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("estados_consulta")
    .select("id, codigo, nombre")
    .eq("activo", true)
    .order("orden")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Fetch consultas with server-side pagination and filtering
 * More efficient for large datasets (25K+ records)
 */
export async function fetchConsultasPaginated(
  page: number = 1,
  limit: number = 10,
  filters: ConsultaPaginatedFilters = {}
): Promise<{ data: ConsultaPaginatedResult | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      searchTerm,
      medicosIds,
      estadosIds,
      dateFilter = "hoy",
      fechaDesde,
      fechaHasta,
      onlyArrived,
      sortBy = "fecha_hora_asc",
    } = filters

    // Calculate offset
    const offset = (page - 1) * limit

    // Step 1: If searchTerm is provided, find matching paciente IDs first
    let matchingPacienteIds: string[] | null = null
    if (searchTerm && searchTerm.length >= 2) {
      const { data: pacientes, error: pacientesError } = await supabase
        .from("pacientes")
        .select("id")
        .or(`dni.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`)
        .limit(1000) // Reasonable limit for search results

      if (pacientesError) {
        console.error("Error searching pacientes:", pacientesError)
        return { data: null, error: pacientesError.message }
      }

      matchingPacienteIds = pacientes?.map(p => p.id) || []

      // If no pacientes match, return empty result
      if (matchingPacienteIds.length === 0) {
        return {
          data: {
            data: [],
            totalCount: 0,
            page,
            limit,
            totalPages: 0,
          },
          error: null,
        }
      }
    }

    // Step 2: Build the main query
    let query = supabase
      .from("consultas")
      .select(`
        id,
        paciente_id,
        medico_id,
        fecha_hora,
        estado_id,
        tipo_consulta,
        motivo,
        informe,
        diagnostico,
        tratamiento,
        receta,
        notas,
        paciente_llego_timestamp,
        created_at,
        updated_at,
        pacientes!inner (
          nombre,
          apellido,
          dni,
          email,
          fecha_nacimiento,
          plan,
          numero_afiliado,
          obra_social:obras_sociales(id, nombre)
        ),
        medicos!inner (
          user_id,
          usuarios_pms!inner (
            nombre,
            apellido
          )
        ),
        estados_consulta!inner (
          nombre,
          codigo
        )
      `, { count: "exact" })

    // Apply paciente filter (from search)
    if (matchingPacienteIds !== null) {
      query = query.in("paciente_id", matchingPacienteIds)
    }

    // Apply medicos filter
    if (medicosIds && medicosIds.length > 0) {
      query = query.in("medico_id", medicosIds)
    }

    // Apply estados filter
    if (estadosIds && estadosIds.length > 0) {
      query = query.in("estado_id", estadosIds)
    }

    // Apply date filter
    const now = new Date()
    if (dateFilter === "hoy") {
      const todayStart = startOfDay(now).toISOString()
      const todayEnd = endOfDay(now).toISOString()
      query = query.gte("fecha_hora", todayStart).lte("fecha_hora", todayEnd)
    } else if (dateFilter === "semana") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
      query = query.gte("fecha_hora", weekStart).lte("fecha_hora", weekEnd)
    } else if (dateFilter === "rango") {
      if (fechaDesde) {
        const fromDate = startOfDay(new Date(fechaDesde)).toISOString()
        query = query.gte("fecha_hora", fromDate)
      }
      if (fechaHasta) {
        const toDate = endOfDay(new Date(fechaHasta)).toISOString()
        query = query.lte("fecha_hora", toDate)
      }
    }
    // dateFilter === "todas" means no date filter

    // Filter by patient arrival (En Consultorio toggle)
    if (onlyArrived) {
      query = query.not("paciente_llego_timestamp", "is", null)
    }

    // Apply ordering and pagination
    // Sort direction must match the client-selected sort option so pagination returns the correct rows
    // Secondary sort by id ensures deterministic order for ties (e.g. same fecha_hora)
    if (sortBy === "llegada_desc" || sortBy === "llegada_asc") {
      const ascending = sortBy === "llegada_asc"
      query = query
        .order("paciente_llego_timestamp", { ascending, nullsFirst: false })
        .order("id", { ascending: true })
    } else {
      const ascending = sortBy === "fecha_hora_asc"
      query = query
        .order("fecha_hora", { ascending })
        .order("id", { ascending: true })
    }
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching consultas paginated:", error)
      return { data: null, error: error.message }
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Transform nested data to flat structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consultas: Consulta[] = (data || []).map((consulta: any) => ({
      id: consulta.id,
      paciente_id: consulta.paciente_id,
      medico_id: consulta.medico_id,
      fecha_hora: consulta.fecha_hora,
      estado_id: consulta.estado_id,
      tipo_consulta: consulta.tipo_consulta,
      motivo: consulta.motivo,
      informe: consulta.informe,
      diagnostico: consulta.diagnostico,
      tratamiento: consulta.tratamiento,
      receta: consulta.receta,
      notas: consulta.notas,
      paciente_llego_timestamp: consulta.paciente_llego_timestamp,
      created_at: consulta.created_at,
      updated_at: consulta.updated_at,
      paciente_nombre: consulta.pacientes.nombre,
      paciente_apellido: consulta.pacientes.apellido,
      paciente_dni: consulta.pacientes.dni,
      paciente_email: consulta.pacientes.email,
      paciente_fecha_nacimiento: consulta.pacientes.fecha_nacimiento,
      paciente_plan: consulta.pacientes.plan,
      paciente_numero_afiliado: consulta.pacientes.numero_afiliado,
      paciente_obra_social: consulta.pacientes.obra_social,
      medico_nombre: consulta.medicos.usuarios_pms.nombre,
      medico_apellido: consulta.medicos.usuarios_pms.apellido,
      estado_nombre: consulta.estados_consulta.nombre,
      estado_codigo: consulta.estados_consulta.codigo,
    }))

    return {
      data: {
        data: consultas,
        totalCount,
        page,
        limit,
        totalPages,
      },
      error: null,
    }
  } catch (error) {
    console.error("Unexpected error fetching consultas paginated:", error)
    return { data: null, error: "Error inesperado al cargar las consultas" }
  }
}

/**
 * Search pacientes by DNI or Nombre + Apellido
 * Minimum 3 characters required for search
 */
export async function searchPacientes(searchTerm: string): Promise<{
  data: PacienteSearchResult[] | null
  error: string | null
}> {
  // Require minimum 3 characters
  if (searchTerm.length < 3) {
    return { data: [], error: null }
  }

  const supabase = await createClient()

  // Search across DNI, nombre, and apellido using ILIKE for case-insensitive partial match
  const { data, error } = await supabase
    .from("pacientes")
    .select("id, dni, nombre, apellido")
    .or(`dni.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`)
    .order("apellido")
    .order("nombre")
    .limit(20) // Limit results to prevent overwhelming UI

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Create a new consulta
 * Validates slot availability before inserting
 */
export async function createConsulta(data: {
  paciente_id: string
  medico_id: string
  tipo_consulta: TipoConsulta
  fecha_hora: string // ISO datetime string
  motivo?: string // Optional reason for the consultation
}): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Extract date and time from fecha_hora for validation
  // Uses application timezone for consistent behavior across environments
  const appointmentDate = new Date(data.fecha_hora)
  const dateStr = formatDateToString(appointmentDate)
  const timeStr = formatTimeInAppTimezone(appointmentDate)

  // Validate slot availability before inserting
  const { data: slotsResult, error: slotsError } = await getAvailableSlotsForDate(
    data.medico_id,
    dateStr
  )

  if (slotsError) {
    return { success: false, error: `Error al verificar disponibilidad: ${slotsError}` }
  }

  if (!slotsResult || slotsResult.slots.length === 0) {
    return { success: false, error: "El médico no tiene horarios disponibles para esta fecha" }
  }

  // Find the slot for the selected time
  const selectedSlot = slotsResult.slots.find(slot => slot.time === timeStr)

  if (!selectedSlot) {
    return { success: false, error: `El horario ${timeStr} no está disponible para este médico` }
  }

  if (!selectedSlot.isAvailable) {
    return {
      success: false,
      error: `El horario ${timeStr} ya tiene el máximo de consultas permitidas (${selectedSlot.scheduledCount}/${selectedSlot.maxConcurrent})`
    }
  }

  // Insert consulta (estado_id defaults to "programada" via database function)
  const { data: insertedConsulta, error } = await supabase
    .from("consultas")
    .insert({
      paciente_id: data.paciente_id,
      medico_id: data.medico_id,
      tipo_consulta: data.tipo_consulta,
      fecha_hora: data.fecha_hora,
      ...(data.motivo ? { motivo: data.motivo } : {}),
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Send confirmation email (fire and forget - don't fail if email fails)
  sendConfirmationEmail({
    consultaId: insertedConsulta.id,
    pacienteId: data.paciente_id,
    medicoId: data.medico_id,
    fechaHora: data.fecha_hora,
  }).catch((err) => {
    console.error("Error sending confirmation email:", err)
  })

  // Trigger revalidation
  revalidatePath("/consultas")

  return { success: true, error: null }
}

/**
 * Toggle patient arrival status (registrar/desmarcar llegada)
 */
export async function togglePacienteLlegada(
  consultaId: string,
  currentTimestamp: string | null
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Toggle: if currently set, clear it; if null, set to now
  const newTimestamp = currentTimestamp ? null : new Date().toISOString()

  const { error } = await supabase
    .from("consultas")
    .update({ paciente_llego_timestamp: newTimestamp })
    .eq("id", consultaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  return { success: true, error: null }
}

/**
 * Iniciar consulta - Change estado from "programada" to "en_curso"
 */
export async function iniciarConsulta(
  consultaId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Get the "en_curso" estado ID
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "en_curso")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "No se pudo encontrar el estado 'en_curso'" }
  }

  // Update consulta estado
  const { error } = await supabase
    .from("consultas")
    .update({ estado_id: estadoData.id })
    .eq("id", consultaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)
  return { success: true, error: null }
}

/**
 * Marcar consulta como ausente - Change estado to "ausente"
 */
export async function marcarComoAusente(
  consultaId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Get the "ausente" estado ID
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "ausente")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "No se pudo encontrar el estado 'ausente'" }
  }

  // Update consulta estado
  const { error } = await supabase
    .from("consultas")
    .update({ estado_id: estadoData.id })
    .eq("id", consultaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)
  return { success: true, error: null }
}

/**
 * Cancelar consulta - Change estado to "cancelada"
 * @param consultaId - The ID of the consulta to cancel
 * @param sendNotification - Whether to send cancellation email to the patient (default: true)
 */
export async function cancelarConsulta(
  consultaId: string,
  sendNotification: boolean = true
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Fetch consulta details for email before updating
  const { data: consultaData, error: consultaFetchError } = await supabase
    .from("consultas")
    .select("paciente_id, medico_id, fecha_hora, motivo")
    .eq("id", consultaId)
    .single()

  if (consultaFetchError || !consultaData) {
    return { success: false, error: "No se pudo encontrar la consulta" }
  }

  // Get the "cancelada" estado ID
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "cancelada")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "No se pudo encontrar el estado 'cancelada'" }
  }

  // Update consulta estado
  const { error } = await supabase
    .from("consultas")
    .update({ estado_id: estadoData.id })
    .eq("id", consultaId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Send cancellation email only if notification is enabled
  if (sendNotification) {
    sendCancellationEmail({
      consultaId,
      pacienteId: consultaData.paciente_id,
      medicoId: consultaData.medico_id,
      fechaHora: consultaData.fecha_hora,
      motivo: consultaData.motivo,
    }).catch((err) => {
      console.error("Error sending cancellation email:", err)
    })
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)
  return { success: true, error: null }
}

/**
 * Finalizar consulta (simple version for table view - just changes estado)
 * Validates that diagnostico and informe are filled before allowing finalization.
 * For full form data save, use the version in [id]/actions.ts
 */
export async function finalizarConsultaSimple(
  consultaId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // First, fetch the consulta to validate required fields
  const { data: consulta, error: fetchError } = await supabase
    .from("consultas")
    .select("diagnostico, informe")
    .eq("id", consultaId)
    .single()

  if (fetchError || !consulta) {
    return { success: false, error: "No se pudo encontrar la consulta" }
  }

  // Validate required fields for finalization
  if (!consulta.diagnostico || !consulta.informe) {
    return {
      success: false,
      error: "Los campos 'Diagnóstico' e 'Informe' son obligatorios para finalizar. Por favor, complete estos campos en la vista de detalle de la consulta.",
    }
  }

  // Get the "completada" estado ID
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "completada")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "No se pudo encontrar el estado 'completada'" }
  }

  // Update consulta estado
  const { error } = await supabase
    .from("consultas")
    .update({ estado_id: estadoData.id })
    .eq("id", consultaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)
  return { success: true, error: null }
}

/**
 * Reagendar consulta - Change the fecha_hora of a scheduled consulta
 * Only works for consultas with estado "programada"
 * Validates slot availability before updating
 */
export async function reagendarConsulta(
  consultaId: string,
  nuevaFechaHora: string // ISO datetime string
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Verify the consulta exists and is in "programada" estado
  const { data: consulta, error: consultaError } = await supabase
    .from("consultas")
    .select(`
      id,
      medico_id,
      paciente_id,
      fecha_hora,
      motivo,
      estados_consulta!inner (
        codigo
      )
    `)
    .eq("id", consultaId)
    .single()

  if (consultaError || !consulta) {
    return { success: false, error: "No se pudo encontrar la consulta" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estadoCodigo = (consulta as any).estados_consulta?.codigo
  if (estadoCodigo !== "programada") {
    return { success: false, error: "Solo se pueden reagendar consultas con estado 'Programada'" }
  }

  // Extract date and time from nuevaFechaHora for validation
  const appointmentDate = new Date(nuevaFechaHora)
  const dateStr = formatDateToString(appointmentDate)
  const timeStr = formatTimeInAppTimezone(appointmentDate)

  // Validate slot availability before updating
  const { data: slotsResult, error: slotsError } = await getAvailableSlotsForDate(
    consulta.medico_id,
    dateStr
  )

  if (slotsError) {
    return { success: false, error: `Error al verificar disponibilidad: ${slotsError}` }
  }

  if (!slotsResult || slotsResult.slots.length === 0) {
    return { success: false, error: "El médico no tiene horarios disponibles para esta fecha" }
  }

  // Find the slot for the selected time
  const selectedSlot = slotsResult.slots.find(slot => slot.time === timeStr)

  if (!selectedSlot) {
    return { success: false, error: `El horario ${timeStr} no está disponible para este médico` }
  }

  // Check if we're moving to a different time slot
  // If same date/time, the current consulta is already counted in scheduledCount
  const currentDateStr = formatDateToString(new Date(consulta.fecha_hora))
  const currentTimeStr = formatTimeInAppTimezone(new Date(consulta.fecha_hora))
  const isSameSlot = dateStr === currentDateStr && timeStr === currentTimeStr

  // If moving to a different slot, check availability
  if (!isSameSlot && !selectedSlot.isAvailable) {
    return {
      success: false,
      error: `El horario ${timeStr} ya tiene el máximo de consultas permitidas (${selectedSlot.scheduledCount}/${selectedSlot.maxConcurrent})`
    }
  }

  // Update consulta fecha_hora
  const { error: updateError } = await supabase
    .from("consultas")
    .update({ fecha_hora: nuevaFechaHora })
    .eq("id", consultaId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Send confirmation email with new date/time (fire and forget)
  sendConfirmationEmail({
    consultaId,
    pacienteId: consulta.paciente_id,
    medicoId: consulta.medico_id,
    fechaHora: nuevaFechaHora,
    motivo: consulta.motivo,
  })

  // Trigger revalidation
  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)

  return { success: true, error: null }
}

/**
 * Transferir consulta - Transfer consulta to another medico
 */
export async function transferirConsulta(
  consultaId: string,
  medicoDestinoId: string,
  motivo: string | null
): Promise<{
  success: boolean
  error: string | null
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Usuario no autenticado" }
  }

  // Get current consulta to get medico_origen_id
  const { data: consulta, error: consultaError } = await supabase
    .from("consultas")
    .select("medico_id")
    .eq("id", consultaId)
    .single()

  if (consultaError || !consulta) {
    return { success: false, error: "No se pudo encontrar la consulta" }
  }

  // Update consulta with new medico
  const { error: updateError } = await supabase
    .from("consultas")
    .update({ medico_id: medicoDestinoId })
    .eq("id", consultaId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Create transfer audit record
  const { error: transferError } = await supabase
    .from("consultas_transferencias")
    .insert({
      consulta_id: consultaId,
      medico_origen_id: consulta.medico_id,
      medico_destino_id: medicoDestinoId,
      transferido_por_user_id: user.id,
      motivo: motivo,
    })

  if (transferError) {
    return { success: false, error: transferError.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${consultaId}`)
  return { success: true, error: null }
}

// ============================================================================
// SCHEDULING ACTIONS - For appointment slot calculation
// ============================================================================

/**
 * Fetch scheduling parameters for a doctor
 * Returns default values if no record exists
 */
export async function fetchMedicoParametros(medicoId: string): Promise<{
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
 * Fetch all schedules for a doctor (all days of week)
 */
export async function fetchMedicoHorarios(medicoId: string): Promise<{
  data: MedicoHorario[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_horarios")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin, activo")
    .eq("medico_id", medicoId)
    .eq("activo", true)
    .order("dia_semana")
    .order("hora_inicio")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data || [], error: null }
}

/**
 * Fetch schedules for a doctor on a specific day of week
 */
export async function fetchMedicoScheduleForDay(
  medicoId: string,
  diaSemana: number
): Promise<{
  data: MedicoHorario[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos_horarios")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin, activo")
    .eq("medico_id", medicoId)
    .eq("dia_semana", diaSemana)
    .eq("activo", true)
    .order("hora_inicio")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data || [], error: null }
}

/**
 * Fetch count of scheduled consultas per time slot for a doctor on a specific date
 * Excludes consultas with estado 'cancelada' or 'ausente'
 */
export async function fetchScheduledConsultasForDate(
  medicoId: string,
  date: string // YYYY-MM-DD format
): Promise<{
  data: Map<string, number> | null
  error: string | null
}> {
  const supabase = await createClient()

  // Get estados that don't block the schedule
  const { data: estadosData, error: estadosError } = await supabase
    .from("estados_consulta")
    .select("id")
    .in("codigo", ["cancelada", "ausente"])

  if (estadosError) {
    return { data: null, error: estadosError.message }
  }

  const excludedEstadoIds = estadosData?.map(e => e.id) || []

  // Fetch consultas for the given date, excluding cancelled/absent
  // We need to match the date portion of fecha_hora
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  let query = supabase
    .from("consultas")
    .select("fecha_hora")
    .eq("medico_id", medicoId)
    .gte("fecha_hora", startOfDay)
    .lte("fecha_hora", endOfDay)

  // Only add the NOT IN filter if we have excluded estados
  if (excludedEstadoIds.length > 0) {
    query = query.not("estado_id", "in", `(${excludedEstadoIds.join(",")})`)
  }

  const { data: consultasData, error: consultasError } = await query

  if (consultasError) {
    return { data: null, error: consultasError.message }
  }

  // Count appointments per time slot
  const appointmentCounts = new Map<string, number>()

  for (const consulta of consultasData || []) {
    // Extract time from fecha_hora (ISO format)
    // Uses application timezone for consistent behavior across environments
    const fechaHora = new Date(consulta.fecha_hora)
    const timeKey = formatTimeInAppTimezone(fechaHora)

    const currentCount = appointmentCounts.get(timeKey) || 0
    appointmentCounts.set(timeKey, currentCount + 1)
  }

  return { data: appointmentCounts, error: null }
}

/**
 * Get all available slots for a doctor on a specific date
 * This is the main function used by the UI
 */
export async function getAvailableSlotsForDate(
  medicoId: string,
  date: string // YYYY-MM-DD format
): Promise<{
  data: AvailableSlotsResult | null
  error: string | null
}> {
  // Check if date is blocked
  const supabaseForBloqueo = await createClient()
  const { data: blockedData } = await supabaseForBloqueo
    .from("medicos_bloqueos_agenda")
    .select("id")
    .eq("medico_id", medicoId)
    .lte("fecha_inicio", date)
    .gte("fecha_fin", date)
    .limit(1)

  if (blockedData && blockedData.length > 0) {
    return {
      data: { date, slots: [], hasAvailability: false },
      error: null,
    }
  }

  // Parse date and get day of week
  const selectedDate = parseDateString(date)
  const diaSemana = getDayOfWeek(selectedDate)

  // Fetch all required data in parallel
  const [parametrosResult, schedulesResult, appointmentsResult] = await Promise.all([
    fetchMedicoParametros(medicoId),
    fetchMedicoScheduleForDay(medicoId, diaSemana),
    fetchScheduledConsultasForDate(medicoId, date),
  ])

  // Check for errors
  if (parametrosResult.error) {
    return { data: null, error: parametrosResult.error }
  }
  if (schedulesResult.error) {
    return { data: null, error: schedulesResult.error }
  }
  if (appointmentsResult.error) {
    return { data: null, error: appointmentsResult.error }
  }

  // If no schedules for this day, return empty result
  if (!schedulesResult.data || schedulesResult.data.length === 0) {
    return {
      data: {
        date,
        slots: [],
        hasAvailability: false,
      },
      error: null,
    }
  }

  // Calculate available slots
  const slots = calculateAvailableSlots(
    schedulesResult.data,
    parametrosResult.data,
    appointmentsResult.data || new Map(),
    selectedDate
  )

  const result = buildAvailableSlotsResult(date, slots)

  return { data: result, error: null }
}

/**
 * Get the days of week that a doctor works (has active schedules)
 * Returns array of day numbers (0=Sunday, 1=Monday, etc.)
 */
export async function getMedicoWorkDays(medicoId: string): Promise<{
  data: number[] | null
  error: string | null
}> {
  const { data: schedules, error } = await fetchMedicoHorarios(medicoId)

  if (error) {
    return { data: null, error }
  }

  const workDays = new Set<number>()
  for (const schedule of schedules || []) {
    if (schedule.activo) {
      workDays.add(schedule.dia_semana)
    }
  }

  return { data: [...workDays].sort(), error: null }
}
