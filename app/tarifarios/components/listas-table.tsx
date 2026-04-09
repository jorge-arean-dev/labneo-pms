"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { CrearListaDialog } from "./crear-lista-dialog"
import { EditarListaDialog } from "./editar-lista-dialog"
import { EliminarListaDialog } from "./eliminar-lista-dialog"
import type { TarifarioSummary, Localidad } from "@/lib/types/entities"

type LocalidadRow = Localidad & { tarifario_id: string | null }

interface ListasTableProps {
  tarifarios: TarifarioSummary[]
  onTarifariosChange: (tarifarios: TarifarioSummary[]) => void
  localidades: LocalidadRow[]
  onLocalidadesChange: (localidades: LocalidadRow[]) => void
}

export function ListasTable({
  tarifarios,
  onTarifariosChange,
  localidades,
  onLocalidadesChange,
}: ListasTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [crearOpen, setCrearOpen] = useState(false)
  const [editarLista, setEditarLista] = useState<TarifarioSummary | null>(null)
  const [eliminarLista, setEliminarLista] = useState<TarifarioSummary | null>(null)

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return tarifarios
    const term = searchTerm.toLowerCase()
    return tarifarios.filter(
      (t) =>
        t.nombre.toLowerCase().includes(term) ||
        t.localidades.some((l) => l.nombre_display.toLowerCase().includes(term))
    )
  }, [tarifarios, searchTerm])

  const handleListaCreated = (newLista: TarifarioSummary, linkedLocalidadIds: string[]) => {
    const next = [...tarifarios, newLista].sort((a, b) => a.nombre.localeCompare(b.nombre))
    onTarifariosChange(next)
    // Reflect link changes in localidades local state (so dialogs disable them instantly)
    onLocalidadesChange(
      localidades.map((l) =>
        linkedLocalidadIds.includes(l.id) ? { ...l, tarifario_id: newLista.id } : l
      )
    )
    router.refresh()
  }

  const handleListaUpdated = (
    updated: TarifarioSummary,
    linkedLocalidadIds: string[]
  ) => {
    const next = tarifarios
      .map((t) => (t.id === updated.id ? updated : t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    onTarifariosChange(next)
    onLocalidadesChange(
      localidades.map((l) => {
        if (linkedLocalidadIds.includes(l.id)) return { ...l, tarifario_id: updated.id }
        if (l.tarifario_id === updated.id) return { ...l, tarifario_id: null }
        return l
      })
    )
    router.refresh()
  }

  const handleListaDeleted = (id: string) => {
    onTarifariosChange(tarifarios.filter((t) => t.id !== id))
    onLocalidadesChange(
      localidades.map((l) => (l.tarifario_id === id ? { ...l, tarifario_id: null } : l))
    )
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar lista o localidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCrearOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva lista
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "lista" : "listas"}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]">Moneda</TableHead>
                <TableHead>Localidades</TableHead>
                <TableHead className="w-[140px] text-center">Ítems con precio</TableHead>
                <TableHead className="w-[160px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {tarifarios.length === 0
                      ? "Todavía no hay listas de precios. Creá la primera para comenzar."
                      : "No se encontraron listas con ese filtro."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.moneda}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.localidades.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sin localidades asignadas
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {t.localidades.slice(0, 3).map((l) => (
                            <Badge key={l.id} variant="secondary" className="text-xs">
                              {l.nombre_display}
                            </Badge>
                          ))}
                          {t.localidades.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{t.localidades.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {t.precios_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/tarifarios/listas/${t.id}`}
                            aria-label={`Abrir precios de ${t.nombre}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditarLista(t)}
                          aria-label={`Editar ${t.nombre}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEliminarLista(t)}
                          aria-label={`Eliminar ${t.nombre}`}
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
              {tarifarios.length === 0
                ? "Todavía no hay listas de precios."
                : "No se encontraron listas."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{t.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {t.moneda}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t.precios_count} ítems con precio
                      </span>
                    </div>
                  </div>
                </div>

                {t.localidades.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.localidades.map((l) => (
                      <Badge key={l.id} variant="secondary" className="text-xs">
                        {l.nombre_display}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/tarifarios/listas/${t.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Precios
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditarLista(t)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEliminarLista(t)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CrearListaDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        localidades={localidades}
        onListaCreated={handleListaCreated}
      />
      <EditarListaDialog
        lista={editarLista}
        localidades={localidades}
        onOpenChange={(open) => !open && setEditarLista(null)}
        onListaUpdated={handleListaUpdated}
      />
      <EliminarListaDialog
        lista={eliminarLista}
        onOpenChange={(open) => !open && setEliminarLista(null)}
        onListaDeleted={handleListaDeleted}
      />
    </div>
  )
}
