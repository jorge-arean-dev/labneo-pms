"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { PacienteWithObraSocial, ConsultaWithRelations } from "@/lib/types/entities"

/**
 * Fetch a single paciente by ID with obra social data
 */
export async function fetchPaciente(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pacientes")
    .select(`
      *,
      obra_social:obras_sociales(id, nombre)
    `)
    .eq("id", id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as PacienteWithObraSocial, error: null }
}

/**
 * Fetch all obras sociales for dropdown
 */
export async function fetchObrasSociales() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("obras_sociales")
    .select("id, nombre")
    .eq("is_active", true)
    .order("nombre")

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Update a paciente
 */
interface UpdatePacienteData {
  dni: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  genero: string | null
  telefono: string | null
  email: string | null
  domicilio: string | null
  obra_social_id: string | null
  plan: string | null
  numero_afiliado: string | null
  foto_perfil_url: string | null
  notas: string | null
  is_active: boolean
  consentimiento_datos: boolean
}

export async function updatePaciente(
  id: string,
  formData: UpdatePacienteData
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("pacientes")
    .update({
      dni: formData.dni,
      nombre: formData.nombre,
      apellido: formData.apellido,
      fecha_nacimiento: formData.fecha_nacimiento,
      genero: formData.genero,
      telefono: formData.telefono || null,
      email: formData.email || null, // Convert empty string to null for unique constraint
      domicilio: formData.domicilio || null,
      obra_social_id: formData.obra_social_id || null,
      plan: formData.plan || null,
      numero_afiliado: formData.numero_afiliado || null,
      foto_perfil_url: formData.foto_perfil_url || null,
      notas: formData.notas || null,
      is_active: formData.is_active,
      consentimiento_datos: formData.consentimiento_datos,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pacientes/[id]", "page")
  revalidatePath("/pacientes", "page")

  return { success: true, error: null }
}

/**
 * Delete a paciente
 */
export async function deletePaciente(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("pacientes")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pacientes", "page")

  return { success: true, error: null }
}

/**
 * Fetch all consultas for a specific patient
 * Note: médico nombre/apellido come from usuarios_pms via user_id JOIN
 */
export async function fetchPacienteConsultas(pacienteId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("consultas")
    .select(`
      *,
      paciente:pacientes!inner(id, nombre, apellido),
      medico:medicos!inner(id, user_id, usuarios_pms!inner(nombre, apellido)),
      estado:estados_consulta!inner(*)
    `)
    .eq("paciente_id", pacienteId)
    .is("medico.deleted_at", null)
    .order("fecha_hora", { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform the data to match ConsultaWithRelations type
  // Extract nombre/apellido from usuarios_pms for medico
  const transformedData = data?.map((item: {
    medico: { id: string; user_id: string; usuarios_pms?: { nombre?: string; apellido?: string } } | Array<{ id: string; user_id: string; usuarios_pms?: { nombre?: string; apellido?: string } }>
    paciente: { id: string; nombre: string; apellido: string } | Array<{ id: string; nombre: string; apellido: string }>
    estado: { id: string; codigo: string; nombre: string } | Array<{ id: string; codigo: string; nombre: string }>
    [key: string]: unknown
  }) => {
    const medico = Array.isArray(item.medico) ? item.medico[0] : item.medico
    return {
      ...item,
      paciente: Array.isArray(item.paciente) ? item.paciente[0] : item.paciente,
      medico: {
        id: medico.id,
        user_id: medico.user_id,
        nombre: medico.usuarios_pms?.nombre,
        apellido: medico.usuarios_pms?.apellido,
      },
      estado: Array.isArray(item.estado) ? item.estado[0] : item.estado,
    }
  }) || []

  return { data: transformedData as ConsultaWithRelations[], error: null }
}
