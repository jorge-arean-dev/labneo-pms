"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getEstadoSolicitudColor } from "@/lib/constants/estado-colors"
import { formatDateTime } from "@/lib/utils/date-format"
import { updateSolicitudEstado, deleteSolicitud } from "../../actions"
import {
  TIPOS_SOLICITUD,
  SUBTIPOS_SERVICIO,
  type SolicitudWithRelations,
  type EstadoSolicitud,
} from "@/lib/types/entities"

interface SolicitudDetailPageProps {
  solicitud: SolicitudWithRelations
  userRole: string
  estados: EstadoSolicitud[]
}

export function SolicitudDetailPage({ solicitud, userRole, estados }: SolicitudDetailPageProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newEstadoId, setNewEstadoId] = useState<string>(solicitud.estado_id)
  const [notasAdmin, setNotasAdmin] = useState(solicitud.notas_admin || "")

  const isAdmin = userRole === "administracion"
  const isProtesis = solicitud.tipo_solicitud === "protesis"
  const isAlquiler = solicitud.tipo_solicitud === "alquiler_equipos"

  // Filter estados that match the solicitud tipo OR apply to all
  const availableEstados = estados.filter(
    (e) => e.tipo_solicitud === solicitud.tipo_solicitud || e.tipo_solicitud === "todos"
  )

  const handleUpdateEstado = async () => {
    setIsUpdating(true)

    const result = await updateSolicitudEstado(
      solicitud.id,
      newEstadoId,
      notasAdmin || undefined
    )

    if (result.success) {
      toast.success("Solicitud actualizada exitosamente")
      router.refresh()
    } else {
      toast.error(result.error || "Error al actualizar")
    }

    setIsUpdating(false)
  }

  const handleDelete = async () => {
    const result = await deleteSolicitud(solicitud.id)

    if (result.success) {
      toast.success("Solicitud eliminada")
      router.push("/solicitudes")
    } else {
      toast.error(result.error || "Error al eliminar")
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/solicitudes"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Solicitudes
        </Link>
        <span>/</span>
        <span className="text-foreground">{solicitud.nombre} {solicitud.apellido}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {solicitud.nombre} {solicitud.apellido}
          </h1>
          <p className="text-muted-foreground">{solicitud.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {TIPOS_SOLICITUD[solicitud.tipo_solicitud]}
          </Badge>
          {solicitud.estados_solicitud && (
            <Badge
              variant="outline"
              className={`border-transparent text-sm px-3 py-1 ${getEstadoSolicitudColor(solicitud.estados_solicitud.codigo)}`}
            >
              {solicitud.estados_solicitud.nombre}
            </Badge>
          )}
        </div>
      </div>

      {/* Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la solicitud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Common fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Nombre</Label>
              <p className="font-medium">{solicitud.nombre}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Apellido</Label>
              <p className="font-medium">{solicitud.apellido}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{solicitud.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Teléfono</Label>
              <p className="font-medium">{solicitud.telefono}</p>
            </div>
          </div>

          {/* Prótesis-specific */}
          {isProtesis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label className="text-muted-foreground text-xs">Localidad</Label>
                <p className="font-medium">{solicitud.localidades?.nombre_display || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">CUIT</Label>
                <p className="font-medium">{solicitud.cuit || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-muted-foreground text-xs">Situación frente al IVA</Label>
                <p className="font-medium">{solicitud.situacion_iva || "—"}</p>
              </div>
            </div>
          )}

          {/* Alquiler-specific */}
          {isAlquiler && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label className="text-muted-foreground text-xs">Tipo de servicio</Label>
                <p className="font-medium">
                  {solicitud.subtipo_servicio
                    ? SUBTIPOS_SERVICIO[solicitud.subtipo_servicio]
                    : "—"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Fecha propuesta</Label>
                <p className="font-medium">
                  {solicitud.fecha_propuesta ? formatDateTime(solicitud.fecha_propuesta) : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-muted-foreground text-xs">Dirección del consultorio</Label>
                <p className="font-medium">{solicitud.direccion_consultorio || "—"}</p>
              </div>
            </div>
          )}

          {/* Observaciones */}
          {solicitud.observaciones && (
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground text-xs">Observaciones</Label>
              <p className="text-sm whitespace-pre-wrap">{solicitud.observaciones}</p>
            </div>
          )}

          {/* Audit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-muted-foreground text-xs">Fecha de envío</Label>
              <p className="text-sm">{formatDateTime(solicitud.created_at)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Última actualización</Label>
              <p className="text-sm">{formatDateTime(solicitud.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestión (Administración)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estado selector */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={newEstadoId} onValueChange={setNewEstadoId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEstados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notas admin */}
            <div className="space-y-2">
              <Label htmlFor="notas-admin">Notas internas</Label>
              <Textarea
                id="notas-admin"
                value={notasAdmin}
                onChange={(e) => setNotasAdmin(e.target.value)}
                placeholder="Notas visibles solo para administración..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleUpdateEstado} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar solicitud?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminará permanentemente la
                      solicitud de {solicitud.nombre} {solicitud.apellido}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas admin visible to odontólogo (read-only) */}
      {!isAdmin && solicitud.notas_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas del laboratorio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{solicitud.notas_admin}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
