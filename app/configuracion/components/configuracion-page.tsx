"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { UsuarioInfoContent } from "./usuario-info-content"
import { OdontologoInfoContent } from "./odontologo-info-content"
import { OdontologoHorariosContent } from "./odontologo-horarios-content"
import {
  updateUsuarioPms,
  upsertOdontologoPerfil,
  updateOdontologoHorarios,
} from "../actions"
import type { UsuarioPms, OdontologoPerfil, OdontologoHorario, Localidad } from "@/lib/types/entities"
import type { UserRole } from "@/app/components/entity-detail-layout/types"

interface ConfiguracionPageProps {
  role: UserRole
  userId: string
  usuarioData: UsuarioPms
  perfilData?: (OdontologoPerfil & { localidades: Localidad | null }) | null
  horariosData?: OdontologoHorario[] | null
  localidadesData?: Localidad[] | null
  incompleteMissingLabels?: string[]
}

export function ConfiguracionPage({
  role,
  userId,
  usuarioData,
  perfilData = null,
  horariosData = null,
  localidadesData = null,
  incompleteMissingLabels = [],
}: ConfiguracionPageProps) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null)

  const isOdontologo = role === "odontologo"

  const handleTabChange = (newTab: string) => {
    if (isEditMode) {
      setPendingTabChange(newTab)
      setShowUnsavedDialog(true)
      return
    }
    setActiveTab(newTab)
  }

  const handleDiscardAndChangeTab = () => {
    setIsEditMode(false)
    if (pendingTabChange) {
      setActiveTab(pendingTabChange)
      setPendingTabChange(null)
    }
    setShowUnsavedDialog(false)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      if (isOdontologo && activeTab === "info") {
        // Save both usuario_pms and odontologo_perfil
        const getInfoValues = (window as unknown as {
          __getOdontologoInfoFormValues?: () => {
            nombre: string
            apellido: string
            telefono?: string
            direccion_consultorio?: string
            localidad_id?: string
            cuit?: string
            situacion_iva?: string
          }
        }).__getOdontologoInfoFormValues

        if (!getInfoValues) {
          toast.error("Error al obtener los datos del formulario")
          setIsSaving(false)
          return
        }

        const values = getInfoValues()

        // Update usuario_pms (nombre, apellido)
        const { success: userSuccess, error: userError } = await updateUsuarioPms(userId, {
          nombre: values.nombre,
          apellido: values.apellido,
        })

        if (!userSuccess) {
          toast.error(userError || "Error al actualizar información personal")
          setIsSaving(false)
          return
        }

        // Upsert odontologo perfil
        const { success: perfilSuccess, error: perfilError } = await upsertOdontologoPerfil(userId, {
          localidad_id: values.localidad_id || null,
          telefono: values.telefono || null,
          cuit: values.cuit || null,
          situacion_iva: values.situacion_iva || null,
          direccion_consultorio: values.direccion_consultorio || null,
        })

        if (!perfilSuccess) {
          toast.error(perfilError || "Error al actualizar datos fiscales")
          setIsSaving(false)
          return
        }

        toast.success("Información actualizada exitosamente")
      } else if (isOdontologo && activeTab === "horarios") {
        // Save horarios
        const getHorariosValues = (window as unknown as {
          __getOdontologoHorariosValues?: () => {
            dia_semana: number
            hora_inicio: string
            hora_fin: string
            activo: boolean
          }[]
        }).__getOdontologoHorariosValues

        if (!getHorariosValues) {
          toast.error("Error al obtener los datos de horarios")
          setIsSaving(false)
          return
        }

        const horarios = getHorariosValues()
        const { success, error } = await updateOdontologoHorarios(userId, horarios)

        if (!success) {
          toast.error(error || "Error al actualizar horarios")
          setIsSaving(false)
          return
        }

        toast.success("Horarios actualizados exitosamente")
      } else {
        // Admin/default: save usuario_pms only
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
        const { success, error } = await updateUsuarioPms(userId, formData)

        if (success) {
          toast.success("Información actualizada exitosamente")
        } else {
          toast.error(error || "Error al actualizar la información")
          setIsSaving(false)
          return
        }
      }

      setIsEditMode(false)
      router.refresh()
    } catch {
      toast.error("Error inesperado al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const showIncompleteBanner = incompleteMissingLabels.length > 0

  return (
    <div className="p-6 space-y-6">
      {showIncompleteBanner && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-950/20 p-4">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
            Tu perfil está incompleto
          </p>
          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
            Completá los siguientes campos para poder crear solicitudes:{" "}
            <span className="font-medium">
              {incompleteMissingLabels.join(", ")}
            </span>
            .
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            {isOdontologo
              ? "Gestioná tu información personal y horarios de atención"
              : "Gestiona tu información personal"}
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

      {/* Content */}
      {isOdontologo ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="info">Información Personal</TabsTrigger>
            <TabsTrigger value="horarios">Horarios de Atención</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <OdontologoInfoContent
              usuario={usuarioData}
              perfil={perfilData ?? null}
              localidades={localidadesData ?? []}
              isEditMode={isEditMode}
            />
          </TabsContent>

          <TabsContent value="horarios" className="mt-6">
            <OdontologoHorariosContent
              horarios={horariosData ?? []}
              isEditMode={isEditMode}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <UsuarioInfoContent
          usuario={usuarioData}
          isEditMode={isEditMode}
          role={role}
        />
      )}

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar. Si cambiás de pestaña, se perderán los cambios realizados.
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
