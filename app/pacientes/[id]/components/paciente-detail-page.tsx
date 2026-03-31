"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileDown, Plus } from "lucide-react"
import { PacienteWithObraSocial, ConsultaWithRelations } from "@/lib/types/entities"
import { EntityDetailLayout } from "@/app/components/entity-detail-layout"
import { PacienteDetailContent } from "./paciente-detail-content"
import { PacienteConsultasList } from "./paciente-consultas-list"
import { DescargarHistoriaDialog } from "./pdf"
import { CrearConsultaDialog } from "@/app/consultas/components/crear-consulta-dialog"
import type { PacienteSearchResult } from "@/app/consultas/types"
import { updatePaciente, deletePaciente } from "../actions"
import { canUpdateEntity, canDeleteEntity } from "@/lib/permissions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface PacienteDetailPageProps {
  paciente: PacienteWithObraSocial
  obrasSociales: Array<{ id: string; nombre: string }>
  consultas: ConsultaWithRelations[]
  role: UserRole
  userId: string
}

export function PacienteDetailPage({
  paciente,
  obrasSociales,
  consultas,
  role,
  userId,
}: PacienteDetailPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("informacion")
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [showNuevaConsultaDialog, setShowNuevaConsultaDialog] = useState(false)

  // Permissions
  const canUpdate = canUpdateEntity("pacientes", { role, userId })
  const canDelete = canDeleteEntity("pacientes", { role, userId })
  const canExportPDF = role === "administrador" || role === "medico"

  // Convert paciente to PacienteSearchResult for the dialog
  const pacienteForConsulta: PacienteSearchResult = {
    id: paciente.id,
    dni: paciente.dni,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
  }

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Get form values from child component via window
      const getFormValues = (window as unknown as { __getPacienteFormValues?: () => unknown }).__getPacienteFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success, error } = await updatePaciente(paciente.id, formData as Parameters<typeof updatePaciente>[1])

      if (success) {
        toast.success("Paciente actualizado exitosamente")
        setIsEditMode(false)
        setHasUnsavedChanges(false)
        router.refresh()
      } else {
        toast.error(error || "Error al actualizar el paciente")
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

  const handleDelete = async () => {
    setIsSaving(true)

    try {
      const { success, error } = await deletePaciente(paciente.id)

      if (success) {
        toast.success("Paciente eliminado exitosamente")
        router.push("/pacientes")
      } else {
        toast.error(error || "Error al eliminar el paciente")
        setIsSaving(false)
      }
    } catch {
      toast.error("Error inesperado al eliminar")
      setIsSaving(false)
    }
  }

  const fullName = `${paciente.nombre} ${paciente.apellido}`

  // Handle tab change - prevent switching when in edit mode
  const handleTabChange = (value: string) => {
    if (isEditMode) {
      return
    }
    setActiveTab(value)
  }

  return (
    <EntityDetailLayout
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Pacientes", href: "/pacientes" },
        { label: fullName },
      ]}
      entityName={fullName}
      actionsProps={{
        canUpdate,
        canDelete,
        isEditMode,
        onEditToggle: handleEditToggle,
        onSave: handleSave,
        onCancel: handleCancel,
        onDelete: handleDelete,
        parentRoute: "/pacientes",
        parentLabel: "Pacientes",
        isSaving,
        hasUnsavedChanges,
        customActions: (
          <Button
            variant="default"
            onClick={() => setShowNuevaConsultaDialog(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Consulta
          </Button>
        ),
      }}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Tabs header row with PDF export button */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="informacion">Información del Paciente</TabsTrigger>
            <TabsTrigger value="consultas" disabled={isEditMode}>
              Consultas
            </TabsTrigger>
          </TabsList>

          {/* PDF Export Button - only visible for médico and administrador */}
          {canExportPDF && !isEditMode && (
            <Button
              variant="outline"
              onClick={() => setShowPdfDialog(true)}
              className="w-full sm:w-auto"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Descargar historia clínica
            </Button>
          )}
        </div>

        <TabsContent value="informacion" className="mt-0">
          <PacienteDetailContent
            paciente={paciente}
            obrasSociales={obrasSociales}
            isEditMode={isEditMode}
            onFormChange={setHasUnsavedChanges}
            role={role}
          />
        </TabsContent>

        <TabsContent value="consultas" className="mt-0">
          <Suspense fallback={<ConsultasListSkeleton />}>
            <PacienteConsultasList consultas={consultas} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {isEditMode && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Guarde o cancele los cambios para ver otras pestañas
        </p>
      )}

      {/* PDF Export Dialog */}
      <DescargarHistoriaDialog
        open={showPdfDialog}
        onOpenChange={setShowPdfDialog}
        paciente={paciente}
        consultas={consultas}
      />

      {/* Nueva Consulta Dialog */}
      <CrearConsultaDialog
        open={showNuevaConsultaDialog}
        onOpenChange={setShowNuevaConsultaDialog}
        initialPaciente={pacienteForConsulta}
      />
    </EntityDetailLayout>
  )
}

function ConsultasListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 border rounded-lg space-y-4">
          <div className="flex items-start justify-between pb-3 border-b">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
