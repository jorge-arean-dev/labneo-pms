/**
 * Shared TypeScript interfaces for entity detail pages — Portal Labneo
 */

export type EntityType = "solicitudes" | "citas_fotogrametria" | "tarifarios"

export type UserRole = "administracion" | "odontologo"

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
