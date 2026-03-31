/**
 * Permission Utilities — Portal Labneo
 *
 * Centralized permission logic for role-based access control
 * Roles: administracion, odontologo, tecnico
 */

export type UserRole = "administracion" | "odontologo" | "tecnico"

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
  if (r === "técnico" || r === "tecnico") return "tecnico"
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

/**
 * Check if role is tecnico
 */
export function isTecnico(role: string): boolean {
  return normalizeRole(role) === "tecnico"
}
