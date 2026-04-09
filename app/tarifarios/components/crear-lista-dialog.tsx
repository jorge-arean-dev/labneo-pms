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
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createTarifario } from "../actions"
import type { TarifarioSummary, Localidad, Moneda } from "@/lib/types/entities"

type LocalidadRow = Localidad & { tarifario_id: string | null }

interface CrearListaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  localidades: LocalidadRow[]
  onListaCreated?: (lista: TarifarioSummary, linkedLocalidadIds: string[]) => void
}

export function CrearListaDialog({
  open,
  onOpenChange,
  localidades,
  onListaCreated,
}: CrearListaDialogProps) {
  const [nombre, setNombre] = useState("")
  const [moneda, setMoneda] = useState<Moneda>("ARS")
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const reset = () => {
    setNombre("")
    setMoneda("ARS")
    setSelectedLocalidades([])
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) reset()
    onOpenChange(newOpen)
  }

  const toggleLocalidad = (id: string) => {
    setSelectedLocalidades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setIsLoading(true)
    const { success, error, data } = await createTarifario({
      nombre: nombre.trim(),
      moneda,
      localidad_ids: selectedLocalidades,
    })

    if (success && data) {
      // Build a TarifarioSummary locally using data we already have
      const linkedLocs = localidades
        .filter((l) => selectedLocalidades.includes(l.id))
        .map((l) => ({ id: l.id, nombre_display: l.nombre_display }))

      const summary: TarifarioSummary = {
        ...data,
        localidades: linkedLocs,
        precios_count: 0,
      }

      if (onListaCreated) onListaCreated(summary, selectedLocalidades)
      toast.success("Lista creada exitosamente")
      handleClose(false)
    } else {
      toast.error(error || "Error al crear la lista")
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva lista de precios</DialogTitle>
          <DialogDescription>
            Creá una nueva lista y asigná las localidades donde se aplicará.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="lista-nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lista-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Lista CABA 2026"
            />
          </div>

          {/* Moneda */}
          <div className="space-y-2">
            <Label>
              Moneda <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={moneda}
              onValueChange={(v) => setMoneda(v as Moneda)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ARS" id="moneda-ars" />
                <Label htmlFor="moneda-ars" className="font-normal cursor-pointer">
                  ARS (Pesos)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="USD" id="moneda-usd" />
                <Label htmlFor="moneda-usd" className="font-normal cursor-pointer">
                  USD (Dólares)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Localidades */}
          <div className="space-y-2">
            <Label>Localidades asignadas</Label>
            <p className="text-xs text-muted-foreground">
              Las localidades marcadas en gris ya pertenecen a otra lista.
            </p>
            <div className="rounded-md border max-h-64 overflow-y-auto divide-y">
              {localidades.length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No hay localidades activas.
                </div>
              ) : (
                localidades.map((l) => {
                  const isTaken = l.tarifario_id !== null
                  const checked = selectedLocalidades.includes(l.id)
                  return (
                    <label
                      key={l.id}
                      className={`flex items-center gap-3 p-3 ${
                        isTaken
                          ? "bg-muted/30 cursor-not-allowed"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isTaken}
                        onCheckedChange={() => !isTaken && toggleLocalidad(l.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${isTaken ? "text-muted-foreground" : ""}`}
                        >
                          {l.nombre_display}
                        </p>
                        {isTaken && (
                          <p className="text-xs text-muted-foreground">
                            Asignada a otra lista
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>
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
              "Crear lista"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
