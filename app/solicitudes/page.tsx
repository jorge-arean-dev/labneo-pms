export const dynamic = "force-dynamic"

export default function SolicitudesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes</h1>
        <p className="text-muted-foreground">
          Gestión de solicitudes de alta de odontólogos
        </p>
      </div>
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">
          Módulo de solicitudes — próximamente
        </p>
      </div>
    </div>
  )
}
