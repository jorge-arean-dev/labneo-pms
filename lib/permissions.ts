/**
 * Permission Utilities
 *
 * Centralized permission logic for role-based access control
 * Based on role-permissions.csv and entities-access-per-role CSV files
 */

import { UserRole, EntityType } from "@/app/components/entity-detail-layout/types"
import { isTodayInAppTimezone } from "@/lib/utils/timezone"

export interface PermissionContext {
  role: UserRole
  userId: string
  entityOwnerId?: string // For ownership checks (e.g., medico.user_id, recepcionista.id)
}

/**
 * Check if user can update an entity
 *
 * @param entity - Entity type
 * @param context - Permission context (role, userId, entityOwnerId)
 * @returns true if user can update the entity
 */
export function canUpdateEntity(
  entity: EntityType,
  context: PermissionContext
): boolean {
  const { role, userId, entityOwnerId } = context

  switch (entity) {
    case "pacientes":
      // All roles can edit patients
      return true

    case "medicos":
      // Admins can edit all medicos
      if (role === "administrador") return true
      // Medicos can only edit their own profile
      if (role === "medico") return userId === entityOwnerId
      // Recepcionistas cannot edit medicos
      return false

    case "recepcionistas":
      // Admins can edit all recepcionistas
      if (role === "administrador") return true
      // Recepcionistas can only edit their own profile
      if (role === "recepcionista") return userId === entityOwnerId
      // Medicos cannot edit recepcionistas
      return false

    case "obras_sociales":
      // Only admins can edit obras sociales
      return role === "administrador"

    case "consultas":
      // Admins can edit all consultas
      if (role === "administrador") return true
      // Medicos can edit their own consultas (checked at field level)
      if (role === "medico") return true
      // Recepcionistas can edit some fields (estado, tipo_consulta)
      if (role === "recepcionista") return true
      return false

    default:
      return false
  }
}

/**
 * Check if user can delete an entity
 *
 * @param entity - Entity type
 * @param context - Permission context
 * @returns true if user can delete the entity
 */
export function canDeleteEntity(
  entity: EntityType,
  context: PermissionContext
): boolean {
  const { role } = context

  // Based on role-permissions.csv:
  // - Administrador can delete all entities
  // - Médico cannot delete any entities
  // - Recepcionista cannot delete any entities

  return role === "administrador"
}

/**
 * Check if user owns a resource
 *
 * @param userId - Current user ID
 * @param resourceOwnerId - Resource owner ID
 * @returns true if user owns the resource
 */
export function isOwner(userId: string, resourceOwnerId?: string): boolean {
  if (!resourceOwnerId) return false
  return userId === resourceOwnerId
}

/**
 * Check if a field is editable for a specific role and ownership context
 *
 * This is used for fine-grained field-level permissions
 * (e.g., medicos can only edit certain fields on their own consultas)
 *
 * @param entity - Entity type
 * @param field - Field name
 * @param context - Permission context
 * @returns true if field is editable
 */
export function canEditField(
  entity: EntityType,
  field: string,
  context: PermissionContext & { isOwner?: boolean }
): boolean {
  const { role, isOwner = false } = context

  // Admin can edit all fields
  if (role === "administrador") return true

  // Entity-specific field permissions
  switch (entity) {
    case "pacientes":
      // Special fields only for admin (already checked above)
      if (field === "notas" || field === "consentimiento_datos") {
        return false
      }
      // All other fields editable by all roles
      return true

    case "medicos":
      // Medicos can only edit their own profile
      if (role === "medico" && isOwner) return true
      // Recepcionistas cannot edit medicos
      return false

    case "recepcionistas":
      // Recepcionistas can only edit their own profile
      if (role === "recepcionista" && isOwner) return true
      // Medicos cannot edit recepcionistas
      return false

    case "consultas":
      // estado_id - admin only (already checked above, non-admins cannot edit via dropdown)
      // Non-admins must use dedicated actions (Iniciar, Cancelar, Finalizar, etc.)
      if (field === "estado_id") {
        return false // admin already handled above
      }

      // Medical fields - only admin (already checked) or owner medico can edit
      const medicalFields = ["motivo", "informe", "diagnostico", "tratamiento", "receta", "notas"]
      if (medicalFields.includes(field)) {
        return role === "medico" && isOwner
      }

      // fecha_hora - only admin can edit directly in edit mode
      // Non-admin users must use the "Reagendar Consulta" action
      if (field === "fecha_hora") {
        return false // admin already handled above
      }

      // Fields editable by all roles (including Médico Non-Owner and Recepcionista):
      // tipo_consulta, medico_id
      if (field === "tipo_consulta" || field === "medico_id") {
        return true
      }

      // Default: no edit permission for other fields
      return false

    case "obras_sociales":
      // notas field - admin only (already checked above, so non-admin reaches here)
      if (field === "notas") {
        return false
      }
      // All other fields - admin only (already checked above, so non-admin reaches here)
      return false

    default:
      return false
  }
}

/**
 * Check if a field is visible for a specific role
 *
 * @param entity - Entity type
 * @param field - Field name
 * @param context - Permission context
 * @returns true if field is visible
 */
export function canViewField(
  entity: EntityType,
  field: string,
  context: PermissionContext & { isOwner?: boolean }
): boolean {
  const { role } = context

  // Admin can view all fields
  if (role === "administrador") return true

  // Never show these fields to any role
  const hiddenFields = ["id", "user_id", "rol_id", "paciente_id"]
  if (hiddenFields.includes(field)) return false

  // Entity-specific field visibility
  switch (entity) {
    case "pacientes":
      // Hide these fields from medico and recepcionista (admin already returned true above)
      if (field === "notas" || field === "consentimiento_datos") {
        return false
      }
      // Hide audit fields from non-admin (admin already returned true above)
      if (["created_at", "updated_at", "created_by", "updated_by"].includes(field)) {
        return false
      }
      return true

    case "medicos":
      // Hide audit fields from non-admin (admin already returned true above)
      if (["created_at", "updated_at", "created_by", "updated_by"].includes(field)) {
        return false
      }
      // All other fields visible
      return true

    case "recepcionistas":
      // Hide audit fields from non-admin (admin already returned true above)
      if (["created_at", "updated_at"].includes(field)) {
        return false
      }
      return true

    case "consultas":
      // Medical fields - hidden from recepcionista
      const medicalFields = ["informe", "diagnostico", "tratamiento", "receta", "notas"]
      if (medicalFields.includes(field)) {
        return role !== "recepcionista"
      }
      // Hide audit fields from non-admin (admin already returned true above)
      if (["created_at", "updated_at", "created_by", "updated_by"].includes(field)) {
        return false
      }
      return true

    case "obras_sociales":
      // notas field - admin only (admin already returned true above)
      if (field === "notas") {
        return false
      }
      // Hide audit fields from non-admin (admin already returned true above)
      if (["created_at", "updated_at", "created_by", "updated_by"].includes(field)) {
        return false
      }
      return true

    default:
      return false
  }
}

// ============================================================================
// Consulta Action Permissions
// ============================================================================

/**
 * Check if user can iniciar a consulta (change estado to "en_curso")
 * Only medico (owner) or admin can iniciar consulta
 */
export function canIniciarConsulta(
  consulta: { medico_id: string; estado_codigo: string },
  context: { role: UserRole; medicoId: string | null }
): boolean {
  const { role, medicoId } = context

  // Must be in programada estado
  if (consulta.estado_codigo !== "programada") return false

  // Admin can iniciar any consulta
  if (role === "administrador") return true

  // Medico can only iniciar their own consultas
  if (role === "medico" && medicoId === consulta.medico_id) return true

  return false
}

/**
 * Check if user can marcar consulta como ausente
 * All roles can mark as ausente when estado is programada
 */
export function canMarcarAusente(
  consulta: { estado_codigo: string }
): boolean {
  return consulta.estado_codigo === "programada"
}

/**
 * Check if user can transferir a consulta to another medico
 * All roles can transfer when estado is programada
 */
export function canTransferirConsulta(
  consulta: { estado_codigo: string }
): boolean {
  return consulta.estado_codigo === "programada"
}

/**
 * Check if user can cancelar a consulta
 * All roles can cancel when estado is programada
 */
export function canCancelarConsulta(
  consulta: { estado_codigo: string }
): boolean {
  return consulta.estado_codigo === "programada"
}

/**
 * Check if user can reagendar a consulta (change fecha_hora)
 * All roles can reagendar when estado is programada
 */
export function canReagendarConsulta(
  consulta: { estado_codigo: string }
): boolean {
  return consulta.estado_codigo === "programada"
}

/**
 * Check if user can registrar llegada (toggle patient arrival)
 * All roles can register arrival for today's programada consultas
 */
export function canRegistrarLlegada(
  consulta: { estado_codigo: string; fecha_hora: string }
): boolean {
  // Must be programada
  if (consulta.estado_codigo !== "programada") return false

  // Must be today's consulta (in application timezone)
  const consultaDate = new Date(consulta.fecha_hora)
  return isTodayInAppTimezone(consultaDate)
}

/**
 * Check if user can finalizar a consulta (change estado to "completada")
 * Only medico (owner) or admin can finalizar consulta
 */
export function canFinalizarConsulta(
  consulta: { medico_id: string; estado_codigo: string },
  context: { role: UserRole; medicoId: string | null }
): boolean {
  const { role, medicoId } = context

  // Must be in en_curso estado
  if (consulta.estado_codigo !== "en_curso") return false

  // Admin can finalizar any consulta
  if (role === "administrador") return true

  // Medico can only finalizar their own consultas
  if (role === "medico" && medicoId === consulta.medico_id) return true

  return false
}

/**
 * Check if user can cancelar a consulta that is en_curso
 * Only medico (owner) or admin can cancelar an en_curso consulta
 */
export function canCancelarConsultaEnCurso(
  consulta: { medico_id: string; estado_codigo: string },
  context: { role: UserRole; medicoId: string | null }
): boolean {
  const { role, medicoId } = context

  // Must be in en_curso estado
  if (consulta.estado_codigo !== "en_curso") return false

  // Admin can cancelar any consulta
  if (role === "administrador") return true

  // Medico can only cancelar their own consultas
  if (role === "medico" && medicoId === consulta.medico_id) return true

  return false
}

/**
 * Check if user can salir sin finalizar (save and keep as en_curso)
 * Only medico (owner) or admin can salir sin finalizar
 */
export function canSalirSinFinalizar(
  consulta: { medico_id: string; estado_codigo: string },
  context: { role: UserRole; medicoId: string | null }
): boolean {
  const { role, medicoId } = context

  // Must be in en_curso estado
  if (consulta.estado_codigo !== "en_curso") return false

  // Admin can salir sin finalizar any consulta
  if (role === "administrador") return true

  // Medico can only salir sin finalizar their own consultas
  if (role === "medico" && medicoId === consulta.medico_id) return true

  return false
}
