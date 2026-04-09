"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateItem } from "../actions"
import type { Item } from "@/lib/types/entities"

interface EditarItemDialogProps {
  item: Item | null
  onOpenChange: (open: boolean) => void
  onItemUpdated?: (item: Item) => void
}

export function EditarItemDialog({
  item,
  onOpenChange,
  onItemUpdated,
}: EditarItemDialogProps) {
  const [nombre, setNombre] = useState("")
  const [tiempoEntrega, setTiempoEntrega] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (item) {
      setNombre(item.nombre)
      setTiempoEntrega(item.tiempo_entrega)
    }
  }, [item])

  const handleSubmit = async () => {
    if (!item) return
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (!tiempoEntrega.trim()) {
      toast.error("El tiempo de entrega es requerido")
      return
    }

    setIsLoading(true)
    const { success, error, data } = await updateItem(item.id, {
      nombre: nombre.trim(),
      tiempo_entrega: tiempoEntrega.trim(),
    })

    if (success && data) {
      if (onItemUpdated) onItemUpdated(data)
      toast.success("Ítem actualizado")
      onOpenChange(false)
    } else {
      toast.error(error || "Error al actualizar el ítem")
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ítem</DialogTitle>
          <DialogDescription>
            Modificá el nombre o el tiempo de entrega del ítem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre-edit">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre-edit"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiempo-entrega-edit">
              Tiempo de entrega <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tiempo-entrega-edit"
              value={tiempoEntrega}
              onChange={(e) => setTiempoEntrega(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
