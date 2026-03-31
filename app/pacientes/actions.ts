"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Types
export interface ObraSocial {
  id: string
  nombre: string
}

export interface Paciente {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string | null
  genero: string | null
  obra_social_id: string | null
  obra_social_nombre: string | null
  ultimaConsulta: string | null
  proximaConsulta: string | null
}

export interface CreatePacienteData {
  dni: string
  nombre: string
  apellido: string
  fecha_nacimiento?: string // ISO date string (optional)
  genero?: string // "Masculino" | "Femenino" | "Otro" (optional)
  telefono?: string // optional
  email?: string
  domicilio?: string
  obra_social_id?: string // optional
  plan?: string
  numero_afiliado?: string
}

// Fetch all obras sociales
export async function fetchObrasSociales(): Promise<{ data: ObraSocial[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("obras_sociales")
      .select("id, nombre")
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

// Fetch all pacientes with joined obra social data
export async function fetchPacientes(): Promise<{ data: Paciente[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Fetch pacientes
    const { data, error } = await supabase
      .from("pacientes")
      .select(`
        id,
        nombre,
        apellido,
        dni,
        telefono,
        genero,
        obra_social_id,
        obras_sociales:obra_social_id (
          nombre
        )
      `)
      .eq("is_active", true)
      .order("apellido", { ascending: true })

    if (error) {
      console.error("Error fetching pacientes:", error)
      return { data: null, error: error.message }
    }

    // Fetch estado IDs for "completada" and "programada"
    const { data: estadosData } = await supabase
      .from("estados_consulta")
      .select("id, codigo")
      .in("codigo", ["completada", "programada"])

    const estadoCompletadaId = estadosData?.find(e => e.codigo === "completada")?.id
    const estadoProgramadaId = estadosData?.find(e => e.codigo === "programada")?.id

    // Fetch consultas for última consulta (completada, fecha_hora <= now)
    const now = new Date().toISOString()
    const ultimaConsultaMap: Record<string, string> = {}
    const proximaConsultaMap: Record<string, string> = {}

    if (estadoCompletadaId) {
      const { data: consultasCompletadas } = await supabase
        .from("consultas")
        .select("paciente_id, fecha_hora")
        .eq("estado_id", estadoCompletadaId)
        .lte("fecha_hora", now)
        .order("fecha_hora", { ascending: false })

      // Group by paciente_id, keep most recent
      if (consultasCompletadas) {
        for (const c of consultasCompletadas) {
          if (!ultimaConsultaMap[c.paciente_id]) {
            ultimaConsultaMap[c.paciente_id] = c.fecha_hora
          }
        }
      }
    }

    if (estadoProgramadaId) {
      const { data: consultasProgramadas } = await supabase
        .from("consultas")
        .select("paciente_id, fecha_hora")
        .eq("estado_id", estadoProgramadaId)
        .gte("fecha_hora", now)
        .order("fecha_hora", { ascending: true })

      // Group by paciente_id, keep earliest upcoming
      if (consultasProgramadas) {
        for (const c of consultasProgramadas) {
          if (!proximaConsultaMap[c.paciente_id]) {
            proximaConsultaMap[c.paciente_id] = c.fecha_hora
          }
        }
      }
    }

    // Transform data to match table structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pacientes: Paciente[] = (data || []).map((p: any) => {
      const obraSocial = Array.isArray(p.obras_sociales) ? p.obras_sociales[0] : p.obras_sociales
      return {
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni,
        telefono: p.telefono,
        genero: p.genero ? mapGenderToDisplay(p.genero) : null,
        obra_social_id: p.obra_social_id || null,
        obra_social_nombre: obraSocial?.nombre || null,
        ultimaConsulta: ultimaConsultaMap[p.id] || null,
        proximaConsulta: proximaConsultaMap[p.id] || null,
      }
    })

    return { data: pacientes, error: null }
  } catch (error) {
    console.error("Unexpected error fetching pacientes:", error)
    return { data: null, error: "Error inesperado al cargar los pacientes" }
  }
}

// Create new paciente
export async function createPaciente(
  formData: CreatePacienteData
): Promise<{ success: boolean; error: string | null; data?: Paciente }> {
  try {
    const supabase = await createClient()

    // Get current user for audit fields
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Map gender display value to database value
    const genderMap: Record<string, string> = {
      Masculino: "M",
      Femenino: "F",
      Otro: "Otro",
    }

    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        dni: formData.dni,
        nombre: formData.nombre,
        apellido: formData.apellido,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        genero: formData.genero ? (genderMap[formData.genero] || null) : null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        domicilio: formData.domicilio || null,
        obra_social_id: formData.obra_social_id || null,
        plan: formData.plan || null,
        numero_afiliado: formData.numero_afiliado || null,
        consentimiento_datos: true,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating paciente:", error)
      return { success: false, error: error.message }
    }

    // Revalidate the pacientes page to refresh data
    revalidatePath("/pacientes")

    return { success: true, error: null, data }
  } catch (error) {
    console.error("Unexpected error creating paciente:", error)
    return { success: false, error: "Error inesperado al crear el paciente" }
  }
}

// Helper function to map database gender values to display values
function mapGenderToDisplay(dbGender: string): string {
  const displayMap: Record<string, string> = {
    M: "Masculino",
    F: "Femenino",
    Otro: "Otro",
  }
  return displayMap[dbGender] || dbGender
}

// Types for paginated fetch
export interface PacientePaginatedFilters {
  searchTerm?: string // Searches across DNI, nombre, apellido
  obrasSocialesIds?: string[] // Filter by obra social IDs (empty = all)
}

export interface PacientePaginatedResult {
  data: Paciente[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Fetch pacientes with server-side pagination and filtering
 * More efficient for large datasets (13K+ records)
 */
export async function fetchPacientesPaginated(
  page: number = 1,
  limit: number = 10,
  filters: PacientePaginatedFilters = {}
): Promise<{ data: PacientePaginatedResult | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { searchTerm, obrasSocialesIds } = filters

    // Calculate offset
    const offset = (page - 1) * limit

    // Build the base query for pacientes
    let query = supabase
      .from("pacientes")
      .select(`
        id,
        nombre,
        apellido,
        dni,
        telefono,
        genero,
        obra_social_id,
        obras_sociales:obra_social_id (
          nombre
        )
      `, { count: "exact" })
      .eq("is_active", true)

    // Apply search filter (searches DNI, nombre, apellido)
    if (searchTerm && searchTerm.length >= 2) {
      // Use OR filter for searching across multiple columns
      query = query.or(
        `dni.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%`
      )
    }

    // Apply obra social filter
    if (obrasSocialesIds && obrasSocialesIds.length > 0) {
      query = query.in("obra_social_id", obrasSocialesIds)
    }

    // Apply ordering and pagination
    query = query
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching pacientes paginated:", error)
      return { data: null, error: error.message }
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Get paciente IDs for this page to fetch consulta data
    const pacienteIds = (data || []).map((p: { id: string }) => p.id)

    // Fetch última consulta and próxima consulta for this page's pacientes only
    const ultimaConsultaMap: Record<string, string> = {}
    const proximaConsultaMap: Record<string, string> = {}

    if (pacienteIds.length > 0) {
      // Get estado IDs
      const { data: estadosData } = await supabase
        .from("estados_consulta")
        .select("id, codigo")
        .in("codigo", ["completada", "programada"])

      const estadoCompletadaId = estadosData?.find(e => e.codigo === "completada")?.id
      const estadoProgramadaId = estadosData?.find(e => e.codigo === "programada")?.id
      const now = new Date().toISOString()

      // Fetch última consulta (completada) for this page's pacientes
      if (estadoCompletadaId) {
        const { data: consultasCompletadas } = await supabase
          .from("consultas")
          .select("paciente_id, fecha_hora")
          .in("paciente_id", pacienteIds)
          .eq("estado_id", estadoCompletadaId)
          .lte("fecha_hora", now)
          .order("fecha_hora", { ascending: false })

        if (consultasCompletadas) {
          for (const c of consultasCompletadas) {
            if (!ultimaConsultaMap[c.paciente_id]) {
              ultimaConsultaMap[c.paciente_id] = c.fecha_hora
            }
          }
        }
      }

      // Fetch próxima consulta (programada) for this page's pacientes
      if (estadoProgramadaId) {
        const { data: consultasProgramadas } = await supabase
          .from("consultas")
          .select("paciente_id, fecha_hora")
          .in("paciente_id", pacienteIds)
          .eq("estado_id", estadoProgramadaId)
          .gte("fecha_hora", now)
          .order("fecha_hora", { ascending: true })

        if (consultasProgramadas) {
          for (const c of consultasProgramadas) {
            if (!proximaConsultaMap[c.paciente_id]) {
              proximaConsultaMap[c.paciente_id] = c.fecha_hora
            }
          }
        }
      }
    }

    // Transform data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pacientes: Paciente[] = (data || []).map((p: any) => {
      const obraSocial = Array.isArray(p.obras_sociales) ? p.obras_sociales[0] : p.obras_sociales
      return {
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni,
        telefono: p.telefono,
        genero: p.genero ? mapGenderToDisplay(p.genero) : null,
        obra_social_id: p.obra_social_id || null,
        obra_social_nombre: obraSocial?.nombre || null,
        ultimaConsulta: ultimaConsultaMap[p.id] || null,
        proximaConsulta: proximaConsultaMap[p.id] || null,
      }
    })

    return {
      data: {
        data: pacientes,
        totalCount,
        page,
        limit,
        totalPages,
      },
      error: null,
    }
  } catch (error) {
    console.error("Unexpected error fetching pacientes paginated:", error)
    return { data: null, error: "Error inesperado al cargar los pacientes" }
  }
}
