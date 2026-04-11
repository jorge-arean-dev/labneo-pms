/**
 * Terminology Configuration
 *
 * This file controls the labels used throughout the application.
 * Modify these values to adapt the app for different business domains.
 *
 * USAGE:
 * 1. Import the terminology object where needed
 * 2. Use the labels instead of hardcoded strings
 *
 * EXAMPLES BY DOMAIN:
 *
 * Dermatology Clinic (default):
 *   patient: "Paciente", doctor: "Médico", appointment: "Consulta"
 *
 * Veterinary Clinic:
 *   patient: "Mascota", doctor: "Veterinario", appointment: "Consulta"
 *
 * Spa / Wellness Center:
 *   patient: "Cliente", doctor: "Terapeuta", appointment: "Sesión"
 *
 * Dental Clinic:
 *   patient: "Paciente", doctor: "Odontólogo", appointment: "Cita"
 *
 * Physiotherapy:
 *   patient: "Paciente", doctor: "Fisioterapeuta", appointment: "Sesión"
 *
 * Hair Salon:
 *   patient: "Cliente", doctor: "Estilista", appointment: "Cita"
 *
 * NOTE: Database table names remain unchanged (pacientes, medicos, consultas).
 * Only UI labels are affected by this configuration.
 */

export const terminology = {
  // ==========================================================================
  // MAIN ENTITIES
  // ==========================================================================

  patient: {
    singular: "Paciente",
    plural: "Pacientes",
    singularLower: "paciente",
    pluralLower: "pacientes",
    article: "el", // el paciente
    articlePlural: "los", // los pacientes
  },

  odontologo: {
    singular: "Odontólogo",
    plural: "Odontólogos",
    singularLower: "odontólogo",
    pluralLower: "odontólogos",
    article: "el",
    articlePlural: "los",
  },

  solicitud: {
    singular: "Solicitud",
    plural: "Solicitudes",
    singularLower: "solicitud",
    pluralLower: "solicitudes",
    article: "la",
    articlePlural: "las",
  },

  insurance: {
    singular: "Obra Social",
    plural: "Obras Sociales",
    singularLower: "obra social",
    pluralLower: "obras sociales",
    article: "la",
    articlePlural: "las",
  },

  schedule: {
    singular: "Horario",
    plural: "Horarios",
    singularLower: "horario",
    pluralLower: "horarios",
    article: "el",
    articlePlural: "los",
  },

  // ==========================================================================
  // DOMAIN INFORMATION
  // ==========================================================================

  domain: {
    /** Business type (e.g., "Laboratorio Dental", "Clínica", "Spa") */
    type: "Laboratorio Dental",

    /** Specialty or focus area */
    specialty: "Prótesis Dental",

    /** Full name for display */
    fullName: "Laboratorio Dental",
  },

  // ==========================================================================
  // UI LABELS - NAVIGATION
  // ==========================================================================

  navigation: {
    dashboard: "Inicio",
    odontologos: "Odontólogos",
    solicitudes: "Solicitudes",
    tarifarios: "Tarifarios",
    settings: "Configuración",
    profile: "Mi Perfil",
    logout: "Cerrar Sesión",
  },

  // ==========================================================================
  // UI LABELS - ACTIONS
  // ==========================================================================

  actions: {
    // Solicitud actions
    newSolicitud: "Nueva Solicitud",
    editSolicitud: "Editar Solicitud",
    cancelSolicitud: "Cancelar Solicitud",
    searchSolicitudes: "Buscar solicitudes...",

    // Generic actions
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    view: "Ver",
    create: "Crear",
    search: "Buscar",
    filter: "Filtrar",
    export: "Exportar",
    print: "Imprimir",
  },

  // ==========================================================================
  // UI LABELS - PAGE TITLES
  // ==========================================================================

  pageTitles: {
    solicitudList: "Listado de Solicitudes",
    solicitudDetail: "Detalle de la Solicitud",
    solicitudNew: "Nueva Solicitud",

    odontologoList: "Listado de Odontólogos",
    odontologoDetail: "Detalle del Odontólogo",

    tarifarioList: "Listado de Tarifarios",
    tarifarioDetail: "Detalle del Tarifario",

    settings: "Configuración",
  },

  // ==========================================================================
  // UI LABELS - MESSAGES
  // ==========================================================================

  messages: {
    // Success messages
    solicitudCreated: "Solicitud creada exitosamente",
    solicitudUpdated: "Solicitud actualizada exitosamente",
    solicitudCancelled: "Solicitud cancelada exitosamente",

    // Error messages
    solicitudNotFound: "Solicitud no encontrada",

    // Confirmation messages
    confirmDelete: "¿Está seguro que desea eliminar este registro?",
    confirmCancel: "¿Está seguro que desea cancelar esta solicitud?",

    // Empty states
    noSolicitudes: "No hay solicitudes registradas",
  },

  // ==========================================================================
  // FIELD LABELS
  // ==========================================================================

  fields: {
    // Common fields
    name: "Nombre",
    lastName: "Apellido",
    fullName: "Nombre Completo",
    email: "Email",
    phone: "Teléfono",
    address: "Dirección",
    notes: "Notas",
    status: "Estado",
    createdAt: "Fecha de Creación",
    updatedAt: "Última Actualización",

    // Odontólogo-specific fields
    cuit: "CUIT",
    situacionIva: "Situación frente al IVA",
    localidad: "Localidad",
    direccionConsultorio: "Dirección del Consultorio",

    // Solicitud-specific fields
    tipoSolicitud: "Tipo de Solicitud",
    observaciones: "Observaciones",
  },
} as const

// Type exports for type safety
export type Terminology = typeof terminology

/** Generic interface for entity terminology that all entities conform to */
export interface EntityTerminology {
  singular: string
  plural: string
  singularLower: string
  pluralLower: string
  article: string
  articlePlural: string
}

export type DomainInfo = typeof terminology.domain

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the terminology for a specific entity
 */
type EntityKey = "patient" | "odontologo" | "solicitud" | "insurance" | "schedule"

export function getEntityTerminology(entity: EntityKey): EntityTerminology {
  return terminology[entity]
}

/**
 * Format a label with article (e.g., "el odontólogo", "la solicitud")
 */
export function withArticle(entity: EntityKey, plural: boolean = false): string {
  const term = terminology[entity]
  if (plural) {
    return `${term.articlePlural} ${term.pluralLower}`
  }
  return `${term.article} ${term.singularLower}`
}

/**
 * Get a message with entity name interpolated
 */
export function formatMessage(template: string, entity: EntityKey): string {
  const term = terminology[entity]
  return template
    .replace(/\{singular\}/g, term.singular)
    .replace(/\{plural\}/g, term.plural)
    .replace(/\{singularLower\}/g, term.singularLower)
    .replace(/\{pluralLower\}/g, term.pluralLower)
}
