"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ObraSocial } from "@/lib/types/entities"
import { EntityDetailLayout } from "@/app/components/entity-detail-layout"
import { ObraSocialDetailContent } from "./obra-social-detail-content"
import { updateObraSocial, deleteObraSocial } from "../actions"
import { canUpdateEntity, canDeleteEntity } from "@/lib/permissions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface ObraSocialDetailPageProps {
  obraSocial: ObraSocial
  role: UserRole
  userId: string
}

export function ObraSocialDetailPage({
  obraSocial,
  role,
  userId,
}: ObraSocialDetailPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Permissions
  const canUpdate = canUpdateEntity("obras_sociales", { role, userId })
  const canDelete = canDeleteEntity("obras_sociales", { role, userId })

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Get form values from child component via window
      const getFormValues = (window as unknown as { __getObraSocialFormValues?: () => Partial<ObraSocial> }).__getObraSocialFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success, error } = await updateObraSocial(obraSocial.id, formData)

      if (success) {
        toast.success("Obra social actualizada exitosamente")
        setIsEditMode(false)
        setHasUnsavedChanges(false)
        router.refresh()
      } else {
        toast.error(error || "Error al actualizar la obra social")
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
      const { success, error } = await deleteObraSocial(obraSocial.id)

      if (success) {
        toast.success("Obra social eliminada exitosamente")
        router.push("/obras-sociales")
      } else {
        toast.error(error || "Error al eliminar la obra social")
        setIsSaving(false)
      }
    } catch {
      toast.error("Error inesperado al eliminar")
      setIsSaving(false)
    }
  }

  return (
    <EntityDetailLayout
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Obras Sociales", href: "/obras-sociales" },
        { label: obraSocial.nombre },
      ]}
      entityName={obraSocial.nombre}
      actionsProps={{
        canUpdate,
        canDelete,
        isEditMode,
        onEditToggle: handleEditToggle,
        onSave: handleSave,
        onCancel: handleCancel,
        onDelete: handleDelete,
        parentRoute: "/obras-sociales",
        parentLabel: "Obras Sociales",
        isSaving,
        hasUnsavedChanges,
      }}
    >
      <ObraSocialDetailContent
        obraSocial={obraSocial}
        isEditMode={isEditMode}
        onFormChange={setHasUnsavedChanges}
        role={role}
      />
    </EntityDetailLayout>
  )
}
