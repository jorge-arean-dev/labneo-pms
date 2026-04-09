"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSolicitud, fetchTarifarioWithItems } from "../actions"
// TODO: Phase 3 — this entire dialog will be replaced with multistep form
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Solicitud = any

// Temporary stub — this entire dialog will be replaced with a multistep form in Phase 3
const TIPOS_SERVICIO = [
  "Prótesis",
  "Alquiler de equipos",
] as const

interface CrearSolicitudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile: { nombre: string; apellido: string; email: string } | null
  localidades: { id: string; localidad: string; tarifario_id: string }[]
  onSolicitudCreated?: (solicitud: Solicitud) => void
}

interface TarifarioData {
  id: string
  nombre: string
  moneda: string
  tarifarios_items: {
    id: string
    servicio: string
    precio: number
    descripcion: string | null
    is_active: boolean
    orden: number
  }[]
}

export function CrearSolicitudDialog({
  open,
  onOpenChange,
  userProfile,
  localidades,
  onSolicitudCreated,
}: CrearSolicitudDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [telefono, setTelefono] = useState("")
  const [horariosAtencion, setHorariosAtencion] = useState("")
  const [cuitIva, setCuitIva] = useState("")
  const [email, setEmail] = useState("")
  const [tipoServicio, setTipoServicio] = useState<string[]>([])

  // Tarifario display
  const [tarifario, setTarifario] = useState<TarifarioData | null>(null)
  const [loadingTarifario, setLoadingTarifario] = useState(false)

  // Pre-fill from user profile when dialog opens
  useEffect(() => {
    if (open && userProfile) {
      setNombre(userProfile.nombre)
      setApellido(userProfile.apellido)
      setEmail(userProfile.email)
    }
  }, [open, userProfile])

  // Fetch tarifario when localidad changes
  useEffect(() => {
    if (!localidad) {
      setTarifario(null)
      return
    }

    const loc = localidades.find((l) => l.localidad === localidad)
    if (!loc) {
      setTarifario(null)
      return
    }

    setLoadingTarifario(true)
    fetchTarifarioWithItems(loc.tarifario_id).then((result) => {
      if (result.data) {
        setTarifario(result.data as TarifarioData)
      } else {
        setTarifario(null)
      }
      setLoadingTarifario(false)
    })
  }, [localidad, localidades])

  const resetForm = () => {
    setNombre(userProfile?.nombre || "")
    setApellido(userProfile?.apellido || "")
    setEmail(userProfile?.email || "")
    setLocalidad("")
    setTelefono("")
    setHorariosAtencion("")
    setCuitIva("")
    setTipoServicio([])
    setTarifario(null)
  }

  const handleSubmit = async () => {
    // Validation
    if (!nombre || !apellido || !localidad || !telefono || !horariosAtencion || !cuitIva || !email) {
      toast.error("Completá todos los campos obligatorios")
      return
    }

    setIsLoading(true)

    const result = await createSolicitud({
      nombre,
      apellido,
      localidad,
      telefono,
      horarios_atencion: horariosAtencion,
      cuit_iva: cuitIva,
      email,
      tipo_servicio: tipoServicio.length > 0 ? tipoServicio : null,
    })

    if (result.success && result.data) {
      if (onSolicitudCreated) {
        onSolicitudCreated(result.data)
      }
      toast.success("Solicitud enviada exitosamente")
      onOpenChange(false)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || "Error al enviar la solicitud")
    }

    setIsLoading(false)
  }

  const toggleServicio = (servicio: string) => {
    setTipoServicio((prev) =>
      prev.includes(servicio)
        ? prev.filter((s) => s !== servicio)
        : [...prev, servicio]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Servicio</DialogTitle>
          <DialogDescription>
            Completá tus datos para solicitar un servicio del laboratorio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sol-nombre">Nombre *</Label>
              <Input
                id="sol-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sol-apellido">Apellido *</Label>
              <Input
                id="sol-apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Pérez"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="sol-email">Email *</Label>
            <Input
              id="sol-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@consultorio.com"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="sol-telefono">Teléfono *</Label>
            <Input
              id="sol-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="(011) 1234-5678"
            />
          </div>

          {/* Localidad */}
          <div className="space-y-2">
            <Label>Localidad *</Label>
            {localidades.length > 0 ? (
              <Select value={localidad} onValueChange={setLocalidad}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná tu localidad" />
                </SelectTrigger>
                <SelectContent>
                  {localidades.map((l) => (
                    <SelectItem key={l.id} value={l.localidad}>
                      {l.localidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Ingresá tu localidad"
              />
            )}
          </div>

          {/* Tarifario display */}
          {loadingTarifario && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando tarifario...
            </div>
          )}
          {tarifario && !loadingTarifario && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {tarifario.nombre} ({tarifario.moneda})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tarifario.tarifarios_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay ítems cargados en este tarifario.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {tarifario.tarifarios_items
                      .filter((item) => item.is_active)
                      .sort((a, b) => a.orden - b.orden)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{item.servicio}</span>
                          <span className="font-medium">
                            {tarifario.moneda === "USD" ? "US$" : "$"}{" "}
                            {item.precio.toLocaleString("es-AR")}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Horarios de atención */}
          <div className="space-y-2">
            <Label htmlFor="sol-horarios">Días y horarios de atención *</Label>
            <Input
              id="sol-horarios"
              value={horariosAtencion}
              onChange={(e) => setHorariosAtencion(e.target.value)}
              placeholder="Lunes a Viernes de 9 a 18hs"
            />
          </div>

          {/* CUIT e IVA */}
          <div className="space-y-2">
            <Label htmlFor="sol-cuit">CUIT y situación frente al IVA *</Label>
            <Input
              id="sol-cuit"
              value={cuitIva}
              onChange={(e) => setCuitIva(e.target.value)}
              placeholder="20-12345678-9 / Responsable Inscripto"
            />
          </div>

          {/* Tipo de servicio */}
          <div className="space-y-3">
            <Label>Tipo de servicio (opcional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIPOS_SERVICIO.map((servicio) => (
                <div key={servicio} className="flex items-center space-x-2">
                  <Checkbox
                    id={`servicio-${servicio}`}
                    checked={tipoServicio.includes(servicio)}
                    onCheckedChange={() => toggleServicio(servicio)}
                  />
                  <Label
                    htmlFor={`servicio-${servicio}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {servicio}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Solicitud"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
