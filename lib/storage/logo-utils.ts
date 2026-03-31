/**
 * Logo Storage Utilities
 *
 * Helper functions for managing clinic logo uploads in Supabase Storage
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Allowed image MIME types for logo
 */
export const ALLOWED_LOGO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const

/**
 * Maximum file size for logo (2MB)
 */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB in bytes

/**
 * Storage bucket name for logo
 */
export const LOGO_BUCKET = 'logo'

/**
 * Generates a unique storage path for the logo using timestamp
 * Each upload creates a new file to avoid upsert/RLS issues
 *
 * @param extension - File extension (jpg, png)
 * @returns Storage path: logo-{timestamp}.{ext}
 */
export function generateLogoPath(extension: string): string {
  const timestamp = Date.now()
  return `logo-${timestamp}.${extension}`
}

/**
 * Validates if a file is a valid logo image
 *
 * @param file - File to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateLogoFile(file: File): {
  isValid: boolean
  error?: string
} {
  // Check file size
  if (file.size > MAX_LOGO_SIZE) {
    return {
      isValid: false,
      error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_LOGO_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check file type
  if (!ALLOWED_LOGO_TYPES.includes(file.type as typeof ALLOWED_LOGO_TYPES[number])) {
    return {
      isValid: false,
      error: 'Tipo de archivo no permitido. Usa JPG o PNG',
    }
  }

  return { isValid: true }
}

/**
 * Uploads a logo file to storage
 *
 * @param file - File to upload
 * @returns Object with success flag, public URL if successful, or error message
 */
export async function uploadLogo(file: File): Promise<{
  success: boolean
  publicUrl?: string
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Validate file
    const validation = validateLogoFile(file)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'

    // Generate unique storage path (new file each time to avoid RLS update issues)
    const filePath = generateLogoPath(extension)

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload file to storage (INSERT, not UPDATE - avoids RLS issues)
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Logo upload error:', uploadError)
      return {
        success: false,
        error: `Error al subir el archivo: ${uploadError.message}`,
      }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath)

    return {
      success: true,
      publicUrl,
    }
  } catch (error) {
    console.error('Unexpected error uploading logo:', error)
    return {
      success: false,
      error: 'Error inesperado al subir el archivo',
    }
  }
}

/**
 * Extracts the filename from a Supabase storage public URL
 *
 * @param publicUrl - The full public URL of the logo
 * @returns The filename or null if invalid
 */
export function extractFilenameFromUrl(publicUrl: string): string | null {
  try {
    // URL format: .../storage/v1/object/public/logo/logo-1234567890.png?t=...
    const url = new URL(publicUrl)
    const pathname = url.pathname
    // Get the last segment (filename)
    const segments = pathname.split('/')
    const filename = segments[segments.length - 1]
    return filename || null
  } catch {
    return null
  }
}

/**
 * Deletes a specific logo file from storage
 *
 * @param filename - The filename to delete (e.g., "logo-1234567890.png")
 * @returns Success flag
 */
export async function deleteLogo(filename?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!filename) {
      // No filename provided, nothing to delete
      return { success: true }
    }

    const supabase = await createClient()

    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([filename])

    if (deleteError) {
      console.error('Error deleting logo:', deleteError)
      // Don't fail - the file might not exist
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting logo:', error)
    return { success: false, error: 'Error inesperado al eliminar el archivo' }
  }
}

/**
 * Gets the public URL for the logo from its storage path
 *
 * @param storagePath - Full storage path to the logo
 * @returns Public URL or null if invalid
 */
export async function getLogoPublicUrl(
  storagePath: string
): Promise<string | null> {
  try {
    const supabase = await createClient()

    const {
      data: { publicUrl },
    } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(storagePath)

    return publicUrl
  } catch (error) {
    console.error('Error getting logo public URL:', error)
    return null
  }
}
