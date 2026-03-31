"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, CalendarDays, Users, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { formatTime, formatDate } from "@/lib/utils/date-format"
import type { RecepcionistaDashboardData, RecepcionistaDashboardConsulta, DashboardPaciente } from "../actions"

interface RecepcionistaDashboardProps {
  data: RecepcionistaDashboardData
  userName: string
}

/**
 * Empty state component for when no data is available
 */
function EmptyState({ message, icon: Icon }: { message: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/**
 * Médico badge component for displaying doctor name
 */
function MedicoBadge({ apellido }: { apellido: string }) {
  return (
    <Badge
      variant="outline"
      className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-transparent text-xs shrink-0"
    >
      Dr. {apellido}
    </Badge>
  )
}

/**
 * Estado horario result type
 */
type EstadoHorarioResult =
  | { type: "none" }  // No badge (patient hasn't arrived or time hasn't passed)
  | { type: "retraso"; minutos: number }  // Clinic fault - patient arrived on time but waiting
  | { type: "llegada_tardia" }  // Patient fault - patient arrived late

/**
 * Calculate the estado horario for a consulta
 * - "retraso" (clinic fault): patient arrived on time/early, but appointment time has passed
 * - "llegada_tardia" (patient fault): patient arrived late
 * - "none": patient hasn't arrived or appointment time hasn't passed yet
 */
function getEstadoHorario(fechaHora: string, pacienteLlegoTimestamp: string | null): EstadoHorarioResult {
  // No badge if patient hasn't arrived
  if (!pacienteLlegoTimestamp) return { type: "none" }

  const appointmentTime = new Date(fechaHora)
  const arrivalTime = new Date(pacienteLlegoTimestamp)
  const currentTime = new Date()

  // No badge if appointment time hasn't passed yet
  if (currentTime <= appointmentTime) return { type: "none" }

  // Check if patient arrived late (patient's fault)
  if (arrivalTime > appointmentTime) {
    return { type: "llegada_tardia" }
  }

  // Patient arrived on time or early, but appointment time has passed (clinic's fault)
  const delayMs = currentTime.getTime() - appointmentTime.getTime()
  const delayMinutes = Math.floor(delayMs / (1000 * 60))
  return { type: "retraso", minutos: delayMinutes }
}

/**
 * Format delay time as string (e.g., "15m" or "1h 15m")
 */
function formatDelayTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

/**
 * Retraso badge component for displaying delay time (clinic fault - yellow)
 */
function RetrasoBadge({ minutos }: { minutos: number }) {
  return (
    <Badge
      variant="outline"
      className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-transparent text-xs shrink-0 gap-1"
    >
      <Clock className="h-3 w-3" />
      Retraso: {formatDelayTime(minutos)}
    </Badge>
  )
}

/**
 * Llegada tardía badge component (patient fault - gray)
 */
function LlegadaTardiaBadge() {
  return (
    <Badge
      variant="outline"
      className="bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-transparent text-xs shrink-0 gap-1"
    >
      <Clock className="h-3 w-3" />
      Llegada tardía
    </Badge>
  )
}

/**
 * Consulta row component for today's appointments (includes médico badge)
 * The tick parameter forces re-render to update delay time
 */
function ConsultaHoyRow({ consulta, tick }: { consulta: RecepcionistaDashboardConsulta; tick: number }) {
  // Calculate estado horario (tick dependency ensures recalculation every 60s)
  const estadoHorario = getEstadoHorario(consulta.fecha_hora, consulta.paciente_llego_timestamp)
  // Suppress unused variable warning - tick is used to force re-render
  void tick

  return (
    <div className="group flex items-center gap-4 border-b last:border-b-0 py-3 px-2 -mx-2 rounded-sm">
      <span className="font-medium text-sm w-16 shrink-0">{formatTime(consulta.fecha_hora)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {consulta.paciente_apellido}, {consulta.paciente_nombre}
        </p>
        <p className="text-xs text-muted-foreground">DNI: {consulta.paciente_dni}</p>
      </div>
      {estadoHorario.type === "retraso" && <RetrasoBadge minutos={estadoHorario.minutos} />}
      {estadoHorario.type === "llegada_tardia" && <LlegadaTardiaBadge />}
      <MedicoBadge apellido={consulta.medico_apellido} />
      {/* Desktop: Button with label */}
      <Button variant="ghost" size="sm" className="hidden md:inline-flex shrink-0 gap-1.5" asChild>
        <Link href={`/consultas/${consulta.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span>Ir a consulta</span>
        </Link>
      </Button>
      {/* Mobile: Icon only */}
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" asChild>
        <Link href={`/consultas/${consulta.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">Ver consulta (se abre en nueva pestaña)</span>
        </Link>
      </Button>
    </div>
  )
}

/**
 * Consulta row component for next 7 days (includes date and médico badge)
 */
function ConsultaProximaRow({ consulta }: { consulta: RecepcionistaDashboardConsulta }) {
  // Get day of week abbreviation
  const date = new Date(consulta.fecha_hora)
  const dayOfWeek = date.toLocaleDateString("es-AR", { weekday: "short" })
  const formattedDate = formatDate(consulta.fecha_hora)
  // Remove the year from the date for a shorter display (e.g., "27/11" instead of "27/11/2025")
  const shortDate = formattedDate.split("/").slice(0, 2).join("/")

  return (
    <div className="group flex items-center gap-4 border-b last:border-b-0 py-3 px-2 -mx-2 rounded-sm">
      <div className="w-20 shrink-0 text-sm">
        <span className="capitalize">{dayOfWeek}</span>{" "}
        <span className="text-muted-foreground">{shortDate}</span>
      </div>
      <span className="font-medium text-sm w-16 shrink-0">{formatTime(consulta.fecha_hora)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {consulta.paciente_apellido}, {consulta.paciente_nombre}
        </p>
        <p className="text-xs text-muted-foreground">DNI: {consulta.paciente_dni}</p>
      </div>
      <MedicoBadge apellido={consulta.medico_apellido} />
      {/* Desktop: Button with label */}
      <Button variant="ghost" size="sm" className="hidden md:inline-flex shrink-0 gap-1.5" asChild>
        <Link href={`/consultas/${consulta.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span>Ir a consulta</span>
        </Link>
      </Button>
      {/* Mobile: Icon only */}
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" asChild>
        <Link href={`/consultas/${consulta.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">Ver consulta (se abre en nueva pestaña)</span>
        </Link>
      </Button>
    </div>
  )
}

/**
 * Paciente row component for recent patients
 */
function PacienteRecienteRow({ paciente }: { paciente: DashboardPaciente }) {
  return (
    <div className="group flex items-center gap-4 border-b last:border-b-0 py-3 px-2 -mx-2 rounded-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {paciente.apellido}, {paciente.nombre}
        </p>
        <p className="text-xs text-muted-foreground">DNI: {paciente.dni}</p>
        <p className="text-xs text-muted-foreground">{paciente.obra_social_nombre || "Sin obra social"}</p>
      </div>
      {/* Desktop: Button with label */}
      <Button variant="ghost" size="sm" className="hidden md:inline-flex shrink-0 gap-1.5" asChild>
        <Link href={`/pacientes/${paciente.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span>Ir a paciente</span>
        </Link>
      </Button>
      {/* Mobile: Icon only */}
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" asChild>
        <Link href={`/pacientes/${paciente.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">Ver paciente (se abre en nueva pestaña)</span>
        </Link>
      </Button>
    </div>
  )
}

export function RecepcionistaDashboard({ data, userName }: RecepcionistaDashboardProps) {
  const router = useRouter()

  // Local state for dashboard data - allows real-time updates without full page refresh
  const [dashboardData, setDashboardData] = useState<RecepcionistaDashboardData>(data)

  // Tick state for auto-updating delay times every 60 seconds
  const [tick, setTick] = useState(0)

  // Destructure from local state for reactivity
  const { pacientesEnEspera, consultasHoy, consultasProximos7Dias, pacientesRecientes } = dashboardData

  // Sync local state when data prop changes (e.g., after router.refresh())
  useEffect(() => {
    setDashboardData(data)
  }, [data])

  // Auto-update delay times every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  // Real-time subscription for consultas updates
  // Recepcionista listens to ALL consultas (no medico_id filter)
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    console.log("[Recepcionista Dashboard Realtime] Setting up subscription")

    // Set up subscription with proper auth
    const setupSubscription = async () => {
      // Ensure realtime is authenticated with the user's session BEFORE subscribing
      const { data: { session } } = await supabase.auth.getSession()
      console.log("[Recepcionista Dashboard Realtime] Session exists:", !!session)
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
        console.log("[Recepcionista Dashboard Realtime] Set realtime auth token")
      }

      // Use unique channel name to avoid conflicts with other realtime subscriptions
      const channelName = `recepcionista-dashboard-consultas-${Date.now()}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "consultas",
          },
          (payload) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newRecord = payload.new as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oldRecord = payload.old as any

            console.log("[Recepcionista Dashboard Realtime] Received event:", payload.eventType, "id:", newRecord?.id || oldRecord?.id)

            // For any event type, refresh the data
            // (Recepcionista sees all médicos, so we refresh on any change)
            if (payload.eventType === "UPDATE") {
              // For UPDATE, update local state if possible
              setDashboardData((prev) => {
                const updatedConsultasHoy = prev.consultasHoy.map((consulta) =>
                  consulta.id === newRecord.id
                    ? { ...consulta, paciente_llego_timestamp: newRecord.paciente_llego_timestamp }
                    : consulta
                )

                // Recalculate pacientesEnEspera count
                const newPacientesEnEspera = updatedConsultasHoy.filter(
                  (c) => c.paciente_llego_timestamp !== null
                ).length

                return {
                  ...prev,
                  consultasHoy: updatedConsultasHoy,
                  pacientesEnEspera: newPacientesEnEspera,
                }
              })

              // If estado changed, do a full refresh to get complete updated data
              if (oldRecord?.estado_id !== newRecord.estado_id) {
                router.refresh()
              }
            } else {
              // For INSERT/DELETE, do a full refresh
              router.refresh()
            }
          }
        )
        .subscribe((status, err) => {
          console.log("[Recepcionista Dashboard Realtime] Subscription status:", status)
          if (err) {
            console.error("[Recepcionista Dashboard Realtime] Subscription error:", err)
          }
          if (status === "SUBSCRIBED") {
            console.log("[Recepcionista Dashboard Realtime] Successfully subscribed to postgres_changes on consultas table")
          }
          if (status === "CHANNEL_ERROR") {
            console.error("[Recepcionista Dashboard Realtime] Channel error occurred")
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  // Get current date formatted
  const today = new Date()
  const formattedToday = today.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Hola {userName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize hidden sm:block">{formattedToday}</p>
      </div>

      {/* Pacientes en Espera Alert */}
      <Card
        className={`border-2 ${
          pacientesEnEspera > 0
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-transparent"
        }`}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex-shrink-0">
            {pacientesEnEspera > 0 ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white">
                <Users className="h-6 w-6" />
              </div>
            ) : (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pacientes en Espera</p>
            <p className="text-lg font-semibold">
              {pacientesEnEspera > 0
                ? `Hay ${pacientesEnEspera} paciente${pacientesEnEspera !== 1 ? "s" : ""} esperando`
                : "No hay pacientes en espera en este momento"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Consultas de Hoy */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Consultas de Hoy
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/consultas" target="_blank" rel="noopener noreferrer">
                  Ir a consultas
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{formattedToday}</p>
          </CardHeader>
          <CardContent>
            {consultasHoy.length > 0 ? (
              <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                {consultasHoy.map((consulta) => (
                  <ConsultaHoyRow key={consulta.id} consulta={consulta} tick={tick} />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No hay consultas programadas para hoy"
                icon={CalendarDays}
              />
            )}
            {consultasHoy.length > 6 && (
              <div className="mt-3 pt-3 border-t">
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/consultas">Ver todas las consultas</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Pacientes Recientes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Pacientes Recientes
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/pacientes" target="_blank" rel="noopener noreferrer">
                  Ir a pacientes
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Ultimos 7 dias</p>
          </CardHeader>
          <CardContent>
            {pacientesRecientes.length > 0 ? (
              <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                {pacientesRecientes.map((paciente) => (
                  <PacienteRecienteRow key={paciente.id} paciente={paciente} />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No han habido consultas en los ultimos 7 dias"
                icon={Users}
              />
            )}
            {pacientesRecientes.length > 6 && (
              <div className="mt-3 pt-3 border-t">
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/pacientes">Ver todos los pacientes</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-width - Proximas Consultas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Proximas Consultas
          </CardTitle>
          <p className="text-sm text-muted-foreground">Proximos 7 dias</p>
        </CardHeader>
        <CardContent>
          {consultasProximos7Dias.length > 0 ? (
            <div className="max-h-[480px] overflow-y-auto overflow-x-hidden">
              {consultasProximos7Dias.map((consulta) => (
                <ConsultaProximaRow key={consulta.id} consulta={consulta} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="No hay consultas programadas para los proximos 7 dias"
              icon={Clock}
            />
          )}
          {consultasProximos7Dias.length > 8 && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link href="/consultas">Ver todas las consultas</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
