import { fetchObrasSociales } from "./actions"
import { ObrasSocialesCards } from "./components/obras-sociales-cards"

export const dynamic = 'force-dynamic'

export default async function ObrasSocialesPage() {
  const { data, error } = await fetchObrasSociales()

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Error al cargar las obras sociales</h2>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <ObrasSocialesCards initialObrasSociales={data || []} />
    </div>
  )
}
