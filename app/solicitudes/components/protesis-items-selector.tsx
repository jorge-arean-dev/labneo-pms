"use client"

import { useMemo } from "react"
import { Minus, Plus, ShoppingCart, Truck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ItemWithPrecio, Moneda } from "@/lib/types/entities"

interface ProtesisItemsSelectorProps {
  /** Catalog items, alphabetically sorted, with the odontólogo's price (or null). */
  items: ItemWithPrecio[]
  /** Fixed currency of the current tarifario; null when no tarifario is resolved. */
  moneda: Moneda | null
  /** Record of itemId → quantity (uncontrolled parent state). */
  quantities: Record<string, number>
  /** Called when the user changes any quantity. */
  onQuantitiesChange: (quantities: Record<string, number>) => void
  /** True when the odontólogo has no tarifario associated with their localidad. */
  noTarifario: boolean
}

function formatPrice(precio: number, moneda: Moneda): string {
  if (moneda === "USD") return `US$ ${precio.toFixed(2)}`
  return `$ ${precio.toLocaleString("es-AR")}`
}

export function ProtesisItemsSelector({
  items,
  moneda,
  quantities,
  onQuantitiesChange,
  noTarifario,
}: ProtesisItemsSelectorProps) {
  const updateQuantity = (id: string, delta: number) => {
    const current = quantities[id] || 0
    const next = Math.max(0, current + delta)
    onQuantitiesChange({ ...quantities, [id]: next })
  }

  const selectedItems = useMemo(
    () => items.filter((item) => (quantities[item.id] || 0) > 0),
    [items, quantities]
  )

  const total = useMemo(
    () =>
      selectedItems.reduce((acc, item) => {
        const qty = quantities[item.id] || 0
        return acc + (item.precio ?? 0) * qty
      }, 0),
    [selectedItems, quantities]
  )

  const totalItems = useMemo(
    () =>
      Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities]
  )

  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 flex flex-col items-center text-center gap-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="font-semibold text-sm">No hay ítems disponibles</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Todavía no hay ítems cargados en el catálogo. Comunicate con el
            laboratorio si creés que es un error.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {noTarifario && (
        <Card className="border-yellow-200 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-900 dark:text-yellow-200">
              No tenés una lista de precios asignada a tu localidad. Podés
              seleccionar ítems igual y el laboratorio confirmará los precios al
              procesar tu solicitud.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const qty = quantities[item.id] || 0
          const hasPrice = item.precio !== null
          return (
            <Card key={item.id} className="py-3">
              <CardContent className="p-0 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="font-medium text-sm">{item.nombre}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Truck className="size-3" />
                      <span>{item.tiempo_entrega}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-end gap-0.5">
                      {moneda && hasPrice && (
                        <Badge variant="outline" className="text-xs">
                          {moneda}
                        </Badge>
                      )}
                      {hasPrice && moneda ? (
                        <span className="font-semibold text-sm">
                          {formatPrice(item.precio as number, moneda)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Sin precio
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={qty === 0}
                        aria-label={`Disminuir cantidad de ${item.nombre}`}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">
                        {qty}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label={`Aumentar cantidad de ${item.nombre}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShoppingCart className="size-4" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {totalItems === 0 ? (
            <p className="text-xs text-muted-foreground">
              No seleccionaste ningún ítem todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-1.5">
                {selectedItems.map((item) => {
                  const qty = quantities[item.id] || 0
                  const subtotal = (item.precio ?? 0) * qty
                  return (
                    <li
                      key={item.id}
                      className="flex justify-between items-center text-xs"
                    >
                      <span>
                        {item.nombre}{" "}
                        <span className="text-muted-foreground">x{qty}</span>
                      </span>
                      <span className="font-medium">
                        {item.precio !== null && moneda
                          ? formatPrice(subtotal, moneda)
                          : "—"}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t pt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
                </p>
                {moneda && total > 0 && (
                  <p className="text-sm font-semibold">
                    Total: {formatPrice(total, moneda)}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
