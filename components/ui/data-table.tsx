"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export interface DataTableColumn<T> {
  header: string | React.ReactNode
  accessorKey: keyof T
  cell?: (value: T[keyof T], row: T) => React.ReactNode
  minWidth?: string
  /** Additional CSS classes for th/td (e.g., "hidden xl:table-cell" for responsive hiding) */
  className?: string
}

export interface DataTableAction<T> {
  label: string | ((row: T) => string)
  onClick?: (row: T) => void
  variant?: "default" | "destructive"
  show?: (row: T) => boolean
}

export interface DataTableInlineAction<T> {
  label: string | ((row: T) => string)
  ariaLabel?: (row: T) => string
  onClick: (row: T) => void
  show?: (row: T) => boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  actions?: DataTableAction<T>[]
  inlineActions?: DataTableInlineAction<T>[]
  rowsPerPage?: number
  onRowsPerPageChange?: (value: number) => void
  currentPage?: number
  onPageChange?: (page: number) => void
  totalPages?: number
  totalCount?: number // For server-side pagination: total records across all pages
  rowClassName?: (row: T) => string
}

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  actions,
  inlineActions,
  rowsPerPage = 10,
  onRowsPerPageChange,
  currentPage = 1,
  onPageChange,
  totalPages = 1,
  totalCount,
  rowClassName,
}: DataTableProps<T>) {
  // Determine if server-side pagination is being used
  // Server-side: totalCount is provided, data is already paginated
  // Client-side: totalCount not provided, we slice data ourselves
  const isServerSidePagination = totalCount !== undefined

  // Paginate the data based on currentPage and rowsPerPage (only for client-side)
  const paginatedData = useMemo(() => {
    if (isServerSidePagination) {
      // Server already paginated the data, use as-is
      return data
    }
    // Client-side pagination: slice the data
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, rowsPerPage, isServerSidePagination])

  // Calculate display range
  const actualTotalCount = totalCount ?? data.length
  const startItem = actualTotalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
  const endItem = Math.min(currentPage * rowsPerPage, actualTotalCount)

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near the start
        pages.push(2, 3, 4, "ellipsis", totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push("ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // In the middle
        pages.push("ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-left text-sm font-medium text-muted-foreground ${column.minWidth || ""} ${column.className || ""}`}
                >
                  {column.header}
                </th>
              ))}
              {((actions && actions.length > 0) || (inlineActions && inlineActions.length > 0)) && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground sticky right-0 bg-muted/50 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((row) => (
              <tr
                key={row.id}
                className={`transition-colors ${rowClassName ? rowClassName(row) : ""}`}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={`px-4 py-4 text-sm ${column.className || ""}`}>
                    {column.cell
                      ? column.cell(row[column.accessorKey], row)
                      : String(row[column.accessorKey] || "")}
                  </td>
                ))}
                {((actions && actions.length > 0) || (inlineActions && inlineActions.length > 0)) && (
                  <td className={`px-4 py-4 sticky right-0 shadow-[-2px_0_4px_rgba(0,0,0,0.06)] ${rowClassName?.(row) || "bg-card"}`}>
                    <div className="flex items-center gap-2">
                      {/* Inline buttons: hidden on mobile when no dropdown actions exist (mobile uses consolidated dropdown below) */}
                      {inlineActions && inlineActions.length > 0 && (
                        <div className={`${(!actions || actions.length === 0) ? "hidden sm:flex" : "flex"} items-center gap-2`}>
                          {inlineActions
                            .filter((action) => !action.show || action.show(row))
                            .map((action, actionIndex) => (
                              <Button
                                key={actionIndex}
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs"
                                onClick={() => action.onClick(row)}
                                aria-label={action.ariaLabel ? action.ariaLabel(row) : undefined}
                              >
                                {typeof action.label === "function" ? action.label(row) : action.label}
                              </Button>
                            ))}
                        </div>
                      )}
                      {/* Regular dropdown: visible at all viewports when actions exist */}
                      {actions && actions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions
                              .filter((action) => !action.show || action.show(row))
                              .map((action, actionIndex) => (
                                <DropdownMenuItem
                                  key={actionIndex}
                                  onClick={() => action.onClick?.(row)}
                                  className={
                                    action.variant === "destructive"
                                      ? "text-destructive"
                                      : ""
                                  }
                                >
                                  {typeof action.label === "function" ? action.label(row) : action.label}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {/* Mobile-only dropdown: consolidates inlineActions when no regular actions exist */}
                      {inlineActions && inlineActions.length > 0 && (!actions || actions.length === 0) && (
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {inlineActions
                                .filter((action) => !action.show || action.show(row))
                                .map((action, actionIndex) => (
                                  <DropdownMenuItem
                                    key={actionIndex}
                                    onClick={() => action.onClick(row)}
                                  >
                                    {typeof action.label === "function" ? action.label(row) : action.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{startItem}</span> a{" "}
          <span className="font-medium text-foreground">{endItem}</span> de{" "}
          <span className="font-medium text-foreground">{actualTotalCount}</span> registros
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filas por página</span>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(v) => {
                onRowsPerPageChange?.(Number(v))
              }}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            {/* First page button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(1)}
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            {/* Previous page button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {pageNumbers.map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  variant="outline"
                  size="sm"
                  className={`h-8 min-w-8 ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : ""
                  }`}
                  onClick={() => onPageChange?.(page)}
                >
                  {page}
                </Button>
              )
            )}

            {/* Next page button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => onPageChange?.(currentPage + 1)}
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {/* Last page button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => onPageChange?.(totalPages)}
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
