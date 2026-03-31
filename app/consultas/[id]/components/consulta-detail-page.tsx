"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConsultaWithRelations, EstadoConsulta } from "@/lib/types/entities"
import { EntityDetailLayout } from "@/app/components/entity-detail-layout"
import { ConsultaDetailContent } from "./consulta-detail-content"
import { ConsultaActionButtons } from "./consulta-action-buttons"
import { PastConsultasList } from "./past-consultas-list"
import { WaitingTimeIndicator } from "@/components/ui/waiting-time-indicator"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { updateConsulta, deleteConsulta, finalizarConsulta, saveWithoutFinalizing } from "../actions"
import {
  cancelarConsulta,
  togglePacienteLlegada,
  iniciarConsulta,
  marcarComoAusente,
} from "@/app/consultas/actions"
import { canUpdateEntity, canDeleteEntity } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils/date-format"
import { getRoleDisplayName } from "@/lib/constants/role-colors"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
import { TransferirConsultaDialog } from "@/app/consultas/components/transferir-consulta-dialog"
import { ReagendarConsultaDialog } from "@/app/consultas/components/reagendar-consulta-dialog"

interface ConsultaDetailPageProps {
  consulta: ConsultaWithRelations
  estados: EstadoConsulta[]
  role: UserRole
  userId: string
  medicoId: string | null
}

export function ConsultaDetailPage({
  consulta: initialConsulta,
  estados,
  role,
  userId,
  medicoId,
}: ConsultaDetailPageProps) {
  const router = useRouter()
  const [consulta, setConsulta] = useState(initialConsulta)

  // Determine if user can auto-enter edit mode for en_curso consultas
  // Only Admin and Médico (Owner) can edit en_curso consultas
  const isOwnerMedico = role === "medico" && medicoId === initialConsulta.medico_id
  const canAutoEnterEditMode = role === "administrador" || isOwnerMedico

  // Auto-enter edit mode when estado is "en_curso" (only for Admin and Owner Médico)
  const [isEditMode, setIsEditMode] = useState(
    initialConsulta.estado.codigo === "en_curso" && canAutoEnterEditMode
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Confirmation dialog states for en_curso actions
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false)
  const [showSalirDialog, setShowSalirDialog] = useState(false)
  const [showCancelarEnCursoDialog, setShowCancelarEnCursoDialog] = useState(false)

  // Confirmation dialog states for programada actions
  const [showRegistrarLlegadaDialog, setShowRegistrarLlegadaDialog] = useState(false)
  const [showIniciarConsultaDialog, setShowIniciarConsultaDialog] = useState(false)
  const [showReagendarConsultaDialog, setShowReagendarConsultaDialog] = useState(false)
  const [showMarcarAusenteDialog, setShowMarcarAusenteDialog] = useState(false)
  const [showTransferirConsultaDialog, setShowTransferirConsultaDialog] = useState(false)
  const [showCancelarProgramadaDialog, setShowCancelarProgramadaDialog] = useState(false)

  // State for cancellation email notification checkbox (default checked)
  const [sendCancellationNotification, setSendCancellationNotification] = useState(true)

  // Sync consulta state when initialConsulta changes (e.g., after router.refresh())
  // Only sync when not in edit mode to avoid overwriting user changes
  useEffect(() => {
    if (!isEditMode) {
      setConsulta(initialConsulta)
    }
  }, [initialConsulta, isEditMode])

  // Update edit mode when estado changes (e.g., after iniciar consulta)
  // Only auto-enter edit mode for Admin and Owner Médico
  useEffect(() => {
    if (consulta.estado.codigo === "en_curso" && !isEditMode && canAutoEnterEditMode) {
      setIsEditMode(true)
    }
  }, [consulta.estado.codigo, isEditMode, canAutoEnterEditMode])

  // Real-time subscription for patient arrival updates
  useEffect(() => {
    const supabase = createClient()

    // Use unique channel name to avoid conflicts with other realtime subscriptions
    const channel = supabase
      .channel(`consulta-detail-${consulta.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultas",
          filter: `id=eq.${consulta.id}`,
        },
        (payload) => {
          // Update only the arrival timestamp
          setConsulta((prev) => ({
            ...prev,
            paciente_llego_timestamp: payload.new.paciente_llego_timestamp,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [consulta.id])

  // Ownership logic: médico can only edit their own consultas
  // Uses reactive `consulta` state (for when medico_id changes via transfer)
  const isOwner = role === "medico" && medicoId === consulta.medico_id

  // Permissions
  const canUpdate = canUpdateEntity("consultas", { role, userId })
  const canDelete = canDeleteEntity("consultas", { role, userId })

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Get form values from child component via window
      const getFormValues = (window as Window & { __getConsultaFormValues?: () => Record<string, unknown> }).__getConsultaFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success, data } = await updateConsulta(consulta.id, formData)

      if (success && data) {
        // Update local state with fresh data for instant feedback
        setConsulta(data)
        toast.success("Consulta actualizada exitosamente")
        setIsEditMode(false)
        setHasUnsavedChanges(false)
        router.refresh()
      } else {
        toast.error("Error al actualizar la consulta")
      }
    } catch {
      toast.error("Error inesperado al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setHasUnsavedChanges(false)
  }

  // ============================================================================
  // Programada Action Handlers
  // ============================================================================

  // Registrar Llegada
  const handleRegistrarLlegadaClick = () => {
    setShowRegistrarLlegadaDialog(true)
  }

  const handleRegistrarLlegadaConfirm = async () => {
    setShowRegistrarLlegadaDialog(false)
    setIsSaving(true)

    try {
      const { success, error } = await togglePacienteLlegada(
        consulta.id,
        consulta.paciente_llego_timestamp
      )

      if (success) {
        const message = consulta.paciente_llego_timestamp
          ? "Llegada desmarcada exitosamente"
          : "Llegada registrada exitosamente"
        toast.success(message)
        router.refresh()
      } else {
        toast.error(error || "Error al registrar llegada")
      }
    } catch {
      toast.error("Error inesperado al registrar llegada")
    } finally {
      setIsSaving(false)
    }
  }

  // Iniciar Consulta
  const handleIniciarConsultaClick = () => {
    setShowIniciarConsultaDialog(true)
  }

  const handleIniciarConsultaConfirm = async () => {
    setShowIniciarConsultaDialog(false)
    setIsSaving(true)

    try {
      const { success, error } = await iniciarConsulta(consulta.id)

      if (success) {
        toast.success("Consulta iniciada exitosamente")
        router.refresh()
      } else {
        toast.error(error || "Error al iniciar consulta")
      }
    } catch {
      toast.error("Error inesperado al iniciar consulta")
    } finally {
      setIsSaving(false)
    }
  }

  // Marcar como Ausente
  const handleMarcarAusenteClick = () => {
    setShowMarcarAusenteDialog(true)
  }

  const handleMarcarAusenteConfirm = async () => {
    setShowMarcarAusenteDialog(false)
    setIsSaving(true)

    try {
      const { success, error } = await marcarComoAusente(consulta.id)

      if (success) {
        toast.success("Paciente marcado como ausente")
        router.push("/consultas")
      } else {
        toast.error(error || "Error al marcar como ausente")
      }
    } catch {
      toast.error("Error inesperado al marcar como ausente")
    } finally {
      setIsSaving(false)
    }
  }

  // Reagendar Consulta
  const handleReagendarConsultaClick = () => {
    setShowReagendarConsultaDialog(true)
  }

  // Transferir Consulta
  const handleTransferirConsultaClick = () => {
    setShowTransferirConsultaDialog(true)
  }

  // Cancelar Consulta (programada)
  const handleCancelarConsultaProgramadaClick = () => {
    setSendCancellationNotification(true) // Reset to checked when opening dialog
    setShowCancelarProgramadaDialog(true)
  }

  const handleCancelarConsultaProgramadaConfirm = async () => {
    setShowCancelarProgramadaDialog(false)
    setIsSaving(true)

    try {
      const { success, error } = await cancelarConsulta(consulta.id, sendCancellationNotification)

      if (success) {
        toast.success("Consulta cancelada exitosamente")
        router.push("/consultas")
      } else {
        toast.error(error || "Error al cancelar consulta")
      }
    } catch {
      toast.error("Error inesperado al cancelar")
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================================
  // En Curso Action Handlers
  // ============================================================================

  // Finalizar consulta - Save and mark as completada
  const handleFinalizarClick = () => {
    // Validate required fields before showing dialog
    const getFormValues = (window as Window & { __getConsultaFormValues?: () => Record<string, unknown> }).__getConsultaFormValues
    if (!getFormValues) {
      toast.error("Error al obtener los datos del formulario")
      return
    }

    const formData = getFormValues()
    if (!formData.diagnostico || !formData.informe) {
      toast.error("Los campos 'Diagnóstico' e 'Informe' son obligatorios para finalizar")
      return
    }

    setShowFinalizarDialog(true)
  }

  const handleFinalizarConfirm = async () => {
    setShowFinalizarDialog(false)
    setIsSaving(true)

    try {
      const getFormValues = (window as Window & { __getConsultaFormValues?: () => Record<string, unknown> }).__getConsultaFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success } = await finalizarConsulta(consulta.id, formData)

      if (success) {
        toast.success("Consulta finalizada exitosamente")
        router.push("/consultas")
      } else {
        toast.error("Error al finalizar la consulta")
      }
    } catch {
      toast.error("Error inesperado al finalizar")
    } finally {
      setIsSaving(false)
    }
  }

  // Salir sin finalizar - Save and keep as en_curso
  const handleSalirSinFinalizarClick = () => {
    setShowSalirDialog(true)
  }

  const handleSalirSinFinalizarConfirm = async () => {
    setShowSalirDialog(false)
    setIsSaving(true)

    try {
      const getFormValues = (window as Window & { __getConsultaFormValues?: () => Record<string, unknown> }).__getConsultaFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success } = await saveWithoutFinalizing(consulta.id, formData)

      if (success) {
        toast.success("Cambios guardados exitosamente")
        router.push("/consultas")
      } else {
        toast.error("Error al guardar")
      }
    } catch {
      toast.error("Error inesperado al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  // Cancelar consulta en_curso
  const handleCancelarConsultaEnCursoClick = () => {
    setSendCancellationNotification(true) // Reset to checked when opening dialog
    setShowCancelarEnCursoDialog(true)
  }

  const handleCancelarConsultaEnCursoConfirm = async () => {
    setShowCancelarEnCursoDialog(false)
    setIsSaving(true)

    try {
      const { success, error } = await cancelarConsulta(consulta.id, sendCancellationNotification)

      if (success) {
        toast.success("Consulta cancelada exitosamente")
        router.push("/consultas")
      } else {
        toast.error(error || "Error al cancelar consulta")
      }
    } catch {
      toast.error("Error inesperado al cancelar")
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================================
  // Delete Handler
  // ============================================================================

  const handleDelete = async () => {
    setIsSaving(true)

    try {
      const { success, error } = await deleteConsulta(consulta.id)

      if (success) {
        toast.success("Consulta eliminada exitosamente")
        router.push("/consultas")
      } else {
        toast.error(error || "Error al eliminar la consulta")
        setIsSaving(false)
      }
    } catch {
      toast.error("Error inesperado al eliminar")
      setIsSaving(false)
    }
  }

  const consultaTitle = `Consulta - ${consulta.paciente.nombre} ${consulta.paciente.apellido}`

  // Check if patient has arrived and is waiting
  const showArrivalBanner =
    consulta.paciente_llego_timestamp && consulta.estado.codigo === "programada"

  // Hide standard edit/delete buttons only when estado is "en_curso" (use custom action buttons instead)
  // For "programada", show edit/delete based on role permissions
  const isEnCurso = consulta.estado.codigo === "en_curso"

  return (
    <EntityDetailLayout
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Consultas", href: "/consultas" },
        { label: consultaTitle },
      ]}
      entityName={consultaTitle}
      actionsProps={{
        canUpdate: isEnCurso ? false : canUpdate,
        canDelete: isEnCurso ? false : canDelete,
        isEditMode,
        onEditToggle: handleEditToggle,
        onSave: handleSave,
        onCancel: handleCancel,
        onDelete: handleDelete,
        parentRoute: "/consultas",
        parentLabel: "Consultas",
        isSaving,
        hasUnsavedChanges,
      }}
    >
      {/* Estado-specific action buttons */}
      <ConsultaActionButtons
        consulta={consulta}
        role={role}
        medicoId={medicoId}
        isSaving={isSaving}
        isEditMode={isEditMode}
        onRegistrarLlegada={handleRegistrarLlegadaClick}
        onIniciarConsulta={handleIniciarConsultaClick}
        onReagendarConsulta={handleReagendarConsultaClick}
        onMarcarAusente={handleMarcarAusenteClick}
        onTransferirConsulta={handleTransferirConsultaClick}
        onCancelarConsulta={handleCancelarConsultaProgramadaClick}
        onFinalizarConsulta={handleFinalizarClick}
        onSalirSinFinalizar={handleSalirSinFinalizarClick}
        onCancelarConsultaEnCurso={handleCancelarConsultaEnCursoClick}
      />

      {/* Arrival banner (full width, above grid) */}
      {showArrivalBanner && (
        <div className="border border-patient-arrived-border bg-patient-arrived rounded-lg py-2 px-4 mb-6 flex justify-center">
          <WaitingTimeIndicator
            arrivedAt={consulta.paciente_llego_timestamp!}
            prefix="Paciente en espera hace"
            className="text-sm font-medium"
          />
        </div>
      )}

      <div className="relative">
        {/* Left column: drives container height (only in-flow child on desktop) */}
        <div className="space-y-6 md:w-[45%]">
          <ConsultaDetailContent
            consulta={consulta}
            estados={estados}
            isEditMode={isEditMode}
            onFormChange={setHasUnsavedChanges}
            role={role}
            isOwner={isOwner}
          />

          {/* Auditoría */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Auditoría</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {/* Creación */}
              <div className="space-y-3">
                <div>
                  <Label>Fecha de Creación</Label>
                  <p className="text-muted-foreground">
                    {formatDateTime(consulta.created_at)}
                  </p>
                </div>
                <div>
                  <Label>Creado por</Label>
                  {consulta.createdByUser ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-muted-foreground">
                        {consulta.createdByUser.nombre} {consulta.createdByUser.apellido}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplayName(consulta.createdByUser.rol)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              {/* Última actualización */}
              <div className="space-y-3">
                <div>
                  <Label>Última Actualización</Label>
                  <p className="text-muted-foreground">
                    {formatDateTime(consulta.updated_at)}
                  </p>
                </div>
                <div>
                  <Label>Actualizado por</Label>
                  {consulta.updatedByUser ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-muted-foreground">
                        {consulta.updatedByUser.nombre} {consulta.updatedByUser.apellido}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplayName(consulta.updatedByUser.rol)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: stacked on mobile, absolute+sticky on desktop */}
        {/* Absolute positioning takes it out of flow so it doesn't affect container height */}
        <div className="mt-6 md:mt-0 md:absolute md:top-0 md:right-0 md:w-[calc(55%-1.5rem)] md:h-full">
          <div className="md:sticky md:top-6 md:h-full md:max-h-[calc(100vh-3rem)] md:overflow-hidden">
            <PastConsultasList pacienteId={consulta.paciente_id} currentConsultaId={consulta.id} role={role} />
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* Confirmation Dialogs - Programada Actions */}
      {/* ====================================================================== */}

      {/* Registrar Llegada Dialog */}
      <AlertDialog open={showRegistrarLlegadaDialog} onOpenChange={setShowRegistrarLlegadaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {consulta.paciente_llego_timestamp ? "¿Desmarcar llegada?" : "¿Registrar llegada?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {consulta.paciente_llego_timestamp
                ? "Se desmarcará la llegada del paciente. El tiempo de espera se reiniciará si se vuelve a registrar."
                : "Se registrará que el paciente ha llegado y comenzará a contar el tiempo de espera."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegistrarLlegadaConfirm} disabled={isSaving}>
              {isSaving ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Iniciar Consulta Dialog */}
      <AlertDialog open={showIniciarConsultaDialog} onOpenChange={setShowIniciarConsultaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Iniciar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              La consulta pasará a estado &quot;En Curso&quot;. Podrás comenzar a documentar el diagnóstico,
              tratamiento y demás información médica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleIniciarConsultaConfirm} disabled={isSaving}>
              {isSaving ? "Iniciando..." : "Iniciar consulta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Marcar como Ausente Dialog */}
      <AlertDialog open={showMarcarAusenteDialog} onOpenChange={setShowMarcarAusenteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como ausente?</AlertDialogTitle>
            <AlertDialogDescription>
              El paciente será marcado como ausente y la consulta quedará registrada como no atendida.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarcarAusenteConfirm}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Procesando..." : "Marcar como ausente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reagendar Consulta Dialog */}
      <ReagendarConsultaDialog
        open={showReagendarConsultaDialog}
        onOpenChange={setShowReagendarConsultaDialog}
        consultaId={consulta.id}
        medicoId={consulta.medico_id}
        medicoNombre={consulta.medico.usuario?.nombre || consulta.medico.nombre || ""}
        medicoApellido={consulta.medico.usuario?.apellido || consulta.medico.apellido || ""}
        pacienteNombre={consulta.paciente.nombre}
        pacienteApellido={consulta.paciente.apellido}
        currentFechaHora={consulta.fecha_hora}
        onSuccess={() => {
          router.refresh()
        }}
      />

      {/* Transferir Consulta Dialog */}
      <TransferirConsultaDialog
        open={showTransferirConsultaDialog}
        onOpenChange={setShowTransferirConsultaDialog}
        consultaId={consulta.id}
        currentMedicoId={consulta.medico_id}
        onSuccess={() => {
          router.refresh()
        }}
      />

      {/* Cancelar Consulta Programada Dialog */}
      <AlertDialog open={showCancelarProgramadaDialog} onOpenChange={setShowCancelarProgramadaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la consulta programada. El paciente deberá agendar una nueva cita
              si desea ser atendido. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="send-notification-programada"
              checked={sendCancellationNotification}
              onCheckedChange={(checked) => setSendCancellationNotification(checked === true)}
              disabled={isSaving}
            />
            <Label
              htmlFor="send-notification-programada"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Enviar notificación al paciente
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>No, volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarConsultaProgramadaConfirm}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Cancelando..." : "Sí, cancelar consulta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====================================================================== */}
      {/* Confirmation Dialogs - En Curso Actions */}
      {/* ====================================================================== */}

      {/* Finalizar Consulta Dialog */}
      <AlertDialog open={showFinalizarDialog} onOpenChange={setShowFinalizarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la consulta como completada. Todos los datos ingresados serán guardados
              y la consulta aparecerá en el historial del paciente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizarConfirm} disabled={isSaving}>
              {isSaving ? "Finalizando..." : "Finalizar consulta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Salir sin Finalizar Dialog */}
      <AlertDialog open={showSalirDialog} onOpenChange={setShowSalirDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin finalizar?</AlertDialogTitle>
            <AlertDialogDescription>
              Los cambios realizados serán guardados, pero la consulta permanecerá en estado &quot;En Curso&quot;.
              Podrás continuar editándola más tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSalirSinFinalizarConfirm} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar y salir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancelar Consulta En Curso Dialog */}
      <AlertDialog open={showCancelarEnCursoDialog} onOpenChange={setShowCancelarEnCursoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la consulta como cancelada. Los datos ingresados hasta ahora serán
              descartados y la consulta no aparecerá en el historial médico del paciente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="send-notification-encurso"
              checked={sendCancellationNotification}
              onCheckedChange={(checked) => setSendCancellationNotification(checked === true)}
              disabled={isSaving}
            />
            <Label
              htmlFor="send-notification-encurso"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Enviar notificación al paciente
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>No, volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarConsultaEnCursoConfirm}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Cancelando..." : "Sí, cancelar consulta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EntityDetailLayout>
  )
}
