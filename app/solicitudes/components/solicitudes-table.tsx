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
import { getEstadoSolicitudColor, getEstadoSolicitudLabel } from "@/lib/constants/estado-colors"
import { formatDate } from "@/lib/utils/date-format"
import { CrearSolicitudDialog } from "./crear-solicitud-dialog"
import type { Solicitud } from "@/lib/types/entities"

interface SolicitudesTableProps {
  initialSolicitudes: Solicitud[]
  userRole: string
  userProfile: { nombre: string; apellido: string; email: string } | null
  localidades: { id: string; localidad: string; tarifario_id: string }[]
}

export function SolicitudesTable({
  initialSolicitudes,
  userRole,
  userProfile,
  localidades,
}: SolicitudesTableProps) {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes)
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [dialogOpen, setDialogOpen] = useState(false)

  const isOdontologo = userRole === "odontologo"

  // Client-side filtering
  const filtered = solicitudes.filter((s) => {
    const matchesSearch =
      searchTerm === "" ||
      `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.localidad.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado =
      estadoFilter === "todos" || s.estado === estadoFilter

    return matchesSearch && matchesEstado
  })

  const handleSolicitudCreated = (newSolicitud: Solicitud) => {
    setSolicitudes([newSolicitud, ...solicitudes])
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isOdontologo ? "Mis Solicitudes" : "Solicitudes"}
          </h1>
          <p className="text-muted-foreground">
            {isOdontologo
              ? "Seguí el estado de tus solicitudes de servicio"
              : "Gestión de solicitudes de servicio de odontólogos"}
          </p>
        </div>
        {isOdontologo && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o localidad..."
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
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="alta_generada">Alta generada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "solicitud" : "solicitudes"}
      </p>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>Servicios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {solicitudes.length === 0
                      ? isOdontologo
                        ? "No tenés solicitudes. Creá una nueva para comenzar."
                        : "No hay solicitudes registradas."
                      : "No se encontraron solicitudes con los filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/solicitudes/${s.id}`)}
                  >
                    <TableCell className="font-medium">
                      {s.nombre} {s.apellido}
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.localidad}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.tipo_servicio?.map((ts) => (
                          <Badge key={ts} variant="outline" className="text-xs">
                            {ts}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-transparent ${getEstadoSolicitudColor(s.estado)}`}
                      >
                        {getEstadoSolicitudLabel(s.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.created_at)}
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
              {solicitudes.length === 0
                ? isOdontologo
                  ? "No tenés solicitudes. Creá una nueva para comenzar."
                  : "No hay solicitudes registradas."
                : "No se encontraron solicitudes con los filtros aplicados."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/solicitudes/${s.id}`)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {s.nombre} {s.apellido}
                  </span>
                  <Badge
                    variant="outline"
                    className={`border-transparent ${getEstadoSolicitudColor(s.estado)}`}
                  >
                    {getEstadoSolicitudLabel(s.estado)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{s.email}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.localidad}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.created_at)}
                  </span>
                </div>
                {s.tipo_servicio && s.tipo_servicio.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.tipo_servicio.map((ts) => (
                      <Badge key={ts} variant="outline" className="text-xs">
                        {ts}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create dialog */}
      {isOdontologo && (
        <CrearSolicitudDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userProfile={userProfile}
          localidades={localidades}
          onSolicitudCreated={handleSolicitudCreated}
        />
      )}
    </div>
  )
}
