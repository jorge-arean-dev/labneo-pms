'use server'

/**
 * Avatar Actions
 *
 * Server actions for handling avatar uploads and updates
 */

import { createClient } from '@/lib/supabase/server'
import {
  uploadAvatar,
  deleteAvatar,
  type AvatarEntityType,
} from '@/lib/storage/avatar-utils'
import { revalidatePath } from 'next/cache'

/**
 * Response type for avatar actions
 */
export interface AvatarActionResponse {
  success: boolean
  message?: string
  publicUrl?: string
  error?: string
}

/**
 * Uploads a user avatar and updates the usuarios_pms.foto_perfil_url
 *
 * @param formData - FormData containing the file and userId
 * @returns ActionResponse with success status and public URL or error message
 */
export async function uploadUserAvatar(
  formData: FormData
): Promise<AvatarActionResponse> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado. Por favor, inicia sesión.',
      }
    }

    // Get file from formData
    const file = formData.get('file') as File | null
    if (!file) {
      return {
        success: false,
        error: 'No se proporcionó ningún archivo',
      }
    }

    // Get target user ID (for admin uploads) or use current user ID
    const targetUserId = (formData.get('userId') as string) || user.id

    // Check if user is authorized to upload for this user
    if (targetUserId !== user.id) {
      // Check if current user is admin
      const { data: currentUser, error: userError } = await supabase
        .from('usuarios_pms')
        .select('rol_id, roles!inner(nombre)')
        .eq('id', user.id)
        .single()

      if (userError || !currentUser) {
        return {
          success: false,
          error: 'No se pudo verificar los permisos del usuario',
        }
      }

      // @ts-expect-error - roles is joined
      if (currentUser.roles.nombre !== 'Administrador') {
        return {
          success: false,
          error: 'No tienes permisos para subir avatares de otros usuarios',
        }
      }
    }

    // Upload avatar to storage
    const uploadResult = await uploadAvatar(file, 'usuarios', targetUserId)

    if (!uploadResult.success || !uploadResult.publicUrl) {
      return {
        success: false,
        error: uploadResult.error || 'Error al subir el archivo',
      }
    }

    // Update usuarios_pms with new avatar URL
    const { error: updateError } = await supabase
      .from('usuarios_pms')
      .update({ foto_perfil_url: uploadResult.publicUrl })
      .eq('id', targetUserId)

    if (updateError) {
      // If database update fails, try to delete the uploaded file
      await deleteAvatar('usuarios', targetUserId)
      return {
        success: false,
        error: `Error al actualizar el perfil: ${updateError.message}`,
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/settings')
    revalidatePath(`/usuarios/${targetUserId}`)

    return {
      success: true,
      message: 'Avatar actualizado exitosamente',
      publicUrl: uploadResult.publicUrl,
    }
  } catch (error) {
    console.error('Unexpected error in uploadUserAvatar:', error)
    return {
      success: false,
      error: 'Error inesperado al subir el avatar',
    }
  }
}

/**
 * Deletes a user avatar and removes the URL from usuarios_pms.foto_perfil_url
 *
 * @param userId - ID of the user (optional, defaults to current user)
 * @returns ActionResponse with success status
 */
export async function deleteUserAvatar(
  userId?: string
): Promise<AvatarActionResponse> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado. Por favor, inicia sesión.',
      }
    }

    // Use current user ID if not specified
    const targetUserId = userId || user.id

    // Check if user is authorized to delete for this user
    if (targetUserId !== user.id) {
      // Check if current user is admin
      const { data: currentUser, error: userError } = await supabase
        .from('usuarios_pms')
        .select('rol_id, roles!inner(nombre)')
        .eq('id', user.id)
        .single()

      if (userError || !currentUser) {
        return {
          success: false,
          error: 'No se pudo verificar los permisos del usuario',
        }
      }

      // @ts-expect-error - roles is joined
      if (currentUser.roles.nombre !== 'Administrador') {
        return {
          success: false,
          error: 'No tienes permisos para eliminar avatares de otros usuarios',
        }
      }
    }

    // Delete avatar from storage
    const deleteResult = await deleteAvatar('usuarios', targetUserId)

    if (!deleteResult.success) {
      return {
        success: false,
        error: deleteResult.error || 'Error al eliminar el archivo',
      }
    }

    // Update usuarios_pms to remove avatar URL
    const { error: updateError } = await supabase
      .from('usuarios_pms')
      .update({ foto_perfil_url: null })
      .eq('id', targetUserId)

    if (updateError) {
      return {
        success: false,
        error: `Error al actualizar el perfil: ${updateError.message}`,
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/settings')
    revalidatePath(`/usuarios/${targetUserId}`)

    return {
      success: true,
      message: 'Avatar eliminado exitosamente',
    }
  } catch (error) {
    console.error('Unexpected error in deleteUserAvatar:', error)
    return {
      success: false,
      error: 'Error inesperado al eliminar el avatar',
    }
  }
}

/**
 * Generic function to upload avatar for any entity type (usuarios or pacientes)
 * This will be useful when pacientes table is created
 *
 * @param file - File to upload
 * @param entityType - Type of entity (usuarios or pacientes)
 * @param entityId - ID of the entity
 * @param tableName - Name of the table to update
 * @returns ActionResponse with success status
 */
export async function uploadEntityAvatar(
  file: File,
  entityType: AvatarEntityType,
  entityId: string,
  tableName: 'usuarios_pms' | 'pacientes'
): Promise<AvatarActionResponse> {
  try {
    const supabase = await createClient()

    // Get current user for authorization check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado. Por favor, inicia sesión.',
      }
    }

    // Upload avatar to storage
    const uploadResult = await uploadAvatar(file, entityType, entityId)

    if (!uploadResult.success || !uploadResult.publicUrl) {
      return {
        success: false,
        error: uploadResult.error || 'Error al subir el archivo',
      }
    }

    // Update table with new avatar URL
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ foto_perfil_url: uploadResult.publicUrl })
      .eq('id', entityId)

    if (updateError) {
      // If database update fails, try to delete the uploaded file
      await deleteAvatar(entityType, entityId)
      return {
        success: false,
        error: `Error al actualizar: ${updateError.message}`,
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard')

    return {
      success: true,
      message: 'Avatar actualizado exitosamente',
      publicUrl: uploadResult.publicUrl,
    }
  } catch (error) {
    console.error('Unexpected error in uploadEntityAvatar:', error)
    return {
      success: false,
      error: 'Error inesperado al subir el avatar',
    }
  }
}
