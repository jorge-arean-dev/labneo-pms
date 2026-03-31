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

  doctor: {
    singular: "Médico",
    plural: "Médicos",
    singularLower: "médico",
    pluralLower: "médicos",
    article: "el",
    articlePlural: "los",
  },

  appointment: {
    singular: "Consulta",
    plural: "Consultas",
    singularLower: "consulta",
    pluralLower: "consultas",
    article: "la",
    articlePlural: "las",
  },

  receptionist: {
    singular: "Recepcionista",
    plural: "Recepcionistas",
    singularLower: "recepcionista",
    pluralLower: "recepcionistas",
    article: "el/la",
    articlePlural: "los/las",
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
    /** Business type (e.g., "Clínica", "Spa", "Veterinaria") */
    type: "Clínica",

    /** Specialty or focus area (e.g., "Dermatología", "Masajes", "Medicina General") */
    specialty: "Dermatología",

    /** Full name for display (e.g., "Clínica Dermatológica") */
    fullName: "Clínica Dermatológica",
  },

  // ==========================================================================
  // UI LABELS - NAVIGATION
  // ==========================================================================

  navigation: {
    dashboard: "Inicio",
    patients: "Pacientes",
    appointments: "Consultas",
    doctors: "Médicos",
    receptionists: "Recepcionistas",
    insurance: "Obras Sociales",
    settings: "Configuración",
    profile: "Mi Perfil",
    logout: "Cerrar Sesión",
  },

  // ==========================================================================
  // UI LABELS - ACTIONS
  // ==========================================================================

  actions: {
    // Patient actions
    newPatient: "Nuevo Paciente",
    editPatient: "Editar Paciente",
    deletePatient: "Eliminar Paciente",
    searchPatients: "Buscar pacientes...",

    // Appointment actions
    newAppointment: "Nueva Consulta",
    editAppointment: "Editar Consulta",
    cancelAppointment: "Cancelar Consulta",
    rescheduleAppointment: "Reprogramar Consulta",
    completeAppointment: "Completar Consulta",

    // Doctor actions
    newDoctor: "Nuevo Médico",
    editDoctor: "Editar Médico",
    manageSchedule: "Gestionar Horarios",

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
    patientList: "Listado de Pacientes",
    patientDetail: "Detalle del Paciente",
    patientNew: "Nuevo Paciente",

    appointmentList: "Listado de Consultas",
    appointmentDetail: "Detalle de la Consulta",
    appointmentNew: "Nueva Consulta",
    appointmentCalendar: "Calendario de Consultas",

    doctorList: "Listado de Médicos",
    doctorDetail: "Detalle del Médico",
    doctorNew: "Nuevo Médico",

    receptionistList: "Listado de Recepcionistas",
    receptionistDetail: "Detalle del Recepcionista",
    receptionistNew: "Nuevo Recepcionista",

    insuranceList: "Listado de Obras Sociales",
    insuranceDetail: "Detalle de la Obra Social",
    insuranceNew: "Nueva Obra Social",

    settings: "Configuración",
    clinicInfo: "Información de la Clínica",
    emailTemplates: "Plantillas de Email",
  },

  // ==========================================================================
  // UI LABELS - MESSAGES
  // ==========================================================================

  messages: {
    // Success messages
    patientCreated: "Paciente creado exitosamente",
    patientUpdated: "Paciente actualizado exitosamente",
    patientDeleted: "Paciente eliminado exitosamente",

    appointmentCreated: "Consulta creada exitosamente",
    appointmentUpdated: "Consulta actualizada exitosamente",
    appointmentCancelled: "Consulta cancelada exitosamente",
    appointmentCompleted: "Consulta completada exitosamente",

    // Error messages
    patientNotFound: "Paciente no encontrado",
    appointmentConflict: "Ya existe una consulta programada en ese horario",
    doctorUnavailable: "El médico no está disponible en ese horario",

    // Confirmation messages
    confirmDelete: "¿Está seguro que desea eliminar este registro?",
    confirmCancel: "¿Está seguro que desea cancelar esta consulta?",

    // Empty states
    noPatients: "No hay pacientes registrados",
    noAppointments: "No hay consultas programadas",
    noDoctors: "No hay médicos registrados",
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

    // Patient-specific fields
    dni: "DNI",
    dateOfBirth: "Fecha de Nacimiento",
    age: "Edad",
    gender: "Género",
    insuranceProvider: "Obra Social",
    insurancePlan: "Plan",
    memberNumber: "Número de Afiliado",
    medicalHistory: "Historial Médico",
    consent: "Consentimiento de Datos",

    // Appointment-specific fields
    appointmentDate: "Fecha de la Consulta",
    appointmentTime: "Hora",
    duration: "Duración",
    reason: "Motivo",
    diagnosis: "Diagnóstico",
    treatment: "Tratamiento",
    prescription: "Receta",
    report: "Informe",
    nextAppointment: "Próxima Consulta",
    appointmentType: "Tipo de Consulta",

    // Doctor-specific fields
    specialty: "Especialidad",
    license: "Matrícula",
    schedule: "Horario de Atención",
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
export function getEntityTerminology(
  entity: "patient" | "doctor" | "appointment" | "receptionist" | "insurance" | "schedule"
): EntityTerminology {
  return terminology[entity]
}

/**
 * Format a label with article (e.g., "el paciente", "la consulta")
 */
export function withArticle(
  entity: "patient" | "doctor" | "appointment" | "receptionist" | "insurance" | "schedule",
  plural: boolean = false
): string {
  const term = terminology[entity]
  if (plural) {
    return `${term.articlePlural} ${term.pluralLower}`
  }
  return `${term.article} ${term.singularLower}`
}

/**
 * Get a message with entity name interpolated
 */
export function formatMessage(
  template: string,
  entity: "patient" | "doctor" | "appointment" | "receptionist" | "insurance" | "schedule"
): string {
  const term = terminology[entity]
  return template
    .replace(/\{singular\}/g, term.singular)
    .replace(/\{plural\}/g, term.plural)
    .replace(/\{singularLower\}/g, term.singularLower)
    .replace(/\{pluralLower\}/g, term.pluralLower)
}
