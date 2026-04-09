"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { CrearItemDialog } from "./crear-item-dialog"
import { EditarItemDialog } from "./editar-item-dialog"
import { EliminarItemDialog } from "./eliminar-item-dialog"
import type { Item } from "@/lib/types/entities"

interface ItemsTableProps {
  items: Item[]
  onItemsChange: (items: Item[]) => void
}

export function ItemsTable({ items, onItemsChange }: ItemsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [crearOpen, setCrearOpen] = useState(false)
  const [editarItem, setEditarItem] = useState<Item | null>(null)
  const [eliminarItem, setEliminarItem] = useState<Item | null>(null)

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter(
      (i) =>
        i.nombre.toLowerCase().includes(term) ||
        i.tiempo_entrega.toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  const handleItemCreated = (newItem: Item) => {
    // Insert alphabetically
    const next = [...items, newItem].sort((a, b) => a.nombre.localeCompare(b.nombre))
    onItemsChange(next)
    router.refresh()
  }

  const handleItemUpdated = (updated: Item) => {
    const next = items
      .map((i) => (i.id === updated.id ? updated : i))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    onItemsChange(next)
    router.refresh()
  }

  const handleItemDeleted = (id: string) => {
    onItemsChange(items.filter((i) => i.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ítem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCrearOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ítem
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "ítem" : "ítems"}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tiempo de entrega</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {items.length === 0
                      ? "Todavía no hay ítems. Creá el primero para comenzar."
                      : "No se encontraron ítems con ese filtro."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.tiempo_entrega}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditarItem(item)}
                          aria-label={`Editar ${item.nombre}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEliminarItem(item)}
                          aria-label={`Eliminar ${item.nombre}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {items.length === 0
                ? "Todavía no hay ítems."
                : "No se encontraron ítems."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.tiempo_entrega}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditarItem(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEliminarItem(item)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <CrearItemDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        onItemCreated={handleItemCreated}
      />
      <EditarItemDialog
        item={editarItem}
        onOpenChange={(open) => !open && setEditarItem(null)}
        onItemUpdated={handleItemUpdated}
      />
      <EliminarItemDialog
        item={eliminarItem}
        onOpenChange={(open) => !open && setEliminarItem(null)}
        onItemDeleted={handleItemDeleted}
      />
    </div>
  )
}
