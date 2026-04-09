"use client"

import { useState } from "react"
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
import { createItem } from "../actions"
import type { Item } from "@/lib/types/entities"

interface CrearItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemCreated?: (item: Item) => void
}

export function CrearItemDialog({
  open,
  onOpenChange,
  onItemCreated,
}: CrearItemDialogProps) {
  const [nombre, setNombre] = useState("")
  const [tiempoEntrega, setTiempoEntrega] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const reset = () => {
    setNombre("")
    setTiempoEntrega("")
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) reset()
    onOpenChange(newOpen)
  }

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (!tiempoEntrega.trim()) {
      toast.error("El tiempo de entrega es requerido")
      return
    }

    setIsLoading(true)
    const { success, error, data } = await createItem({
      nombre: nombre.trim(),
      tiempo_entrega: tiempoEntrega.trim(),
    })

    if (success && data) {
      if (onItemCreated) onItemCreated(data)
      toast.success("Ítem creado exitosamente")
      handleClose(false)
    } else {
      toast.error(error || "Error al crear el ítem")
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo ítem</DialogTitle>
          <DialogDescription>
            Agregá un nuevo ítem al catálogo global. El precio se define por lista de precios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Corona CAD Zirconia (por pieza)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiempo-entrega">
              Tiempo de entrega <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tiempo-entrega"
              value={tiempoEntrega}
              onChange={(e) => setTiempoEntrega(e.target.value)}
              placeholder="Ej. 4-5 días hábiles"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear ítem"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
