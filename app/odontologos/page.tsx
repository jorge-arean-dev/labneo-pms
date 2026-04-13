import { unstable_noStore as noStore } from "next/cache"
import { fetchOdontologos } from "./actions"
import { OdontologosTable } from "./components/odontologos-table"

export const dynamic = "force-dynamic"

export default async function Page() {
  noStore()

  const { data, error } = await fetchOdontologos()

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Odontólogos</h1>
        <p className="text-sm text-destructive">
          Error al cargar los odontólogos: {error}
        </p>
      </div>
    )
  }

  return <OdontologosTable initialOdontologos={data || []} />
}
