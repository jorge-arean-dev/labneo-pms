"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Save, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EntityActionsProps } from "./types"

/**
 * EntityActions Component
 *
 * Displays action buttons for entity detail pages:
 * - "Volver" button (always visible)
 * - "Editar/Guardar/Cancelar" buttons (based on permissions and edit mode)
 * - "Eliminar" button (based on permissions)
 *
 * Handles unsaved changes warning and delete confirmation
 */
export function EntityActions({
  canUpdate,
  canDelete,
  isEditMode,
  onEditToggle,
  onSave,
  onCancel,
  onDelete,
  parentRoute,
  parentLabel,
  isSaving = false,
  hasUnsavedChanges = false,
  customActions,
  skipDeleteConfirmation = false,
}: EntityActionsProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  const handleBack = () => {
    if (isEditMode && hasUnsavedChanges) {
      setPendingNavigation(parentRoute)
      setShowUnsavedChangesDialog(true)
    } else {
      router.push(parentRoute)
    }
  }

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesDialog(true)
    } else {
      onCancel()
    }
  }

  const handleConfirmNavigation = () => {
    setShowUnsavedChangesDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    } else {
      onCancel()
    }
  }

  const handleDelete = async () => {
    await onDelete()
    setShowDeleteDialog(false)
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Volver Button */}
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a {parentLabel}
        </Button>

        {/* Edit/Save/Cancel Buttons */}
        {canUpdate && (
          <div className="flex gap-2">
            {!isEditMode ? (
              <Button
                onClick={onEditToggle}
                className="flex-1 sm:flex-none"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        )}

        {/* Custom Actions (e.g., PDF Export) */}
        {customActions && !isEditMode && customActions}

        {/* Delete Button */}
        {canDelete && !isEditMode && (
          <Button
            variant="destructive"
            onClick={() => {
              if (skipDeleteConfirmation) {
                // Component handles its own confirmation dialog
                onDelete()
              } else {
                // Show built-in confirmation dialog
                setShowDeleteDialog(true)
              }
            }}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los datos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro que deseas salir? Se perderán todos los cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
