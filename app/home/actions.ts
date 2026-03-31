"use server"

import { createClient } from "@/lib/supabase/server"
import { getTodayBoundariesUTC, getDateRangeBoundariesUTC } from "@/lib/utils/timezone"

/**
 * Types for médico dashboard data
 */
export interface DashboardConsulta {
  id: string
  fecha_hora: string
  paciente_id: string
  paciente_nombre: string
  paciente_apellido: string
  paciente_dni: string
  paciente_llego_timestamp: string | null
}

/**
 * Types for recepcionista dashboard data (includes médico info)
 */
export interface RecepcionistaDashboardConsulta extends DashboardConsulta {
  medico_id: string
  medico_apellido: string
}

export interface DashboardPaciente {
  id: string
  nombre: string
  apellido: string
  dni: string
  obra_social_nombre: string | null
  ultima_consulta_fecha: string
}

export interface MedicoDashboardData {
  medicoId: string
  medicoNombre: string
  pacientesEnEspera: number
  consultasHoy: DashboardConsulta[]
  consultasProximos7Dias: DashboardConsulta[]
  pacientesRecientes: DashboardPaciente[]
}

export interface RecepcionistaDashboardData {
  pacientesEnEspera: number
  consultasHoy: RecepcionistaDashboardConsulta[]
  consultasProximos7Dias: RecepcionistaDashboardConsulta[]
  pacientesRecientes: DashboardPaciente[]
}

/**
 * Get the médico record associated with the current user
 * Note: nombre/apellido come from usuarios_pms via user_id JOIN
 */
async function getMedicoByUserId(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos")
    .select("id, user_id, usuarios_pms!inner(nombre, apellido)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to flat structure for backwards compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = data as any
  const usuariosPms = Array.isArray(rawData.usuarios_pms) ? rawData.usuarios_pms[0] : rawData.usuarios_pms

  const medico = {
    id: data.id,
    nombre: usuariosPms?.nombre || '',
    apellido: usuariosPms?.apellido || '',
  }

  return { data: medico, error: null }
}

/**
 * Fetch all dashboard data for a médico
 */
export async function fetchMedicoDashboardData(userId: string): Promise<{
  data: MedicoDashboardData | null
  error: string | null
}> {
  const supabase = await createClient()

  // First, get the médico record for this user
  const { data: medico, error: medicoError } = await getMedicoByUserId(userId)

  if (medicoError || !medico) {
    return { data: null, error: medicoError || "No se encontró el médico asociado a este usuario" }
  }

  // Get the "programada" estado ID for filtering consultas
  const { data: estadoProgramada } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "programada")
    .single()

  if (!estadoProgramada) {
    return { data: null, error: "No se encontró el estado 'programada'" }
  }

  // Calculate date boundaries in application timezone
  // These are returned as UTC ISO strings for database queries
  const nowISO = new Date().toISOString() // Current UTC time for retraso check
  const { startISO: todayStartISO, endISO: todayEndISO } = getTodayBoundariesUTC()
  const { startISO: sevenDaysAgoISO, endISO: sevenDaysFromNowISO } = getDateRangeBoundariesUTC(7, 7)

  // Execute all queries in parallel
  const [
    consultasPotentialRetrasadasResult,
    consultasHoyResult,
    consultasProximos7DiasResult,
    consultasRecientesResult
  ] = await Promise.all([
    // 1. Fetch consultas that could be retrasadas (programada + patient arrived + appointment time passed)
    // We need to filter client-side to check if patient arrived on time (clinic fault) vs late (patient fault)
    supabase
      .from("consultas")
      .select("id, fecha_hora, paciente_llego_timestamp")
      .eq("medico_id", medico.id)
      .eq("estado_id", estadoProgramada.id)
      .not("paciente_llego_timestamp", "is", null)
      .lt("fecha_hora", nowISO),

    // 2. Consultas de hoy
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        paciente_llego_timestamp,
        pacientes!inner (
          nombre,
          apellido,
          dni
        )
      `)
      .eq("medico_id", medico.id)
      .eq("estado_id", estadoProgramada.id)
      .gte("fecha_hora", todayStartISO)
      .lt("fecha_hora", todayEndISO)
      .order("fecha_hora", { ascending: true }),

    // 3. Consultas próximos 7 días (excluding today)
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        paciente_llego_timestamp,
        pacientes!inner (
          nombre,
          apellido,
          dni
        )
      `)
      .eq("medico_id", medico.id)
      .eq("estado_id", estadoProgramada.id)
      .gte("fecha_hora", todayEndISO)
      .lt("fecha_hora", sevenDaysFromNowISO)
      .order("fecha_hora", { ascending: true }),

    // 4. Consultas de los últimos 7 días (for pacientes recientes)
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        pacientes!inner (
          id,
          nombre,
          apellido,
          dni,
          obras_sociales (
            nombre
          )
        )
      `)
      .eq("medico_id", medico.id)
      .gte("fecha_hora", sevenDaysAgoISO)
      .lt("fecha_hora", todayEndISO)
      .order("fecha_hora", { ascending: false })
  ])

  // Check for errors
  if (consultasPotentialRetrasadasResult.error) {
    return { data: null, error: consultasPotentialRetrasadasResult.error.message }
  }
  if (consultasHoyResult.error) {
    return { data: null, error: consultasHoyResult.error.message }
  }
  if (consultasProximos7DiasResult.error) {
    return { data: null, error: consultasProximos7DiasResult.error.message }
  }
  if (consultasRecientesResult.error) {
    return { data: null, error: consultasRecientesResult.error.message }
  }

  // Calculate pacientesEnEspera: count ALL patients waiting
  // (patient arrived + appointment time has passed, regardless of fault)
  const pacientesEnEspera = (consultasPotentialRetrasadasResult.data || []).length

  // Transform consultas hoy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultasHoy: DashboardConsulta[] = (consultasHoyResult.data || []).map((c: any) => {
    const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
    return {
      id: c.id,
      fecha_hora: c.fecha_hora,
      paciente_id: c.paciente_id,
      paciente_nombre: paciente?.nombre || '',
      paciente_apellido: paciente?.apellido || '',
      paciente_dni: paciente?.dni || '',
      paciente_llego_timestamp: c.paciente_llego_timestamp,
    }
  })

  // Transform consultas próximos 7 días
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultasProximos7Dias: DashboardConsulta[] = (consultasProximos7DiasResult.data || []).map((c: any) => {
    const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
    return {
      id: c.id,
      fecha_hora: c.fecha_hora,
      paciente_id: c.paciente_id,
      paciente_nombre: paciente?.nombre || '',
      paciente_apellido: paciente?.apellido || '',
      paciente_dni: paciente?.dni || '',
      paciente_llego_timestamp: c.paciente_llego_timestamp,
    }
  })

  // Transform and deduplicate pacientes recientes (get unique pacientes, keeping most recent consulta)
  const pacientesMap = new Map<string, DashboardPaciente>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (consultasRecientesResult.data || []) as any[]) {
    if (!pacientesMap.has(c.paciente_id)) {
      const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
      const obraSocial = paciente?.obras_sociales
      const obraSocialNombre = Array.isArray(obraSocial) ? obraSocial[0]?.nombre : obraSocial?.nombre

      pacientesMap.set(c.paciente_id, {
        id: paciente?.id || c.paciente_id,
        nombre: paciente?.nombre || '',
        apellido: paciente?.apellido || '',
        dni: paciente?.dni || '',
        obra_social_nombre: obraSocialNombre || null,
        ultima_consulta_fecha: c.fecha_hora,
      })
    }
  }
  const pacientesRecientes = Array.from(pacientesMap.values())

  return {
    data: {
      medicoId: medico.id,
      medicoNombre: medico.nombre,
      pacientesEnEspera,
      consultasHoy,
      consultasProximos7Dias,
      pacientesRecientes,
    },
    error: null,
  }
}

/**
 * Fetch all dashboard data for a recepcionista (all médicos)
 */
export async function fetchRecepcionistaDashboardData(): Promise<{
  data: RecepcionistaDashboardData | null
  error: string | null
}> {
  const supabase = await createClient()

  // Get the "programada" estado ID for filtering consultas
  const { data: estadoProgramada } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "programada")
    .single()

  if (!estadoProgramada) {
    return { data: null, error: "No se encontró el estado 'programada'" }
  }

  // Calculate date boundaries in application timezone
  // These are returned as UTC ISO strings for database queries
  const nowISO = new Date().toISOString() // Current UTC time for retraso check
  const { startISO: todayStartISO, endISO: todayEndISO } = getTodayBoundariesUTC()
  const { startISO: sevenDaysAgoISO, endISO: sevenDaysFromNowISO } = getDateRangeBoundariesUTC(7, 7)

  // Execute all queries in parallel (no medico_id filter - get all médicos)
  const [
    consultasPotentialRetrasadasResult,
    consultasHoyResult,
    consultasProximos7DiasResult,
    consultasRecientesResult
  ] = await Promise.all([
    // 1. Fetch consultas that could be retrasadas (programada + patient arrived + appointment time passed)
    // We need to filter client-side to check if patient arrived on time (clinic fault) vs late (patient fault)
    supabase
      .from("consultas")
      .select("id, fecha_hora, paciente_llego_timestamp")
      .eq("estado_id", estadoProgramada.id)
      .not("paciente_llego_timestamp", "is", null)
      .lt("fecha_hora", nowISO),

    // 2. Consultas de hoy (all médicos, includes médico info)
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        paciente_llego_timestamp,
        medico_id,
        pacientes!inner (
          nombre,
          apellido,
          dni
        ),
        medicos!inner (
          user_id,
          usuarios_pms!inner (
            apellido
          )
        )
      `)
      .eq("estado_id", estadoProgramada.id)
      .gte("fecha_hora", todayStartISO)
      .lt("fecha_hora", todayEndISO)
      .order("fecha_hora", { ascending: true }),

    // 3. Consultas próximos 7 días (excluding today, all médicos)
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        paciente_llego_timestamp,
        medico_id,
        pacientes!inner (
          nombre,
          apellido,
          dni
        ),
        medicos!inner (
          user_id,
          usuarios_pms!inner (
            apellido
          )
        )
      `)
      .eq("estado_id", estadoProgramada.id)
      .gte("fecha_hora", todayEndISO)
      .lt("fecha_hora", sevenDaysFromNowISO)
      .order("fecha_hora", { ascending: true }),

    // 4. Consultas de los últimos 7 días (for pacientes recientes, all médicos)
    supabase
      .from("consultas")
      .select(`
        id,
        fecha_hora,
        paciente_id,
        pacientes!inner (
          id,
          nombre,
          apellido,
          dni,
          obras_sociales (
            nombre
          )
        )
      `)
      .gte("fecha_hora", sevenDaysAgoISO)
      .lt("fecha_hora", todayEndISO)
      .order("fecha_hora", { ascending: false })
  ])

  // Check for errors
  if (consultasPotentialRetrasadasResult.error) {
    return { data: null, error: consultasPotentialRetrasadasResult.error.message }
  }
  if (consultasHoyResult.error) {
    return { data: null, error: consultasHoyResult.error.message }
  }
  if (consultasProximos7DiasResult.error) {
    return { data: null, error: consultasProximos7DiasResult.error.message }
  }
  if (consultasRecientesResult.error) {
    return { data: null, error: consultasRecientesResult.error.message }
  }

  // Calculate pacientesEnEspera: count ALL patients waiting
  // (patient arrived + appointment time has passed, regardless of fault)
  const pacientesEnEspera = (consultasPotentialRetrasadasResult.data || []).length

  // Transform consultas hoy (includes médico info)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultasHoy: RecepcionistaDashboardConsulta[] = (consultasHoyResult.data || []).map((c: any) => {
    const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
    const medico = Array.isArray(c.medicos) ? c.medicos[0] : c.medicos
    const usuariosPms = medico?.usuarios_pms
    const medicoApellido = Array.isArray(usuariosPms) ? usuariosPms[0]?.apellido : usuariosPms?.apellido

    return {
      id: c.id,
      fecha_hora: c.fecha_hora,
      paciente_id: c.paciente_id,
      paciente_nombre: paciente?.nombre || '',
      paciente_apellido: paciente?.apellido || '',
      paciente_dni: paciente?.dni || '',
      paciente_llego_timestamp: c.paciente_llego_timestamp,
      medico_id: c.medico_id,
      medico_apellido: medicoApellido || '',
    }
  })

  // Transform consultas próximos 7 días (includes médico info)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultasProximos7Dias: RecepcionistaDashboardConsulta[] = (consultasProximos7DiasResult.data || []).map((c: any) => {
    const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
    const medico = Array.isArray(c.medicos) ? c.medicos[0] : c.medicos
    const usuariosPms = medico?.usuarios_pms
    const medicoApellido = Array.isArray(usuariosPms) ? usuariosPms[0]?.apellido : usuariosPms?.apellido

    return {
      id: c.id,
      fecha_hora: c.fecha_hora,
      paciente_id: c.paciente_id,
      paciente_nombre: paciente?.nombre || '',
      paciente_apellido: paciente?.apellido || '',
      paciente_dni: paciente?.dni || '',
      paciente_llego_timestamp: c.paciente_llego_timestamp,
      medico_id: c.medico_id,
      medico_apellido: medicoApellido || '',
    }
  })

  // Transform and deduplicate pacientes recientes (get unique pacientes, keeping most recent consulta)
  const pacientesMap = new Map<string, DashboardPaciente>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (consultasRecientesResult.data || []) as any[]) {
    if (!pacientesMap.has(c.paciente_id)) {
      const paciente = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes
      const obraSocial = paciente?.obras_sociales
      const obraSocialNombre = Array.isArray(obraSocial) ? obraSocial[0]?.nombre : obraSocial?.nombre

      pacientesMap.set(c.paciente_id, {
        id: paciente?.id || c.paciente_id,
        nombre: paciente?.nombre || '',
        apellido: paciente?.apellido || '',
        dni: paciente?.dni || '',
        obra_social_nombre: obraSocialNombre || null,
        ultima_consulta_fecha: c.fecha_hora,
      })
    }
  }
  const pacientesRecientes = Array.from(pacientesMap.values())

  return {
    data: {
      pacientesEnEspera,
      consultasHoy,
      consultasProximos7Dias,
      pacientesRecientes,
    },
    error: null,
  }
}
