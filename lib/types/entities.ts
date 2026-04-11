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
// LOCALIDADES (lookup table)
// ============================================================================

export interface Localidad {
  id: string
  codigo: string
  nombre_display: string
  provincia: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// ODONTOLOGOS PERFIL (odontologo-specific profile data)
// ============================================================================

export interface OdontologoPerfil {
  id: string
  usuario_id: string
  localidad_id: string | null
  telefono: string | null
  cuit: string | null
  situacion_iva: string | null
  direccion_consultorio: string | null
  created_at: string
  updated_at: string
}

export interface OdontologoPerfilWithLocalidad extends OdontologoPerfil {
  localidades: Localidad | null
}

// ============================================================================
// ODONTOLOGOS HORARIOS (weekly schedule)
// ============================================================================

export interface OdontologoHorario {
  id: string
  usuario_id: string
  dia_semana: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  hora_inicio: string // HH:MM:SS
  hora_fin: string // HH:MM:SS
  activo: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// ESTADOS SOLICITUD (dedicated status table)
// ============================================================================

export interface EstadoSolicitud {
  id: string
  codigo: string
  nombre: string
  tipo_solicitud: "protesis" | "alquiler_equipos" | "todos"
  descripcion: string | null
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// SOLICITUDES (unified service requests)
// ============================================================================

export type TipoSolicitud = "protesis" | "alquiler_equipos"
export type SubtipoServicio = "escaner_intraoral" | "fotogrametria"

export interface Solicitud {
  id: string
  odontologo_id: string
  tipo_solicitud: TipoSolicitud
  estado_id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  localidad_id: string | null
  cuit: string | null
  situacion_iva: string | null
  subtipo_servicio: SubtipoServicio | null
  direccion_consultorio: string | null
  fecha_propuesta: string | null
  observaciones: string | null
  notas_admin: string | null
  // Tarifario snapshot (only set for tipo_solicitud = 'protesis')
  tarifario_id: string | null
  moneda_snapshot: Moneda | null
  total_snapshot: number | null
  // Vevi Dental acceptance (prótesis only, set by admin)
  vevi_usuario: string | null
  vevi_password: string | null
  comentarios_admin: string | null
  created_at: string
  updated_at: string
}

export interface SolicitudWithRelations extends Solicitud {
  odontologo: {
    id: string
    nombre: string
    apellido: string
    email: string
  } | null
  estados_solicitud: EstadoSolicitud | null
  localidades: Localidad | null
  solicitudes_items?: SolicitudItem[]
}

// ============================================================================
// ITEMS (global catalog)
// ============================================================================

export interface Item {
  id: string
  nombre: string
  tiempo_entrega: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ============================================================================
// TARIFARIOS (price lists) + entries
// ============================================================================

export type Moneda = "ARS" | "USD"

export interface Tarifario {
  id: string
  nombre: string
  moneda: Moneda
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Row in tarifarios_items: one item priced inside one tarifario. */
export interface TarifarioItemPrecio {
  id: string
  tarifario_id: string
  item_id: string
  precio: number
  created_at: string
  updated_at: string
}

/** Summary used in listas table rows: tarifario + linked localidades + item-priced count. */
export interface TarifarioSummary extends Tarifario {
  localidades: Pick<Localidad, "id" | "nombre_display">[]
  precios_count: number
}

/** Item joined with its precio in a specific tarifario (null = sin precio). */
export interface ItemWithPrecio extends Item {
  precio: number | null
}

// ============================================================================
// SOLICITUDES_ITEMS (line items on a prótesis solicitud)
// ============================================================================

export interface SolicitudItem {
  id: string
  solicitud_id: string
  item_id: string
  nombre_snapshot: string
  tiempo_entrega_snapshot: string
  precio_snapshot: number
  cantidad: number
  subtotal_snapshot: number
  created_at: string
}

// ============================================================================
// HELPER TYPES & CONSTANTS
// ============================================================================

export const TIPOS_SOLICITUD = {
  protesis: "Prótesis",
  alquiler_equipos: "Alquiler de equipos",
} as const

export const SUBTIPOS_SERVICIO = {
  escaner_intraoral: "Escáner Intraoral",
  fotogrametria: "Fotogrametría",
} as const

export const SITUACIONES_IVA = [
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
  "Consumidor Final",
] as const

export type SituacionIva = typeof SITUACIONES_IVA[number]
