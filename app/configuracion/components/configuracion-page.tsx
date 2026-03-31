"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Save, X } from "lucide-react"
import { UsuarioPms } from "@/lib/types/entities"
import { Button } from "@/components/ui/button"
import { UsuarioInfoContent } from "./usuario-info-content"
import { updateUsuarioPms } from "../actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface ConfiguracionPageProps {
  role: UserRole
  userId?: string
  usuarioData: UsuarioPms | null
}

export function ConfiguracionPage({
  role,
  usuarioData,
}: ConfiguracionPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!usuarioData) return
    setIsSaving(true)

    try {
      const getFormValues = (window as unknown as {
        __getUsuarioFormValues?: () => {
          nombre: string
          apellido: string
        }
      }).__getUsuarioFormValues
      if (!getFormValues) {
        toast.error("Error al obtener los datos del formulario")
        setIsSaving(false)
        return
      }

      const formData = getFormValues()
      const { success, error } = await updateUsuarioPms(usuarioData.id, formData)

      if (success) {
        toast.success("Información actualizada exitosamente")
        setIsEditMode(false)
        router.refresh()
      } else {
        toast.error(error || "Error al actualizar la información")
      }
    } catch {
      toast.error("Error inesperado al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditMode && (
            <Button onClick={() => setIsEditMode(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(false)}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Info Content */}
      {usuarioData && (
        <UsuarioInfoContent
          usuario={usuarioData}
          isEditMode={isEditMode}
          role={role}
        />
      )}
    </div>
  )
}
