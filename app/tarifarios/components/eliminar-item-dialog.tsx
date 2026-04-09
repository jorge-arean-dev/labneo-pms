"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { deleteItem } from "../actions"
import type { Item } from "@/lib/types/entities"

interface EliminarItemDialogProps {
  item: Item | null
  onOpenChange: (open: boolean) => void
  onItemDeleted?: (id: string) => void
}

export function EliminarItemDialog({
  item,
  onOpenChange,
  onItemDeleted,
}: EliminarItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!item) return
    setIsLoading(true)
    const { success, error } = await deleteItem(item.id)
    if (success) {
      if (onItemDeleted) onItemDeleted(item.id)
      toast.success("Ítem eliminado")
      onOpenChange(false)
    } else {
      toast.error(error || "Error al eliminar el ítem")
    }
    setIsLoading(false)
  }

  return (
    <AlertDialog open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
          <AlertDialogDescription>
            El ítem <strong>{item?.nombre}</strong> dejará de aparecer en las listas
            de precios y en el selector de prótesis. Las solicitudes históricas que
            lo incluyen no se verán afectadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
