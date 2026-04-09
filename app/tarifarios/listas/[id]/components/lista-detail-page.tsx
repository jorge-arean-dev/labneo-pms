"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ListaPreciosGrid } from "./lista-precios-grid"
import type { Tarifario, ItemWithPrecio, Localidad } from "@/lib/types/entities"

interface ListaDetailPageProps {
  tarifario: Tarifario
  items: ItemWithPrecio[]
  localidades: Localidad[]
}

export function ListaDetailPage({
  tarifario,
  items: initialItems,
  localidades,
}: ListaDetailPageProps) {
  const [items, setItems] = useState<ItemWithPrecio[]>(initialItems)
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter((i) => i.nombre.toLowerCase().includes(term))
  }, [items, searchTerm])

  const preciosCount = items.filter((i) => i.precio !== null).length

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/tarifarios"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tarifarios
        </Link>
        <span>/</span>
        <span className="text-foreground">{tarifario.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tarifario.nombre}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Asigná el precio de cada ítem en esta lista. Los ítems sin precio
            aparecerán como <strong>Sin precio</strong> en el selector del odontólogo.
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {tarifario.moneda}
        </Badge>
      </div>

      {/* Metadata card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información de la lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Localidades asignadas</p>
            {localidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin localidades asignadas. Editá la lista desde /tarifarios para
                asignar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {localidades.map((l) => (
                  <Badge key={l.id} variant="secondary" className="text-xs">
                    {l.nombre_display}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ítems con precio</p>
            <p className="text-sm font-medium">
              {preciosCount} de {items.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar ítem..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <ListaPreciosGrid
        tarifarioId={tarifario.id}
        moneda={tarifario.moneda}
        items={filtered}
        onItemsChange={setItems}
        allItems={items}
      />
    </div>
  )
}
