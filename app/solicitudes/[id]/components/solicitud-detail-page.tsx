"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, CheckCircle2, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import {
  updateSolicitudEstado,
  deleteSolicitud,
  marcarSolicitudProtesisProcesada,
} from "../../actions"
import {
  TIPOS_SOLICITUD,
  SUBTIPOS_SERVICIO,
  type SolicitudWithRelations,
  type EstadoSolicitud,
  type Moneda,
} from "@/lib/types/entities"

function formatPrice(precio: number, moneda: Moneda): string {
  if (moneda === "USD") return `US$ ${precio.toFixed(2)}`
  return `$ ${precio.toLocaleString("es-AR")}`
}

interface SolicitudDetailPageProps {
  solicitud: SolicitudWithRelations
  userRole: string
  estados: EstadoSolicitud[]
  veviRegistered: boolean
  veviUsuario: string | null
}

export function SolicitudDetailPage({
  solicitud,
  userRole,
  estados,
  veviRegistered,
  veviUsuario,
}: SolicitudDetailPageProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newEstadoId, setNewEstadoId] = useState<string>(solicitud.estado_id)
  const [notasAdmin, setNotasAdmin] = useState(solicitud.notas_admin || "")

  // First-time Vevi credentials form state (only used when !veviRegistered)
  const [veviUsuarioInput, setVeviUsuarioInput] = useState("")
  const [veviPasswordInput, setVeviPasswordInput] = useState("")
  const [veviComentariosInput, setVeviComentariosInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isAdmin = userRole === "administracion"
  const isProtesis = solicitud.tipo_solicitud === "protesis"
  const isAlquiler = solicitud.tipo_solicitud === "alquiler_equipos"
  const estadoCodigo = solicitud.estados_solicitud?.codigo || ""
  const isPendiente = estadoCodigo === "pendiente"
  const isProcesada = estadoCodigo === "procesada"

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

  // Click handler for the "Marcar como procesada" button.
  // - If the odontólogo is not yet registered: validate inputs, then open
  //   a confirmation dialog before the action runs.
  // - If the odontólogo is already registered: call the action directly.
  const handleClickMarcarProcesada = () => {
    if (!veviRegistered) {
      if (!veviUsuarioInput.trim() || !veviPasswordInput.trim()) {
        toast.error("El usuario y contraseña de Vevi son obligatorios")
        return
      }
      setConfirmOpen(true)
      return
    }
    void runMarcarProcesada()
  }

  const runMarcarProcesada = async () => {
    setIsProcessing(true)
    setConfirmOpen(false)

    const result = await marcarSolicitudProtesisProcesada(
      solicitud.id,
      veviRegistered
        ? {}
        : {
            vevi_usuario: veviUsuarioInput.trim(),
            vevi_password: veviPasswordInput.trim(),
            vevi_comentarios: veviComentariosInput.trim() || null,
          }
    )

    if (result.success) {
      toast.success(
        veviRegistered
          ? "Solicitud marcada como procesada"
          : "Solicitud procesada — Credenciales guardadas y enviadas al odontólogo"
      )
      router.refresh()
    } else {
      toast.error(result.error || "Error al procesar la solicitud")
    }

    setIsProcessing(false)
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

          {/* Prótesis items */}
          {isProtesis && solicitud.solicitudes_items && solicitud.solicitudes_items.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Ítems solicitados</Label>
                {solicitud.moneda_snapshot && (
                  <Badge variant="outline" className="text-xs">
                    {solicitud.moneda_snapshot}
                  </Badge>
                )}
              </div>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Ítem</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">
                        Tiempo de entrega
                      </th>
                      <th className="px-3 py-2 font-medium text-right">Precio</th>
                      <th className="px-3 py-2 font-medium text-center w-16">Cant.</th>
                      <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {solicitud.solicitudes_items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">{line.nombre_snapshot}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {line.tiempo_entrega_snapshot}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {line.precio_snapshot > 0 && solicitud.moneda_snapshot
                            ? formatPrice(Number(line.precio_snapshot), solicitud.moneda_snapshot)
                            : <span className="text-xs text-muted-foreground italic">Sin precio</span>}
                        </td>
                        <td className="px-3 py-2 text-center">{line.cantidad}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {line.subtotal_snapshot > 0 && solicitud.moneda_snapshot
                            ? formatPrice(Number(line.subtotal_snapshot), solicitud.moneda_snapshot)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {solicitud.total_snapshot !== null && solicitud.total_snapshot > 0 && solicitud.moneda_snapshot && (
                    <tfoot className="bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPrice(Number(solicitud.total_snapshot), solicitud.moneda_snapshot)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
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
            {/* Prótesis in pendiente: show the right flow based on Vevi state */}
            {isProtesis && isPendiente && (
              <>
                {veviRegistered ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4 flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-200">
                        Odontólogo ya registrado en Vevi como{" "}
                        <span className="font-mono">{veviUsuario}</span>
                      </p>
                      <p className="text-blue-800/80 dark:text-blue-300/80 mt-1">
                        Al marcar como procesada, solo se actualizará el estado de la solicitud.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Este odontólogo aún no está registrado en Vevi. Registralo en la plataforma e
                      ingresá las credenciales generadas para quedar asociadas a su perfil.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vevi-usuario">Usuario Vevi Dental *</Label>
                        <Input
                          id="vevi-usuario"
                          value={veviUsuarioInput}
                          onChange={(e) => setVeviUsuarioInput(e.target.value)}
                          placeholder="usuario@vevidental.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vevi-password">Contraseña Vevi Dental *</Label>
                        <Input
                          id="vevi-password"
                          value={veviPasswordInput}
                          onChange={(e) => setVeviPasswordInput(e.target.value)}
                          placeholder="Contraseña generada"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vevi-comentarios">Comentarios (opcional)</Label>
                      <Textarea
                        id="vevi-comentarios"
                        value={veviComentariosInput}
                        onChange={(e) => setVeviComentariosInput(e.target.value)}
                        placeholder="Comentarios visibles para el odontólogo..."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Prótesis procesada: read-only summary */}
            {isProtesis && isProcesada && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-4 text-sm space-y-1">
                <p className="font-medium text-green-700 dark:text-green-300">
                  Solicitud procesada
                </p>
                <p className="text-muted-foreground">
                  Esta solicitud ya fue procesada por el administrador.
                </p>
              </div>
            )}

            {/* Non-prótesis: generic estado selector */}
            {!isProtesis && (
              <>
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
              </>
            )}

            {/* Notas admin (internal, for non-prótesis) */}
            {!isProtesis && (
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
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {/* Prótesis pendiente: Marcar como procesada */}
              {isProtesis && isPendiente && (
                <Button
                  onClick={handleClickMarcarProcesada}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como procesada
                    </>
                  )}
                </Button>
              )}

              {/* Non-prótesis: save estado changes */}
              {!isProtesis && (
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
              )}

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

      {/* Notas admin visible to odontólogo (read-only, non-prótesis only) */}
      {!isAdmin && !isProtesis && solicitud.notas_admin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas del laboratorio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{solicitud.notas_admin}</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog for first-time credential submission */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar credenciales Vevi</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Se enviarán los siguientes datos al odontólogo por email:</p>
                <div className="rounded-md border p-3 bg-muted/40 space-y-1 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground">Usuario: </span>
                    {veviUsuarioInput}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contraseña: </span>
                    {veviPasswordInput}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Una vez guardadas, estas credenciales quedarán asociadas al perfil del
                  odontólogo y no podrás editarlas desde esta pantalla.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runMarcarProcesada()}>
              Confirmar y procesar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
