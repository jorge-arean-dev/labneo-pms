"use client"

import { EntityHeader } from "./entity-header"
import { EntityActions } from "./entity-actions"
import { BreadcrumbItem, EntityActionsProps } from "./types"

interface EntityDetailLayoutProps {
  breadcrumbs: BreadcrumbItem[]
  entityName: string
  actionsProps: EntityActionsProps
  children: React.ReactNode
}

/**
 * EntityDetailLayout Component
 *
 * Unified layout for all entity detail pages
 * Provides:
 * - Breadcrumb navigation
 * - Entity name heading
 * - Action buttons (Volver, Editar/Guardar, Eliminar)
 * - Content area (children)
 */
export function EntityDetailLayout({
  breadcrumbs,
  entityName,
  actionsProps,
  children,
}: EntityDetailLayoutProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EntityHeader breadcrumbs={breadcrumbs} entityName={entityName} />
        <div className="flex-shrink-0">
          <EntityActions {...actionsProps} />
        </div>
      </div>

      {/* Content Section */}
      <div>{children}</div>
    </div>
  )
}
