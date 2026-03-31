"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Recepcionista } from "@/lib/types/entities"
import { EntityDetailLayout } from "@/app/components/entity-detail-layout"
import { RecepcionistaDetailContent } from "./recepcionista-detail-content"
import { updateRecepcionista, deleteRecepcionista } from "../actions"
import { canUpdateEntity, canDeleteEntity } from "@/lib/permissions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface RecepcionistaDetailPageProps {
  recepcionista: Recepcionista
  role: UserRole
  userId: string
}

export function RecepcionistaDetailPage({
  recepcionista,
  role,
  userId,
}: RecepcionistaDetailPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Check ownership - recepcionista owns their own record
  const isOwner = recepcionista.id === userId

  // Permissions
  const canUpdate = canUpdateEntity("recepcionistas", { role, userId, entityOwnerId: recepcionista.id })
  const canDelete = canDeleteEntity("recepcionistas", { role, userId })

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Get form values from child component via window
      const getFormValues = (window as unknown as Record<string, () => Partial<Recepcionista>>).__getRecepcionistaFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()

      const { success, error } = await updateRecepcionista(recepcionista.id, formData)

      if (success) {
        toast.success("Recepcionista actualizado exitosamente")
        setIsEditMode(false)
        setHasUnsavedChanges(false)
        router.refresh()
      } else {
        toast.error(error || "Error al actualizar el recepcionista")
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
      const { success, error } = await deleteRecepcionista(recepcionista.id)

      if (success) {
        toast.success("Recepcionista eliminado exitosamente")
        router.push("/recepcionistas")
      } else {
        toast.error(error || "Error al eliminar el recepcionista")
        setIsSaving(false)
      }
    } catch {
      toast.error("Error inesperado al eliminar")
      setIsSaving(false)
    }
  }

  const fullName = `${recepcionista.nombre} ${recepcionista.apellido}`

  return (
    <EntityDetailLayout
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Recepcionistas", href: "/recepcionistas" },
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
        parentRoute: "/recepcionistas",
        parentLabel: "Recepcionistas",
        isSaving,
        hasUnsavedChanges,
      }}
    >
      <RecepcionistaDetailContent
        recepcionista={recepcionista}
        isEditMode={isEditMode}
        onFormChange={setHasUnsavedChanges}
        role={role}
        userId={userId}
        isOwner={isOwner}
      />
    </EntityDetailLayout>
  )
}
