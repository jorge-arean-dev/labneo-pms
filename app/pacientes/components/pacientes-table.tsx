"use client"

import { useState, useMemo, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, HeartPulse, ChevronDown, Info, Loader2 } from "lucide-react"
import { DataTable, type DataTableColumn, type DataTableInlineAction } from "@/components/ui/data-table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { CrearPacienteDialog } from "./crear-paciente-dialog"
import { CrearConsultaDialog } from "@/app/consultas/components/crear-consulta-dialog"
import { formatDateLong } from "@/lib/utils/date-format"
import type { PacienteSearchResult } from "@/app/consultas/types"
import { fetchPacientesPaginated, type ObraSocial, type PacientePaginatedResult } from "../actions"

interface Patient {
  id: string
  name: string
  dni: string
  obraSocialId: string | null
  obraSocialNombre: string | null
  ultimaConsulta: string | null
  proximaConsulta: string | null
}

interface PacientesTableProps {
  initialData: PacientePaginatedResult
  obrasSociales: ObraSocial[]
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function PacientesTable({ initialData, obrasSociales }: PacientesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Server-side pagination state
  const [paginatedResult, setPaginatedResult] = useState<PacientePaginatedResult>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const [selectedObrasSociales, setSelectedObrasSociales] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [obrasSocialesOpen, setObrasSocialesOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Nueva Consulta dialog state
  const [isNuevaConsultaDialogOpen, setIsNuevaConsultaDialogOpen] = useState(false)
  const [selectedPacienteForConsulta, setSelectedPacienteForConsulta] = useState<PacienteSearchResult | null>(null)

  // Transform server data to table format
  const patients: Patient[] = useMemo(() => {
    return paginatedResult.data.map((p) => ({
      id: p.id,
      name: `${p.apellido}, ${p.nombre}`,
      dni: p.dni,
      obraSocialId: p.obra_social_id,
      obraSocialNombre: p.obra_social_nombre,
      ultimaConsulta: p.ultimaConsulta,
      proximaConsulta: p.proximaConsulta,
    }))
  }, [paginatedResult.data])

  // Fetch data from server
  const fetchData = useCallback(async (
    page: number,
    limit: number,
    search: string,
    obrasSocialesIds: string[]
  ) => {
    setIsLoading(true)
    try {
      const result = await fetchPacientesPaginated(page, limit, {
        searchTerm: search.length >= 2 ? search : undefined,
        obrasSocialesIds: obrasSocialesIds.length > 0 && obrasSocialesIds.length < obrasSociales.length
          ? obrasSocialesIds
          : undefined,
      })

      if (result.data) {
        setPaginatedResult(result.data)
      }
    } catch (error) {
      console.error("Error fetching pacientes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [obrasSociales.length])

  // Fetch when debounced search term changes
  useEffect(() => {
    // Only fetch if search term is empty or >= 2 chars
    if (debouncedSearchTerm.length === 0 || debouncedSearchTerm.length >= 2) {
      setCurrentPage(1)
      fetchData(1, rowsPerPage, debouncedSearchTerm, selectedObrasSociales)
    }
  }, [debouncedSearchTerm, fetchData, rowsPerPage, selectedObrasSociales])

  // Fetch when page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    fetchData(page, rowsPerPage, debouncedSearchTerm, selectedObrasSociales)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedObrasSociales])

  // Fetch when rows per page changes
  const handleRowsPerPageChange = useCallback((limit: number) => {
    setRowsPerPage(limit)
    setCurrentPage(1)
    fetchData(1, limit, debouncedSearchTerm, selectedObrasSociales)
  }, [fetchData, debouncedSearchTerm, selectedObrasSociales])

  // Handle obra social filter change
  const handleObrasSocialesChange = useCallback((newSelection: string[]) => {
    setSelectedObrasSociales(newSelection)
    setCurrentPage(1)
    fetchData(1, rowsPerPage, debouncedSearchTerm, newSelection)
  }, [fetchData, rowsPerPage, debouncedSearchTerm])

  // Calculate "Todas" checkbox state for obras sociales: "all" | "some" | "none"
  const todasObrasSocialesState = useMemo(() => {
    if (obrasSociales.length === 0) return "none"
    if (selectedObrasSociales.length === 0) return "all" // Empty = all selected (no filter)
    const selectedCount = selectedObrasSociales.length
    if (selectedCount === obrasSociales.length) return "all"
    return "some"
  }, [obrasSociales, selectedObrasSociales])

  // Toggle all obras sociales on/off
  const toggleTodasObrasSociales = () => {
    if (todasObrasSocialesState === "all" || selectedObrasSociales.length === 0) {
      // If all selected or no filter, do nothing (keep all)
      // To deselect all, user must select individual items
      handleObrasSocialesChange([])
    } else {
      // Select all (clear filter)
      handleObrasSocialesChange([])
    }
  }

  // Toggle individual obra social
  const toggleObraSocial = (obraSocialId: string) => {
    const newSelection = selectedObrasSociales.includes(obraSocialId)
      ? selectedObrasSociales.filter((id) => id !== obraSocialId)
      : [...selectedObrasSociales, obraSocialId]
    handleObrasSocialesChange(newSelection)
  }

  // Get selected obras sociales names for display
  const selectedObrasSocialesText = useMemo(() => {
    if (selectedObrasSociales.length === 0) return "Todas"
    if (selectedObrasSociales.length === 1) {
      const os = obrasSociales.find((o) => o.id === selectedObrasSociales[0])
      return os ? os.nombre : "Obra Social"
    }
    return `${selectedObrasSociales.length} obras sociales`
  }, [selectedObrasSociales, obrasSociales])

  // Define table columns
  const columns: DataTableColumn<Patient>[] = [
    {
      header: "Paciente",
      accessorKey: "name",
      cell: (value) => <span className="font-semibold">{String(value)}</span>,
      minWidth: "min-w-[180px]",
    },
    {
      header: "DNI",
      accessorKey: "dni",
    },
    {
      header: "Obra Social",
      accessorKey: "obraSocialNombre",
      cell: (value) =>
        value ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {String(value)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: (
        <div className="flex items-center gap-1.5">
          <span>Última Consulta</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Fecha de la consulta completada más reciente</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      accessorKey: "ultimaConsulta",
      cell: (value) => (value ? formatDateLong(value as string) : <span className="text-muted-foreground">-</span>),
    },
    {
      header: (
        <div className="flex items-center gap-1.5">
          <span>Próxima Consulta</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Fecha de la próxima consulta programada</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      accessorKey: "proximaConsulta",
      cell: (value) => (value ? formatDateLong(value as string) : <span className="text-muted-foreground">-</span>),
    },
  ]

  // Handle opening nueva consulta dialog
  const handleNuevaConsulta = (patient: Patient) => {
    // Convert Patient to PacienteSearchResult format
    // Name format is "Apellido, Nombre"
    const [apellido, nombre] = patient.name.split(", ")

    setSelectedPacienteForConsulta({
      id: patient.id,
      dni: patient.dni,
      nombre: nombre || "",
      apellido: apellido || "",
    })
    setIsNuevaConsultaDialogOpen(true)
  }

  // Handle closing nueva consulta dialog
  const handleNuevaConsultaDialogClose = (open: boolean) => {
    setIsNuevaConsultaDialogOpen(open)
    if (!open) {
      setSelectedPacienteForConsulta(null)
    }
  }

  // Handle new patient created - refresh data
  const handlePatientCreated = () => {
    startTransition(() => {
      fetchData(currentPage, rowsPerPage, debouncedSearchTerm, selectedObrasSociales)
      router.refresh()
    })
  }

  // Inline actions rendered as visible buttons (matching consultas table pattern)
  const inlineActions: DataTableInlineAction<Patient>[] = [
    {
      label: "Ver",
      ariaLabel: (row) => `Ver paciente ${row.name}`,
      onClick: (row) => router.push(`/pacientes/${row.id}`),
    },
    {
      label: "Nueva Consulta",
      ariaLabel: (row) => `Nueva consulta para ${row.name}`,
      onClick: (row) => handleNuevaConsulta(row),
    },
  ]

  const showLoadingOverlay = isLoading || isPending

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus pacientes, historiales médicos y citas programadas.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Crear paciente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Search Filter (DNI, Nombre, Apellido) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Buscar</span>
          </div>
          <div className="relative">
            <Input
              placeholder="DNI, nombre o apellido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72"
            />
            {isLoading && searchTerm.length >= 2 && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <span className="text-xs text-muted-foreground">Ingrese al menos 2 caracteres</span>
          )}
        </div>

        {/* Obra Social Multi-Select */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Obra Social</span>
          </div>
          <Popover open={obrasSocialesOpen} onOpenChange={setObrasSocialesOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <span className="truncate">{selectedObrasSocialesText}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar obra social..." />
                <CommandList>
                  <CommandEmpty>No se encontraron obras sociales</CommandEmpty>
                  <CommandGroup>
                    {/* Todas - select all toggle */}
                    <CommandItem
                      onSelect={toggleTodasObrasSociales}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedObrasSociales.length === 0}
                        className="mr-2"
                      />
                      Todas
                    </CommandItem>

                    {/* Individual obras sociales - indented */}
                    {obrasSociales.map((os) => (
                      <CommandItem
                        key={os.id}
                        onSelect={() => toggleObraSocial(os.id)}
                        className="cursor-pointer pl-6"
                      >
                        <Checkbox
                          checked={selectedObrasSociales.includes(os.id)}
                          className="mr-2"
                        />
                        {os.nombre}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table with loading overlay */}
      <div className="relative">
        {showLoadingOverlay && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando...</span>
            </div>
          </div>
        )}
        <DataTable
          columns={columns}
          data={patients}
          inlineActions={inlineActions}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          totalPages={paginatedResult.totalPages}
          totalCount={paginatedResult.totalCount}
        />
      </div>

      {/* Crear Paciente Dialog */}
      <CrearPacienteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onPatientCreated={handlePatientCreated}
      />

      {/* Crear Consulta Dialog */}
      <CrearConsultaDialog
        open={isNuevaConsultaDialogOpen}
        onOpenChange={handleNuevaConsultaDialogClose}
        initialPaciente={selectedPacienteForConsulta}
      />
    </div>
  )
}
