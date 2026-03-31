/**
 * Role color utilities for the sidebar user section
 *
 * Colors are chosen to be:
 * - Visible in both light and dark modes
 * - Non-distracting (professional internal tool)
 * - Semantically meaningful for each role
 */

export type RoleName = "administrador" | "medico" | "recepcionista"

/**
 * Returns Tailwind CSS classes for the role color
 * Works in both light and dark modes
 */
export function getRoleColor(role: string): string {
  const normalizedRole = role.toLowerCase()

  switch (normalizedRole) {
    case "administrador":
      // Amber/Gold - Premium, authority, full system access
      return "text-amber-600 dark:text-amber-400"
    case "medico":
    case "médico":
      // Blue - Professional, medical, trustworthy
      return "text-blue-600 dark:text-blue-400"
    case "recepcionista":
      // Emerald/Green - Approachable, operational support
      return "text-emerald-600 dark:text-emerald-400"
    default:
      return "text-muted-foreground"
  }
}

/**
 * Returns the display name for a role (with proper capitalization and accents)
 */
export function getRoleDisplayName(role: string): string {
  const normalizedRole = role.toLowerCase()

  switch (normalizedRole) {
    case "administrador":
      return "Administrador"
    case "medico":
    case "médico":
      return "Médico"
    case "recepcionista":
      return "Recepcionista"
    default:
      return role
  }
}
