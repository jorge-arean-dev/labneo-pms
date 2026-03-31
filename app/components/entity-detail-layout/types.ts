/**
 * Shared TypeScript interfaces for entity detail pages
 */

export type EntityType = "pacientes" | "medicos" | "recepcionistas" | "obras_sociales" | "consultas"

export type UserRole = "administrador" | "medico" | "recepcionista"

export interface EntityDetailLayoutProps {
  entityType: EntityType
  entityId: string
  entityName: string
  entityLabel: string
  parentRoute: string
  parentLabel: string

  // Permissions
  canUpdate: boolean
  canDelete: boolean

  // Content
  children: React.ReactNode
}

export interface EntityActionsProps {
  canUpdate: boolean
  canDelete: boolean
  isEditMode: boolean
  onEditToggle: () => void
  onSave: () => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
  parentRoute: string
  parentLabel: string
  isSaving?: boolean
  hasUnsavedChanges?: boolean
  /** Optional custom actions to render between Edit and Delete buttons */
  customActions?: React.ReactNode
  /** Skip built-in delete confirmation dialog (use when component has custom delete handling) */
  skipDeleteConfirmation?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
}
