"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { transferirConsulta, fetchMedicos } from "../actions"
import { MedicoOption } from "../types"

interface TransferirConsultaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultaId: string
  currentMedicoId: string
  medicos?: MedicoOption[] // Optional - will fetch if not provided
  onSuccess?: () => void // Optional callback after successful transfer
}

export function TransferirConsultaDialog({
  open,
  onOpenChange,
  consultaId,
  currentMedicoId,
  medicos: providedMedicos,
  onSuccess,
}: TransferirConsultaDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>("")
  const [motivo, setMotivo] = useState("")
  const [medicos, setMedicos] = useState<MedicoOption[]>(providedMedicos || [])
  const [isFetchingMedicos, setIsFetchingMedicos] = useState(false)

  // Fetch medicos if not provided
  useEffect(() => {
    if (open && !providedMedicos) {
      setIsFetchingMedicos(true)
      fetchMedicos()
        .then(({ data }) => {
          if (data) {
            setMedicos(data)
          }
        })
        .finally(() => {
          setIsFetchingMedicos(false)
        })
    }
  }, [open, providedMedicos])

  // Update medicos when providedMedicos changes
  useEffect(() => {
    if (providedMedicos) {
      setMedicos(providedMedicos)
    }
  }, [providedMedicos])

  // Filter out current medico and deleted medicos
  const availableMedicos = medicos.filter(
    (m) => m.id !== currentMedicoId && !m.deleted_at
  )

  const handleSubmit = async () => {
    if (!selectedMedicoId) {
      toast.error("Debes seleccionar un médico de destino")
      return
    }

    setIsLoading(true)

    const { success, error } = await transferirConsulta(
      consultaId,
      selectedMedicoId,
      motivo.trim() || null
    )

    if (success) {
      toast.success("Consulta transferida exitosamente")
      onOpenChange(false)
      setSelectedMedicoId("")
      setMotivo("")
      if (onSuccess) {
        onSuccess()
      }
      router.refresh()
    } else {
      toast.error(error || "Error al transferir consulta")
    }

    setIsLoading(false)
  }

  const handleCancel = () => {
    setSelectedMedicoId("")
    setMotivo("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir consulta</DialogTitle>
          <DialogDescription>
            Selecciona el médico de destino y opcionalmente agrega un motivo para la
            transferencia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="medico">Médico de destino *</Label>
            <Select value={selectedMedicoId} onValueChange={setSelectedMedicoId} disabled={isFetchingMedicos}>
              <SelectTrigger id="medico">
                <SelectValue placeholder={isFetchingMedicos ? "Cargando médicos..." : "Seleccionar médico"} />
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

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Ej: Especialista en dermatología pediátrica"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Transfiriendo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
