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
import { getEstadoSolicitudColor } from "@/lib/constants/estado-colors"
import { formatDate } from "@/lib/utils/date-format"
import { CrearSolicitudDialog } from "./crear-solicitud-dialog"
import { TIPOS_SOLICITUD } from "@/lib/types/entities"
import type {
  SolicitudWithRelations,
  EstadoSolicitud,
  OdontologoPerfilWithLocalidad,
} from "@/lib/types/entities"

interface SolicitudesTableProps {
  initialSolicitudes: SolicitudWithRelations[]
  userRole: string
  estados: EstadoSolicitud[]
  userProfile: { id: string; nombre: string; apellido: string; email: string } | null
  odontologoPerfil: OdontologoPerfilWithLocalidad | null
}

export function SolicitudesTable({
  initialSolicitudes,
  userRole,
  estados,
  userProfile,
  odontologoPerfil,
}: SolicitudesTableProps) {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes)
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [tipoFilter, setTipoFilter] = useState<string>("todos")
  const [dialogOpen, setDialogOpen] = useState(false)

  const isOdontologo = userRole === "odontologo"

  // Client-side filtering
  const filtered = solicitudes.filter((s) => {
    const localidadName = s.localidades?.nombre_display || ""
    const matchesSearch =
      searchTerm === "" ||
      `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      localidadName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado =
      estadoFilter === "todos" || s.estados_solicitud?.codigo === estadoFilter

    const matchesTipo = tipoFilter === "todos" || s.tipo_solicitud === tipoFilter

    return matchesSearch && matchesEstado && matchesTipo
  })

  const handleSolicitudCreated = (newSolicitud: SolicitudWithRelations) => {
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
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="protesis">{TIPOS_SOLICITUD.protesis}</SelectItem>
            <SelectItem value="alquiler_equipos">{TIPOS_SOLICITUD.alquiler_equipos}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {estados.map((e) => (
              <SelectItem key={e.id} value={e.codigo}>
                {e.nombre}
              </SelectItem>
            ))}
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
                <TableHead>Tipo</TableHead>
                <TableHead>Localidad</TableHead>
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
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {TIPOS_SOLICITUD[s.tipo_solicitud]}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.localidades?.nombre_display || "—"}</TableCell>
                    <TableCell>
                      {s.estados_solicitud && (
                        <Badge
                          variant="outline"
                          className={`border-transparent ${getEstadoSolicitudColor(s.estados_solicitud.codigo)}`}
                        >
                          {s.estados_solicitud.nombre}
                        </Badge>
                      )}
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
                  {s.estados_solicitud && (
                    <Badge
                      variant="outline"
                      className={`border-transparent ${getEstadoSolicitudColor(s.estados_solicitud.codigo)}`}
                    >
                      {s.estados_solicitud.nombre}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{s.email}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {TIPOS_SOLICITUD[s.tipo_solicitud]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.created_at)}
                  </span>
                </div>
                {s.localidades?.nombre_display && (
                  <p className="text-sm text-muted-foreground">{s.localidades.nombre_display}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create dialog */}
      {isOdontologo && userProfile && (
        <CrearSolicitudDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userProfile={userProfile}
          odontologoPerfil={odontologoPerfil}
          onSolicitudCreated={handleSolicitudCreated}
        />
      )}
    </div>
  )
}
