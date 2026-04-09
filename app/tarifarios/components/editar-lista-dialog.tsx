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
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { updateTarifario } from "../actions"
import type { TarifarioSummary, Localidad, Moneda } from "@/lib/types/entities"

type LocalidadRow = Localidad & { tarifario_id: string | null }

interface EditarListaDialogProps {
  lista: TarifarioSummary | null
  localidades: LocalidadRow[]
  onOpenChange: (open: boolean) => void
  onListaUpdated?: (lista: TarifarioSummary, linkedLocalidadIds: string[]) => void
}

export function EditarListaDialog({
  lista,
  localidades,
  onOpenChange,
  onListaUpdated,
}: EditarListaDialogProps) {
  const [nombre, setNombre] = useState("")
  const [moneda, setMoneda] = useState<Moneda>("ARS")
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (lista) {
      setNombre(lista.nombre)
      setMoneda(lista.moneda)
      setSelectedLocalidades(lista.localidades.map((l) => l.id))
    }
  }, [lista])

  const toggleLocalidad = (id: string) => {
    setSelectedLocalidades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!lista) return
    if (!nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setIsLoading(true)
    const { success, error, data } = await updateTarifario(lista.id, {
      nombre: nombre.trim(),
      moneda,
      localidad_ids: selectedLocalidades,
    })

    if (success && data) {
      const linkedLocs = localidades
        .filter((l) => selectedLocalidades.includes(l.id))
        .map((l) => ({ id: l.id, nombre_display: l.nombre_display }))

      const summary: TarifarioSummary = {
        ...data,
        localidades: linkedLocs,
        precios_count: lista.precios_count,
      }

      if (onListaUpdated) onListaUpdated(summary, selectedLocalidades)
      toast.success("Lista actualizada")
      onOpenChange(false)
    } else {
      toast.error(error || "Error al actualizar la lista")
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={lista !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lista de precios</DialogTitle>
          <DialogDescription>
            Modificá el nombre, la moneda o las localidades asignadas a esta lista.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="lista-nombre-edit">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lista-nombre-edit"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

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
                <RadioGroupItem value="ARS" id="moneda-ars-edit" />
                <Label htmlFor="moneda-ars-edit" className="font-normal cursor-pointer">
                  ARS (Pesos)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="USD" id="moneda-usd-edit" />
                <Label htmlFor="moneda-usd-edit" className="font-normal cursor-pointer">
                  USD (Dólares)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Localidades asignadas</Label>
            <p className="text-xs text-muted-foreground">
              Las localidades marcadas en gris pertenecen a otra lista.
            </p>
            <div className="rounded-md border max-h-64 overflow-y-auto divide-y">
              {localidades.length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No hay localidades activas.
                </div>
              ) : (
                localidades.map((l) => {
                  // Disabled if the localidad belongs to ANOTHER tarifario
                  const belongsToOther =
                    l.tarifario_id !== null && l.tarifario_id !== lista?.id
                  const checked = selectedLocalidades.includes(l.id)
                  return (
                    <label
                      key={l.id}
                      className={`flex items-center gap-3 p-3 ${
                        belongsToOther
                          ? "bg-muted/30 cursor-not-allowed"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={belongsToOther}
                        onCheckedChange={() =>
                          !belongsToOther && toggleLocalidad(l.id)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            belongsToOther ? "text-muted-foreground" : ""
                          }`}
                        >
                          {l.nombre_display}
                        </p>
                        {belongsToOther && (
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
