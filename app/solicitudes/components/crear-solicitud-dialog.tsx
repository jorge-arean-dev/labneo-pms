"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, ArrowLeft, ArrowRight, Package, Wrench, CalendarClock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { SchedulingCalendar } from "@/components/ui/scheduling-calendar"
import { SlotSelector } from "@/components/ui/slot-selector"
import { createSolicitud, fetchTarifarioForCurrentOdontologo } from "../actions"
import type { CreateSolicitudData } from "../actions"
import { ProtesisItemsSelector } from "./protesis-items-selector"
import {
  TIPOS_SOLICITUD,
  SUBTIPOS_SERVICIO,
  type TipoSolicitud,
  type SubtipoServicio,
  type SolicitudWithRelations,
  type OdontologoPerfilWithLocalidad,
  type ItemWithPrecio,
  type Moneda,
} from "@/lib/types/entities"
import {
  getMockSlotsForService,
  getMockWorkDaysForService,
  getMockBlockedDatesForService,
} from "@/lib/mocks/alquiler-slots"

// ============================================================================
// Props
// ============================================================================

interface CrearSolicitudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  odontologoPerfil: OdontologoPerfilWithLocalidad | null
  onSolicitudCreated?: (solicitud: SolicitudWithRelations) => void
}

// ============================================================================
// Component
// ============================================================================

export function CrearSolicitudDialog({
  open,
  onOpenChange,
  odontologoPerfil,
  onSolicitudCreated,
}: CrearSolicitudDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [tipoSolicitud, setTipoSolicitud] = useState<TipoSolicitud | null>(null)

  // Editable fields only
  const [subtipoServicio, setSubtipoServicio] = useState<SubtipoServicio | "">("")
  const [observaciones, setObservaciones] = useState("")

  // Alquiler slot picker state (MOCKED — see lib/mocks/alquiler-slots.ts)
  const [fechaSlot, setFechaSlot] = useState<Date | undefined>(undefined)
  const [horaSlot, setHoraSlot] = useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // Prótesis-specific state
  const [catalogItems, setCatalogItems] = useState<ItemWithPrecio[] | null>(null)
  const [catalogMoneda, setCatalogMoneda] = useState<Moneda | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Load catalog lazily when user picks Prótesis
  useEffect(() => {
    if (step === 2 && tipoSolicitud === "protesis" && catalogItems === null && !isLoadingCatalog) {
      setIsLoadingCatalog(true)
      fetchTarifarioForCurrentOdontologo()
        .then((res) => {
          if (res.error) {
            toast.error(res.error)
            setCatalogItems([])
            setCatalogMoneda(null)
          } else {
            setCatalogItems(res.items || [])
            setCatalogMoneda(res.tarifario?.moneda ?? null)
          }
        })
        .finally(() => setIsLoadingCatalog(false))
    }
  }, [step, tipoSolicitud, catalogItems, isLoadingCatalog])

  // Profile fields still required by the workflow even though they're no longer
  // rendered inline — the lab needs them to coordinate the rental.
  const telefonoDisplay = odontologoPerfil?.telefono || null
  const direccionDisplay = odontologoPerfil?.direccion_consultorio || null

  // Derived scheduling data for the alquiler flow (MOCKED).
  const workDays = useMemo(
    () => (subtipoServicio ? getMockWorkDaysForService(subtipoServicio) : []),
    [subtipoServicio],
  )
  const blockedDates = useMemo(
    () => (subtipoServicio ? getMockBlockedDatesForService(subtipoServicio) : []),
    [subtipoServicio],
  )
  const slots = useMemo(
    () =>
      subtipoServicio && fechaSlot
        ? getMockSlotsForService(subtipoServicio, fechaSlot)
        : [],
    [subtipoServicio, fechaSlot],
  )

  // Reset date + slot whenever the service changes so the new availability
  // pattern is reflected cleanly.
  useEffect(() => {
    setFechaSlot(undefined)
    setHoraSlot(null)
  }, [subtipoServicio])

  // Fake a short loading state when the date changes so the skeleton shows.
  // Replace with real async fetch when the backend exists. The bail-out branch
  // MUST clear isLoadingSlots — otherwise a service change with a date already
  // picked leaves the skeleton stuck (the reset effect above clears fechaSlot
  // in the same render cycle where this effect still sees the stale date in
  // its closure and kicks off a timer that then gets cancelled).
  useEffect(() => {
    if (!subtipoServicio || !fechaSlot) {
      setIsLoadingSlots(false)
      return
    }
    setIsLoadingSlots(true)
    setHoraSlot(null)
    const id = setTimeout(() => setIsLoadingSlots(false), 350)
    return () => clearTimeout(id)
  }, [subtipoServicio, fechaSlot])

  const resetForm = () => {
    setStep(1)
    setTipoSolicitud(null)
    setSubtipoServicio("")
    setFechaSlot(undefined)
    setHoraSlot(null)
    setIsLoadingSlots(false)
    setObservaciones("")
    setCatalogItems(null)
    setCatalogMoneda(null)
    setQuantities({})
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

  const selectedItemsCount = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  const validateStep2 = (): string | null => {
    if (!telefonoDisplay) {
      return "Falta tu teléfono. Completá tu perfil en Configuración antes de continuar."
    }

    if (tipoSolicitud === "protesis") {
      if (selectedItemsCount === 0) {
        return "Seleccioná al menos un ítem antes de enviar la solicitud"
      }
    }

    if (tipoSolicitud === "alquiler_equipos") {
      if (!subtipoServicio) return "Seleccioná el tipo de servicio"
      if (!direccionDisplay) {
        return "Falta la dirección del consultorio en tu perfil. Completala en Configuración."
      }
      if (!fechaSlot || !horaSlot) return "Seleccioná una fecha y un horario"
    }

    return null
  }

  // Compose the alquiler fecha_propuesta from the calendar date + slot hour.
  const buildFechaPropuesta = (): string | null => {
    if (!fechaSlot || !horaSlot) return null
    const [hh, mm] = horaSlot.split(":").map(Number)
    const dt = new Date(fechaSlot)
    dt.setHours(hh, mm, 0, 0)
    return dt.toISOString()
  }

  const handleSubmit = async () => {
    if (!tipoSolicitud) return

    const validationError = validateStep2()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsLoading(true)

    const itemsPayload =
      tipoSolicitud === "protesis"
        ? Object.entries(quantities)
            .filter(([, qty]) => qty > 0)
            .map(([item_id, cantidad]) => ({ item_id, cantidad }))
        : undefined

    const payload: CreateSolicitudData = {
      tipo_solicitud: tipoSolicitud,
      subtipo_servicio:
        tipoSolicitud === "alquiler_equipos" ? (subtipoServicio as SubtipoServicio) : null,
      fecha_propuesta:
        tipoSolicitud === "alquiler_equipos" ? buildFechaPropuesta() : null,
      observaciones: observaciones || null,
      items: itemsPayload,
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
            {/* Items selector */}
            {isLoadingCatalog || catalogItems === null ? (
              <Card className="border-dashed bg-muted/30">
                <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Cargando catálogo de ítems...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ProtesisItemsSelector
                items={catalogItems}
                moneda={catalogMoneda}
                quantities={quantities}
                onQuantitiesChange={setQuantities}
                noTarifario={catalogMoneda === null}
              />
            )}

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
            {/* Tipo de servicio — drives the calendar below */}
            <div className="space-y-2">
              <Label htmlFor="subtipo-servicio">
                Tipo de servicio <span className="text-destructive">*</span>
              </Label>
              <Select
                value={subtipoServicio}
                onValueChange={(v) => setSubtipoServicio(v as SubtipoServicio)}
              >
                <SelectTrigger id="subtipo-servicio">
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

            {/* Empty state before a service is picked */}
            {!subtipoServicio && (
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-14 text-center dark:bg-muted/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/15">
                  <CalendarClock
                    className="h-8 w-8 text-primary/60 dark:text-primary/70"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Elegí un servicio para continuar
                </p>
                <p className="max-w-[320px] text-sm leading-relaxed text-muted-foreground">
                  Seleccioná &ldquo;Escáner Intraoral&rdquo; o &ldquo;Fotogrametría&rdquo; en el campo
                  de arriba para ver los días y horarios disponibles para tu solicitud.
                </p>
              </div>
            )}

            {/* Calendar + slot picker — visible once a service is picked */}
            {subtipoServicio && (
              <section
                key={subtipoServicio}
                aria-label="Selección de fecha y horario"
                className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
              >
                <Card className="md:h-[420px]">
                  <CardContent className="flex h-full flex-col p-4">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      Seleccioná una fecha{" "}
                      <span className="text-destructive">*</span>
                    </h4>
                    <SchedulingCalendar
                      selectedDate={fechaSlot}
                      onSelectDate={(date) => setFechaSlot(date)}
                      workDays={workDays}
                      blockedDates={blockedDates}
                    />
                  </CardContent>
                </Card>

                <Card className="md:h-[420px]">
                  <CardContent className="flex h-full flex-col p-4">
                    <div className="mb-3 border-b pb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Horarios disponibles
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fechaSlot
                          ? format(fechaSlot, "EEEE d 'de' MMMM", { locale: es })
                          : "Seleccioná un día en el calendario"}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col overflow-y-auto">
                      <SlotSelector
                        slots={slots}
                        selectedTime={horaSlot}
                        onSelectTime={setHoraSlot}
                        isLoading={isLoadingSlots}
                        hasDate={Boolean(fechaSlot)}
                        serviceLabel={SUBTIPOS_SERVICIO[subtipoServicio]}
                      />
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregá cualquier detalle adicional..."
                rows={2}
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
              <Button
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  (tipoSolicitud === "alquiler_equipos" &&
                    (!subtipoServicio || !fechaSlot || !horaSlot))
                }
              >
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
