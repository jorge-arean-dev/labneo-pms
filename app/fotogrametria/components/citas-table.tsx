"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { getEstadoCitaColor, getEstadoCitaLabel } from "@/lib/constants/estado-colors"
import { formatDateTime } from "@/lib/utils/date-format"
import { SolicitarTurnoDialog } from "./solicitar-turno-dialog"
import type { CitaFotogrametria } from "@/lib/types/entities"

interface CitaWithOdontologo extends CitaFotogrametria {
  odontologo?: {
    id: string
    nombre: string
    apellido: string
    email: string
  } | null
}

interface CitasTableProps {
  initialCitas: CitaWithOdontologo[]
  userRole: string
}

export function CitasTable({ initialCitas, userRole }: CitasTableProps) {
  const router = useRouter()
  const [citas, setCitas] = useState(initialCitas)
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [dialogOpen, setDialogOpen] = useState(false)

  const isOdontologo = userRole === "odontologo"

  const filtered = citas.filter((c) => {
    const odontologoName = c.odontologo
      ? `${c.odontologo.nombre} ${c.odontologo.apellido}`
      : ""
    const matchesSearch =
      searchTerm === "" ||
      odontologoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.direccion_consultorio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (String(c.tipo_servicio || "")).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado =
      estadoFilter === "todos" || c.estado === estadoFilter

    return matchesSearch && matchesEstado
  })

  const handleCitaCreated = (newCita: CitaFotogrametria) => {
    setCitas([newCita, ...citas])
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isOdontologo ? "Mis Turnos de Fotogrametría" : "Fotogrametría"}
          </h1>
          <p className="text-muted-foreground">
            {isOdontologo
              ? "Solicitá y seguí el estado de tus turnos"
              : "Gestión de citas de fotogrametría"}
          </p>
        </div>
        {isOdontologo && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Turno
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              isOdontologo
                ? "Buscar por dirección o servicio..."
                : "Buscar por odontólogo, dirección o servicio..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="aceptada">Aceptada</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="rechazada">Rechazada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "cita" : "citas"}
      </p>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {!isOdontologo && <TableHead>Odontólogo</TableHead>}
                <TableHead>Dirección</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha propuesta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isOdontologo ? 4 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {citas.length === 0
                      ? isOdontologo
                        ? "No tenés turnos. Solicitá uno nuevo para comenzar."
                        : "No hay citas de fotogrametría registradas."
                      : "No se encontraron citas con los filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/fotogrametria/${c.id}`)}
                  >
                    {!isOdontologo && (
                      <TableCell className="font-medium">
                        {c.odontologo
                          ? `${c.odontologo.nombre} ${c.odontologo.apellido}`
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell>{c.direccion_consultorio}</TableCell>
                    <TableCell>{c.tipo_servicio || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.fecha_propuesta)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-transparent ${getEstadoCitaColor(c.estado)}`}
                      >
                        {getEstadoCitaLabel(c.estado)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {citas.length === 0
                ? isOdontologo
                  ? "No tenés turnos. Solicitá uno nuevo para comenzar."
                  : "No hay citas de fotogrametría registradas."
                : "No se encontraron citas con los filtros aplicados."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/fotogrametria/${c.id}`)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {!isOdontologo && c.odontologo
                      ? `${c.odontologo.nombre} ${c.odontologo.apellido}`
                      : c.direccion_consultorio}
                  </span>
                  <Badge
                    variant="outline"
                    className={`border-transparent ${getEstadoCitaColor(c.estado)}`}
                  >
                    {getEstadoCitaLabel(c.estado)}
                  </Badge>
                </div>
                {!isOdontologo && (
                  <p className="text-sm text-muted-foreground">{c.direccion_consultorio}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {c.tipo_servicio || "Sin especificar"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(c.fecha_propuesta)}
                  </span>
                </div>
                {c.observaciones && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.observaciones}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create dialog */}
      {isOdontologo && (
        <SolicitarTurnoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCitaCreated={handleCitaCreated}
        />
      )}
    </div>
  )
}
