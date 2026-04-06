"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { getEstadoCitaColor, getEstadoCitaLabel } from "@/lib/constants/estado-colors"
import { formatDateTime } from "@/lib/utils/date-format"
import { updateCitaEstado, deleteCita } from "../../actions"
import type { CitaFotogrametria, EstadoCita } from "@/lib/types/entities"

interface CitaWithOdontologo extends CitaFotogrametria {
  odontologo?: {
    id: string
    nombre: string
    apellido: string
    email: string
  } | null
}

interface CitaDetailPageProps {
  cita: CitaWithOdontologo
  userRole: string
}

export function CitaDetailPage({ cita, userRole }: CitaDetailPageProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [notas, setNotas] = useState(cita.notas || "")

  const isAdmin = userRole === "administracion"
  const canManage = isAdmin

  const handleEstadoChange = async (estado: EstadoCita) => {
    setIsUpdating(true)

    const result = await updateCitaEstado(
      cita.id,
      estado,
      notas || undefined
    )

    if (result.success) {
      toast.success(`Cita ${getEstadoCitaLabel(estado).toLowerCase()}`)
      router.refresh()
    } else {
      toast.error(result.error || "Error al actualizar")
    }

    setIsUpdating(false)
  }

  const handleSaveNotas = async () => {
    setIsUpdating(true)

    const result = await updateCitaEstado(
      cita.id,
      cita.estado as EstadoCita,
      notas
    )

    if (result.success) {
      toast.success("Notas guardadas")
      router.refresh()
    } else {
      toast.error(result.error || "Error al guardar")
    }

    setIsUpdating(false)
  }

  const handleDelete = async () => {
    const result = await deleteCita(cita.id)

    if (result.success) {
      toast.success("Cita eliminada")
      router.push("/fotogrametria")
    } else {
      toast.error(result.error || "Error al eliminar")
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/fotogrametria"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Fotogrametría
        </Link>
        <span>/</span>
        <span className="text-foreground">Detalle de cita</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cita de Fotogrametría</h1>
          {cita.odontologo && (
            <p className="text-muted-foreground">
              {cita.odontologo.nombre} {cita.odontologo.apellido} — {cita.odontologo.email}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`border-transparent text-sm px-3 py-1 ${getEstadoCitaColor(cita.estado)}`}
        >
          {getEstadoCitaLabel(cita.estado)}
        </Badge>
      </div>

      {/* Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la cita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Dirección del consultorio</Label>
              <p className="font-medium">{cita.direccion_consultorio}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Tipo de servicio</Label>
              <p className="font-medium">{cita.tipo_servicio || "No especificado"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Fecha y hora propuesta</Label>
              <p className="font-medium">{formatDateTime(cita.fecha_propuesta)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Estado</Label>
              <p className="font-medium">{getEstadoCitaLabel(cita.estado)}</p>
            </div>
          </div>

          {cita.observaciones && (
            <div>
              <Label className="text-muted-foreground text-xs">Observaciones del odontólogo</Label>
              <p className="text-sm mt-1">{cita.observaciones}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-muted-foreground text-xs">Fecha de solicitud</Label>
              <p className="text-sm">{formatDateTime(cita.created_at)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Última actualización</Label>
              <p className="text-sm">{formatDateTime(cita.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Controls (Admin) */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Gestión (Administración)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick action buttons based on current estado */}
            <div className="space-y-2">
              <Label>Acciones</Label>
              <div className="flex flex-wrap gap-2">
                {cita.estado === "pendiente" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleEstadoChange("aceptada")}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleEstadoChange("rechazada")}
                      disabled={isUpdating}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rechazar
                    </Button>
                  </>
                )}
                {cita.estado === "aceptada" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleEstadoChange("finalizada")}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marcar como Finalizada
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEstadoChange("pendiente")}
                      disabled={isUpdating}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Volver a Pendiente
                    </Button>
                  </>
                )}
                {(cita.estado === "finalizada" || cita.estado === "rechazada") && (
                  <p className="text-sm text-muted-foreground">
                    Esta cita está {getEstadoCitaLabel(cita.estado).toLowerCase()}. No hay acciones disponibles.
                  </p>
                )}
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>

            {/* Notas internas */}
            <div className="space-y-2">
              <Label htmlFor="notas-internas">Notas internas</Label>
              <Textarea
                id="notas-internas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones sobre la visita, equipamiento necesario, etc."
                rows={3}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotas}
                disabled={isUpdating}
              >
                Guardar notas
              </Button>
            </div>

            {/* Delete (admin only) */}
            {isAdmin && (
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Eliminar cita
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar cita?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente esta cita de fotogrametría.
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Notas internas visible to odontólogo (read-only) */}
      {!canManage && cita.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{cita.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
