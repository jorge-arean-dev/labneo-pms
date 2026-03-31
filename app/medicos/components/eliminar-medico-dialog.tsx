"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, AlertCircle, Check, Users2, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils/date-format"
import {
  fetchMedicoProgramadas,
  fetchAvailableMedicosForTransfer,
  bulkTransferConsultas,
  deleteMedico,
  ConsultaProgramada,
  MedicoTransferOption,
  TransferAssignment,
} from "../actions"

interface EliminarMedicoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicoId: string
  medicoNombre: string
  onSuccess?: () => void
}

interface ConsultaWithTransfer extends ConsultaProgramada {
  medicoDestinoId: string | null
}

export function EliminarMedicoDialog({
  open,
  onOpenChange,
  medicoId,
  medicoNombre,
  onSuccess,
}: EliminarMedicoDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [consultas, setConsultas] = useState<ConsultaWithTransfer[]>([])
  const [availableMedicos, setAvailableMedicos] = useState<MedicoTransferOption[]>([])
  const [bulkMedicoId, setBulkMedicoId] = useState<string>("")
  const [showSimpleConfirm, setShowSimpleConfirm] = useState(false)
  const [hasLoadedData, setHasLoadedData] = useState(false)

  // Load data when dialog opens
  const loadData = useCallback(async () => {
    if (!open || hasLoadedData) return

    setIsLoading(true)

    const [programadasResult, medicosResult] = await Promise.all([
      fetchMedicoProgramadas(medicoId),
      fetchAvailableMedicosForTransfer(medicoId),
    ])

    if (programadasResult.error) {
      toast.error(programadasResult.error)
      onOpenChange(false)
      return
    }

    if (medicosResult.error) {
      toast.error(medicosResult.error)
      onOpenChange(false)
      return
    }

    const consultasWithTransfer: ConsultaWithTransfer[] = (programadasResult.data || []).map((c) => ({
      ...c,
      medicoDestinoId: null,
    }))

    setConsultas(consultasWithTransfer)
    setAvailableMedicos(medicosResult.data || [])
    setHasLoadedData(true)
    setIsLoading(false)

    // If no programadas, show simple confirm
    if (consultasWithTransfer.length === 0) {
      setShowSimpleConfirm(true)
    }
  }, [open, hasLoadedData, medicoId, onOpenChange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setConsultas([])
      setAvailableMedicos([])
      setBulkMedicoId("")
      setShowSimpleConfirm(false)
      setHasLoadedData(false)
      setIsLoading(false)
      setIsDeleting(false)
    }
  }, [open])

  // Check if all consultas have been assigned
  const allAssigned = consultas.length === 0 || consultas.every((c) => c.medicoDestinoId !== null)
  const assignedCount = consultas.filter((c) => c.medicoDestinoId !== null).length

  // Handle individual consulta assignment
  const handleAssignment = (consultaId: string, medicoDestinoId: string) => {
    setConsultas((prev) =>
      prev.map((c) =>
        c.id === consultaId ? { ...c, medicoDestinoId } : c
      )
    )
  }

  // Handle bulk assignment
  const handleBulkApply = () => {
    if (!bulkMedicoId) return

    setConsultas((prev) =>
      prev.map((c) => ({ ...c, medicoDestinoId: bulkMedicoId }))
    )
  }

  // Handle delete (with transfers if needed)
  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      // If there are consultas, transfer them first
      if (consultas.length > 0) {
        const transfers: TransferAssignment[] = consultas.map((c) => ({
          consultaId: c.id,
          medicoDestinoId: c.medicoDestinoId!,
        }))

        const transferResult = await bulkTransferConsultas(medicoId, transfers)

        if (!transferResult.success) {
          toast.error(transferResult.error || "Error al transferir consultas")
          setIsDeleting(false)
          return
        }
      }

      // Now delete the medico
      const deleteResult = await deleteMedico(medicoId)

      if (deleteResult.success) {
        toast.success(
          consultas.length > 0
            ? `Médico eliminado. ${consultas.length} consulta(s) transferida(s) exitosamente.`
            : "Médico eliminado exitosamente"
        )
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
        router.refresh()
        router.push("/medicos")
      } else {
        toast.error(deleteResult.error || "Error al eliminar el médico")
      }
    } catch {
      toast.error("Error inesperado al eliminar el médico")
    } finally {
      setIsDeleting(false)
    }
  }

  // Simple confirmation dialog (no programadas)
  if (showSimpleConfirm) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Médico</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar a {medicoNombre}? Esta acción
              revocará su acceso a la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Transfer dialog (has programadas)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Eliminar Médico
            {consultas.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {consultas.length} consulta(s)
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {medicoNombre} tiene {consultas.length} consulta(s) programada(s). Debe
            transferirlas a otro médico antes de eliminarlo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Bulk action section */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <Label className="flex items-center gap-2 mb-2">
                    <Users2 className="h-4 w-4" />
                    Transferir todas las consultas a
                  </Label>
                  <Select value={bulkMedicoId} onValueChange={setBulkMedicoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar médico..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMedicos.map((medico) => (
                        <SelectItem key={medico.id} value={medico.id}>
                          Dr. {medico.nombre} {medico.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleBulkApply}
                  disabled={!bulkMedicoId}
                  className="w-full sm:w-auto"
                >
                  Aplicar
                </Button>
              </div>
            </Card>

            {/* No available medicos warning */}
            {availableMedicos.length === 0 && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                  No hay médicos disponibles para transferir las consultas. Debe
                  crear al menos un médico antes de eliminar este.
                </p>
              </div>
            )}

            {/* Desktop table view */}
            <div className="hidden sm:block rounded-lg border overflow-hidden">
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Fecha Consulta</TableHead>
                      <TableHead>Transferir a</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultas.map((consulta) => (
                      <TableRow
                        key={consulta.id}
                        className={cn(
                          "transition-colors",
                          !consulta.medicoDestinoId &&
                            "bg-yellow-50/50 dark:bg-yellow-950/20"
                        )}
                      >
                        <TableCell className="w-8">
                          {consulta.medicoDestinoId ? (
                            <Check
                              className="h-4 w-4 text-green-600"
                              aria-label="Médico asignado"
                            />
                          ) : (
                            <AlertCircle
                              className="h-4 w-4 text-yellow-600"
                              aria-label="Pendiente de asignación"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {consulta.paciente_apellido}, {consulta.paciente_nombre}
                        </TableCell>
                        <TableCell>{formatDateTime(consulta.fecha_hora)}</TableCell>
                        <TableCell>
                          <Select
                            value={consulta.medicoDestinoId || ""}
                            onValueChange={(value) =>
                              handleAssignment(consulta.id, value)
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "w-[200px]",
                                !consulta.medicoDestinoId &&
                                  "border-yellow-300 dark:border-yellow-700"
                              )}
                            >
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMedicos.map((medico) => (
                                <SelectItem key={medico.id} value={medico.id}>
                                  Dr. {medico.nombre} {medico.apellido}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Mobile card view */}
            <ScrollArea className="sm:hidden max-h-[300px]">
              <div className="space-y-3 pr-4">
                {consultas.map((consulta) => (
                  <Card
                    key={consulta.id}
                    className={cn(
                      "p-4 space-y-3",
                      !consulta.medicoDestinoId &&
                        "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {consulta.paciente_apellido}, {consulta.paciente_nombre}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(consulta.fecha_hora)}
                        </p>
                      </div>
                      {consulta.medicoDestinoId ? (
                        <Check
                          className="h-5 w-5 text-green-600"
                          aria-label="Médico asignado"
                        />
                      ) : (
                        <AlertCircle
                          className="h-5 w-5 text-yellow-600"
                          aria-label="Pendiente de asignación"
                        />
                      )}
                    </div>
                    <Select
                      value={consulta.medicoDestinoId || ""}
                      onValueChange={(value) =>
                        handleAssignment(consulta.id, value)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          !consulta.medicoDestinoId &&
                            "border-yellow-300 dark:border-yellow-700"
                        )}
                      >
                        <SelectValue placeholder="Seleccionar médico..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMedicos.map((medico) => (
                          <SelectItem key={medico.id} value={medico.id}>
                            Dr. {medico.nombre} {medico.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Progress indicator */}
            <p className="text-sm text-muted-foreground">
              {assignedCount} de {consultas.length} consulta(s) asignada(s)
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!allAssigned || isDeleting || availableMedicos.length === 0}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Médico
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
