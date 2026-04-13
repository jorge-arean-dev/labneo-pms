/**
 * Email Templates Index — Portal Labneo
 *
 * Placeholder — email templates will be rebuilt for Labneo's
 * notification flows (solicitud status changes, cita confirmations)
 */

// Re-export base utilities
export {
  baseTemplate,
  formatDateSpanish,
  formatTimeSpanish,
  capitalize,
} from "./base"

// Prótesis solicitud processing emails
export {
  protesisFirstProcesadaEmail,
  protesisSubsequentProcesadaEmail,
} from "./solicitud-protesis"
