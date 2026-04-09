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
import { deleteTarifario } from "../actions"
import type { TarifarioSummary } from "@/lib/types/entities"

interface EliminarListaDialogProps {
  lista: TarifarioSummary | null
  onOpenChange: (open: boolean) => void
  onListaDeleted?: (id: string) => void
}

export function EliminarListaDialog({
  lista,
  onOpenChange,
  onListaDeleted,
}: EliminarListaDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!lista) return
    setIsLoading(true)
    const { success, error } = await deleteTarifario(lista.id)
    if (success) {
      if (onListaDeleted) onListaDeleted(lista.id)
      toast.success("Lista eliminada")
      onOpenChange(false)
    } else {
      toast.error(error || "Error al eliminar la lista")
    }
    setIsLoading(false)
  }

  return (
    <AlertDialog open={lista !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar lista de precios?</AlertDialogTitle>
          <AlertDialogDescription>
            La lista <strong>{lista?.nombre}</strong> dejará de aplicarse. Sus
            localidades quedarán sin lista asignada. Las solicitudes históricas que
            usaron esta lista no se verán afectadas.
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
