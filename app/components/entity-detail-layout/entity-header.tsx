"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { BreadcrumbItem } from "./types"

interface EntityHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  entityName: string
}

/**
 * EntityHeader Component
 *
 * Displays breadcrumb navigation and entity name
 * Breadcrumbs are interactive and clickable
 */
export function EntityHeader({ breadcrumbs, entityName }: EntityHeaderProps) {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        ))}
      </nav>

      {/* Entity Name */}
      <h1 className="text-3xl font-bold tracking-tight">{entityName}</h1>
    </div>
  )
}
