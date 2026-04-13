"use client"

import { useState, useMemo } from "react"
import { Search, KeyRound, CheckCircle2, Circle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/utils/date-format"
import type { OdontologoListItem } from "@/lib/types/entities"
import { EditarVeviCredencialesDialog } from "./editar-vevi-credenciales-dialog"

type VeviFilter = "todos" | "registrados" | "pendientes"

interface OdontologosTableProps {
  initialOdontologos: OdontologoListItem[]
}

export function OdontologosTable({ initialOdontologos }: OdontologosTableProps) {
  const [odontologos, setOdontologos] = useState(initialOdontologos)
  const [search, setSearch] = useState("")
  const [veviFilter, setVeviFilter] = useState<VeviFilter>("todos")
  const [editingOdontologo, setEditingOdontologo] = useState<OdontologoListItem | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return odontologos.filter((o) => {
      if (veviFilter === "registrados" && !o.vevi_registrado_at) return false
      if (veviFilter === "pendientes" && o.vevi_registrado_at) return false

      if (!q) return true
      return (
        o.nombre.toLowerCase().includes(q) ||
        o.apellido.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.localidad_nombre?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [odontologos, search, veviFilter])

  const handleUpdated = (updated: OdontologoListItem) => {
    setOdontologos((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    )
  }

  const registeredCount = odontologos.filter((o) => o.vevi_registrado_at).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Odontólogos</h1>
        <p className="text-muted-foreground">
          Gestioná los odontólogos registrados y sus credenciales de Vevi Dental
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Total: {odontologos.length}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900">
          Registrados en Vevi: {registeredCount}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900">
          Pendientes: {odontologos.length - registeredCount}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido, email o localidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={veviFilter} onValueChange={(v) => setVeviFilter(v as VeviFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="registrados">Registrados en Vevi</SelectItem>
            <SelectItem value="pendientes">Pendientes de registro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Localidad</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado Vevi</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay odontólogos que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => {
                const isRegistered = !!o.vevi_registrado_at
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.apellido}, {o.nombre}
                    </TableCell>
                    <TableCell className="text-sm">{o.email}</TableCell>
                    <TableCell className="text-sm">
                      {o.localidad_nombre || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.telefono || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {isRegistered ? (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Registrado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                        >
                          <Circle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingOdontologo(o)}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                        {isRegistered ? "Editar credenciales" : "Registrar en Vevi"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {odontologos.length} odontólogos
        {editingOdontologo && editingOdontologo.vevi_registrado_at && (
          <> · Última edición disponible: {formatDateTime(editingOdontologo.vevi_registrado_at)}</>
        )}
      </p>

      {/* Edit dialog */}
      <EditarVeviCredencialesDialog
        odontologo={editingOdontologo}
        onClose={() => setEditingOdontologo(null)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
