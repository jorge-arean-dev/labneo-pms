/**
 * Estado color utilities for badges — Portal Labneo
 *
 * Solicitudes: enviada, en_proceso, alta_generada
 * Citas fotogrametría: pendiente, aceptada, finalizada, rechazada
 */

export function getEstadoSolicitudColor(estado: string): string {
  switch (estado) {
    case "enviada":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "en_proceso":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    case "alta_generada":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
  }
}

export function getEstadoSolicitudLabel(estado: string): string {
  switch (estado) {
    case "enviada":
      return "Enviada"
    case "en_proceso":
      return "En proceso"
    case "alta_generada":
      return "Alta generada"
    default:
      return estado
  }
}

export function getEstadoCitaColor(estado: string): string {
  switch (estado) {
    case "pendiente":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "aceptada":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    case "finalizada":
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
    case "rechazada":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
  }
}

export function getEstadoCitaLabel(estado: string): string {
  switch (estado) {
    case "pendiente":
      return "Pendiente"
    case "aceptada":
      return "Aceptada"
    case "finalizada":
      return "Finalizada"
    case "rechazada":
      return "Rechazada"
    default:
      return estado
  }
}
