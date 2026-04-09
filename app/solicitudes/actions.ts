"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  SolicitudWithRelations,
  EstadoSolicitud,
  Localidad,
  TipoSolicitud,
  SubtipoServicio,
  OdontologoPerfilWithLocalidad,
  OdontologoHorario,
} from "@/lib/types/entities"

// ============================================================================
// Fetch solicitudes (list)
// ============================================================================

export async function fetchSolicitudes() {
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
    .from("solicitudes")
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)
    `)
    .order("created_at", { ascending: false })

  // Odontólogos only see their own
  if (role === "odontologo") {
    query = query.eq("odontologo_id", user.id)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as SolicitudWithRelations[], error: null }
}

// ============================================================================
// Fetch single solicitud by ID
// ============================================================================

export async function fetchSolicitudById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)
    `)
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as SolicitudWithRelations, error: null }
}

// ============================================================================
// Fetch estados
// ============================================================================

export async function fetchEstadosSolicitud() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("estados_solicitud")
    .select("id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at")
    .eq("activo", true)
    .order("orden")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as EstadoSolicitud[], error: null }
}

// ============================================================================
// Fetch localidades (active only)
// ============================================================================

export async function fetchLocalidades() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("localidades")
    .select("id, codigo, nombre_display, provincia, activo, created_at, updated_at")
    .eq("activo", true)
    .order("nombre_display")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as Localidad[], error: null }
}

// ============================================================================
// Fetch odontologo profile + horarios (for preloading the form)
// ============================================================================

export async function fetchOdontologoProfileForForm() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { usuario: null, perfil: null, horarios: null, error: "No autenticado" }
  }

  // Fetch base user data
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuarios_pms")
    .select("id, nombre, apellido, email")
    .eq("id", user.id)
    .single()

  if (usuarioError) {
    return { usuario: null, perfil: null, horarios: null, error: usuarioError.message }
  }

  // Fetch odontologo perfil with localidad join
  const { data: perfilData } = await supabase
    .from("odontologos_perfil")
    .select("id, usuario_id, localidad_id, telefono, cuit, situacion_iva, direccion_consultorio, created_at, updated_at, localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)")
    .eq("usuario_id", user.id)
    .single()

  // Fetch horarios
  const { data: horariosData } = await supabase
    .from("odontologos_horarios")
    .select("id, usuario_id, dia_semana, hora_inicio, hora_fin, activo, created_at, updated_at")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("dia_semana")
    .order("hora_inicio")

  return {
    usuario: usuarioData,
    perfil: perfilData as unknown as OdontologoPerfilWithLocalidad | null,
    horarios: (horariosData || []) as OdontologoHorario[],
    error: null,
  }
}

// ============================================================================
// Create solicitud
// ============================================================================

/**
 * Only editable fields come from the client. Read-only profile fields
 * (nombre, apellido, email, telefono, localidad, cuit, situacion_iva,
 * direccion_consultorio) are pulled server-side from the odontologo profile
 * to ensure data consistency and prevent client-side tampering.
 */
export interface CreateSolicitudData {
  tipo_solicitud: TipoSolicitud
  // Alquiler-specific (editable)
  subtipo_servicio: SubtipoServicio | null
  fecha_propuesta: string | null
  // Shared optional (editable)
  observaciones: string | null
}

export async function createSolicitud(formData: CreateSolicitudData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "No autenticado", data: null }
  }

  // Pull profile data server-side for historical snapshot
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, email")
    .eq("id", user.id)
    .single()

  if (usuarioError || !usuarioData) {
    return { success: false, error: "Error al obtener datos del usuario", data: null }
  }

  const { data: perfilData, error: perfilError } = await supabase
    .from("odontologos_perfil")
    .select("telefono, localidad_id, cuit, situacion_iva, direccion_consultorio")
    .eq("usuario_id", user.id)
    .single()

  if (perfilError || !perfilData) {
    return {
      success: false,
      error: "Debés completar tu perfil en Configuración antes de crear una solicitud",
      data: null,
    }
  }

  // Validate required profile fields
  if (!perfilData.telefono) {
    return {
      success: false,
      error: "Falta el teléfono en tu perfil. Completalo en Configuración.",
      data: null,
    }
  }

  // Fetch default estado (pendiente)
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_solicitud")
    .select("id")
    .eq("codigo", "pendiente")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "Error al obtener estado inicial", data: null }
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .insert({
      odontologo_id: user.id,
      tipo_solicitud: formData.tipo_solicitud,
      estado_id: estadoData.id,
      // Profile snapshot (historical copies)
      nombre: usuarioData.nombre,
      apellido: usuarioData.apellido,
      email: usuarioData.email,
      telefono: perfilData.telefono,
      localidad_id: perfilData.localidad_id,
      cuit: perfilData.cuit,
      situacion_iva: perfilData.situacion_iva,
      direccion_consultorio: perfilData.direccion_consultorio,
      // Editable fields
      subtipo_servicio: formData.subtipo_servicio,
      fecha_propuesta: formData.fecha_propuesta,
      observaciones: formData.observaciones,
    })
    .select(`
      *,
      estados_solicitud(id, codigo, nombre, tipo_solicitud, orden, activo, descripcion, created_at, updated_at),
      localidades(id, codigo, nombre_display, provincia, activo, created_at, updated_at)
    `)
    .single()

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  revalidatePath("/solicitudes", "page")
  return { success: true, error: null, data: data as unknown as SolicitudWithRelations }
}

// ============================================================================
// Update solicitud estado (admin only)
// ============================================================================

export async function updateSolicitudEstado(
  id: string,
  estadoId: string,
  notas_admin?: string
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { estado_id: estadoId }
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
