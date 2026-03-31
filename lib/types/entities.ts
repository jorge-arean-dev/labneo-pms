/**
 * Shared TypeScript interfaces for database entities — Portal Labneo
 */

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
  activated_at: string | null
}

// ============================================================================
// SOLICITUDES (dentist onboarding requests)
// ============================================================================

export type EstadoSolicitud = "enviada" | "en_proceso" | "alta_generada"

export interface Solicitud {
  id: string
  odontologo_id: string
  nombre: string
  apellido: string
  localidad: string
  telefono: string
  horarios_atencion: string
  cuit_iva: string
  email: string
  tipo_servicio: string[] | null
  estado: EstadoSolicitud
  notas_admin: string | null
  created_at: string
  updated_at: string
}

export interface SolicitudWithOdontologo extends Solicitud {
  odontologo: {
    id: string
    nombre: string
    apellido: string
    email: string
  } | null
}

// ============================================================================
// TARIFARIOS (price lists)
// ============================================================================

export interface Tarifario {
  id: string
  nombre: string
  moneda: "ARS" | "USD"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TarifarioItem {
  id: string
  tarifario_id: string
  servicio: string
  precio: number
  descripcion: string | null
  is_active: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface TarifarioWithItems extends Tarifario {
  items: TarifarioItem[]
}

// ============================================================================
// LOCALIDADES → TARIFARIOS (mapping)
// ============================================================================

export interface LocalidadTarifario {
  id: string
  localidad: string
  tarifario_id: string
  created_at: string
}

// ============================================================================
// CITAS FOTOGRAMETRIA (photogrammetry appointments)
// ============================================================================

export type EstadoCita = "pendiente" | "aceptada" | "finalizada" | "rechazada"

export interface CitaFotogrametria {
  id: string
  odontologo_id: string
  direccion_consultorio: string
  tipo_servicio: string | null
  fecha_propuesta: string
  observaciones: string | null
  estado: EstadoCita
  notas_tecnico: string | null
  created_at: string
  updated_at: string
}

export interface CitaFotogrametriaWithOdontologo extends CitaFotogrametria {
  odontologo: {
    id: string
    nombre: string
    apellido: string
    email: string
  } | null
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export const TIPOS_SERVICIO = [
  "Prótesis",
  "Fotogrametría",
  "Alquiler de escáner",
  "Soldadura de titanio",
  "Full Arch",
] as const

export type TipoServicio = typeof TIPOS_SERVICIO[number]
