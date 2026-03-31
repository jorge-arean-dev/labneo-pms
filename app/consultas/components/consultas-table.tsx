"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronDown, Calendar as CalendarIcon, Info, Search, Stethoscope, FileText, ArrowUpDown, Loader2, RefreshCw } from "lucide-react"
import { DataTable, type DataTableColumn, type DataTableAction, type DataTableInlineAction } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
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
import { formatTime, formatDate } from "@/lib/utils/date-format"
import { getTipoConsultaLabel, getTipoConsultaBadge, TIPO_CONSULTA_BADGE, TIPO_CONSULTA_LABELS, type TipoConsulta } from "@/lib/constants/consulta-types"
import { getEstadoColor } from "@/lib/constants/estado-colors"
import { Consulta, MedicoOption, EstadoOption, ConsultaPaginatedResult, DateFilterType, SortOption } from "../types"
import { CrearConsultaDialog } from "./crear-consulta-dialog"
import { TransferirConsultaDialog } from "./transferir-consulta-dialog"
import { ReagendarConsultaDialog } from "./reagendar-consulta-dialog"
import { PatientInfoPopover } from "@/app/components/patient-info-popover"
import {
  togglePacienteLlegada,
  iniciarConsulta,
  marcarComoAusente,
  cancelarConsulta,
  finalizarConsultaSimple,
  fetchConsultasPaginated,
} from "../actions"

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
import { toast } from "sonner"

interface ConsultasTableProps {
  initialData: ConsultaPaginatedResult
  medicos: MedicoOption[]
  estados: EstadoOption[]
  currentUserRole: "administrador" | "medico" | "recepcionista"
  currentUserMedicoId: string | null
  initialMedicosFilter: string[]
  initialEstadosFilter: string[]
}

// Helper function to check if a date is today
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

type ConfirmationAction =
  | "registrar_llegada"
  | "iniciar_consulta"
  | "marcar_ausente"
  | "cancelar_programada"
  | "finalizar_consulta"
  | "cancelar_en_curso"

const SORT_OPTIONS: { value: SortOption; label: string; hint: string }[] = [
  { value: "fecha_hora_asc", label: "Hora Consulta ↑", hint: "(más temprano primero)" },
  { value: "fecha_hora_desc", label: "Hora Consulta ↓", hint: "(más tarde primero)" },
  { value: "llegada_asc", label: "Hora Llegada ↑", hint: "(más temprano primero)" },
  { value: "llegada_desc", label: "Hora Llegada ↓", hint: "(más tarde primero)" },
]

const DEFAULT_SORT: SortOption = "fecha_hora_asc"

export function ConsultasTable({ initialData, medicos, estados, currentUserRole, currentUserMedicoId, initialMedicosFilter, initialEstadosFilter }: ConsultasTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Server-side pagination state
  const [paginatedResult, setPaginatedResult] = useState<ConsultaPaginatedResult>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sort state - initialized from URL params or default
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sortParam = searchParams.get("sort")
    if (sortParam && SORT_OPTIONS.some(opt => opt.value === sortParam)) {
      return sortParam as SortOption
    }
    return DEFAULT_SORT
  })

  // Local state for consultas - allows real-time updates without full page refresh
  const [consultas, setConsultas] = useState<Consulta[]>(initialData.data)

  // Search state with debouncing
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilterType>("hoy")
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined)
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined)

  // Initialize filters from props
  const [selectedMedicos, setSelectedMedicos] = useState<string[]>(initialMedicosFilter)
  const [selectedEstados, setSelectedEstados] = useState<string[]>(initialEstadosFilter)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [medicosOpen, setMedicosOpen] = useState(false)
  const [estadosOpen, setEstadosOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [consultaToTransfer, setConsultaToTransfer] = useState<Consulta | null>(null)
  const [reagendarDialogOpen, setReagendarDialogOpen] = useState(false)
  const [consultaToReagendar, setConsultaToReagendar] = useState<Consulta | null>(null)
  const [crearConsultaOpen, setCrearConsultaOpen] = useState(false)
  const [enConsultorio, setEnConsultorio] = useState(false)

  // Confirmation dialog state
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null)
  const [confirmationConsulta, setConfirmationConsulta] = useState<Consulta | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sendCancellationNotification, setSendCancellationNotification] = useState(true)

  // Tick state for Estado Horario auto-update (triggers re-render every minute)
  const [, setTick] = useState(0)

  // Check if "programada" estado is selected (for En Consultorio toggle visibility)
  const programadaEstadoId = useMemo(() =>
    estados.find(e => e.codigo === "programada")?.id,
    [estados]
  )

  const isProgramadaSelected = useMemo(() =>
    !!programadaEstadoId && selectedEstados.includes(programadaEstadoId),
    [programadaEstadoId, selectedEstados]
  )

  // Refs for realtime handler and action callbacks to avoid stale closures
  const estadosRef = useRef(estados)
  useEffect(() => { estadosRef.current = estados }, [estados])

  const filtersRef = useRef({
    currentPage, rowsPerPage, debouncedSearchTerm, selectedMedicos,
    selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy,
  })
  useEffect(() => {
    filtersRef.current = {
      currentPage, rowsPerPage, debouncedSearchTerm, selectedMedicos,
      selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy,
    }
  }, [currentPage, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy])

  // Note: no useEffect sync from initialData. All data updates after initial render
  // come from fetchData() calls (action handlers + realtime subscription).
  // Syncing from initialData caused bugs: server actions call revalidatePath() which
  // triggers a server component re-render with DEFAULT filters (today + programada),
  // overwriting the user's active filter state.

  // Fetch data from server
  const fetchData = useCallback(async (
    page: number,
    limit: number,
    search: string,
    medicosIds: string[],
    estadosIds: string[],
    dateFilterValue: DateFilterType,
    desde?: Date,
    hasta?: Date,
    onlyArrived?: boolean,
    sort?: SortOption
  ) => {
    // Short-circuit: if no médicos or no estados selected, show empty results
    if (medicosIds.length === 0 || estadosIds.length === 0) {
      const empty: ConsultaPaginatedResult = {
        data: [],
        totalCount: 0,
        page: 1,
        limit,
        totalPages: 0,
      }
      setPaginatedResult(empty)
      setConsultas([])
      return
    }

    setIsLoading(true)
    try {
      const result = await fetchConsultasPaginated(page, limit, {
        searchTerm: search.length >= 2 ? search : undefined,
        medicosIds,
        estadosIds,
        dateFilter: dateFilterValue,
        fechaDesde: desde?.toISOString(),
        fechaHasta: hasta?.toISOString(),
        onlyArrived,
        sortBy: sort,
      })

      if (result.data) {
        setPaginatedResult(result.data)
        setConsultas(result.data.data)
      }
    } catch (error) {
      console.error("Error fetching consultas:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update URL and re-fetch when sort changes
  // Uses replaceState instead of router.push to avoid triggering a server component
  // re-render which would overwrite the current filter state with defaults
  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value)
    setCurrentPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (value === DEFAULT_SORT) {
      params.delete("sort")
    } else {
      params.set("sort", value)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, "", newUrl)
    // Re-fetch with new sort so server returns correctly ordered/paginated data
    fetchData(1, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, value)
  }, [searchParams, fetchData, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio])

  // Fetch when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length === 0 || debouncedSearchTerm.length >= 2) {
      setCurrentPage(1)
      fetchData(1, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy)
    }
  }, [debouncedSearchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update Estado Horario every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  // Real-time subscription for consultas updates
  useEffect(() => {
    const supabase = createClient()

    // Use unique channel name to avoid conflicts with other realtime subscriptions
    const channelName = `consultas-table-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultas",
        },
        (payload) => {
          console.log("[Realtime] Consulta updated:", payload.new.id)

          // Resolve estado details locally from estados ref
          const newEstadoId = payload.new.estado_id
          const estadoChanged = payload.old.estado_id !== newEstadoId
          const estadoInfo = estadoChanged
            ? estadosRef.current.find(e => e.id === newEstadoId)
            : null

          // Update local state with the changed consulta (including estado details)
          setConsultas((prev) =>
            prev.map((consulta) =>
              consulta.id === payload.new.id
                ? {
                    ...consulta,
                    paciente_llego_timestamp: payload.new.paciente_llego_timestamp,
                    estado_id: newEstadoId,
                    ...(estadoInfo && {
                      estado_nombre: estadoInfo.nombre,
                      estado_codigo: estadoInfo.codigo,
                    }),
                  }
                : consulta
            )
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultas",
        },
        () => {
          console.log("[Realtime] New consulta inserted")
          // Re-fetch with current filters to pick up the new consulta
          const f = filtersRef.current
          fetchData(
            f.currentPage, f.rowsPerPage, f.debouncedSearchTerm,
            f.selectedMedicos, f.selectedEstados, f.dateFilter,
            f.fechaDesde, f.fechaHasta, f.enConsultorio, f.sortBy
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "consultas",
        },
        (payload) => {
          console.log("[Realtime] Consulta deleted:", payload.old.id)
          // Remove from local state
          setConsultas((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Client-side filtering and sorting (uses local consultas state for real-time updates)
  // Apply client-side sorting to server-fetched data
  // Secondary sort by id ensures deterministic order for ties (e.g. same fecha_hora)
  const sortedConsultas = useMemo(() => {
    return [...consultas].sort((a, b) => {
      let result: number
      switch (sortBy) {
        case "fecha_hora_desc":
          result = new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
          break
        case "fecha_hora_asc":
          result = new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
          break
        case "llegada_desc": {
          // Null values go to the end
          if (!a.paciente_llego_timestamp && !b.paciente_llego_timestamp) result = 0
          else if (!a.paciente_llego_timestamp) return 1
          else if (!b.paciente_llego_timestamp) return -1
          else result = new Date(b.paciente_llego_timestamp).getTime() - new Date(a.paciente_llego_timestamp).getTime()
          break
        }
        case "llegada_asc": {
          // Null values go to the end
          if (!a.paciente_llego_timestamp && !b.paciente_llego_timestamp) result = 0
          else if (!a.paciente_llego_timestamp) return 1
          else if (!b.paciente_llego_timestamp) return -1
          else result = new Date(a.paciente_llego_timestamp).getTime() - new Date(b.paciente_llego_timestamp).getTime()
          break
        }
        default:
          result = 0
      }
      // Tiebreaker: sort by id for deterministic order
      if (result === 0) {
        return a.id.localeCompare(b.id)
      }
      return result
    })
  }, [consultas, sortBy])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    fetchData(page, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy])

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((limit: number) => {
    setRowsPerPage(limit)
    setCurrentPage(1)
    fetchData(1, limit, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy)
  }, [fetchData, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy])

  // Handle medicos filter change
  const handleMedicosChange = useCallback((newSelection: string[]) => {
    setSelectedMedicos(newSelection)
    setCurrentPage(1)
    fetchData(1, rowsPerPage, debouncedSearchTerm, newSelection, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy])

  // Handle estados filter change
  const handleEstadosChange = useCallback((newSelection: string[]) => {
    setSelectedEstados(newSelection)
    // Auto-reset "En Consultorio" toggle if programada is deselected
    const isProgramadaInNew = programadaEstadoId ? newSelection.includes(programadaEstadoId) : false
    const effectiveEnConsultorio = isProgramadaInNew ? enConsultorio : false
    if (!isProgramadaInNew && enConsultorio) {
      setEnConsultorio(false)
    }
    setCurrentPage(1)
    fetchData(1, rowsPerPage, debouncedSearchTerm, selectedMedicos, newSelection, dateFilter, fechaDesde, fechaHasta, effectiveEnConsultorio, sortBy)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedMedicos, dateFilter, fechaDesde, fechaHasta, enConsultorio, programadaEstadoId, sortBy])

  // Handle date filter change
  const handleDateFilterChange = useCallback((newFilter: DateFilterType, desde?: Date, hasta?: Date) => {
    setDateFilter(newFilter)
    if (desde !== undefined) setFechaDesde(desde)
    if (hasta !== undefined) setFechaHasta(hasta)
    setCurrentPage(1)
    fetchData(1, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, newFilter, desde, hasta, enConsultorio, sortBy)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, enConsultorio, sortBy])

  // Toggle medico selection
  const toggleMedico = (medicoId: string) => {
    const newSelection = selectedMedicos.includes(medicoId)
      ? selectedMedicos.filter((id) => id !== medicoId)
      : [...selectedMedicos, medicoId]
    handleMedicosChange(newSelection)
  }

  // Toggle estado selection
  const toggleEstado = (estadoId: string) => {
    const newSelection = selectedEstados.includes(estadoId)
      ? selectedEstados.filter((id) => id !== estadoId)
      : [...selectedEstados, estadoId]
    handleEstadosChange(newSelection)
  }

  // "Todos" state for estados filter: "all" | "some" | "none"
  const todosEstadosState = useMemo(() => {
    if (estados.length === 0) return "none"
    const selectedCount = estados.filter((e) => selectedEstados.includes(e.id)).length
    if (selectedCount === 0) return "none"
    if (selectedCount === estados.length) return "all"
    return "some"
  }, [estados, selectedEstados])

  // Toggle all estados on/off
  const toggleTodosEstados = () => {
    let newSelection: string[]
    if (todosEstadosState === "all") {
      newSelection = []
    } else {
      newSelection = estados.map((e) => e.id)
    }
    handleEstadosChange(newSelection)
  }

  // Handle "En Consultorio" toggle change
  const handleEnConsultorioChange = useCallback((checked: boolean) => {
    setEnConsultorio(checked)
    setCurrentPage(1)
    fetchData(1, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, checked, sortBy)
  }, [fetchData, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, sortBy])

  // Handle manual refresh - re-fetches data with current filters
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchData(currentPage, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy)
      toast.success("Datos actualizados")
    } catch {
      toast.error("Error al actualizar los datos")
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchData, currentPage, rowsPerPage, debouncedSearchTerm, selectedMedicos, selectedEstados, dateFilter, fechaDesde, fechaHasta, enConsultorio, sortBy])

  // Get list of other médicos (excluding current user's medico) - for medico role only
  const otherMedicos = useMemo(() => {
    if (currentUserRole !== "medico" || !currentUserMedicoId) return []
    return medicos.filter((m) => m.id !== currentUserMedicoId)
  }, [medicos, currentUserRole, currentUserMedicoId])

  // Calculate "Otros Médicos" checkbox state: "all" | "some" | "none"
  const otrosMedicosState = useMemo(() => {
    if (otherMedicos.length === 0) return "none"
    const selectedOtherCount = otherMedicos.filter((m) => selectedMedicos.includes(m.id)).length
    if (selectedOtherCount === 0) return "none"
    if (selectedOtherCount === otherMedicos.length) return "all"
    return "some"
  }, [otherMedicos, selectedMedicos])

  // Toggle all other médicos on/off
  const toggleOtrosMedicos = () => {
    let newSelection: string[]
    if (otrosMedicosState === "all") {
      // Deselect all other médicos
      newSelection = selectedMedicos.filter((id) => !otherMedicos.some((m) => m.id === id))
    } else {
      // Select all other médicos
      const otherIds = otherMedicos.map((m) => m.id)
      newSelection = [...new Set([...selectedMedicos, ...otherIds])]
    }
    handleMedicosChange(newSelection)
  }

  // Calculate "Todos" checkbox state for recepcionista/administrador: "all" | "some" | "none"
  const todosMedicosState = useMemo(() => {
    if (currentUserRole === "medico") return "none"
    if (medicos.length === 0) return "none"
    const selectedCount = medicos.filter((m) => selectedMedicos.includes(m.id)).length
    if (selectedCount === 0) return "none"
    if (selectedCount === medicos.length) return "all"
    return "some"
  }, [medicos, selectedMedicos, currentUserRole])

  // Toggle all médicos on/off (for recepcionista/administrador)
  const toggleTodosMedicos = () => {
    let newSelection: string[]
    if (todosMedicosState === "all") {
      // Deselect all médicos
      newSelection = []
    } else {
      // Select all médicos
      newSelection = medicos.map((m) => m.id)
    }
    handleMedicosChange(newSelection)
  }

  // ============================================================================
  // Confirmation Dialog Helpers
  // ============================================================================

  const openConfirmationDialog = (action: ConfirmationAction, consulta: Consulta) => {
    setConfirmationAction(action)
    setConfirmationConsulta(consulta)
    // Reset notification checkbox for cancel actions
    if (action === "cancelar_programada" || action === "cancelar_en_curso") {
      setSendCancellationNotification(true)
    }
    setConfirmationDialogOpen(true)
  }

  const getConfirmationDialogContent = () => {
    if (!confirmationAction || !confirmationConsulta) return { title: "", description: "" }

    const pacienteName = `${confirmationConsulta.paciente_nombre} ${confirmationConsulta.paciente_apellido}`

    switch (confirmationAction) {
      case "registrar_llegada":
        return confirmationConsulta.paciente_llego_timestamp
          ? {
              title: "¿Desmarcar llegada?",
              description: `Se desmarcará la llegada de ${pacienteName}. El tiempo de espera se reiniciará si se vuelve a registrar.`,
              confirmText: "Desmarcar llegada",
              isDestructive: false,
            }
          : {
              title: "¿Registrar llegada?",
              description: `Se registrará que ${pacienteName} ha llegado y comenzará a contar el tiempo de espera.`,
              confirmText: "Registrar llegada",
              isDestructive: false,
            }
      case "iniciar_consulta":
        return {
          title: "¿Iniciar consulta?",
          description: `La consulta de ${pacienteName} pasará a estado "En Curso". Podrás comenzar a documentar el diagnóstico, tratamiento y demás información médica.`,
          confirmText: "Iniciar consulta",
          isDestructive: false,
        }
      case "marcar_ausente":
        return {
          title: "¿Marcar como ausente?",
          description: `${pacienteName} será marcado como ausente y la consulta quedará registrada como no atendida. Esta acción no se puede deshacer.`,
          confirmText: "Marcar como ausente",
          isDestructive: true,
        }
      case "cancelar_programada":
        return {
          title: "¿Cancelar consulta?",
          description: `Esta acción cancelará la consulta programada de ${pacienteName}. El paciente deberá agendar una nueva cita si desea ser atendido. Esta acción no se puede deshacer.`,
          confirmText: "Sí, cancelar consulta",
          isDestructive: true,
        }
      case "finalizar_consulta":
        return {
          title: "¿Finalizar consulta?",
          description: `Esta acción marcará la consulta de ${pacienteName} como completada. Para agregar información médica detallada, utilice la vista de detalle de la consulta.`,
          confirmText: "Finalizar consulta",
          isDestructive: false,
        }
      case "cancelar_en_curso":
        return {
          title: "¿Cancelar consulta?",
          description: `Esta acción marcará la consulta de ${pacienteName} como cancelada. Los datos ingresados hasta ahora serán descartados y la consulta no aparecerá en el historial médico del paciente. Esta acción no se puede deshacer.`,
          confirmText: "Sí, cancelar consulta",
          isDestructive: true,
        }
      default:
        return { title: "", description: "", confirmText: "Confirmar", isDestructive: false }
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmationAction || !confirmationConsulta) return

    setIsProcessing(true)

    try {
      let result: { success: boolean; error: string | null }

      switch (confirmationAction) {
        case "registrar_llegada":
          result = await togglePacienteLlegada(
            confirmationConsulta.id,
            confirmationConsulta.paciente_llego_timestamp
          )
          if (result.success) {
            toast.success(
              confirmationConsulta.paciente_llego_timestamp
                ? "Llegada desmarcada exitosamente"
                : "Llegada registrada exitosamente"
            )
          }
          break

        case "iniciar_consulta":
          result = await iniciarConsulta(confirmationConsulta.id)
          if (result.success) {
            toast.success("Consulta iniciada exitosamente")
            router.push(`/consultas/${confirmationConsulta.id}`)
          }
          break

        case "marcar_ausente":
          result = await marcarComoAusente(confirmationConsulta.id)
          if (result.success) {
            toast.success("Paciente marcado como ausente")
          }
          break

        case "cancelar_programada":
        case "cancelar_en_curso":
          result = await cancelarConsulta(confirmationConsulta.id, sendCancellationNotification)
          if (result.success) {
            toast.success("Consulta cancelada exitosamente")
          }
          break

        case "finalizar_consulta":
          result = await finalizarConsultaSimple(confirmationConsulta.id)
          if (result.success) {
            toast.success("Consulta finalizada exitosamente")
          }
          break

        default:
          result = { success: false, error: "Acción no reconocida" }
      }

      if (!result.success) {
        toast.error(result.error || "Error al procesar la acción")
      } else if (confirmationAction !== "iniciar_consulta") {
        // Re-fetch with current filters instead of router.refresh() which would
        // overwrite the user's active filter state with server defaults
        const f = filtersRef.current
        fetchData(
          f.currentPage, f.rowsPerPage, f.debouncedSearchTerm,
          f.selectedMedicos, f.selectedEstados, f.dateFilter,
          f.fechaDesde, f.fechaHasta, f.enConsultorio, f.sortBy
        )
      }
    } catch {
      toast.error("Error inesperado al procesar la acción")
    } finally {
      setIsProcessing(false)
      setConfirmationDialogOpen(false)
      setConfirmationAction(null)
      setConfirmationConsulta(null)
    }
  }

  // ============================================================================
  // Action Handlers (trigger confirmation dialogs)
  // ============================================================================

  const handleToggleLlegada = (row: Consulta) => {
    openConfirmationDialog("registrar_llegada", row)
  }

  const handleIniciarConsulta = (row: Consulta) => {
    openConfirmationDialog("iniciar_consulta", row)
  }

  const handleMarcarAusente = (row: Consulta) => {
    openConfirmationDialog("marcar_ausente", row)
  }

  const handleCancelarConsultaProgramada = (row: Consulta) => {
    openConfirmationDialog("cancelar_programada", row)
  }

  const handleFinalizarConsulta = (row: Consulta) => {
    openConfirmationDialog("finalizar_consulta", row)
  }

  const handleCancelarConsultaEnCurso = (row: Consulta) => {
    openConfirmationDialog("cancelar_en_curso", row)
  }

  // Handle transferir consulta - Opens separate dialog
  const handleTransferirConsulta = (row: Consulta) => {
    setConsultaToTransfer(row)
    setTransferDialogOpen(true)
  }

  // Handle reagendar consulta - Opens separate dialog
  const handleReagendarConsulta = (row: Consulta) => {
    setConsultaToReagendar(row)
    setReagendarDialogOpen(true)
  }

  // Get selected medico names for display
  const selectedMedicosText = useMemo(() => {
    if (selectedMedicos.length === 0) return "Médicos"

    // For recepcionista/administrador: show "Todos los médicos" when all are selected
    if (currentUserRole !== "medico" && selectedMedicos.length === medicos.length) {
      return "Todos los médicos"
    }

    if (selectedMedicos.length === 1) {
      // For medico role, show "Mis Consultas" when they select themselves
      if (currentUserRole === "medico" && selectedMedicos[0] === currentUserMedicoId) {
        return "Mis Consultas"
      }
      const medico = medicos.find((m) => m.id === selectedMedicos[0])
      return medico ? `${medico.nombre} ${medico.apellido}` : "Médicos"
    }
    return `${selectedMedicos.length} médicos`
  }, [selectedMedicos, medicos, currentUserRole, currentUserMedicoId])

  // Get selected estado names for display
  const selectedEstadosText = useMemo(() => {
    if (selectedEstados.length === 0) return "Estados"
    if (selectedEstados.length === estados.length) return "Todos los estados"
    if (selectedEstados.length === 1) {
      const estado = estados.find((e) => e.id === selectedEstados[0])
      return estado ? estado.nombre : "Estados"
    }
    return `${selectedEstados.length} estados`
  }, [selectedEstados, estados])

  // Helper function to calculate Estado Horario
  // Returns: type "none" (dash), "a_tiempo", "retraso" (clinic fault), or "llegada_tardia" (patient fault)
  const getEstadoHorario = (row: Consulta): { text: string; type: "none" | "a_tiempo" | "retraso" | "llegada_tardia" } => {
    // Only show for programada status with patient arrived
    if (row.estado_codigo !== "programada" || !row.paciente_llego_timestamp) {
      return { text: "—", type: "none" }
    }

    const now = new Date()
    const scheduledTime = new Date(row.fecha_hora)
    const arrivalTime = new Date(row.paciente_llego_timestamp)

    // Appointment time hasn't passed yet
    if (now <= scheduledTime) {
      return { text: "A tiempo", type: "a_tiempo" }
    }

    // Check if patient arrived late (patient's fault)
    if (arrivalTime > scheduledTime) {
      return { text: "Llegada tardía", type: "llegada_tardia" }
    }

    // Patient arrived on time or early, but appointment time has passed (clinic's fault)
    const diffMs = now.getTime() - scheduledTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return { text: `Retraso: ${diffMins}m`, type: "retraso" }
    } else {
      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return { text: `Retraso: ${hours}h ${mins}m`, type: "retraso" }
    }
  }

  // Define table columns
  const columns: DataTableColumn<Consulta>[] = [
    {
      header: "Paciente",
      accessorKey: "paciente_nombre",
      cell: (_, row) => (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/pacientes/${row.paciente_id}`}
                target="_blank"
                className="font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.paciente_apellido}, {row.paciente_nombre}
              </Link>
            </TooltipTrigger>
            <TooltipContent>Ir al perfil del paciente</TooltipContent>
          </Tooltip>
          <PatientInfoPopover
            paciente={{
              id: row.paciente_id,
              nombre: row.paciente_nombre,
              apellido: row.paciente_apellido,
              dni: row.paciente_dni,
              email: row.paciente_email,
              fecha_nacimiento: row.paciente_fecha_nacimiento,
              plan: row.paciente_plan,
              numero_afiliado: row.paciente_numero_afiliado,
              obra_social: row.paciente_obra_social,
            }}
          />
        </div>
      ),
      minWidth: "min-w-[180px]",
    },
    {
      header: "Estado",
      accessorKey: "estado_codigo",
      cell: (_, row) => (
        <Badge variant="outline" className={`border-transparent ${getEstadoColor(row.estado_codigo)}`}>
          {row.estado_nombre}
        </Badge>
      ),
      minWidth: "min-w-[100px]",
    },
    {
      header: "Médico",
      accessorKey: "medico_nombre",
      cell: (_, row) => `${row.medico_nombre} ${row.medico_apellido}`,
      minWidth: "min-w-[140px]",
    },
    {
      header: (
        <div className="flex items-center gap-1.5">
          <span>Tipo</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="space-y-1.5 p-3">
              {(Object.entries(TIPO_CONSULTA_BADGE) as [TipoConsulta, { letter: string; color: string }][]).map(([key, badge]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${badge.color}`}>
                    {badge.letter}
                  </span>
                  <span>{TIPO_CONSULTA_LABELS[key]}</span>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      accessorKey: "tipo_consulta",
      cell: (value) => {
        const badge = getTipoConsultaBadge(value as TipoConsulta | null)
        if (!badge) return <span className="text-muted-foreground">—</span>
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${badge.color}`}>
                {badge.letter}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {getTipoConsultaLabel(value as TipoConsulta | null)}
            </TooltipContent>
          </Tooltip>
        )
      },
      minWidth: "min-w-[60px]",
      className: "hidden xl:table-cell",
    },
    {
      header: "Motivo",
      accessorKey: "motivo",
      cell: (value) => {
        const text = value as string | null
        if (!text) return <span className="text-muted-foreground">—</span>
        const truncated = text.length > 30 ? `${text.slice(0, 30)}...` : text
        if (text.length <= 30) return <span className="text-sm">{text}</span>
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm cursor-default">{truncated}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="whitespace-pre-wrap">{text}</p>
            </TooltipContent>
          </Tooltip>
        )
      },
      minWidth: "min-w-[180px]",
      className: "hidden xl:table-cell",
    },
    {
      header: dateFilter === "hoy" ? "Hora" : "Fecha y Hora",
      accessorKey: "fecha_hora",
      cell: (value) => (
        <span className="whitespace-nowrap">
          {dateFilter === "hoy"
            ? formatTime(String(value))
            : `${formatDate(String(value))} ${formatTime(String(value))}`}
        </span>
      ),
      minWidth: dateFilter === "hoy" ? "min-w-[90px]" : "min-w-[170px]",
    },
    {
      header: (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span>Llegada</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Horario de arribo del paciente al consultorio</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      accessorKey: "paciente_llego_timestamp",
      cell: (_, row) => (
        <span className={row.paciente_llego_timestamp ? "font-medium" : "text-muted-foreground"}>
          {formatTime(row.paciente_llego_timestamp)}
        </span>
      ),
      minWidth: "min-w-[100px]",
    },
    {
      header: (
        <div className="flex items-center gap-1.5">
          <span>Estado Horario</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Indica si la consulta está en hora o cuánto tiempo de retraso lleva</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      accessorKey: "estado_id",
      cell: (_, row) => {
        const { text, type } = getEstadoHorario(row)
        // Yellow for clinic fault (retraso), gray for patient fault (llegada_tardia), muted for others
        const colorClass = type === "retraso"
          ? "text-amber-600 dark:text-amber-400 font-medium"
          : type === "llegada_tardia"
            ? "text-gray-500 dark:text-gray-400"
            : "text-muted-foreground"
        return (
          <span className={colorClass}>
            {text}
          </span>
        )
      },
      minWidth: "min-w-[150px]",
      className: "hidden xl:table-cell",
    },
  ]

  // Permission check helpers
  const isOwnerMedico = (row: Consulta) =>
    currentUserRole === "medico" && currentUserMedicoId === row.medico_id

  const canPerformEnCursoAction = (row: Consulta) =>
    currentUserRole === "administrador" || isOwnerMedico(row)

  // Define table actions
  const actions: DataTableAction<Consulta>[] = [
    // ============================
    // Programada actions
    // ============================

    // Registrar/Desmarcar llegada - Only for today's programada consultas
    {
      label: (row) =>
        row.paciente_llego_timestamp ? "Desmarcar llegada" : "Registrar llegada",
      onClick: handleToggleLlegada,
      show: (row) =>
        row.estado_codigo === "programada" && isSameDay(new Date(row.fecha_hora), new Date()),
    },
    // Iniciar consulta - Only for medico (owner) or admin
    {
      label: "Iniciar consulta",
      onClick: handleIniciarConsulta,
      show: (row) => {
        if (row.estado_codigo !== "programada") return false
        // Admin can iniciar any consulta
        if (currentUserRole === "administrador") return true
        // Medico can only iniciar their own consultas
        if (currentUserRole === "medico" && currentUserMedicoId === row.medico_id) return true
        return false
      },
    },
    // Reagendar consulta - All roles, only for programada consultas
    {
      label: "Reagendar consulta",
      onClick: handleReagendarConsulta,
      show: (row) => row.estado_codigo === "programada",
    },
    // Marcar como ausente - All roles, only for programada consultas
    {
      label: "Marcar como ausente",
      onClick: handleMarcarAusente,
      show: (row) => row.estado_codigo === "programada",
    },
    // Transferir consulta - All roles, only for programada consultas
    {
      label: "Transferir consulta",
      onClick: handleTransferirConsulta,
      show: (row) => row.estado_codigo === "programada",
    },
    // Cancelar consulta (programada) - All roles, only for programada consultas
    {
      label: "Cancelar consulta",
      onClick: handleCancelarConsultaProgramada,
      variant: "destructive",
      show: (row) => row.estado_codigo === "programada",
    },

    // ============================
    // En curso actions
    // ============================

    // Finalizar consulta - Only for medico (owner) or admin
    {
      label: "Finalizar consulta",
      onClick: handleFinalizarConsulta,
      show: (row) => row.estado_codigo === "en_curso" && canPerformEnCursoAction(row),
    },
    // Cancelar consulta (en_curso) - Only for medico (owner) or admin
    {
      label: "Cancelar consulta",
      onClick: handleCancelarConsultaEnCurso,
      variant: "destructive",
      show: (row) => row.estado_codigo === "en_curso" && canPerformEnCursoAction(row),
    },

  ]

  // Inline actions rendered as visible buttons (outside the dropdown menu)
  const inlineActionsList: DataTableInlineAction<Consulta>[] = [
    {
      label: "Ver",
      ariaLabel: (row) => `Ver consulta de ${row.paciente_apellido}, ${row.paciente_nombre}`,
      onClick: (row) => router.push(`/consultas/${row.id}`),
    },
  ]

  const dialogContent = getConfirmationDialogContent()

  // Helper to render empty state message
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <h3 className="mb-2 text-lg font-semibold">No hay consultas para los filtros seleccionados</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Intenta cambiar el período o los filtros, o crea una nueva consulta
      </p>
      <Button className="gap-2" onClick={() => setCrearConsultaOpen(true)}>
        <Plus className="h-4 w-4" />
        Crear Consulta
      </Button>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Consultas</h1>
          <p className="text-muted-foreground">Visualiza y gestiona las consultas programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="default"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar datos de consultas</p>
            </TooltipContent>
          </Tooltip>
          <Button className="gap-2" onClick={() => setCrearConsultaOpen(true)}>
            <Plus className="h-4 w-4" />
            Crear Consulta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Row 1: Period Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período</span>
          </div>
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <Button
              variant={dateFilter === "hoy" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleDateFilterChange("hoy")}
              className="rounded-md"
            >
              Hoy
            </Button>
            <Button
              variant={dateFilter === "semana" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleDateFilterChange("semana")}
              className="rounded-md"
            >
              Esta semana
            </Button>
            <Button
              variant={dateFilter === "rango" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleDateFilterChange("rango", fechaDesde, fechaHasta)}
              className="rounded-md"
            >
              Rango personalizado
            </Button>
          </div>

          {/* Date Range Inputs - Only visible when custom range selected */}
          {dateFilter === "rango" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 pl-4 sm:pl-6 border-l-2 border-muted-foreground/30">
                {/* Desde Date Picker */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="fecha-desde" className="text-sm font-medium text-muted-foreground min-w-[50px]">
                    Desde:
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="fecha-desde"
                        variant="outline"
                        className={cn(
                          "flex-1 sm:flex-none sm:w-[280px] justify-start text-left font-normal",
                          !fechaDesde && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaDesde}
                        onSelect={(date) => handleDateFilterChange("rango", date, fechaHasta)}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Hasta Date Picker */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="fecha-hasta" className="text-sm font-medium text-muted-foreground min-w-[50px]">
                    Hasta:
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="fecha-hasta"
                        variant="outline"
                        className={cn(
                          "flex-1 sm:flex-none sm:w-[280px] justify-start text-left font-normal",
                          !fechaHasta && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaHasta}
                        onSelect={(date) => handleDateFilterChange("rango", fechaDesde, date)}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Clear Dates Button */}
                {(fechaDesde || fechaHasta) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateFilterChange("rango", undefined, undefined)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Limpiar fechas
                  </Button>
                )}
              </div>

              {/* Validation Error */}
              {fechaDesde && fechaHasta && fechaHasta < fechaDesde && (
                <p className="text-sm text-destructive pl-4 sm:pl-6">
                  La fecha &quot;Hasta&quot; debe ser posterior a la fecha &quot;Desde&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Existing Filters + Sort Control */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Search Filter (DNI, Nombre, Apellido) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Buscar paciente</span>
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

          {/* Médicos Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Médico</span>
            </div>
            <Popover open={medicosOpen} onOpenChange={setMedicosOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-between">
                  <span className="truncate">{selectedMedicosText}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar médico..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron médicos</CommandEmpty>
                    {/* For medico role: show "Mis Consultas" + "Otros Médicos" with select-all */}
                    {currentUserRole === "medico" && currentUserMedicoId ? (
                      <CommandGroup>
                        {/* Mis Consultas - standalone item */}
                        <CommandItem
                          onSelect={() => toggleMedico(currentUserMedicoId)}
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMedicos.includes(currentUserMedicoId)}
                            className="mr-2"
                          />
                          Mis Consultas
                        </CommandItem>

                        {/* Otros Médicos - select all toggle */}
                        <CommandItem
                          onSelect={toggleOtrosMedicos}
                          className="cursor-pointer mt-2"
                        >
                          <Checkbox
                            checked={
                              otrosMedicosState === "all"
                                ? true
                                : otrosMedicosState === "some"
                                  ? "indeterminate"
                                  : false
                            }
                            className="mr-2"
                          />
                          Otros Médicos
                        </CommandItem>

                        {/* Individual médicos - indented */}
                        {otherMedicos.map((medico) => (
                          <CommandItem
                            key={medico.id}
                            onSelect={() => toggleMedico(medico.id)}
                            className="cursor-pointer pl-6"
                          >
                            <Checkbox
                              checked={selectedMedicos.includes(medico.id)}
                              className="mr-2"
                            />
                            {medico.nombre} {medico.apellido}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      /* For recepcionista/administrador: show "Todos" + individual médicos */
                      <CommandGroup>
                        {/* Todos - select all toggle */}
                        <CommandItem
                          onSelect={toggleTodosMedicos}
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={
                              todosMedicosState === "all"
                                ? true
                                : todosMedicosState === "some"
                                  ? "indeterminate"
                                  : false
                            }
                            className="mr-2"
                          />
                          Todos
                        </CommandItem>

                        {/* Individual médicos - indented */}
                        {medicos.map((medico) => (
                          <CommandItem
                            key={medico.id}
                            onSelect={() => toggleMedico(medico.id)}
                            className="cursor-pointer pl-6"
                          >
                            <Checkbox
                              checked={selectedMedicos.includes(medico.id)}
                              className="mr-2"
                            />
                            {medico.nombre} {medico.apellido}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Estados Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estado</span>
            </div>
            <Popover open={estadosOpen} onOpenChange={setEstadosOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-between">
                  <span className="truncate">{selectedEstadosText}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar estado..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron estados</CommandEmpty>
                    <CommandGroup>
                      {/* Todos - select all toggle */}
                      <CommandItem
                        onSelect={toggleTodosEstados}
                        className="cursor-pointer"
                      >
                        <Checkbox
                          checked={
                            todosEstadosState === "all"
                              ? true
                              : todosEstadosState === "some"
                                ? "indeterminate"
                                : false
                          }
                          className="mr-2"
                        />
                        Todos
                      </CommandItem>

                      {/* Individual estados - indented */}
                      {estados.map((estado) => (
                        <CommandItem
                          key={estado.id}
                          onSelect={() => toggleEstado(estado.id)}
                          className="cursor-pointer pl-6"
                        >
                          <Checkbox checked={selectedEstados.includes(estado.id)} className="mr-2" />
                          <Badge
                            variant="outline"
                            className={`border-transparent ${getEstadoColor(estado.codigo)}`}
                          >
                            {estado.nombre}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* En Consultorio Toggle - Only visible when "programada" is selected */}
          {isProgramadaSelected && (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
              <Switch
                id="en-consultorio"
                checked={enConsultorio}
                onCheckedChange={handleEnConsultorioChange}
              />
              <Label htmlFor="en-consultorio" className="text-sm cursor-pointer select-none whitespace-nowrap">
                Solo pacientes en consultorio
              </Label>
            </div>
          )}

          {/* Sort Control */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ordenar por</span>
            </div>
            <Select value={sortBy} onValueChange={(value) => handleSortChange(value as SortOption)}>
              <SelectTrigger className="w-[180px] sm:w-[400px]" aria-label="Ordenar consultas por">
                <SelectValue placeholder="Seleccionar orden" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}{" "}
                    <span className="text-muted-foreground hidden sm:inline">{option.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Legend: Yellow row indicator - only show when "programada" estado is selected */}
      {isProgramadaSelected && (
        <div className="flex items-center gap-2 px-4 py-2 mb-4 border-l-4 border-patient-arrived-border bg-patient-arrived rounded-md">
          <div className="h-3 w-3 bg-patient-arrived-sample border-2 border-patient-arrived-border rounded-sm shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Filas resaltadas:</span> Paciente en consultorio
          </p>
        </div>
      )}

      {/* Table with loading overlay OR empty state */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando...</span>
            </div>
          </div>
        )}
        {consultas.length === 0 ? (
          renderEmptyState()
        ) : (
          <DataTable
            columns={columns}
            data={sortedConsultas}
            actions={actions}
            inlineActions={inlineActionsList}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            totalPages={paginatedResult.totalPages}
            totalCount={paginatedResult.totalCount}
            rowClassName={(row) =>
              row.paciente_llego_timestamp && row.estado_codigo === "programada"
                ? "bg-patient-arrived"
                : ""
            }
          />
        )}
      </div>

      {/* Dialogs */}
      <CrearConsultaDialog
        open={crearConsultaOpen}
        onOpenChange={setCrearConsultaOpen}
        medicos={medicos}
      />

      {consultaToTransfer && (
        <TransferirConsultaDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          consultaId={consultaToTransfer.id}
          currentMedicoId={consultaToTransfer.medico_id}
          medicos={medicos}
        />
      )}

      {consultaToReagendar && (
        <ReagendarConsultaDialog
          open={reagendarDialogOpen}
          onOpenChange={setReagendarDialogOpen}
          consultaId={consultaToReagendar.id}
          medicoId={consultaToReagendar.medico_id}
          medicoNombre={consultaToReagendar.medico_nombre}
          medicoApellido={consultaToReagendar.medico_apellido}
          pacienteNombre={consultaToReagendar.paciente_nombre}
          pacienteApellido={consultaToReagendar.paciente_apellido}
          currentFechaHora={consultaToReagendar.fecha_hora}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {/* Notification checkbox for cancel actions */}
          {(confirmationAction === "cancelar_programada" || confirmationAction === "cancelar_en_curso") && (
            <div className="flex items-center space-x-2 py-4">
              <Checkbox
                id="send-notification-table"
                checked={sendCancellationNotification}
                onCheckedChange={(checked) => setSendCancellationNotification(checked === true)}
                disabled={isProcessing}
              />
              <Label
                htmlFor="send-notification-table"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Enviar notificación al paciente
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className={
                dialogContent.isDestructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isProcessing ? "Procesando..." : dialogContent.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
