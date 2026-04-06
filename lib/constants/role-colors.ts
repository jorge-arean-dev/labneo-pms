/**
 * Role color utilities for the sidebar user section
 *
 * Colors are chosen to be:
 * - Visible in both light and dark modes
 * - Non-distracting (professional portal)
 * - Semantically meaningful for each role
 */

export type RoleName = "administracion" | "odontologo"

/**
 * Returns Tailwind CSS classes for the role color
 * Works in both light and dark modes
 */
export function getRoleColor(role: string): string {
  const normalizedRole = role.toLowerCase()

  switch (normalizedRole) {
    case "administracion":
    case "administración":
      // Amber/Gold - Authority, full system access
      return "text-amber-600 dark:text-amber-400"
    case "odontologo":
    case "odontólogo":
      // Sky blue - Clinical, trustworthy, health professional
      return "text-sky-600 dark:text-sky-400"
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
    case "administracion":
    case "administración":
      return "Administración"
    case "odontologo":
    case "odontólogo":
      return "Odontólogo"
    default:
      return role
  }
}
