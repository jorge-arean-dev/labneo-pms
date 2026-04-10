"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "sonner"
import { bulkAssignLocalidades } from "../actions"
import type { TarifarioSummary, Localidad } from "@/lib/types/entities"

type LocalidadRow = Localidad & { tarifario_id: string | null }

interface LocalidadesTableProps {
  localidades: LocalidadRow[]
  onLocalidadesChange: (localidades: LocalidadRow[]) => void
  tarifarios: TarifarioSummary[]
  onTarifariosChange: (tarifarios: TarifarioSummary[]) => void
}

export function LocalidadesTable({
  localidades,
  onLocalidadesChange,
  tarifarios,
  onTarifariosChange,
}: LocalidadesTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetTarifarioId, setTargetTarifarioId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")

  const unassignedCount = useMemo(
    () => localidades.filter((l) => !l.tarifario_id).length,
    [localidades]
  )

  const allSelected =
    localidades.length > 0 && selectedIds.size === localidades.length
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(localidades.map((l) => l.id)))
    }
  }

  function getTarifarioNombre(tarifarioId: string | null): string | null {
    if (!tarifarioId) return null
    return tarifarios.find((t) => t.id === tarifarioId)?.nombre ?? null
  }

  function attemptAssign() {
    if (selectedIds.size === 0 || !targetTarifarioId) return

    const ids = Array.from(selectedIds)
    const targetNombre = getTarifarioNombre(targetTarifarioId) || targetTarifarioId

    // Check if any selected localidades already belong to a DIFFERENT lista
    const reassigned = localidades.filter(
      (l) =>
        ids.includes(l.id) &&
        l.tarifario_id !== null &&
        l.tarifario_id !== targetTarifarioId
    )

    if (reassigned.length > 0) {
      // Group by current lista for a clear message
      const byLista = new Map<string, string[]>()
      for (const l of reassigned) {
        const nombre = getTarifarioNombre(l.tarifario_id) || "otra lista"
        const list = byLista.get(nombre) || []
        list.push(l.nombre_display)
        byLista.set(nombre, list)
      }

      const parts = Array.from(byLista.entries()).map(
        ([lista, names]) =>
          `${names.join(", ")} (actualmente en ${lista})`
      )

      setConfirmMessage(
        `${reassigned.length === 1 ? "1 localidad seleccionada ya pertenece" : `${reassigned.length} localidades seleccionadas ya pertenecen`} a otra lista y ${reassigned.length === 1 ? "será reasignada" : "serán reasignadas"} a ${targetNombre}:\n\n${parts.join("\n")}`
      )
      setConfirmOpen(true)
      return
    }

    executeAssign()
  }

  async function executeAssign() {
    if (selectedIds.size === 0 || !targetTarifarioId) return

    setConfirmOpen(false)
    setIsAssigning(true)
    const ids = Array.from(selectedIds)

    const { success, error } = await bulkAssignLocalidades(ids, targetTarifarioId)

    if (success) {
      // Optimistic update: update localidades state
      const updatedLocalidades = localidades.map((l) =>
        ids.includes(l.id) ? { ...l, tarifario_id: targetTarifarioId } : l
      )
      onLocalidadesChange(updatedLocalidades)

      // Update tarifarios state: recalculate localidades arrays
      const updatedTarifarios = tarifarios.map((t) => {
        const linkedLocs = updatedLocalidades
          .filter((l) => l.tarifario_id === t.id)
          .map((l) => ({ id: l.id, nombre_display: l.nombre_display }))
        return { ...t, localidades: linkedLocs }
      })
      onTarifariosChange(updatedTarifarios)

      toast.success(
        `${ids.length} ${ids.length === 1 ? "localidad asignada" : "localidades asignadas"} correctamente`
      )
      setSelectedIds(new Set())
      setTargetTarifarioId("")
      router.refresh()
    } else {
      toast.error(error || "Error al asignar localidades")
    }

    setIsAssigning(false)
  }

  return (
    <div className="space-y-4">
      {/* Warning banner for unassigned localidades */}
      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {unassignedCount === 1
              ? "Hay 1 localidad sin lista de precios asignada."
              : `Hay ${unassignedCount} localidades sin lista de precios asignada.`}{" "}
            Todas las localidades deben tener una lista asignada.
          </p>
        </div>
      )}

      {/* Count + desktop assignment bar */}
      <div className="hidden sm:flex sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {localidades.length} {localidades.length === 1 ? "localidad" : "localidades"}
        </p>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} seleccionada{selectedIds.size > 1 ? "s" : ""}
            </span>
          )}
          <Select
            value={targetTarifarioId}
            onValueChange={setTargetTarifarioId}
            disabled={selectedIds.size === 0}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Seleccionar lista..." />
            </SelectTrigger>
            <SelectContent>
              {tarifarios.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={attemptAssign}
            disabled={
              selectedIds.size === 0 || !targetTarifarioId || isAssigning
            }
            size="sm"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {isAssigning ? "Asignando..." : "Asignar"}
          </Button>
        </div>
      </div>

      {/* Mobile count */}
      <p className="text-sm text-muted-foreground sm:hidden">
        {localidades.length} {localidades.length === 1 ? "localidad" : "localidades"}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todas"
                  />
                </TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Lista de precios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localidades.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No hay localidades registradas.
                  </TableCell>
                </TableRow>
              ) : (
                localidades.map((l) => {
                  const tarifarioNombre = getTarifarioNombre(l.tarifario_id)
                  const isSelected = selectedIds.has(l.id)

                  return (
                    <TableRow
                      key={l.id}
                      className={isSelected ? "bg-blue-50 dark:bg-blue-950/40" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(l.id)}
                          aria-label={`Seleccionar ${l.nombre_display}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {l.nombre_display}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.provincia || "—"}
                      </TableCell>
                      <TableCell>
                        {tarifarioNombre ? (
                          <Badge variant="secondary" className="text-xs">
                            {tarifarioNombre}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-700 text-xs dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          >
                            Sin asignar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {localidades.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay localidades registradas.
            </CardContent>
          </Card>
        ) : (
          localidades.map((l) => {
            const tarifarioNombre = getTarifarioNombre(l.tarifario_id)
            const isSelected = selectedIds.has(l.id)

            return (
              <Card
                key={l.id}
                className={isSelected ? "border-primary/50 bg-blue-50 dark:bg-blue-950/40" : undefined}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(l.id)}
                      aria-label={`Seleccionar ${l.nombre_display}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium">{l.nombre_display}</p>
                      {l.provincia && (
                        <p className="text-sm text-muted-foreground">
                          {l.provincia}
                        </p>
                      )}
                      <div className="pt-1">
                        {tarifarioNombre ? (
                          <Badge variant="secondary" className="text-xs">
                            {tarifarioNombre}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-700 text-xs dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          >
                            Sin asignar
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Mobile sticky footer for assignment */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 space-y-3 sm:hidden z-50">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} seleccionada{selectedIds.size > 1 ? "s" : ""}
          </p>
          <Select
            value={targetTarifarioId}
            onValueChange={setTargetTarifarioId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar lista..." />
            </SelectTrigger>
            <SelectContent>
              {tarifarios.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={attemptAssign}
            disabled={!targetTarifarioId || isAssigning}
            className="w-full"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {isAssigning ? "Asignando..." : "Asignar"}
          </Button>
        </div>
      )}

      {/* Reassignment confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reasignar localidades</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeAssign}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
