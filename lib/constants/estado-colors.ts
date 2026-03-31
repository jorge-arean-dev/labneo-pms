/**
 * Centralized color mappings for estados_consulta
 *
 * These colors are used for badges and status indicators throughout the application.
 * All classes are safelisted in tailwind.config.ts to prevent purging.
 */

export type EstadoCodigo = "programada" | "en_curso" | "completada" | "cancelada" | "ausente"

/**
 * Helper function to get the Tailwind classes for a given estado codigo
 * @param codigo - The estado codigo (e.g., "programada", "en_curso")
 * @returns Tailwind CSS classes for the badge
 */
export function getEstadoColor(codigo: string): string {
  switch (codigo) {
    case "programada":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "en_curso":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    case "completada":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    case "cancelada":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    case "ausente":
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
  }
}
