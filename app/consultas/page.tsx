import { fetchConsultasPaginated, fetchMedicos, fetchEstados } from "./actions"
import { ConsultasTable } from "./components/consultas-table"
import { createClient } from "@/lib/supabase/server"
import { SortOption } from "./types"

export const dynamic = 'force-dynamic'

const VALID_SORT_OPTIONS: SortOption[] = ["fecha_hora_desc", "fecha_hora_asc", "llegada_desc", "llegada_asc"]

export default async function ConsultasPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const params = await searchParams
  const sortBy = VALID_SORT_OPTIONS.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : undefined
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No autenticado</h2>
          <p className="text-sm text-muted-foreground">Debes iniciar sesión para ver consultas</p>
        </div>
      </div>
    )
  }

  // Get user role
  const { data: userData } = await supabase
    .from("usuarios_pms")
    .select("rol_id, roles!inner(nombre)")
    .eq("id", user.id)
    .single()

  const roles = userData?.roles as unknown as { nombre: string } | { nombre: string }[]
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre

  // Convert role name to lowercase to match TypeScript types
  const role = roleName?.toLowerCase() as "administrador" | "medico" | "recepcionista"

  if (!role) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error de permisos</h2>
          <p className="text-sm text-muted-foreground">No se pudo determinar tu rol de usuario</p>
        </div>
      </div>
    )
  }

  // Get medico_id if user is a medico
  let medicoId: string | null = null
  if (role === "medico") {
    const { data: medicoData } = await supabase
      .from("medicos")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single()

    medicoId = medicoData?.id || null
  }

  // Fetch medicos and estados first to determine initial filters
  const [medicosResult, estadosResult] = await Promise.all([
    fetchMedicos(),
    fetchEstados(),
  ])

  // Handle errors
  if (medicosResult.error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error al cargar médicos</h2>
          <p className="text-sm text-muted-foreground">{medicosResult.error}</p>
        </div>
      </div>
    )
  }

  if (estadosResult.error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error al cargar estados</h2>
          <p className="text-sm text-muted-foreground">{estadosResult.error}</p>
        </div>
      </div>
    )
  }

  const medicos = medicosResult.data || []
  const estados = estadosResult.data || []

  // Calculate initial filters based on role
  const initialMedicosFilter = role === "medico" && medicoId
    ? [medicoId]
    : medicos.map(m => m.id)

  // Default to "programada" estado
  const programadaEstado = estados.find(e => e.codigo === "programada")
  const initialEstadosFilter = programadaEstado ? [programadaEstado.id] : []

  // Fetch initial page of consultas with filters (default: today, programada)
  const paginatedResult = await fetchConsultasPaginated(1, 10, {
    medicosIds: initialMedicosFilter,
    estadosIds: initialEstadosFilter,
    dateFilter: "hoy",
    sortBy,
  })

  if (paginatedResult.error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Error al cargar consultas</h2>
          <p className="text-sm text-muted-foreground">{paginatedResult.error}</p>
        </div>
      </div>
    )
  }

  // Pass data to client component
  return (
    <ConsultasTable
      initialData={paginatedResult.data!}
      medicos={medicos}
      estados={estados}
      currentUserRole={role}
      currentUserMedicoId={medicoId}
      initialMedicosFilter={initialMedicosFilter}
      initialEstadosFilter={initialEstadosFilter}
    />
  )
}
