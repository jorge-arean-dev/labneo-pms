"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { getBaseUrl } from "@/lib/utils/get-base-url"

// Types
export interface ObraSocialOption {
  id: string
  nombre: string
}

export interface Medico {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  matricula: string
  user_id: string
  foto_perfil_url: string | null
  last_sign_in_at: string | null
  activated_at: string | null
  created_at: string
  obras_sociales?: ObraSocialOption[]
}

export interface CreateMedicoData {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  matricula?: string
}

// Info about a deleted médico for reactivation confirmation
export interface DeletedMedicoInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  deletedAt: string
}

// Check if email belongs to a soft-deleted médico
export async function checkDeletedMedicoByEmail(
  email: string
): Promise<{ exists: boolean; deletedMedico: DeletedMedicoInfo | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Check if current user is admin
    const { data: userRole } = await supabase.rpc('get_user_role')
    if (userRole !== 'Administrador') {
      return { exists: false, deletedMedico: null, error: "No tiene permisos" }
    }

    // Check if user with this email exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (!existingUser) {
      return { exists: false, deletedMedico: null, error: null }
    }

    // Check if there's a soft-deleted médico with this user_id
    const { data: deletedMedico } = await adminClient
      .from("medicos")
      .select("id, email, deleted_at")
      .eq("user_id", existingUser.id)
      .not("deleted_at", "is", null)
      .single()

    if (!deletedMedico) {
      // User exists but no deleted médico - could be active médico or different role
      const { data: activeMedico } = await adminClient
        .from("medicos")
        .select("id")
        .eq("user_id", existingUser.id)
        .is("deleted_at", null)
        .single()

      if (activeMedico) {
        return { exists: false, deletedMedico: null, error: "Ya existe un médico activo con este correo electrónico" }
      }

      return { exists: false, deletedMedico: null, error: "Este correo electrónico ya está asociado a otro usuario del sistema" }
    }

    // Get nombre/apellido from usuarios_pms
    const { data: usuarioPms } = await supabase
      .from("usuarios_pms")
      .select("nombre, apellido")
      .eq("id", existingUser.id)
      .single()

    return {
      exists: true,
      deletedMedico: {
        id: deletedMedico.id,
        nombre: usuarioPms?.nombre || "Desconocido",
        apellido: usuarioPms?.apellido || "",
        email: deletedMedico.email,
        deletedAt: deletedMedico.deleted_at,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error checking deleted médico:", error)
    return { exists: false, deletedMedico: null, error: "Error al verificar el correo electrónico" }
  }
}

// Fetch all médicos with user info
// Note: nombre/apellido come from usuarios_pms via user_id JOIN
export async function fetchMedicos(): Promise<{ data: Medico[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Fetch médicos with usuarios_pms data (nombre/apellido/activated_at from usuarios_pms)
    const { data: medicosData, error: medicosError } = await supabase
      .from("medicos")
      .select(`
        id,
        email,
        telefono,
        matricula,
        user_id,
        created_at,
        usuarios_pms!inner(nombre, apellido, foto_perfil_url, activated_at)
      `)
      .is("deleted_at", null)

    if (medicosError) {
      console.error("Error fetching médicos:", medicosError)
      return { data: null, error: medicosError.message }
    }

    if (!medicosData || medicosData.length === 0) {
      return { data: [], error: null }
    }

    // Fetch obras sociales for all médicos
    const { data: obrasSocialesData, error: obrasSocialesError } = await supabase
      .from("medicos_obras_sociales")
      .select("medico_id, obras_sociales!inner(id, nombre)")
      .in("medico_id", medicosData.map((m) => m.id))

    if (obrasSocialesError) {
      console.error("Error fetching obras sociales:", obrasSocialesError)
    }

    // Fetch last_sign_in_at from auth.users using admin API
    const adminClient = createAdminClient()

    type MedicoRawData = typeof medicosData[number] & {
      usuarios_pms: { nombre: string; apellido: string; foto_perfil_url: string | null; activated_at: string | null }
    }

    type ObraSocialRelation = {
      medico_id: string
      obras_sociales: { id: string; nombre: string }
    }

    const medicosWithUserData: Medico[] = await Promise.all(
      (medicosData as MedicoRawData[]).map(async (medico) => {
        // Fetch last_sign_in_at using admin API (still needed for último acceso display)
        let lastSignInAt: string | null = null
        try {
          const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(medico.user_id)
          if (!userError && user) {
            lastSignInAt = user.last_sign_in_at || null
          }
        } catch (_error) {
          console.error(`Error fetching auth user for medico ${medico.id}:`, _error)
        }

        // Get obras sociales for this médico
        const medicoObrasSociales = (obrasSocialesData as ObraSocialRelation[] | null)
          ?.filter((os) => os.medico_id === medico.id)
          .map((os) => ({
            id: os.obras_sociales.id,
            nombre: os.obras_sociales.nombre,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)) || []

        return {
          id: medico.id,
          nombre: medico.usuarios_pms.nombre,
          apellido: medico.usuarios_pms.apellido,
          email: medico.email,
          telefono: medico.telefono,
          matricula: medico.matricula,
          user_id: medico.user_id,
          created_at: medico.created_at,
          foto_perfil_url: medico.usuarios_pms.foto_perfil_url || null,
          last_sign_in_at: lastSignInAt,
          activated_at: medico.usuarios_pms.activated_at,
          obras_sociales: medicoObrasSociales,
        }
      })
    )

    // Sort by apellido, then nombre (since we can't order by joined table)
    medicosWithUserData.sort((a, b) => {
      const apellidoCompare = a.apellido.localeCompare(b.apellido)
      if (apellidoCompare !== 0) return apellidoCompare
      return a.nombre.localeCompare(b.nombre)
    })

    return { data: medicosWithUserData, error: null }
  } catch (error) {
    console.error("Unexpected error fetching médicos:", error)
    return { data: null, error: "Error inesperado al cargar los médicos" }
  }
}

// Create new médico with platform access
// If a soft-deleted médico with the same email exists, reactivates them instead
export async function createMedicoWithAccess(
  formData: CreateMedicoData
): Promise<{ success: boolean; error: string | null; data?: Medico; reactivated?: boolean }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user for audit fields
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Check if current user is admin
    const { data: userRole } = await supabase.rpc('get_user_role')

    if (userRole !== 'Administrador') {
      return { success: false, error: "No tiene permisos para crear médicos" }
    }

    // Step 1: Check if user with this email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === formData.email)

    if (existingUser) {
      // User exists - check if there's a soft-deleted médico we can reactivate
      const { data: deletedMedico } = await adminClient
        .from("medicos")
        .select("id, email, telefono, matricula, user_id, created_at")
        .eq("user_id", existingUser.id)
        .not("deleted_at", "is", null)
        .single()

      if (deletedMedico) {
        // Reactivation flow: soft-deleted médico found
        return await reactivateMedico(
          adminClient,
          supabase,
          existingUser.id,
          deletedMedico.id,
          formData,
          currentUser.id
        )
      }

      // Check if there's an active médico with this email
      const { data: activeMedico } = await adminClient
        .from("medicos")
        .select("id")
        .eq("user_id", existingUser.id)
        .is("deleted_at", null)
        .single()

      if (activeMedico) {
        return { success: false, error: "Ya existe un médico activo con este correo electrónico" }
      }

      // User exists but is not a médico (could be recepcionista or admin)
      return { success: false, error: "Este correo electrónico ya está asociado a otro usuario del sistema" }
    }

    // Step 2: Create new auth user and send invite email
    // inviteUserByEmail creates the user AND sends the invite email using the "Invite user" template
    const { data: authUser, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      formData.email,
      {
        redirectTo: `${getBaseUrl()}/auth/set-password`,
      }
    )

    if (authError || !authUser.user) {
      console.error("Error inviting user:", authError)
      return { success: false, error: authError?.message || "Error al crear usuario de autenticación" }
    }

    // Step 3: Get role ID for "Medico"
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "Medico")
      .single()

    if (roleError || !roleData) {
      console.error("Error fetching Medico role:", roleError)
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: "Error al obtener el rol de Médico" }
    }

    // Step 4: Upsert into usuarios_pms (insert or update if exists)
    // Note: Database trigger may auto-create usuarios_pms entry, so we use upsert
    const { error: usuarioError } = await supabase.from("usuarios_pms").upsert({
      id: authUser.user.id,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      rol_id: roleData.id,
    })

    if (usuarioError) {
      console.error("Error creating usuario_pms:", usuarioError)
      // Rollback: delete auth user (cascade deletes usuarios_pms)
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: usuarioError.message }
    }

    // Step 5: Insert into medicos
    // Note: nombre/apellido are stored in usuarios_pms (single source of truth)
    const { data: medicoData, error: medicoError } = await supabase
      .from("medicos")
      .insert({
        email: formData.email,
        matricula: formData.matricula || null,
        telefono: formData.telefono || null,
        user_id: authUser.user.id,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      })
      .select("id, email, telefono, matricula, user_id, created_at")
      .single()

    if (medicoError || !medicoData) {
      console.error("Error creating medico:", medicoError)
      // Rollback: delete auth user (cascade deletes usuarios_pms)
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: medicoError?.message || "Error al crear médico" }
    }

    // Note: Invite email was already sent by inviteUserByEmail() in Step 2

    // Revalidate the medicos page
    revalidatePath("/medicos", "page")

    return {
      success: true,
      error: null,
      reactivated: false,
      data: {
        ...medicoData,
        // Get nombre/apellido from usuarios_pms (which we created earlier)
        nombre: formData.nombre,
        apellido: formData.apellido,
        foto_perfil_url: null,
        last_sign_in_at: null,
        activated_at: null, // New user, not yet activated
      },
    }
  } catch (error) {
    console.error("Unexpected error creating médico:", error)
    return { success: false, error: "Error inesperado al crear el médico" }
  }
}

// Reactivate a soft-deleted médico
async function reactivateMedico(
  adminClient: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  medicoId: string,
  formData: CreateMedicoData,
  currentUserId: string
): Promise<{ success: boolean; error: string | null; data?: Medico; reactivated?: boolean }> {
  try {
    // Step 1: Unban the auth user
    const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    })

    if (unbanError) {
      console.error("Error unbanning user:", unbanError)
      return { success: false, error: "Error al reactivar el usuario" }
    }

    // Step 2: Get role ID for "Medico"
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "Medico")
      .single()

    if (roleError || !roleData) {
      console.error("Error fetching Medico role:", roleError)
      return { success: false, error: "Error al obtener el rol de Médico" }
    }

    // Step 3: Update usuarios_pms with new info
    const { error: usuarioError } = await supabase
      .from("usuarios_pms")
      .update({
        nombre: formData.nombre,
        apellido: formData.apellido,
        rol_id: roleData.id,
      })
      .eq("id", userId)

    if (usuarioError) {
      console.error("Error updating usuario_pms:", usuarioError)
      return { success: false, error: usuarioError.message }
    }

    // Step 4: Reactivate médico (clear deleted_at, update info)
    // Use admin client to bypass RLS
    const { data: medicoData, error: medicoError } = await adminClient
      .from("medicos")
      .update({
        deleted_at: null,
        matricula: formData.matricula || null,
        telefono: formData.telefono || null,
        updated_by: currentUserId,
      })
      .eq("id", medicoId)
      .select("id, email, telefono, matricula, user_id, created_at")
      .single()

    if (medicoError || !medicoData) {
      console.error("Error reactivating medico:", medicoError)
      return { success: false, error: medicoError?.message || "Error al reactivar médico" }
    }

    // Step 5: Send new invite email
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      formData.email,
      {
        redirectTo: `${getBaseUrl()}/auth/set-password`,
      }
    )

    if (inviteError) {
      // If invite fails because user already confirmed, try sending a password reset instead
      if (inviteError.message?.includes("already been registered") ||
          inviteError.message?.includes("already confirmed")) {
        // User already exists, send password reset email instead
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${getBaseUrl()}/auth/reset-password`,
        })

        if (resetError) {
          console.error("Error sending password reset email:", resetError)
          // Don't fail - médico was reactivated successfully
        }
      } else {
        console.error("Error sending invite email:", inviteError)
        // Don't fail - médico was reactivated successfully
      }
    }

    // Revalidate the medicos page
    revalidatePath("/medicos", "page")

    return {
      success: true,
      error: null,
      reactivated: true,
      data: {
        ...medicoData,
        nombre: formData.nombre,
        apellido: formData.apellido,
        foto_perfil_url: null,
        last_sign_in_at: null,
        activated_at: null, // Reactivated user needs to set password again
      },
    }
  } catch (error) {
    console.error("Unexpected error reactivating médico:", error)
    return { success: false, error: "Error inesperado al reactivar el médico" }
  }
}

// Reset médico password
export async function resetMedicoPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: userRole } = await supabase.rpc('get_user_role')

    if (userRole !== 'Administrador') {
      return { success: false, error: "No tiene permisos para restablecer contraseñas" }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/reset-password`,
    })

    if (error) {
      console.error("Error sending password reset email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error resetting password:", error)
    return { success: false, error: "Error inesperado al restablecer la contraseña" }
  }
}

// Re-send invitation to médico who hasn't completed setup
export async function resendMedicoInvite(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const { data: userRole } = await supabase.rpc('get_user_role')

    if (userRole !== 'Administrador') {
      return { success: false, error: "No tiene permisos para reenviar invitaciones" }
    }

    // Re-send invitation using admin API
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/set-password`,
    })

    if (error) {
      // If invite fails because user already clicked the link (email_exists),
      // fall back to password reset which will allow them to set their password
      if (error.code === "email_exists" || error.message?.includes("already been registered")) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getBaseUrl()}/auth/reset-password`,
        })

        if (resetError) {
          console.error("Error sending password reset email:", resetError)
          return { success: false, error: resetError.message }
        }

        // Password reset sent successfully
        return { success: true, error: null }
      }

      console.error("Error resending invite email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error resending invite:", error)
    return { success: false, error: "Error inesperado al reenviar la invitación" }
  }
}

// Soft delete médico
export async function deleteMedico(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Usuario no autenticado" }
    }

    // Check if current user is admin
    const { data: userRole } = await supabase.rpc('get_user_role')

    if (userRole !== 'Administrador') {
      return { success: false, error: "No tiene permisos para eliminar médicos" }
    }

    // Get médico data before deletion
    const { data: medico, error: fetchError } = await supabase
      .from("medicos")
      .select("user_id, email")
      .eq("id", id)
      .single()

    if (fetchError || !medico) {
      console.error("Error fetching médico:", fetchError)
      return { success: false, error: "Médico no encontrado" }
    }

    // Soft delete: set deleted_at timestamp
    // Use admin client to bypass RLS (we've already verified user is admin above)
    const { error: deleteError } = await adminClient
      .from("medicos")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id)

    if (deleteError) {
      console.error("Error soft deleting médico:", deleteError)
      return { success: false, error: deleteError.message }
    }

    // Ban the auth user to prevent login
    const { error: banError } = await adminClient.auth.admin.updateUserById(medico.user_id, {
      ban_duration: "876000h", // ~100 years (effectively permanent)
    })

    if (banError) {
      console.error("Error banning user:", banError)
      // Don't rollback soft delete - just log the error
    }

    // Revalidate the medicos page
    revalidatePath("/medicos")

    return { success: true, error: null }
  } catch (error) {
    console.error("Unexpected error deleting médico:", error)
    return { success: false, error: "Error inesperado al eliminar el médico" }
  }
}

// ============================================================================
// DELETE MEDICO FLOW - Consultas programadas and transfer actions
// ============================================================================

/**
 * Consulta programada for delete medico flow
 */
export interface ConsultaProgramada {
  id: string
  fecha_hora: string
  paciente_nombre: string
  paciente_apellido: string
}

/**
 * Fetch consultas with estado "programada" for a médico
 * Used to check if transfers are needed before deletion
 */
export async function fetchMedicoProgramadas(medicoId: string): Promise<{
  data: ConsultaProgramada[] | null
  error: string | null
}> {
  const supabase = await createClient()

  // Get the programada estado ID
  const { data: estadoProgramada, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "programada")
    .single()

  if (estadoError || !estadoProgramada) {
    return { data: null, error: "No se pudo obtener el estado programada" }
  }

  // Fetch consultas with estado programada for this medico
  const { data, error } = await supabase
    .from("consultas")
    .select(`
      id,
      fecha_hora,
      pacientes!inner(nombre, apellido)
    `)
    .eq("medico_id", medicoId)
    .eq("estado_id", estadoProgramada.id)
    .order("fecha_hora", { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform the data
  const consultas: ConsultaProgramada[] = (data || []).map((c) => {
    const paciente = c.pacientes as unknown as { nombre: string; apellido: string }
    return {
      id: c.id,
      fecha_hora: c.fecha_hora,
      paciente_nombre: paciente.nombre,
      paciente_apellido: paciente.apellido,
    }
  })

  return { data: consultas, error: null }
}

/**
 * Médico option for transfer dropdown
 */
export interface MedicoTransferOption {
  id: string
  nombre: string
  apellido: string
}

/**
 * Fetch available médicos for transfer (excluding the one being deleted)
 */
export async function fetchAvailableMedicosForTransfer(excludeMedicoId: string): Promise<{
  data: MedicoTransferOption[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("medicos")
    .select(`
      id,
      usuarios_pms!inner(nombre, apellido)
    `)
    .is("deleted_at", null)
    .neq("id", excludeMedicoId)

  if (error) {
    return { data: null, error: error.message }
  }

  // Transform to include nombre/apellido at top level
  const medicos: MedicoTransferOption[] = (data || []).map((m) => {
    const usuario = m.usuarios_pms as unknown as { nombre: string; apellido: string }
    return {
      id: m.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    }
  })

  // Sort by apellido, then nombre
  medicos.sort((a, b) => {
    const apellidoCompare = a.apellido.localeCompare(b.apellido)
    if (apellidoCompare !== 0) return apellidoCompare
    return a.nombre.localeCompare(b.nombre)
  })

  return { data: medicos, error: null }
}

/**
 * Transfer assignment for bulk transfer
 */
export interface TransferAssignment {
  consultaId: string
  medicoDestinoId: string
}

/**
 * Bulk transfer consultas to other médicos
 * Used when deleting a médico with programadas
 */
export async function bulkTransferConsultas(
  medicoOrigenId: string,
  transfers: TransferAssignment[]
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

  // Check if current user is admin
  const { data: userRole } = await supabase.rpc('get_user_role')

  if (userRole !== 'Administrador') {
    return { success: false, error: "No tiene permisos para transferir consultas" }
  }

  // Process each transfer
  for (const transfer of transfers) {
    // Update consulta with new medico
    const { error: updateError } = await supabase
      .from("consultas")
      .update({ medico_id: transfer.medicoDestinoId })
      .eq("id", transfer.consultaId)

    if (updateError) {
      return { success: false, error: `Error al transferir consulta: ${updateError.message}` }
    }

    // Create transfer audit record
    const { error: transferError } = await supabase
      .from("consultas_transferencias")
      .insert({
        consulta_id: transfer.consultaId,
        medico_origen_id: medicoOrigenId,
        medico_destino_id: transfer.medicoDestinoId,
        transferido_por_user_id: user.id,
        motivo: "Transferencia por eliminación de médico",
      })

    if (transferError) {
      return { success: false, error: `Error al registrar transferencia: ${transferError.message}` }
    }
  }

  revalidatePath("/consultas")

  return { success: true, error: null }
}
