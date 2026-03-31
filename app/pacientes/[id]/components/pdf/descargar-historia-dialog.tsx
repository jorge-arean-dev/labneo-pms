"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { toast } from "sonner"
import { FileDown, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PacienteWithObraSocial, ConsultaWithRelations } from "@/lib/types/entities"
import { HistoriaClinicaPDF } from "./historia-clinica-pdf"
import { fetchLogoUrl, fetchClinicName, generatePDFFilename } from "./utils"

type ConsultaFilter = "completadas" | "todas"

interface DescargarHistoriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paciente: PacienteWithObraSocial
  consultas: ConsultaWithRelations[]
}

export function DescargarHistoriaDialog({
  open,
  onOpenChange,
  paciente,
  consultas,
}: DescargarHistoriaDialogProps) {
  const [filter, setFilter] = useState<ConsultaFilter>("completadas")
  const [isGenerating, setIsGenerating] = useState(false)

  // Count consultas by filter
  const completadasCount = consultas.filter(
    (c) => c.estado.codigo === "completada"
  ).length
  const todasCount = consultas.length

  const handleDownload = async () => {
    setIsGenerating(true)

    try {
      // Fetch logo URL and clinic name in parallel
      const [logoUrl, clinicName] = await Promise.all([
        fetchLogoUrl(),
        fetchClinicName(),
      ])

      // Filter consultas based on selection
      const filteredConsultas =
        filter === "completadas"
          ? consultas.filter((c) => c.estado.codigo === "completada")
          : consultas

      // Sort by most recent first
      const sortedConsultas = [...filteredConsultas].sort(
        (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
      )

      // Generate PDF
      const generationDate = new Date().toISOString()
      const doc = (
        <HistoriaClinicaPDF
          paciente={paciente}
          consultas={sortedConsultas}
          logoUrl={logoUrl}
          clinicName={clinicName}
          generationDate={generationDate}
        />
      )

      const blob = await pdf(doc).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = generatePDFFilename(paciente.nombre, paciente.apellido)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Historia clínica descargada exitosamente")
      onOpenChange(false)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Error al generar el PDF. Por favor, intenta nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancel = () => {
    setFilter("completadas")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Descargar historia clínica</DialogTitle>
          <DialogDescription>
            Selecciona qué consultas incluir en el documento PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={filter}
            onValueChange={(value) => setFilter(value as ConsultaFilter)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="completadas" id="completadas" />
              <Label
                htmlFor="completadas"
                className="flex-1 cursor-pointer font-normal"
              >
                <div className="font-medium">Solo completadas</div>
                <div className="text-sm text-muted-foreground">
                  {completadasCount} consulta{completadasCount !== 1 ? "s" : ""} completada{completadasCount !== 1 ? "s" : ""}
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="todas" id="todas" />
              <Label
                htmlFor="todas"
                className="flex-1 cursor-pointer font-normal"
              >
                <div className="font-medium">Todas las consultas</div>
                <div className="text-sm text-muted-foreground">
                  {todasCount} consulta{todasCount !== 1 ? "s" : ""} en total
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
