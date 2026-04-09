/**
 * Estado color utilities for badges — Portal Labneo
 *
 * Uses estados_solicitud table for dynamic status management.
 * These helpers provide fallback colors based on known estado codes.
 */

/**
 * Returns the display label for a solicitud estado code.
 * Used by solicitudes table and detail pages.
 */
export function getEstadoSolicitudLabel(codigo: string): string {
  switch (codigo) {
    case "pendiente":
      return "Pendiente"
    case "en_revision":
      return "En revisión"
    case "aprobada":
      return "Aprobada"
    case "rechazada":
      return "Rechazada"
    case "completada":
      return "Completada"
    default:
      return codigo
  }
}

export function getEstadoSolicitudColor(codigo: string): string {
  switch (codigo) {
    case "pendiente":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "en_revision":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    case "aprobada":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    case "rechazada":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    case "completada":
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
  }
}
