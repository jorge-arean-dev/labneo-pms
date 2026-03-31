/**
 * Shared TypeScript interfaces for database entities
 */

// ============================================================================
// OBRAS SOCIALES
// ============================================================================

export interface ObraSocial {
  id: string
  nombre: string
  codigo: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  sitio_web: string | null
  is_active: boolean
  notas: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ============================================================================
// PACIENTES
// ============================================================================

export interface Paciente {
  id: string
  dni: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  genero: "M" | "F" | "Otro" | null
  telefono: string | null
  email: string | null
  domicilio: string | null
  obra_social_id: string | null
  plan: string | null
  numero_afiliado: string | null
  foto_perfil_url: string | null
  notas: string | null
  is_active: boolean
  consentimiento_datos: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface PacienteWithObraSocial extends Paciente {
  obra_social: {
    id: string
    nombre: string
  } | null
}

// ============================================================================
// MEDICOS
// ============================================================================

export interface Medico {
  id: string
  email: string
  telefono: string | null
  matricula: string | null
  user_id: string
  deleted_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  // nombre and apellido come from usuarios_pms via user_id
  // These are populated when JOINing with usuarios_pms
  nombre?: string
  apellido?: string
  // activated_at indicates if user completed account setup (set their password)
  // null = pending invite, has value = active account
  activated_at?: string | null
}

// ============================================================================
// MEDICOS HORARIOS
// ============================================================================

export interface MedicoHorario {
  id: string
  medico_id: string
  dia_semana: number // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  hora_inicio: string // TIME format (HH:MM:SS)
  hora_fin: string // TIME format (HH:MM:SS)
  duracion_consulta: number // Minutes
  duracion_buffer: number // Minutes
  activo: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ============================================================================
// MEDICOS BLOQUEOS AGENDA
// ============================================================================

export interface MedicoBloqueoAgenda {
  id: string
  medico_id: string
  fecha_inicio: string // DATE format (YYYY-MM-DD)
  fecha_fin: string // DATE format (YYYY-MM-DD)
  motivo: string | null
  origen: "individual" | "general"
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// ============================================================================
// MEDICOS OBRAS SOCIALES
// ============================================================================

export interface MedicoObraSocial {
  id: string
  medico_id: string
  obra_social_id: string
  porcentaje_cobertura: number | null
  copago: number | null
  requiere_autorizacion: boolean
  numero_convenio: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  notas: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

// Simplified type for multi-select (only id and nombre)
export interface ObraSocialOption {
  id: string
  nombre: string
}

// ============================================================================
// USUARIOS PMS (base user profile table)
// ============================================================================

export interface UsuarioPms {
  id: string
  nombre: string
  apellido: string
  email: string
  rol_id: string
  foto_perfil_url: string | null
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

// ============================================================================
// RECEPCIONISTAS (from usuarios_pms)
// ============================================================================

export interface Recepcionista {
  id: string
  nombre: string
  apellido: string
  email: string
  rol_id: string
  foto_perfil_url: string | null
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  // activated_at indicates if user completed account setup (set their password)
  // null = pending invite, has value = active account
  activated_at?: string | null
}

// ============================================================================
// CONSULTAS
// ============================================================================

export interface EstadoConsulta {
  id: string
  codigo: "programada" | "en_curso" | "completada" | "cancelada" | "ausente"
  nombre: string
  descripcion: string | null
  es_estado_final: boolean
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Consulta {
  id: string
  paciente_id: string
  medico_id: string
  fecha_hora: string
  motivo: string | null
  estado_id: string
  tipo_consulta: "primera_vez" | "control" | "urgencia" | null
  informe: string | null
  diagnostico: string | null
  tratamiento: string | null
  receta: string | null
  notas: string | null
  paciente_llego_timestamp: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface AuditUser {
  nombre: string
  apellido: string
  rol: string
}

export interface ConsultaWithRelations extends Consulta {
  paciente: {
    id: string
    nombre: string
    apellido: string
    dni: string
    email: string | null
    fecha_nacimiento: string
    plan: string | null
    numero_afiliado: string | null
    obra_social: {
      id: string
      nombre: string
    } | null
  }
  medico: {
    id: string
    user_id: string
    // nombre and apellido come from usuarios_pms via user_id JOIN
    usuario?: {
      nombre: string
      apellido: string
    }
    // For backwards compatibility during migration
    nombre?: string
    apellido?: string
  }
  estado: EstadoConsulta
  createdByUser: AuditUser | null
  updatedByUser: AuditUser | null
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type GeneroOption = { value: "M" | "F" | "Otro"; label: string }
export type EstadoOption = { value: string; label: string }
export type TipoConsultaOption = { value: "primera_vez" | "control" | "urgencia"; label: string }
