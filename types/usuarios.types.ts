/**
 * Usuario Types
 *
 * Type definitions for extended user data in the PMS system
 */

import { Database } from './database.types'
import { Role } from './roles.types'

export type UsuarioPMS = Database['public']['Tables']['usuarios_pms']['Row']
export type UsuarioPMSInsert = Database['public']['Tables']['usuarios_pms']['Insert']
export type UsuarioPMSUpdate = Database['public']['Tables']['usuarios_pms']['Update']

/**
 * Usuario with joined role information
 */
export interface UsuarioPMSWithRole extends UsuarioPMS {
  role: Role
}

/**
 * Usuario profile data for display purposes
 */
export interface UsuarioProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  rolNombre: string
  fotoPerfilUrl: string | null
}

/**
 * Form data for creating/updating usuario
 */
export interface UsuarioFormData {
  nombre: string
  apellido: string
  email: string
  rolId: string
  fotoPerfilUrl?: string | null
}
