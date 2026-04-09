/**
 * Permission Utilities — Portal Labneo
 *
 * Centralized permission logic for role-based access control
 * Roles: administracion, odontologo
 */

export type UserRole = "administracion" | "odontologo"

export interface PermissionContext {
  role: UserRole
  userId: string
}

/**
 * Normalize role string to lowercase without accents
 */
export function normalizeRole(role: string): UserRole {
  const r = role.toLowerCase()
  if (r === "administración" || r === "administracion") return "administracion"
  if (r === "odontólogo" || r === "odontologo") return "odontologo"
  return r as UserRole
}

/**
 * Check if role is admin
 */
export function isAdmin(role: string): boolean {
  return normalizeRole(role) === "administracion"
}

/**
 * Check if role is odontologo
 */
export function isOdontologo(role: string): boolean {
  return normalizeRole(role) === "odontologo"
}

// ============================================================================
// Tarifarios — admin-only module
// ============================================================================

/** Whether the user can access the /tarifarios admin surface (items + listas). */
export function canAccessTarifarios(role: string): boolean {
  return isAdmin(role)
}
