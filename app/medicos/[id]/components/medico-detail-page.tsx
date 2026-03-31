"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Medico } from "@/lib/types/entities"
import { EntityDetailLayout } from "@/app/components/entity-detail-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MedicoInfoContent } from "./medico-info-content"
import { MedicoHorariosContent } from "@/app/components/medico/medico-horarios-content"
import { MedicoObrasSocialesContent } from "./medico-obras-sociales-content"
import { MedicoBloqueosContent } from "@/app/components/medico/medico-bloqueos-content"
import { EliminarMedicoDialog } from "@/app/medicos/components/eliminar-medico-dialog"
import { updateMedico, updateMedicoHorarios, updateMedicoObrasSociales, updateMedicoParametrosAgenda } from "../actions"
import { canUpdateEntity, canDeleteEntity } from "@/lib/permissions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface MedicoDetailPageProps {
  medico: Medico
  role: UserRole
  userId: string
}

export function MedicoDetailPage({
  medico,
  role,
  userId,
}: MedicoDetailPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Permissions: Admin can update/delete all, médico can only update their own
  const canUpdate = canUpdateEntity("medicos", { role, userId, entityOwnerId: medico.user_id })
  const canDelete = canDeleteEntity("medicos", { role, userId, entityOwnerId: medico.user_id })

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Bloqueos tab handles its own saves — no-op here
      if (activeTab === "bloqueos") {
        setIsSaving(false)
        return
      }

      // Save based on active tab
      if (activeTab === "info") {
        // Save info tab
        const getFormValues = (window as Window & { __getMedicoFormValues?: () => unknown }).__getMedicoFormValues
        if (!getFormValues) {
          toast.error("Error al obtener los datos del formulario")
          setIsSaving(false)
          return
        }

        const formData = getFormValues()
        const { success, error } = await updateMedico(medico.id, formData as Parameters<typeof updateMedico>[1])

        if (success) {
          toast.success("Información actualizada exitosamente")
          setIsEditMode(false)
          setHasUnsavedChanges(false)
          router.refresh()
        } else {
          toast.error(error || "Error al actualizar la información")
        }
      } else if (activeTab === "horarios") {
        // Save horarios tab (now updates two tables: medicos_horarios and medicos_parametros_agenda)
        const getHorariosFormValues = (window as Window & { __getMedicoHorariosFormValues?: () => {
          horarios: Parameters<typeof updateMedicoHorarios>[1]
          parametros: Parameters<typeof updateMedicoParametrosAgenda>[1]
        } }).__getMedicoHorariosFormValues
        if (!getHorariosFormValues) {
          toast.error("Error al obtener los datos de horarios")
          setIsSaving(false)
          return
        }

        const formData = getHorariosFormValues()

        // Update both tables in parallel
        const [horariosResult, parametrosResult] = await Promise.all([
          updateMedicoHorarios(medico.id, formData.horarios),
          updateMedicoParametrosAgenda(medico.id, formData.parametros)
        ])

        if (horariosResult.success && parametrosResult.success) {
          toast.success("Horarios y parámetros actualizados exitosamente")
          setIsEditMode(false)
          setHasUnsavedChanges(false)
          router.refresh()
        } else {
          const errorMsg = horariosResult.error || parametrosResult.error || "Error al actualizar"
          toast.error(errorMsg)
        }
      } else if (activeTab === "obras-sociales") {
        // Save obras sociales tab
        const getObrasSocialesFormValues = (window as Window & { __getMedicoObrasSocialesFormValues?: () => { obras_sociales_ids: string[] } }).__getMedicoObrasSocialesFormValues
        if (!getObrasSocialesFormValues) {
          toast.error("Error al obtener los datos de obras sociales")
          setIsSaving(false)
          return
        }

        const obrasSocialesData = getObrasSocialesFormValues()
        const { success, error } = await updateMedicoObrasSociales(
          medico.id,
          obrasSocialesData.obras_sociales_ids
        )

        if (success) {
          toast.success("Obras sociales actualizadas exitosamente")
          setIsEditMode(false)
          setHasUnsavedChanges(false)
          router.refresh()
        } else {
          toast.error(error || "Error al actualizar las obras sociales")
        }
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
    setDeleteDialogOpen(true)
  }

  const fullName = `${medico.nombre} ${medico.apellido}`

  return (
    <EntityDetailLayout
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Médicos", href: "/medicos" },
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
        parentRoute: "/medicos",
        parentLabel: "Médicos",
        isSaving,
        hasUnsavedChanges,
        skipDeleteConfirmation: true, // Uses custom EliminarMedicoDialog
      }}
    >
      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="obras-sociales">Obras Sociales</TabsTrigger>
          <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <MedicoInfoContent
            medico={medico}
            isEditMode={isEditMode}
            onFormChange={setHasUnsavedChanges}
            role={role}
          />
        </TabsContent>

        <TabsContent value="horarios" className="space-y-6">
          <MedicoHorariosContent
            medico={medico}
            isEditMode={isEditMode}
            onFormChange={setHasUnsavedChanges}
          />
        </TabsContent>

        <TabsContent value="obras-sociales" className="space-y-6">
          <MedicoObrasSocialesContent
            medico={medico}
            role={role}
            userId={userId}
            isEditMode={isEditMode}
            onFormChange={setHasUnsavedChanges}
          />
        </TabsContent>

        <TabsContent value="bloqueos" className="space-y-6">
          <MedicoBloqueosContent
            medico={medico}
            canManage={canUpdate}
          />
        </TabsContent>
      </Tabs>

      <EliminarMedicoDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        medicoId={medico.id}
        medicoNombre={fullName}
      />
    </EntityDetailLayout>
  )
}
