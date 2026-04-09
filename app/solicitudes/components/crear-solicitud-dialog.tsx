"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, ArrowLeft, ArrowRight, Package, Wrench, Info, Lock } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createSolicitud } from "../actions"
import type { CreateSolicitudData } from "../actions"
import {
  TIPOS_SOLICITUD,
  SUBTIPOS_SERVICIO,
  type TipoSolicitud,
  type SubtipoServicio,
  type SolicitudWithRelations,
  type OdontologoPerfilWithLocalidad,
} from "@/lib/types/entities"

// ============================================================================
// Props
// ============================================================================

interface CrearSolicitudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile: { id: string; nombre: string; apellido: string; email: string }
  odontologoPerfil: OdontologoPerfilWithLocalidad | null
  onSolicitudCreated?: (solicitud: SolicitudWithRelations) => void
}

// ============================================================================
// Helpers
// ============================================================================

const TOOLTIP_TEXT = "Editá esta información desde Configuración"

/**
 * Renders a read-only field with a tooltip explaining where to edit it.
 */
function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 cursor-help">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Lock className="h-3 w-3 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">{value || "—"}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{TOOLTIP_TEXT}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Component
// ============================================================================

export function CrearSolicitudDialog({
  open,
  onOpenChange,
  userProfile,
  odontologoPerfil,
  onSolicitudCreated,
}: CrearSolicitudDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [tipoSolicitud, setTipoSolicitud] = useState<TipoSolicitud | null>(null)

  // Editable fields only
  const [subtipoServicio, setSubtipoServicio] = useState<SubtipoServicio | "">("")
  const [fechaPropuesta, setFechaPropuesta] = useState("")
  const [observaciones, setObservaciones] = useState("")

  // Resolve display values for read-only fields
  const localidadDisplay = odontologoPerfil?.localidades?.nombre_display || null
  const telefonoDisplay = odontologoPerfil?.telefono || null
  const cuitDisplay = odontologoPerfil?.cuit || null
  const situacionIvaDisplay = odontologoPerfil?.situacion_iva || null
  const direccionDisplay = odontologoPerfil?.direccion_consultorio || null

  const resetForm = () => {
    setStep(1)
    setTipoSolicitud(null)
    setSubtipoServicio("")
    setFechaPropuesta("")
    setObservaciones("")
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) resetForm()
    onOpenChange(newOpen)
  }

  const handleTipoSelect = (tipo: TipoSolicitud) => {
    setTipoSolicitud(tipo)
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  const validateStep2 = (): string | null => {
    if (!telefonoDisplay) {
      return "Falta tu teléfono. Completá tu perfil en Configuración antes de continuar."
    }

    if (tipoSolicitud === "alquiler_equipos") {
      if (!subtipoServicio) return "Seleccioná el tipo de servicio"
      if (!direccionDisplay) {
        return "Falta la dirección del consultorio en tu perfil. Completala en Configuración."
      }
      if (!fechaPropuesta) return "Seleccioná la fecha propuesta"
    }

    return null
  }

  const handleSubmit = async () => {
    if (!tipoSolicitud) return

    const validationError = validateStep2()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsLoading(true)

    const payload: CreateSolicitudData = {
      tipo_solicitud: tipoSolicitud,
      subtipo_servicio:
        tipoSolicitud === "alquiler_equipos" ? (subtipoServicio as SubtipoServicio) : null,
      fecha_propuesta: tipoSolicitud === "alquiler_equipos" ? fechaPropuesta : null,
      observaciones: observaciones || null,
    }

    const result = await createSolicitud(payload)

    if (result.success && result.data) {
      if (onSolicitudCreated) onSolicitudCreated(result.data)
      toast.success("Solicitud enviada exitosamente")
      handleClose(false)
      router.refresh()
    } else {
      toast.error(result.error || "Error al enviar la solicitud")
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Seleccioná el tipo de solicitud que querés crear"
              : `Completá los datos para tu solicitud de ${tipoSolicitud ? TIPOS_SOLICITUD[tipoSolicitud] : ""}`}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator — centered */}
        <div className="flex justify-center py-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}
            >
              1
            </div>
            <div className="h-px w-10 bg-border" />
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              2
            </div>
          </div>
        </div>

        {/* STEP 1: Tipo selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <Card
              className="cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              onClick={() => handleTipoSelect("protesis")}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Prótesis</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicitud de prótesis dental
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              onClick={() => handleTipoSelect("alquiler_equipos")}
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Alquiler de equipos</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escáner Intraoral o Fotogrametría
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2 — Prótesis */}
        {step === 2 && tipoSolicitud === "protesis" && (
          <div className="space-y-4 py-2">
            {/* Tariff placeholder */}
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <Package className="h-8 w-8 text-muted-foreground/60" />
                <h3 className="font-semibold text-sm">Selección de productos</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Próximamente vas a poder elegir los productos del tarifario y sus cantidades
                  desde acá.
                </p>
              </CardContent>
            </Card>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales sobre tu solicitud de prótesis..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* STEP 2 — Alquiler de equipos */}
        {step === 2 && tipoSolicitud === "alquiler_equipos" && (
          <div className="space-y-4 py-2">
            {/* Read-only profile fields */}
            <Card className="bg-muted/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Datos de tu perfil (solo lectura)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadOnlyField label="Nombre" value={userProfile.nombre} />
                  <ReadOnlyField label="Apellido" value={userProfile.apellido} />
                  <ReadOnlyField label="Email" value={userProfile.email} />
                  <ReadOnlyField label="Teléfono" value={telefonoDisplay} />
                  <ReadOnlyField label="Localidad" value={localidadDisplay} />
                  <ReadOnlyField label="CUIT" value={cuitDisplay} />
                  <div className="sm:col-span-2">
                    <ReadOnlyField
                      label="Dirección del consultorio"
                      value={direccionDisplay}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ReadOnlyField
                      label="Situación frente al IVA"
                      value={situacionIvaDisplay}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Editá esta información desde{" "}
                  <Link
                    href="/configuracion"
                    className="underline hover:text-foreground"
                  >
                    Configuración
                  </Link>
                </p>
              </CardContent>
            </Card>

            {/* Horarios message */}
            <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Utilizaremos los horarios configurados en tu perfil para coordinar
                  esta solicitud de alquiler de equipos. Revisalos en{" "}
                  <Link
                    href="/configuracion"
                    className="underline hover:no-underline font-medium"
                  >
                    Configuración
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            {/* Editable fields */}
            <div className="space-y-2">
              <Label>
                Tipo de servicio <span className="text-destructive">*</span>
              </Label>
              <Select
                value={subtipoServicio}
                onValueChange={(v) => setSubtipoServicio(v as SubtipoServicio)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná el servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escaner_intraoral">
                    {SUBTIPOS_SERVICIO.escaner_intraoral}
                  </SelectItem>
                  <SelectItem value="fotogrametria">
                    {SUBTIPOS_SERVICIO.fotogrametria}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha">
                Fecha propuesta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fecha"
                type="datetime-local"
                value={fechaPropuesta}
                onChange={(e) => setFechaPropuesta(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregá cualquier detalle adicional..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Solicitud
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
