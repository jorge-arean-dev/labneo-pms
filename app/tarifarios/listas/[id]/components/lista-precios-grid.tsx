"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { upsertPrecio, eliminarPrecio } from "../../../actions"
import type { ItemWithPrecio, Moneda } from "@/lib/types/entities"

interface ListaPreciosGridProps {
  tarifarioId: string
  moneda: Moneda
  items: ItemWithPrecio[]
  allItems: ItemWithPrecio[]
  onItemsChange: (items: ItemWithPrecio[]) => void
}

function formatPrice(precio: number, moneda: Moneda): string {
  if (moneda === "USD") return `US$ ${precio.toFixed(2)}`
  return `$ ${precio.toLocaleString("es-AR")}`
}

export function ListaPreciosGrid({
  tarifarioId,
  moneda,
  items,
  allItems,
  onItemsChange,
}: ListaPreciosGridProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (item: ItemWithPrecio) => {
    setEditingItemId(item.id)
    setEditValue(item.precio !== null ? String(item.precio) : "")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const cancelEdit = () => {
    setEditingItemId(null)
    setEditValue("")
  }

  const applyPriceChange = (itemId: string, newPrecio: number | null) => {
    const next = allItems.map((i) =>
      i.id === itemId ? { ...i, precio: newPrecio } : i
    )
    onItemsChange(next)
  }

  const saveEdit = async (item: ItemWithPrecio) => {
    const trimmed = editValue.trim()

    // Empty → remove the precio row
    if (trimmed === "") {
      if (item.precio === null) {
        cancelEdit()
        return
      }
      setSavingItemId(item.id)
      const { success, error } = await eliminarPrecio(tarifarioId, item.id)
      if (success) {
        applyPriceChange(item.id, null)
        toast.success("Precio eliminado")
        cancelEdit()
      } else {
        toast.error(error || "Error al eliminar el precio")
      }
      setSavingItemId(null)
      return
    }

    const parsed = Number(trimmed.replace(",", "."))
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Precio inválido")
      return
    }

    setSavingItemId(item.id)
    const { success, error } = await upsertPrecio(tarifarioId, item.id, parsed)
    if (success) {
      applyPriceChange(item.id, parsed)
      toast.success("Precio guardado")
      cancelEdit()
    } else {
      toast.error(error || "Error al guardar el precio")
    }
    setSavingItemId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: ItemWithPrecio) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit(item)
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {allItems.length === 0
            ? "Todavía no hay ítems en el catálogo. Creá ítems desde /tarifarios → Ítems."
            : "No se encontraron ítems con ese filtro."}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ítem</TableHead>
            <TableHead>Tiempo de entrega</TableHead>
            <TableHead className="w-[240px] text-right">
              Precio ({moneda})
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isEditing = editingItemId === item.id
            const isSaving = savingItemId === item.id
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nombre}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.tiempo_entrega}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        ref={inputRef}
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item)}
                        placeholder="Vacío = sin precio"
                        className="w-36 text-right"
                        disabled={isSaving}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => saveEdit(item)}
                        disabled={isSaving}
                        aria-label="Guardar"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(item)}
                      className="text-right hover:underline cursor-pointer min-w-[120px]"
                    >
                      {item.precio !== null ? (
                        <span className="font-medium">
                          {formatPrice(item.precio, moneda)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Sin precio
                        </span>
                      )}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
