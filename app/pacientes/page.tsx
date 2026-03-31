import { fetchPacientesPaginated, fetchObrasSociales } from "./actions"
import { PacientesTable } from "./components/pacientes-table"

export const dynamic = 'force-dynamic'

export default async function PacientesPage() {
  // Fetch initial page of patients and obras sociales on server
  const [paginatedResult, obrasSocialesResult] = await Promise.all([
    fetchPacientesPaginated(1, 10, {}),
    fetchObrasSociales(),
  ])

  if (paginatedResult.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error al cargar pacientes</h2>
          <p className="text-muted-foreground">{paginatedResult.error}</p>
        </div>
      </div>
    )
  }

  if (obrasSocialesResult.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error al cargar obras sociales</h2>
          <p className="text-muted-foreground">{obrasSocialesResult.error}</p>
        </div>
      </div>
    )
  }

  return (
    <PacientesTable
      initialData={paginatedResult.data!}
      obrasSociales={obrasSocialesResult.data || []}
    />
  )
}
