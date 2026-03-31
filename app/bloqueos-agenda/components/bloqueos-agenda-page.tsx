"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { CalendarOff, CalendarPlus, Shield, Trash2, Loader2 } from "lucide-react"
import { deleteBloqueoAgenda } from "@/app/medicos/[id]/actions"
import { formatDate } from "@/lib/utils/date-format"
import { cn } from "@/lib/utils"
import { AgregarBloqueoDialog } from "./agregar-bloqueo-dialog"
import { BloqueoGeneralDialog } from "./bloqueo-general-dialog"
import type { BloqueoWithMedico } from "../actions"

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

interface BloqueosAgendaPageProps {
  initialBloqueos: BloqueoWithMedico[]
  medicos: Array<{ id: string; nombre: string; apellido: string }>
  role: "administrador" | "recepcionista"
}

export function BloqueosAgendaPage({
  initialBloqueos,
  medicos,
}: BloqueosAgendaPageProps) {
  const router = useRouter()
  const [bloqueos, setBloqueos] = useState(initialBloqueos)
  const [filterMedicoId, setFilterMedicoId] = useState<string>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [generalDialogOpen, setGeneralDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BloqueoWithMedico | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const filtered = filterMedicoId === "all"
    ? bloqueos
    : bloqueos.filter(b => b.medico_id === filterMedicoId)

  const proximoBloqueos = filtered.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "proximo")
  const activoBloqueos = filtered.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "activo")
  const pasadoBloqueos = filtered.filter(b => getBloqueoStatus(b.fecha_inicio, b.fecha_fin, today) === "pasado")

  const handleBloqueoCreated = () => {
    router.refresh()
    window.location.reload()
  }

  const handleGeneralCreated = () => {
    router.refresh()
    window.location.reload()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    const { success, error } = await deleteBloqueoAgenda(deleteTarget.id)

    if (success) {
      setBloqueos(prev => prev.filter(b => b.id !== deleteTarget.id))
      toast.success("Bloqueo eliminado exitosamente")
      router.refresh()
    } else {
      toast.error(error || "Error al eliminar el bloqueo")
    }

    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const getDayCount = (fechaInicio: string, fechaFin: string) => {
    const start = new Date(fechaInicio + "T00:00:00")
    const end = new Date(fechaFin + "T00:00:00")
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const colCount = 7 // Médico + 5 data cols + actions

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bloqueos de Agenda</h1>
          <p className="text-muted-foreground">
            Gestión de períodos de no disponibilidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Agregar Bloqueo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setGeneralDialogOpen(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Bloqueo General
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Filtrar por médico:</label>
        <Select value={filterMedicoId} onValueChange={setFilterMedicoId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los médicos</SelectItem>
            {medicos.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.apellido}, {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <Empty className="border">
              <EmptyMedia variant="icon">
                <CalendarOff />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Sin bloqueos de agenda</EmptyTitle>
                <EmptyDescription>
                  {filterMedicoId === "all"
                    ? "No hay períodos de no disponibilidad registrados."
                    : "No hay bloqueos para el médico seleccionado."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Agregar Bloqueo
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {/* Desktop: single aligned table */}
              <div className="hidden sm:block">
                <Table className="table-fixed">
                  <colgroup><col className="w-[18%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[7%]" /><col className="w-[22%]" /><col className="w-[14%]" /><col className="w-[7%]" /></colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>Fecha inicio</TableHead>
                      <TableHead>Fecha fin</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="sr-only">Acciones</TableHead>
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
                    onDelete={setDeleteTarget}
                    getDayCount={getDayCount}
                  />
                )}
                {proximoBloqueos.length > 0 && (
                  <MobileSection
                    label="Próximos"
                    status="proximo"
                    bloqueos={proximoBloqueos}
                    onDelete={setDeleteTarget}
                    getDayCount={getDayCount}
                  />
                )}
                {pasadoBloqueos.length > 0 && (
                  <MobileSection
                    label="Pasados"
                    status="pasado"
                    bloqueos={pasadoBloqueos}
                    onDelete={null}
                    getDayCount={getDayCount}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AgregarBloqueoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        medicos={medicos}
        onBloqueoCreated={handleBloqueoCreated}
      />

      <BloqueoGeneralDialog
        open={generalDialogOpen}
        onOpenChange={setGeneralDialogOpen}
        onBloqueoCreated={handleGeneralCreated}
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
                {deleteTarget.medico_apellido}, {deleteTarget.medico_nombre}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(deleteTarget.fecha_inicio)} → {formatDate(deleteTarget.fecha_fin)}
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
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar bloqueo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  onDelete,
  getDayCount,
}: {
  bloqueo: BloqueoWithMedico
  status: BloqueoStatus
  onDelete: ((b: BloqueoWithMedico) => void) | null
  getDayCount: (a: string, b: string) => number
}) {
  const config = STATUS_CONFIG[status]
  return (
    <TableRow className={config.rowClass}>
      <TableCell className={cn("font-medium", config.cellBorderClass)}>
        {bloqueo.medico_apellido}, {bloqueo.medico_nombre}
      </TableCell>
      <TableCell>{formatDate(bloqueo.fecha_inicio)}</TableCell>
      <TableCell>{formatDate(bloqueo.fecha_fin)}</TableCell>
      <TableCell className="text-muted-foreground">
        {getDayCount(bloqueo.fecha_inicio, bloqueo.fecha_fin)}
      </TableCell>
      <TableCell>{bloqueo.motivo || "—"}</TableCell>
      <TableCell>
        <OrigenBadge origen={bloqueo.origen} />
      </TableCell>
      <TableCell>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(bloqueo)}
            aria-label={`Eliminar bloqueo de ${bloqueo.medico_apellido}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function MobileSection({
  label,
  status,
  bloqueos,
  onDelete,
  getDayCount,
}: {
  label: string
  status: BloqueoStatus
  bloqueos: BloqueoWithMedico[]
  onDelete: ((b: BloqueoWithMedico) => void) | null
  getDayCount: (a: string, b: string) => number
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
                {bloqueo.medico_apellido}, {bloqueo.medico_nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(bloqueo.fecha_inicio)} → {formatDate(bloqueo.fecha_fin)}
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
            {onDelete && (
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
