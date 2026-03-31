"use client"

import { useEffect, useState } from "react"
import { Medico, ObraSocialOption } from "@/lib/types/entities"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import type { UserRole } from "@/app/components/entity-detail-layout/types"
import { fetchAllObrasSociales, fetchMedicoObrasSociales } from "../actions"

interface MedicoObrasSocialesContentProps {
  medico: Medico
  isEditMode: boolean
  onFormChange?: (hasChanges: boolean) => void
  role: UserRole
  userId: string
}

export function MedicoObrasSocialesContent({
  medico,
  isEditMode,
  onFormChange,
}: MedicoObrasSocialesContentProps) {
  const [obrasSociales, setObrasSociales] = useState<ObraSocialOption[]>([])
  const [selectedObrasSociales, setSelectedObrasSociales] = useState<string[]>([])
  const [initialSelected, setInitialSelected] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // In configuracion, the médico is always editing their own profile
  const canEdit = true

  // Fetch obras sociales and médico's current associations
  // Re-fetch when exiting edit mode (after save) to show updated data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all active obras sociales
        const { data: allObrasSociales, error: osError } = await fetchAllObrasSociales()
        if (osError || !allObrasSociales) {
          throw new Error(osError || "Error al cargar obras sociales")
        }
        setObrasSociales(allObrasSociales)

        // Fetch médico's current obras sociales associations
        const { data: medicoOS, error: medicoOSError } = await fetchMedicoObrasSociales(medico.id)
        if (medicoOSError || !medicoOS) {
          throw new Error(medicoOSError || "Error al cargar las asociaciones del médico")
        }
        const currentSelected = medicoOS.map((os) => os.id)

        setSelectedObrasSociales(currentSelected)
        setInitialSelected(currentSelected)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch on mount and when exiting edit mode
    if (!isEditMode) {
      fetchData()
    }
  }, [medico.id, isEditMode])

  // Track form changes
  useEffect(() => {
    if (!isEditMode) {
      // Reset to initial values when exiting edit mode
      setSelectedObrasSociales(initialSelected)
      return
    }

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify([...selectedObrasSociales].sort()) !==
                      JSON.stringify([...initialSelected].sort())

    if (onFormChange) {
      onFormChange(hasChanges)
    }
  }, [selectedObrasSociales, initialSelected, isEditMode, onFormChange])

  // Expose form values to parent via window
  useEffect(() => {
    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__getMedicoObrasSocialesFormValues = () => ({
        obras_sociales_ids: selectedObrasSociales,
      })
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__getMedicoObrasSocialesFormValues
    }
  }, [isEditMode, selectedObrasSociales])

  // Convert obras sociales to multi-select options
  const options: MultiSelectOption[] = obrasSociales.map((os) => ({
    label: os.nombre,
    value: os.id,
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Obras Sociales</CardTitle>
          <CardDescription>
            Seleccione las obras sociales que puede atender
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-28" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Obras Sociales</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Obras Sociales</CardTitle>
        <CardDescription>
          {isEditMode
            ? "Seleccione las obras sociales que puede atender"
            : "Obras sociales que puede atender"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditMode && canEdit ? (
          <MultiSelect
            options={options}
            selected={selectedObrasSociales}
            onChange={setSelectedObrasSociales}
            placeholder="Seleccionar obras sociales..."
            emptyText="No se encontraron obras sociales"
            searchPlaceholder="Buscar obras sociales..."
          />
        ) : (
          <div>
            {selectedObrasSociales.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedObrasSociales.map((osId) => {
                  const os = obrasSociales.find((o) => o.id === osId)
                  return os ? (
                    <span
                      key={os.id}
                      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    >
                      {os.nombre}
                    </span>
                  ) : null
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <InfoIcon className="h-4 w-4" />
                <span>No hay obras sociales asociadas</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
