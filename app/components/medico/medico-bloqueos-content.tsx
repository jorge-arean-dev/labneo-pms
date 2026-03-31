"use client"

/**
 * Shared component for médico bloqueos de agenda (blocked dates)
 * Used by both /medicos/[id] and /configuracion routes
 *
 * Self-contained CRUD - does NOT use the parent edit/save mode.
 * Each add/delete operation is immediate and atomic.
 */

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Medico, MedicoBloqueoAgenda } from "@/lib/types/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia, EmptyContent } from "@/components/ui/empty"
import { CalendarOff, CalendarPlus, Trash2, Loader2, AlertTriangle, CalendarIcon } from "lucide-react"
import { fetchMedicoBloqueosAgenda } from "@/lib/actions/medico-bloqueos"
import {
  checkBloqueoConflicts,
  createBloqueoAgenda,
  deleteBloqueoAgenda,
} from "@/app/medicos/[id]/actions"
import { formatDate, formatDateTime } from "@/lib/utils/date-format"
import { cn } from "@/lib/utils"

// ============================================================================
// Status helpers
// ============================================================================

type BloqueoStatus = "proximo" | "activo" | "pasado"

function getBloqueoStatus(fechaInicio: string, fechaFin: string, today: string): BloqueoStatus {
  if (fechaFin < today) return "pasado"
  if (fechaInicio > today) return "proximo"
  return "activo"
}

const STATUS_CONFIG = {
  activo: {
    label: "Activos",
    cellBorderClass: "border-l-4 border-l-[hsl(var(--bloqueo-activo))]",
    rowClass: "",
    dotClass: "bg-[hsl(var(--bloqueo-activo))]",
  },
  proximo: {
    label: "Próximos",
    cellBorderClass: "border-l-4 border-l-[hsl(var(--bloqueo-proximo))]",
    rowClass: "",
    dotClass: "bg-[hsl(var(--bloqueo-proximo))]",
  },
  pasado: {
    label: "Pasados",
    cellBorderClass: "border-l-4 border-l-[hsl(var(--bloqueo-pasado))]",
    rowClass: "text-muted-foreground opacity-60",
    dotClass: "bg-[hsl(var(--bloqueo-pasado))]",
  },
} as const

// ============================================================================
// Main component
// ============================================================================

interface MedicoBloqueosContentProps {
  medico: Medico
  canManage: boolean
}

export function MedicoBloqueosContent({ medico, canManage }: MedicoBloqueosContentProps) {
  const router = useRouter()
  const [bloqueos, setBloqueos] = useState<MedicoBloqueoAgenda[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MedicoBloqueoAgenda | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadBloqueos = useCallback(async () => {
    setIsLoading(true)
    const { data, error: fetchError } = await fetchMedicoBloqueosAgenda(medico.id)
    if (fetchError) {
      setError(fetchError)
    } else {
      setBloqueos(data || [])
      setError(null)
    }
    setIsLoading(false)
  }, [medico.id])

  useEffect(() => {
    loadBloqueos()
  }, [loadBloqueos])

  const today = new Date().toISOString().split("T")[0]

  const proximoBloqueos = bloqueos.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "proximo")
  const activoBloqueos = bloqueos.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "activo")
  const pasadoBloqueos = bloqueos.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "pasado")

  const handleBloqueoCreated = (newBloqueo: MedicoBloqueoAgenda) => {
    setBloqueos(prev => [newBloqueo, ...prev])
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    const { success, error: deleteError } = await deleteBloqueoAgenda(deleteTarget.id)

    if (success) {
      setBloqueos(prev => prev.filter(b => b.id !== deleteTarget.id))
      toast.success("Bloqueo eliminado exitosamente")
      router.refresh()
    } else {
      toast.error(deleteError || "Error al eliminar el bloqueo")
    }

    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const formatDateRange = (fechaInicio: string, fechaFin: string) => {
    if (fechaInicio === fechaFin) {
      return formatDate(fechaInicio)
    }
    return `${formatDate(fechaInicio)} → ${formatDate(fechaFin)}`
  }

  const getDayCount = (fechaInicio: string, fechaFin: string) => {
    const start = new Date(fechaInicio + "T00:00:00")
    const end = new Date(fechaFin + "T00:00:00")
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Error al cargar los bloqueos: {error}</p>
        </CardContent>
      </Card>
    )
  }

  // Column count for section header colspan
  const colCount = canManage ? 6 : 5

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">Bloqueos de Agenda</CardTitle>
            <CardDescription>
              Períodos en que el médico no estará disponible
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Agregar Bloqueo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {bloqueos.length === 0 ? (
            <Empty className="border">
              <EmptyMedia variant="icon">
                <CalendarOff />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Sin bloqueos de agenda</EmptyTitle>
                <EmptyDescription>
                  No hay períodos de no disponibilidad registrados para este médico.
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button
                    size="sm"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Agregar Bloqueo
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              {/* Desktop: single aligned table */}
              <div className="hidden sm:block">
                <Table className="table-fixed">
                  <colgroup><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[8%]" /><col className="w-[26%]" /><col className="w-[18%]" />{canManage && <col className="w-[8%]" />}</colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha inicio</TableHead>
                      <TableHead>Fecha fin</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      {canManage && <TableHead className="sr-only">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Activos (most relevant — currently in effect) */}
                    {activoBloqueos.length > 0 && (
                      <>
                        <SectionHeaderRow label="Activos" status="activo" colSpan={colCount} />
                        {activoBloqueos.map(bloqueo => (
                          <BloqueoRow
                            key={bloqueo.id}
                            bloqueo={bloqueo}
                            status="activo"
                            canManage={canManage}
                            onDelete={setDeleteTarget}
                            getDayCount={getDayCount}
                          />
                        ))}
                      </>
                    )}
                    {/* Próximos */}
                    {proximoBloqueos.length > 0 && (
                      <>
                        <SectionHeaderRow label="Próximos" status="proximo" colSpan={colCount} />
                        {proximoBloqueos.map(bloqueo => (
                          <BloqueoRow
                            key={bloqueo.id}
                            bloqueo={bloqueo}
                            status="proximo"
                            canManage={canManage}
                            onDelete={setDeleteTarget}
                            getDayCount={getDayCount}
                          />
                        ))}
                      </>
                    )}
                    {/* Pasados */}
                    {pasadoBloqueos.length > 0 && (
                      <>
                        <SectionHeaderRow label="Pasados" status="pasado" colSpan={colCount} />
                        {pasadoBloqueos.map(bloqueo => (
                          <BloqueoRow
                            key={bloqueo.id}
                            bloqueo={bloqueo}
                            status="pasado"
                            canManage={canManage}
                            onDelete={null}
                            getDayCount={getDayCount}
                          />
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-4">
                {activoBloqueos.length > 0 && (
                  <MobileSection
                    label="Activos"
                    status="activo"
                    bloqueos={activoBloqueos}
                    canManage={canManage}
                    onDelete={setDeleteTarget}
                    getDayCount={getDayCount}
                    formatDateRange={formatDateRange}
                  />
                )}
                {proximoBloqueos.length > 0 && (
                  <MobileSection
                    label="Próximos"
                    status="proximo"
                    bloqueos={proximoBloqueos}
                    canManage={canManage}
                    onDelete={setDeleteTarget}
                    getDayCount={getDayCount}
                    formatDateRange={formatDateRange}
                  />
                )}
                {pasadoBloqueos.length > 0 && (
                  <MobileSection
                    label="Pasados"
                    status="pasado"
                    bloqueos={pasadoBloqueos}
                    canManage={false}
                    onDelete={null}
                    getDayCount={getDayCount}
                    formatDateRange={formatDateRange}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AgregarBloqueoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        medicoId={medico.id}
        onBloqueoCreated={handleBloqueoCreated}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar bloqueo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas la eliminación de este bloqueo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="space-y-1 rounded-lg border p-3">
              <p className="text-sm font-medium">
                {formatDateRange(deleteTarget.fecha_inicio, deleteTarget.fecha_fin)}
              </p>
              {deleteTarget.motivo && (
                <p className="text-sm text-muted-foreground">&quot;{deleteTarget.motivo}&quot;</p>
              )}
              <p className="text-xs text-muted-foreground">
                El médico quedará disponible para ese período.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar bloqueo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================================
// Table sub-components
// ============================================================================

function SectionHeaderRow({ label, status, colSpan }: { label: string; status: BloqueoStatus; colSpan: number }) {
  const config = STATUS_CONFIG[status]
  return (
    <TableRow className="hover:bg-transparent border-b-0">
      <TableCell colSpan={colSpan} className="pt-5 pb-1 px-4">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", config.dotClass)} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function BloqueoRow({
  bloqueo,
  status,
  canManage,
  onDelete,
  getDayCount,
}: {
  bloqueo: MedicoBloqueoAgenda
  status: BloqueoStatus
  canManage: boolean
  onDelete: ((b: MedicoBloqueoAgenda) => void) | null
  getDayCount: (a: string, b: string) => number
}) {
  const config = STATUS_CONFIG[status]
  return (
    <TableRow className={config.rowClass}>
      <TableCell className={config.cellBorderClass}>{formatDate(bloqueo.fecha_inicio)}</TableCell>
      <TableCell>{formatDate(bloqueo.fecha_fin)}</TableCell>
      <TableCell className="text-muted-foreground">
        {getDayCount(bloqueo.fecha_inicio, bloqueo.fecha_fin)}
      </TableCell>
      <TableCell>{bloqueo.motivo || "—"}</TableCell>
      <TableCell>
        <OrigenBadge origen={bloqueo.origen} />
      </TableCell>
      {canManage && (
        <TableCell>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(bloqueo)}
              aria-label={`Eliminar bloqueo del ${formatDate(bloqueo.fecha_inicio)} al ${formatDate(bloqueo.fecha_fin)}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

function MobileSection({
  label,
  status,
  bloqueos,
  canManage,
  onDelete,
  getDayCount,
  formatDateRange,
}: {
  label: string
  status: BloqueoStatus
  bloqueos: MedicoBloqueoAgenda[]
  canManage: boolean
  onDelete: ((b: MedicoBloqueoAgenda) => void) | null
  getDayCount: (a: string, b: string) => number
  formatDateRange: (a: string, b: string) => string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", config.dotClass)} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {bloqueos.map(bloqueo => (
          <div
            key={bloqueo.id}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              config.cellBorderClass,
              config.rowClass
            )}
          >
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium">
                {formatDateRange(bloqueo.fecha_inicio, bloqueo.fecha_fin)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {getDayCount(bloqueo.fecha_inicio, bloqueo.fecha_fin)} día{getDayCount(bloqueo.fecha_inicio, bloqueo.fecha_fin) > 1 ? "s" : ""}
                </span>
                <OrigenBadge origen={bloqueo.origen} />
              </div>
              {bloqueo.motivo && (
                <p className="text-xs text-muted-foreground">{bloqueo.motivo}</p>
              )}
            </div>
            {canManage && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(bloqueo)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Origen Badge
// ============================================================================

function OrigenBadge({ origen }: { origen: "individual" | "general" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        origen === "general"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
          : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
      )}
    >
      {origen === "general" ? "General" : "Individual"}
    </Badge>
  )
}

// ============================================================================
// Agregar Bloqueo Dialog
// ============================================================================

interface AgregarBloqueoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicoId: string
  onBloqueoCreated: (bloqueo: MedicoBloqueoAgenda) => void
}

function AgregarBloqueoDialog({
  open,
  onOpenChange,
  medicoId,
  onBloqueoCreated,
}: AgregarBloqueoDialogProps) {
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined)
  const [fechaFin, setFechaFin] = useState<Date | undefined>(undefined)
  const [motivo, setMotivo] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    fecha_hora: string
    paciente_nombre: string
    paciente_apellido: string
  }>>([])
  const [hasChecked, setHasChecked] = useState(false)
  const [inicioPopoverOpen, setInicioPopoverOpen] = useState(false)
  const [finPopoverOpen, setFinPopoverOpen] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFechaInicio(undefined)
      setFechaFin(undefined)
      setMotivo("")
      setConflicts([])
      setHasChecked(false)
    }
  }, [open])

  // Check conflicts when both dates are set
  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setConflicts([])
      setHasChecked(false)
      return
    }

    const checkConflicts = async () => {
      setIsChecking(true)
      const inicio = formatDateForApi(fechaInicio)
      const fin = formatDateForApi(fechaFin)

      const result = await checkBloqueoConflicts(medicoId, inicio, fin)

      if (result.error) {
        toast.error(result.error)
      } else {
        setConflicts(result.consultas)
      }
      setHasChecked(true)
      setIsChecking(false)
    }

    checkConflicts()
  }, [fechaInicio, fechaFin, medicoId])

  const handleSubmit = async () => {
    if (!fechaInicio || !fechaFin) return

    setIsSubmitting(true)

    const result = await createBloqueoAgenda(medicoId, {
      fecha_inicio: formatDateForApi(fechaInicio),
      fecha_fin: formatDateForApi(fechaFin),
      motivo: motivo.trim() || undefined,
      origen: "individual",
    })

    if (result.success && result.data) {
      onBloqueoCreated(result.data)
      toast.success("Bloqueo creado exitosamente")
      onOpenChange(false)
    } else {
      toast.error(result.error || "Error al crear el bloqueo")
    }

    setIsSubmitting(false)
  }

  const canSubmit = fechaInicio && fechaFin && hasChecked && conflicts.length === 0 && !isChecking && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Agregar Bloqueo de Agenda</DialogTitle>
          <DialogDescription>
            Selecciona el período de no disponibilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fecha de inicio */}
          <div className="space-y-2">
            <Label>Fecha de inicio *</Label>
            <Popover open={inicioPopoverOpen} onOpenChange={setInicioPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaInicio ? formatDate(formatDateForApi(fechaInicio)) : "Seleccionar fecha..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={(date) => {
                    setFechaInicio(date)
                    if (date && fechaFin && fechaFin < date) {
                      setFechaFin(undefined)
                    }
                    setInicioPopoverOpen(false)
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de fin */}
          <div className="space-y-2">
            <Label>Fecha de fin *</Label>
            <Popover open={finPopoverOpen} onOpenChange={setFinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaFin && "text-muted-foreground"
                  )}
                  disabled={!fechaInicio}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFin ? formatDate(formatDateForApi(fechaFin)) : "Seleccionar fecha..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={(date) => {
                    setFechaFin(date)
                    setFinPopoverOpen(false)
                  }}
                  disabled={(date) => {
                    if (!fechaInicio) return true
                    return date < fechaInicio
                  }}
                  defaultMonth={fechaInicio}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Para un solo día, usa la misma fecha en ambos campos.
            </p>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Vacaciones, congreso médico, feriado..."
              maxLength={200}
              rows={2}
            />
          </div>

          {/* Conflict checking indicator */}
          {isChecking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando consultas en este período...
            </div>
          )}

          {/* Conflict warning */}
          {hasChecked && conflicts.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    No se puede crear este bloqueo
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Hay {conflicts.length} consulta{conflicts.length > 1 ? "s" : ""} programada{conflicts.length > 1 ? "s" : ""} en este período.
                    Cancélalas o reprogramálas antes de continuar.
                  </p>
                  <ul className="space-y-1">
                    {conflicts.map(c => (
                      <li key={c.id} className="text-sm text-amber-700 dark:text-amber-300">
                        &bull; {c.paciente_apellido}, {c.paciente_nombre} — {formatDateTime(c.fecha_hora)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Agregar Bloqueo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
