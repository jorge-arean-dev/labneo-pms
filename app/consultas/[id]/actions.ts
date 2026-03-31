"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ConsultaWithRelations, AuditUser } from "@/lib/types/entities"
import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fetch audit user info (name + role) for created_by/updated_by UUIDs.
 * Returns null if the userId is null or the user is not found.
 */
async function fetchAuditUser(
  supabase: SupabaseClient,
  userId: string | null
): Promise<AuditUser | null> {
  if (!userId) return null

  const { data } = await supabase
    .from("usuarios_pms")
    .select("nombre, apellido, roles!inner(nombre)")
    .eq("id", userId)
    .single()

  if (!data) return null

  return {
    nombre: data.nombre,
    apellido: data.apellido,
    rol: (data.roles as unknown as { nombre: string }).nombre,
  }
}

/**
 * Fetch a single consulta by ID with related data (patient, doctor, estado)
 * Note: médico nombre/apellido come from usuarios_pms via user_id JOIN
 */
export async function fetchConsulta(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("consultas")
    .select(`
      *,
      paciente:pacientes(id, nombre, apellido, dni, email, fecha_nacimiento, plan, numero_afiliado, obra_social:obras_sociales(id, nombre)),
      medico:medicos(id, user_id, usuarios_pms(nombre, apellido)),
      estado:estados_consulta(id, nombre, codigo)
    `)
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  // Fetch audit user info in parallel
  const [createdByUser, updatedByUser] = await Promise.all([
    fetchAuditUser(supabase, data.created_by),
    fetchAuditUser(supabase, data.updated_by),
  ])

  // Transform to flatten usuarios_pms data into medico
  const transformedData = {
    ...data,
    medico: {
      id: data.medico.id,
      user_id: data.medico.user_id,
      nombre: (data.medico as { usuarios_pms: { nombre: string; apellido: string } }).usuarios_pms?.nombre,
      apellido: (data.medico as { usuarios_pms: { nombre: string; apellido: string } }).usuarios_pms?.apellido,
    },
    createdByUser,
    updatedByUser,
  }

  return { data: transformedData as ConsultaWithRelations, error: null }
}

/**
 * Update a consulta
 */
export async function updateConsulta(
  id: string,
  formData: Record<string, unknown>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("consultas")
    .update({
      fecha_hora: formData.fecha_hora,
      motivo: formData.motivo || null,
      estado_id: formData.estado_id,
      tipo_consulta: formData.tipo_consulta || null,
      informe: formData.informe || null,
      diagnostico: formData.diagnostico || null,
      tratamiento: formData.tratamiento || null,
      receta: formData.receta || null,
      notas: formData.notas || null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message, data: null }
  }

  // Fetch the updated consulta with all relations
  const { data: updatedConsulta, error: fetchError } = await supabase
    .from("consultas")
    .select(`
      *,
      paciente:pacientes(id, nombre, apellido, dni, email, fecha_nacimiento, plan, numero_afiliado, obra_social:obras_sociales(id, nombre)),
      medico:medicos(id, user_id, usuarios_pms(nombre, apellido)),
      estado:estados_consulta(id, nombre, codigo)
    `)
    .eq("id", id)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message, data: null }
  }

  // Fetch audit user info in parallel
  const [createdByUser, updatedByUser] = await Promise.all([
    fetchAuditUser(supabase, updatedConsulta.created_by),
    fetchAuditUser(supabase, updatedConsulta.updated_by),
  ])

  // Transform to flatten usuarios_pms data into medico
  const transformedData = {
    ...updatedConsulta,
    medico: {
      id: updatedConsulta.medico.id,
      user_id: updatedConsulta.medico.user_id,
      nombre: (updatedConsulta.medico as { usuarios_pms: { nombre: string; apellido: string } }).usuarios_pms?.nombre,
      apellido: (updatedConsulta.medico as { usuarios_pms: { nombre: string; apellido: string } }).usuarios_pms?.apellido,
    },
    createdByUser,
    updatedByUser,
  }

  revalidatePath("/consultas/[id]", "page")
  revalidatePath("/consultas", "page")

  return { success: true, error: null, data: transformedData as ConsultaWithRelations }
}

/**
 * Delete a consulta
 */
export async function deleteConsulta(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("consultas")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas", "page")

  return { success: true, error: null }
}

/**
 * Fetch all estados_consulta for dropdown
 */
export async function fetchEstados() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("estados_consulta")
    .select("id, nombre, codigo, descripcion, es_estado_final, orden, activo, created_at, updated_at")
    .order("nombre")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Fetch past consultas for a patient (excluding current consulta)
 * Returns all consultas regardless of estado
 */
export async function fetchPastConsultas(pacienteId: string, currentConsultaId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("consultas")
    .select(`
      id,
      fecha_hora,
      informe,
      diagnostico,
      medico:medicos!inner(id, user_id, usuarios_pms!inner(nombre, apellido)),
      estado:estados_consulta!inner(codigo, nombre)
    `)
    .eq("paciente_id", pacienteId)
    .neq("id", currentConsultaId)
    .order("fecha_hora", { ascending: false })
    .limit(10)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Finalizar consulta - Save form data and change estado to "completada"
 */
export async function finalizarConsulta(
  id: string,
  formData: Record<string, unknown>
) {
  const supabase = await createClient()

  // Get the "completada" estado ID
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "completada")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "No se pudo encontrar el estado 'completada'" }
  }

  // Update consulta with form data and change estado
  const { error } = await supabase
    .from("consultas")
    .update({
      fecha_hora: formData.fecha_hora,
      motivo: formData.motivo || null,
      estado_id: estadoData.id,
      tipo_consulta: formData.tipo_consulta || null,
      informe: formData.informe || null,
      diagnostico: formData.diagnostico || null,
      tratamiento: formData.tratamiento || null,
      receta: formData.receta || null,
      notas: formData.notas || null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${id}`)
  return { success: true, error: null }
}

/**
 * Save and keep estado as "en_curso" (Salir sin finalizar)
 */
export async function saveWithoutFinalizing(
  id: string,
  formData: Record<string, unknown>
) {
  const supabase = await createClient()

  // Update consulta but keep estado as "en_curso"
  const { error } = await supabase
    .from("consultas")
    .update({
      fecha_hora: formData.fecha_hora,
      motivo: formData.motivo || null,
      tipo_consulta: formData.tipo_consulta || null,
      informe: formData.informe || null,
      diagnostico: formData.diagnostico || null,
      tratamiento: formData.tratamiento || null,
      receta: formData.receta || null,
      notas: formData.notas || null,
      // Don't update estado_id - keep as "en_curso"
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/consultas")
  revalidatePath(`/consultas/${id}`)
  return { success: true, error: null }
}
