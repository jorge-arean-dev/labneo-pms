"use client"

import { Button } from "@/components/ui/button"
import { CalendarClock } from "lucide-react"
import { ConsultaWithRelations } from "@/lib/types/entities"
import {
  canRegistrarLlegada,
  canIniciarConsulta,
  canMarcarAusente,
  canTransferirConsulta,
  canCancelarConsulta,
  canFinalizarConsulta,
  canSalirSinFinalizar,
  canCancelarConsultaEnCurso,
  canReagendarConsulta,
} from "@/lib/permissions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface ConsultaActionButtonsProps {
  consulta: ConsultaWithRelations
  role: UserRole
  medicoId: string | null
  isSaving: boolean
  isEditMode: boolean
  onRegistrarLlegada: () => void
  onIniciarConsulta: () => void
  onReagendarConsulta: () => void
  onMarcarAusente: () => void
  onTransferirConsulta: () => void
  onCancelarConsulta: () => void
  onFinalizarConsulta: () => void
  onSalirSinFinalizar: () => void
  onCancelarConsultaEnCurso: () => void
}

export function ConsultaActionButtons({
  consulta,
  role,
  medicoId,
  isSaving,
  isEditMode,
  onRegistrarLlegada,
  onIniciarConsulta,
  onReagendarConsulta,
  onMarcarAusente,
  onTransferirConsulta,
  onCancelarConsulta,
  onFinalizarConsulta,
  onSalirSinFinalizar,
  onCancelarConsultaEnCurso,
}: ConsultaActionButtonsProps) {
  const estadoCodigo = consulta.estado.codigo

  // Don't render for final/inactive estados
  if (!["programada", "en_curso"].includes(estadoCodigo)) {
    return null
  }

  // Permission context for actions requiring ownership check
  const permissionContext = { role, medicoId }

  // Consulta context for permission checks
  const consultaContext = {
    medico_id: consulta.medico_id,
    estado_codigo: estadoCodigo,
    fecha_hora: consulta.fecha_hora,
  }

  // Check permissions for programada actions
  const showRegistrarLlegada = canRegistrarLlegada(consultaContext)
  const showIniciarConsulta = canIniciarConsulta(consultaContext, permissionContext)
  const showReagendarConsulta = canReagendarConsulta(consultaContext)
  const showMarcarAusente = canMarcarAusente(consultaContext)
  const showTransferirConsulta = canTransferirConsulta(consultaContext)
  const showCancelarConsultaProgramada = canCancelarConsulta(consultaContext)

  // Check permissions for en_curso actions
  const showFinalizarConsulta = canFinalizarConsulta(consultaContext, permissionContext)
  const showSalirSinFinalizar = canSalirSinFinalizar(consultaContext, permissionContext)
  const showCancelarConsultaEnCurso = canCancelarConsultaEnCurso(consultaContext, permissionContext)

  // Determine button text for Registrar llegada (toggle)
  const hasArrived = !!consulta.paciente_llego_timestamp
  const registrarLlegadaText = hasArrived ? "Desmarcar llegada" : "Registrar llegada"

  if (estadoCodigo === "programada") {
    // Check if any buttons should be shown
    const hasAnyButton =
      showRegistrarLlegada ||
      showIniciarConsulta ||
      showReagendarConsulta ||
      showMarcarAusente ||
      showTransferirConsulta ||
      showCancelarConsultaProgramada

    if (!hasAnyButton) return null

    return (
      <div className="border-b pb-4 mb-6">
        {/* Single row on desktop, stacks on mobile */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {showIniciarConsulta && (
            <Button
              onClick={onIniciarConsulta}
              disabled={isSaving || isEditMode}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? "Iniciando..." : "Iniciar consulta"}
            </Button>
          )}
          {showReagendarConsulta && (
            <Button variant="outline" onClick={onReagendarConsulta} disabled={isSaving || isEditMode}>
              <CalendarClock className="mr-2 h-4 w-4" />
              {isSaving ? "Procesando..." : "Reagendar consulta"}
            </Button>
          )}
          {showRegistrarLlegada && (
            <Button onClick={onRegistrarLlegada} disabled={isSaving || isEditMode}>
              {isSaving ? "Procesando..." : registrarLlegadaText}
            </Button>
          )}
          {showMarcarAusente && (
            <Button variant="outline" onClick={onMarcarAusente} disabled={isSaving || isEditMode}>
              {isSaving ? "Procesando..." : "Marcar como ausente"}
            </Button>
          )}
          {showTransferirConsulta && (
            <Button variant="outline" onClick={onTransferirConsulta} disabled={isSaving || isEditMode}>
              {isSaving ? "Procesando..." : "Transferir consulta"}
            </Button>
          )}
          {showCancelarConsultaProgramada && (
            <Button variant="destructive" onClick={onCancelarConsulta} disabled={isSaving || isEditMode}>
              {isSaving ? "Cancelando..." : "Cancelar consulta"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (estadoCodigo === "en_curso") {
    // Check if any buttons should be shown
    const hasAnyButton =
      showFinalizarConsulta || showSalirSinFinalizar || showCancelarConsultaEnCurso

    if (!hasAnyButton) return null

    return (
      <div className="border-b pb-4 mb-6">
        {/* Single row on desktop, stacks to 2 rows on mobile */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {showFinalizarConsulta && (
            <Button onClick={onFinalizarConsulta} disabled={isSaving}>
              {isSaving ? "Finalizando..." : "Finalizar consulta"}
            </Button>
          )}
          {showSalirSinFinalizar && (
            <Button
              variant="secondary"
              onClick={onSalirSinFinalizar}
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : "Salir sin finalizar"}
            </Button>
          )}
          {showCancelarConsultaEnCurso && (
            <Button
              variant="destructive"
              onClick={onCancelarConsultaEnCurso}
              disabled={isSaving}
            >
              {isSaving ? "Cancelando..." : "Cancelar consulta"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return null
}
