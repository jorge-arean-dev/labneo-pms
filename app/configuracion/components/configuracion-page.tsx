"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Save, X } from "lucide-react"
import { Medico, UsuarioPms } from "@/lib/types/entities"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MedicoInfoContent } from "./medico-info-content"
import { MedicoHorariosContent } from "@/app/components/medico/medico-horarios-content"
import { MedicoObrasSocialesContent } from "./medico-obras-sociales-content"
import { MedicoBloqueosContent } from "@/app/components/medico/medico-bloqueos-content"
import { UsuarioInfoContent } from "./usuario-info-content"
import {
  updateMedicoProfile,
  updateMedicoHorarios,
  updateMedicoObrasSociales,
  updateMedicoParametrosAgenda,
  updateUsuarioPms,
} from "../actions"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
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

interface ConfiguracionPageProps {
  role: UserRole
  userId: string
  medicoData: Medico | null
  usuarioData: UsuarioPms | null
}

export function ConfiguracionPage({
  role,
  userId,
  medicoData,
  usuarioData,
}: ConfiguracionPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null)

  // All roles can edit their own profile
  const canUpdate = true

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleTabChange = (newTab: string) => {
    if (isEditMode && hasUnsavedChanges) {
      setPendingTabChange(newTab)
      setShowUnsavedDialog(true)
    } else {
      setActiveTab(newTab)
    }
  }

  const handleDiscardAndChangeTab = () => {
    setIsEditMode(false)
    setHasUnsavedChanges(false)
    if (pendingTabChange) {
      setActiveTab(pendingTabChange)
      setPendingTabChange(null)
    }
    setShowUnsavedDialog(false)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Bloqueos tab handles its own saves — no-op here
      if (activeTab === "bloqueos") {
        setIsSaving(false)
        return
      }

      if (role === "medico" && medicoData) {
        // Save médico data based on active tab
        if (activeTab === "info") {
          const getFormValues = (window as unknown as {
            __getMedicoFormValues?: () => {
              nombre: string
              apellido: string
              matricula: string | null
              telefono: string | null
            }
          }).__getMedicoFormValues
          if (!getFormValues) {
            toast.error("Error al obtener los datos del formulario")
            setIsSaving(false)
            return
          }

          const formData = getFormValues()
          const { success, error } = await updateMedicoProfile(medicoData.id, formData)

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
          const getHorariosFormValues = (window as unknown as {
            __getMedicoHorariosFormValues?: () => {
              horarios: Parameters<typeof updateMedicoHorarios>[1]
              parametros: Parameters<typeof updateMedicoParametrosAgenda>[1]
            }
          }).__getMedicoHorariosFormValues
          if (!getHorariosFormValues) {
            toast.error("Error al obtener los datos de horarios")
            setIsSaving(false)
            return
          }

          const formData = getHorariosFormValues()

          // Update both tables in parallel
          const [horariosResult, parametrosResult] = await Promise.all([
            updateMedicoHorarios(medicoData.id, formData.horarios),
            updateMedicoParametrosAgenda(medicoData.id, formData.parametros)
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
          const getObrasSocialesFormValues = (window as unknown as {
            __getMedicoObrasSocialesFormValues?: () => {
              obras_sociales_ids: string[]
            }
          }).__getMedicoObrasSocialesFormValues
          if (!getObrasSocialesFormValues) {
            toast.error("Error al obtener los datos de obras sociales")
            setIsSaving(false)
            return
          }

          const obrasSocialesData = getObrasSocialesFormValues()
          const { success, error } = await updateMedicoObrasSociales(
            medicoData.id,
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
      } else if (usuarioData) {
        // Save usuario_pms data (recepcionista or admin)
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
          setHasUnsavedChanges(false)
          router.refresh()
        } else {
          toast.error(error || "Error al actualizar la información")
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            {role === "medico"
              ? "Gestiona tu perfil, horarios y obras sociales"
              : "Gestiona tu información personal"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditMode && canUpdate && (
            <Button onClick={handleEditToggle}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
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

      {/* Content based on role */}
      {role === "medico" && medicoData ? (
        // Médico: 3 tabs (Info, Horarios, Obras Sociales)
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">Información General</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="obras-sociales">Obras Sociales</TabsTrigger>
            <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <MedicoInfoContent
              medico={medicoData}
              isEditMode={isEditMode}
              onFormChange={setHasUnsavedChanges}
              role={role}
              isSelfManagement={true}
            />
          </TabsContent>

          <TabsContent value="horarios" className="space-y-6">
            <MedicoHorariosContent
              medico={medicoData}
              isEditMode={isEditMode}
              onFormChange={setHasUnsavedChanges}
            />
          </TabsContent>

          <TabsContent value="obras-sociales" className="space-y-6">
            <MedicoObrasSocialesContent
              medico={medicoData}
              role={role}
              userId={userId}
              isEditMode={isEditMode}
              onFormChange={setHasUnsavedChanges}
            />
          </TabsContent>

          <TabsContent value="bloqueos" className="space-y-6">
            <MedicoBloqueosContent
              medico={medicoData}
              canManage={true}
            />
          </TabsContent>
        </Tabs>
      ) : usuarioData ? (
        // Recepcionista or Admin: Single page (Info + Password)
        <UsuarioInfoContent
          usuario={usuarioData}
          isEditMode={isEditMode}
          onFormChange={setHasUnsavedChanges}
          role={role}
        />
      ) : null}

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de pestaña?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTabChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardAndChangeTab}>
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
