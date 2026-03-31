/**
 * Avatar Storage Utilities
 *
 * Helper functions for managing avatar uploads in Supabase Storage
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Avatar entity types
 */
export type AvatarEntityType = 'usuarios' | 'pacientes'

/**
 * Allowed image MIME types for avatars
 */
export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/**
 * Maximum file size for avatars (5MB)
 */
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB in bytes

/**
 * Storage bucket name for avatars
 */
export const AVATARS_BUCKET = 'avatars'

/**
 * Generates the storage path for an avatar
 *
 * @param entityType - Type of entity (usuarios or pacientes)
 * @param entityId - ID of the entity
 * @param filename - Original filename (extension will be preserved)
 * @returns Storage path in format: {entityType}/{entityId}/avatar.{ext}
 */
export function generateAvatarPath(
  entityType: AvatarEntityType,
  entityId: string,
  filename: string
): string {
  const extension = filename.split('.').pop()?.toLowerCase() || 'jpg'
  return `${entityType}/${entityId}/avatar.${extension}`
}

/**
 * Validates if a file is a valid avatar image
 *
 * @param file - File to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateAvatarFile(file: File): {
  isValid: boolean
  error?: string
} {
  // Check file size
  if (file.size > MAX_AVATAR_SIZE) {
    return {
      isValid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_AVATAR_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check file type
  if (!ALLOWED_AVATAR_TYPES.includes(file.type as typeof ALLOWED_AVATAR_TYPES[number])) {
    return {
      isValid: false,
      error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o GIF',
    }
  }

  return { isValid: true }
}

/**
 * Uploads an avatar file to storage
 *
 * @param file - File to upload
 * @param entityType - Type of entity (usuarios or pacientes)
 * @param entityId - ID of the entity
 * @returns Object with success flag, public URL if successful, or error message
 */
export async function uploadAvatar(
  file: File,
  entityType: AvatarEntityType,
  entityId: string
): Promise<{
  success: boolean
  publicUrl?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validate file
    const validation = validateAvatarFile(file)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    // Generate storage path
    const filePath = generateAvatarPath(entityType, entityId, file.name)

    // Delete old avatar if exists (to avoid accumulating files)
    await deleteAvatar(entityType, entityId)

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        success: false,
        error: `Error al subir el archivo: ${uploadError.message}`,
      }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)

    return {
      success: true,
      publicUrl,
    }
  } catch (error) {
    console.error('Unexpected error uploading avatar:', error)
    return {
      success: false,
      error: 'Error inesperado al subir el archivo',
    }
  }
}

/**
 * Deletes an avatar from storage
 *
 * @param entityType - Type of entity (usuarios or pacientes)
 * @param entityId - ID of the entity
 * @returns Success flag
 */
export async function deleteAvatar(
  entityType: AvatarEntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // List all files in the entity's folder
    const { data: files, error: listError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(`${entityType}/${entityId}`)

    if (listError) {
      // If folder doesn't exist, that's fine
      if (listError.message.includes('not found')) {
        return { success: true }
      }
      return { success: false, error: listError.message }
    }

    if (!files || files.length === 0) {
      return { success: true }
    }

    // Delete all files in the folder
    const filePaths = files.map((file) => `${entityType}/${entityId}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .remove(filePaths)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting avatar:', error)
    return { success: false, error: 'Error inesperado al eliminar el archivo' }
  }
}

/**
 * Gets the public URL for an avatar from its storage path
 *
 * @param storagePath - Full storage path to the avatar
 * @returns Public URL or null if invalid
 */
export async function getAvatarPublicUrl(
  storagePath: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath)

    return publicUrl
  } catch (error) {
    console.error('Error getting avatar public URL:', error)
    return null
  }
}

/**
 * Extracts entity type and ID from a storage path
 *
 * @param storagePath - Storage path in format: {entityType}/{entityId}/avatar.{ext}
 * @returns Object with entityType and entityId or null if invalid
 */
export function parseAvatarPath(storagePath: string): {
  entityType: AvatarEntityType
  entityId: string
} | null {
  const parts = storagePath.split('/')
  if (parts.length < 2) return null

  const entityType = parts[0] as AvatarEntityType
  const entityId = parts[1]

  if (!['usuarios', 'pacientes'].includes(entityType)) return null
  if (!entityId) return null

  return { entityType, entityId }
}
