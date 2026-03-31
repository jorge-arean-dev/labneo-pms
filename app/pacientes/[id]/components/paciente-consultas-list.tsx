"use client"

import { ConsultaWithRelations } from "@/lib/types/entities"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ExternalLink } from "lucide-react"
import { formatDateTimeLong } from "@/lib/utils/date-format"
import { getEstadoColor } from "@/lib/constants/estado-colors"

interface PacienteConsultasListProps {
  consultas: ConsultaWithRelations[]
}

const TIPO_CONSULTA_LABELS: Record<string, string> = {
  primera_vez: "Primera vez",
  control: "Control",
  urgencia: "Urgencia",
}

export function PacienteConsultasList({ consultas }: PacienteConsultasListProps) {
  if (consultas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-base mb-4">
          No hay consultas registradas para este paciente.
        </p>
        <Button disabled variant="outline">
          Crear Consulta
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {consultas.map((consulta) => (
        <Card key={consulta.id} className="p-5 hover:shadow-md transition-shadow duration-200">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b">
            <div className="flex-1 space-y-3">
              {/* Fecha y hora */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Fecha y hora de consulta
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatDateTimeLong(consulta.fecha_hora)}
                </div>
              </div>
              {/* Médico */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Médico
                </div>
                <div className="text-base font-semibold text-foreground">
                  {consulta.medico.nombre} {consulta.medico.apellido}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`border-transparent ${getEstadoColor(consulta.estado.codigo)}`}
            >
              {consulta.estado.nombre}
            </Badge>
          </div>

          {/* Body */}
          <div className="pt-4 space-y-3">
            {/* Tipo */}
            {consulta.tipo_consulta && (
              <div className="text-sm">
                <span className="font-medium text-foreground/90">Tipo: </span>
                <span className="text-foreground/70">
                  {TIPO_CONSULTA_LABELS[consulta.tipo_consulta] || consulta.tipo_consulta}
                </span>
              </div>
            )}

            {/* Diagnóstico */}
            {consulta.diagnostico && (
              <>
                <div className="border-t my-3" />
                <div>
                  <div className="text-sm font-medium text-foreground/90 mb-1.5">
                    Diagnóstico
                  </div>
                  <div className="text-sm text-foreground/70 leading-relaxed max-h-20 overflow-y-auto">
                    {consulta.diagnostico}
                  </div>
                </div>
              </>
            )}

            {/* Informe */}
            {consulta.informe && (
              <>
                <div className="border-t my-3" />
                <div>
                  <div className="text-sm font-medium text-foreground/90 mb-1.5">
                    Informe
                  </div>
                  <div className="text-sm text-foreground/70 leading-relaxed max-h-20 overflow-y-auto">
                    {consulta.informe}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3">
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a
                href={`/consultas/${consulta.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Ver Detalle
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
