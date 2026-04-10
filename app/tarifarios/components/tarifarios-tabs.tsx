"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ItemsTable } from "./items-table"
import { ListasTable } from "./listas-table"
import { LocalidadesTable } from "./localidades-table"
import type { Item, TarifarioSummary, Localidad } from "@/lib/types/entities"

interface TarifariosTabsProps {
  initialItems: Item[]
  initialTarifarios: TarifarioSummary[]
  localidades: (Localidad & { tarifario_id: string | null })[]
}

export function TarifariosTabs({
  initialItems,
  initialTarifarios,
  localidades,
}: TarifariosTabsProps) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [tarifarios, setTarifarios] = useState<TarifarioSummary[]>(initialTarifarios)
  const [localidadesState, setLocalidadesState] = useState(localidades)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tarifarios</h1>
        <p className="text-muted-foreground">
          Gestión del catálogo de ítems y listas de precios por localidad
        </p>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Ítems</TabsTrigger>
          <TabsTrigger value="listas">Listas de precios</TabsTrigger>
          <TabsTrigger value="localidades">Localidades</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-6">
          <ItemsTable items={items} onItemsChange={setItems} />
        </TabsContent>

        <TabsContent value="listas" className="mt-6">
          <ListasTable
            tarifarios={tarifarios}
            onTarifariosChange={setTarifarios}
            localidades={localidadesState}
            onLocalidadesChange={setLocalidadesState}
          />
        </TabsContent>

        <TabsContent value="localidades" className="mt-6">
          <LocalidadesTable
            localidades={localidadesState}
            onLocalidadesChange={setLocalidadesState}
            tarifarios={tarifarios}
            onTarifariosChange={setTarifarios}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
