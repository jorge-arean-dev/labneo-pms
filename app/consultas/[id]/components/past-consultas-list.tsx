"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { fetchPastConsultas } from "../actions"
import { formatDateTimeLong } from "@/lib/utils/date-format"
import { getEstadoColor } from "@/lib/constants/estado-colors"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface PastConsulta {
  id: string
  fecha_hora: string
  informe: string | null
  diagnostico: string | null
  medico: {
    nombre: string
    apellido: string
  } | null
  estado: {
    codigo: string
    nombre: string
  } | null
}

interface PastConsultasListProps {
  pacienteId: string
  currentConsultaId: string
  role: UserRole
}

export function PastConsultasList({ pacienteId, currentConsultaId, role }: PastConsultasListProps) {
  const [consultas, setConsultas] = useState<PastConsulta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadPastConsultas = async () => {
      const { data, error } = await fetchPastConsultas(pacienteId, currentConsultaId)

      if (!error && data) {
        // Transform the data to match our interface (handle arrays from Supabase joins)
        // Note: medico nombre/apellido come from usuarios_pms via user_id JOIN
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedData = data.map((c: any) => {
          const medico = Array.isArray(c.medico) ? c.medico[0] : c.medico
          return {
            id: c.id,
            fecha_hora: c.fecha_hora,
            informe: c.informe,
            diagnostico: c.diagnostico,
            medico: medico ? {
              nombre: medico.usuarios_pms?.nombre,
              apellido: medico.usuarios_pms?.apellido,
            } : null,
            estado: Array.isArray(c.estado) ? c.estado[0] : c.estado,
          }
        })
        setConsultas(transformedData as PastConsulta[])
      }

      setIsLoading(false)
    }

    loadPastConsultas()
  }, [pacienteId, currentConsultaId])

  const toggleExpand = (consultaId: string, field: 'diagnostico' | 'informe') => {
    const key = `${consultaId}-${field}`
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const isExpanded = (consultaId: string, field: 'diagnostico' | 'informe') => {
    return expandedCards.has(`${consultaId}-${field}`)
  }

  // Helper to check if text needs truncation (roughly 3 lines = ~150 chars)
  const needsTruncation = (text: string) => text.length > 150

  // Recepcionistas cannot see medical information (informe, diagnostico)
  const canViewMedicalInfo = role !== "recepcionista"

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Consultas</h3>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (consultas.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Consultas</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sin consultas registradas</p>
          <p className="text-sm text-muted-foreground">
            Este paciente no tiene historial de consultas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-6 flex flex-col max-h-[60vh] md:max-h-full md:h-full">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Historial de Consultas</h3>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
        <div className="space-y-3 pr-2">
          {consultas.map((consulta) => {
            const hasDiagnostico = canViewMedicalInfo && consulta.diagnostico && consulta.diagnostico.trim().length > 0
            const hasInforme = canViewMedicalInfo && consulta.informe && consulta.informe.trim().length > 0
            const hasMedicalInfo = hasDiagnostico || hasInforme

            return (
              <Card
                key={consulta.id}
                className="relative p-4 hover:shadow-md transition-shadow duration-200"
              >
                {/* Header */}
                <div className="pr-24">
                  <p className="text-sm font-medium text-foreground">
                    {formatDateTimeLong(consulta.fecha_hora)}
                  </p>
                  {consulta.medico && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Dr. {consulta.medico.nombre} {consulta.medico.apellido}
                    </p>
                  )}
                </div>

                {/* Estado Badge (absolute positioned) */}
                {consulta.estado && (
                  <Badge
                    variant="outline"
                    className={`absolute top-3 right-3 border-transparent text-xs ${getEstadoColor(consulta.estado.codigo)}`}
                  >
                    {consulta.estado.nombre}
                  </Badge>
                )}

                {/* Medical Content - only shown for non-recepcionistas */}
                {canViewMedicalInfo && (
                  <>
                    {/* Divider */}
                    <Separator className="my-3" />

                    <div className="space-y-3">
                      {hasDiagnostico && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Diagnóstico
                          </h4>
                          <p
                            className={`text-sm text-foreground leading-relaxed ${
                              isExpanded(consulta.id, 'diagnostico') ? '' : 'line-clamp-3'
                            }`}
                          >
                            {consulta.diagnostico}
                          </p>
                          {needsTruncation(consulta.diagnostico!) && (
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs mt-1"
                              onClick={() => toggleExpand(consulta.id, 'diagnostico')}
                            >
                              {isExpanded(consulta.id, 'diagnostico') ? 'Ver menos' : 'Ver más'}
                            </Button>
                          )}
                        </div>
                      )}

                      {hasInforme && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Informe
                          </h4>
                          <p
                            className={`text-sm text-foreground leading-relaxed ${
                              isExpanded(consulta.id, 'informe') ? '' : 'line-clamp-3'
                            }`}
                          >
                            {consulta.informe}
                          </p>
                          {needsTruncation(consulta.informe!) && (
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs mt-1"
                              onClick={() => toggleExpand(consulta.id, 'informe')}
                            >
                              {isExpanded(consulta.id, 'informe') ? 'Ver menos' : 'Ver más'}
                            </Button>
                          )}
                        </div>
                      )}

                      {!hasMedicalInfo && (
                        <p className="text-sm italic text-muted-foreground">
                          Sin información médica registrada
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/consultas/${consulta.id}`} target="_blank" rel="noopener noreferrer">
                      Ir a consulta
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
