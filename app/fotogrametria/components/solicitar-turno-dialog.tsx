"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCita } from "../actions"
import type { CitaFotogrametria } from "@/lib/types/entities"

interface SolicitarTurnoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCitaCreated?: (cita: CitaFotogrametria) => void
}

export function SolicitarTurnoDialog({
  open,
  onOpenChange,
  onCitaCreated,
}: SolicitarTurnoDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [direccion, setDireccion] = useState("")
  const [tipoServicio, setTipoServicio] = useState("")
  const [fechaPropuesta, setFechaPropuesta] = useState("")
  const [observaciones, setObservaciones] = useState("")

  const resetForm = () => {
    setDireccion("")
    setTipoServicio("")
    setFechaPropuesta("")
    setObservaciones("")
  }

  const handleSubmit = async () => {
    if (!direccion || !fechaPropuesta) {
      toast.error("Completá la dirección y la fecha propuesta")
      return
    }

    setIsLoading(true)

    const result = await createCita({
      direccion_consultorio: direccion,
      tipo_servicio: tipoServicio || null,
      fecha_propuesta: new Date(fechaPropuesta).toISOString(),
      observaciones: observaciones || null,
    })

    if (result.success && result.data) {
      if (onCitaCreated) {
        onCitaCreated(result.data)
      }
      toast.success("Turno solicitado exitosamente")
      onOpenChange(false)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || "Error al solicitar el turno")
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Turno de Fotogrametría</DialogTitle>
          <DialogDescription>
            Solicitá una visita del equipo a tu consultorio para realizar el escaneo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dirección del consultorio */}
          <div className="space-y-2">
            <Label htmlFor="cita-direccion">Dirección del consultorio *</Label>
            <Input
              id="cita-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </div>

          {/* Tipo de servicio */}
          <div className="space-y-2">
            <Label htmlFor="cita-tipo">Tipo de servicio</Label>
            <Input
              id="cita-tipo"
              value={tipoServicio}
              onChange={(e) => setTipoServicio(e.target.value)}
              placeholder="Ej: Escaneo intraoral, Full Arch..."
            />
          </div>

          {/* Fecha propuesta */}
          <div className="space-y-2">
            <Label htmlFor="cita-fecha">Fecha y hora propuesta *</Label>
            <Input
              id="cita-fecha"
              type="datetime-local"
              value={fechaPropuesta}
              onChange={(e) => setFechaPropuesta(e.target.value)}
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="cita-obs">Observaciones</Label>
            <Textarea
              id="cita-obs"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indicaciones de acceso, paciente a atender, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar Turno"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
