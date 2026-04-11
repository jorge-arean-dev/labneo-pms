/**
 * Role Types
 *
 * Type definitions for user roles in the PMS system
 */

import { Database } from './database.types'

export type Role = Database['public']['Tables']['roles']['Row']
export type RoleInsert = Database['public']['Tables']['roles']['Insert']
export type RoleUpdate = Database['public']['Tables']['roles']['Update']

/**
 * Role names as constants for type safety
 */
export const ROLE_NAMES = {
  ADMINISTRACION: 'Administracion',
  ODONTOLOGO: 'Odontologo',
} as const

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES]

/**
 * Helper type for role validation
 */
export function isValidRoleName(name: string): name is RoleName {
  return Object.values(ROLE_NAMES).includes(name as RoleName)
}
