"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { OdontologoListItem } from "@/lib/types/entities"

// ============================================================================
// Admin guard
// ============================================================================

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, error: "No autenticado" }
  }

  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("roles(nombre)")
    .eq("id", user.id)
    .single()

  const role = (userData?.roles as unknown as { nombre: string } | null)?.nombre
  if (role !== "Administracion") {
    return { ok: false as const, error: "No autorizado" }
  }

  return { ok: true as const, supabase, userId: user.id }
}

// ============================================================================
// List odontólogos (for the /odontologos admin table)
// ============================================================================
//
// Returns every user with role='Odontologo', joined with their odontologos_perfil
// and localidad (both optional via LEFT JOIN). The `vevi_password` column is
// intentionally excluded — it's fetched on-demand via fetchOdontologoVeviCredentials.

interface RawRow {
  id: string
  nombre: string
  apellido: string
  email: string
  created_at: string
  roles: { nombre: string } | null
  odontologos_perfil:
    | {
        telefono: string | null
        cuit: string | null
        situacion_iva: string | null
        direccion_consultorio: string | null
        localidad_id: string | null
        vevi_usuario: string | null
        vevi_registrado_at: string | null
        vevi_comentarios: string | null
        localidades: { id: string; nombre_display: string } | null
      }
    | null
}

export async function fetchOdontologos(): Promise<{
  data: OdontologoListItem[] | null
  error: string | null
}> {
  const guard = await assertAdmin()
  if (!guard.ok) return { data: null, error: guard.error }

  const { data, error } = await guard.supabase
    .from("usuarios_pms")
    .select(
      `
      id, nombre, apellido, email, created_at,
      roles!inner(nombre),
      odontologos_perfil(
        telefono, cuit, situacion_iva, direccion_consultorio, localidad_id,
        vevi_usuario, vevi_registrado_at, vevi_comentarios,
        localidades(id, nombre_display)
      )
    `
    )
    .eq("roles.nombre", "Odontologo")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const rows = (data as unknown as RawRow[]) ?? []
  const flattened: OdontologoListItem[] = rows.map((row) => {
    const perfil = row.odontologos_perfil
    return {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      created_at: row.created_at,
      telefono: perfil?.telefono ?? null,
      cuit: perfil?.cuit ?? null,
      situacion_iva: perfil?.situacion_iva ?? null,
      direccion_consultorio: perfil?.direccion_consultorio ?? null,
      localidad_id: perfil?.localidad_id ?? null,
      localidad_nombre: perfil?.localidades?.nombre_display ?? null,
      vevi_usuario: perfil?.vevi_usuario ?? null,
      vevi_registrado_at: perfil?.vevi_registrado_at ?? null,
      vevi_comentarios: perfil?.vevi_comentarios ?? null,
    }
  })

  return { data: flattened, error: null }
}

// ============================================================================
// Fetch a single odontólogo's Vevi credentials (admin-only, on-demand)
// ============================================================================

export async function fetchOdontologoVeviCredentials(odontologoId: string): Promise<{
  data: {
    vevi_usuario: string | null
    vevi_password: string | null
    vevi_comentarios: string | null
    vevi_registrado_at: string | null
  } | null
  error: string | null
}> {
  const guard = await assertAdmin()
  if (!guard.ok) return { data: null, error: guard.error }

  const { data, error } = await guard.supabase
    .from("odontologos_perfil")
    .select("vevi_usuario, vevi_password, vevi_comentarios, vevi_registrado_at")
    .eq("usuario_id", odontologoId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: data ?? {
      vevi_usuario: null,
      vevi_password: null,
      vevi_comentarios: null,
      vevi_registrado_at: null,
    },
    error: null,
  }
}

// ============================================================================
// Update odontólogo Vevi credentials (admin-only, unconditional email)
// ============================================================================
//
// Writes the new credentials to odontologos_perfil. If the odontólogo wasn't
// previously registered (vevi_registrado_at IS NULL), this call also acts as
// the retroactive registration — sets vevi_registrado_at = now() so the
// sidebar unlocks "Acceso Vevi" for them.
//
// An email with the updated credentials is ALWAYS sent (no toggle gating),
// because silently changing a user's password without notifying them is a
// security/UX footgun.

export interface UpdateVeviCredentialsData {
  vevi_usuario: string
  vevi_password: string
  vevi_comentarios?: string | null
}

export async function updateOdontologoVeviCredentials(
  odontologoId: string,
  formData: UpdateVeviCredentialsData
): Promise<{
  success: boolean
  error: string | null
  data: OdontologoListItem | null
}> {
  const guard = await assertAdmin()
  if (!guard.ok) return { success: false, error: guard.error, data: null }

  // Basic validation
  if (!formData.vevi_usuario?.trim() || !formData.vevi_password?.trim()) {
    return {
      success: false,
      error: "El usuario y la contraseña son obligatorios",
      data: null,
    }
  }

  // Fetch current perfil to know if this is a retroactive registration
  const { data: currentPerfil, error: fetchError } = await guard.supabase
    .from("odontologos_perfil")
    .select("id, vevi_registrado_at")
    .eq("usuario_id", odontologoId)
    .single()

  if (fetchError || !currentPerfil) {
    return {
      success: false,
      error: "No se encontró el perfil del odontólogo",
      data: null,
    }
  }

  const isRetroactiveRegistration = !currentPerfil.vevi_registrado_at

  const updatePayload: Record<string, unknown> = {
    vevi_usuario: formData.vevi_usuario.trim(),
    vevi_password: formData.vevi_password.trim(),
    vevi_comentarios: formData.vevi_comentarios?.trim() || null,
  }
  if (isRetroactiveRegistration) {
    updatePayload.vevi_registrado_at = new Date().toISOString()
  }

  const { error: updateError } = await guard.supabase
    .from("odontologos_perfil")
    .update(updatePayload)
    .eq("id", currentPerfil.id)

  if (updateError) {
    return { success: false, error: updateError.message, data: null }
  }

  // Fetch the full list row to return for optimistic UI
  const { data: userData, error: userFetchError } = await guard.supabase
    .from("usuarios_pms")
    .select(
      `
      id, nombre, apellido, email, created_at,
      odontologos_perfil(
        telefono, cuit, situacion_iva, direccion_consultorio, localidad_id,
        vevi_usuario, vevi_registrado_at, vevi_comentarios,
        localidades(id, nombre_display)
      )
    `
    )
    .eq("id", odontologoId)
    .single()

  let returnData: OdontologoListItem | null = null
  if (!userFetchError && userData) {
    const raw = userData as unknown as RawRow
    const perfil = raw.odontologos_perfil
    returnData = {
      id: raw.id,
      nombre: raw.nombre,
      apellido: raw.apellido,
      email: raw.email,
      created_at: raw.created_at,
      telefono: perfil?.telefono ?? null,
      cuit: perfil?.cuit ?? null,
      situacion_iva: perfil?.situacion_iva ?? null,
      direccion_consultorio: perfil?.direccion_consultorio ?? null,
      localidad_id: perfil?.localidad_id ?? null,
      localidad_nombre: perfil?.localidades?.nombre_display ?? null,
      vevi_usuario: perfil?.vevi_usuario ?? null,
      vevi_registrado_at: perfil?.vevi_registrado_at ?? null,
      vevi_comentarios: perfil?.vevi_comentarios ?? null,
    }
  }

  // Unconditional email — always notify the odontólogo that their credentials
  // changed. Best-effort: email failure does not rollback the DB update.
  try {
    const { sendEmail } = await import("@/lib/email")
    const { protesisCredencialesActualizadasEmail } = await import(
      "@/lib/email/templates"
    )

    if (userData?.email) {
      const { subject, html } = protesisCredencialesActualizadasEmail({
        nombre: userData.nombre,
        apellido: userData.apellido,
        usuario: formData.vevi_usuario.trim(),
        password: formData.vevi_password.trim(),
        comentarios: formData.vevi_comentarios?.trim() || null,
      })

      await sendEmail({
        to: userData.email,
        toName: `${userData.nombre} ${userData.apellido}`,
        subject,
        html,
      })
    }
  } catch (emailError) {
    console.error("Error sending Vevi credentials updated email:", emailError)
  }

  revalidatePath("/odontologos", "page")
  revalidatePath("/acceso-vevi", "page")
  return { success: true, error: null, data: returnData }
}
