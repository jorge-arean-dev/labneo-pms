"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PatientArrival {
  id: string
  pacienteNombre: string
  pacienteApellido: string
  isExiting: boolean
}

interface PatientArrivalBannerProps {
  /** The médico's ID (from medicos table) - only shows notifications for this médico's consultas */
  medicoId: string
}

/**
 * Global patient arrival notification banner.
 * Shows a top overlay when a patient arrives (paciente_llego_timestamp is set).
 * Auto-dismisses after 5 seconds with smooth animations.
 *
 * Only shows notifications for the specified médico's consultas.
 */
export function PatientArrivalBanner({ medicoId }: PatientArrivalBannerProps) {
  const [notifications, setNotifications] = useState<PatientArrival[]>([])

  const dismissNotification = useCallback((id: string) => {
    // Start exit animation
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isExiting: true } : n))
    )

    // Remove after animation completes
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 500)
  }, [])

  const addNotification = useCallback((arrival: Omit<PatientArrival, "isExiting">) => {
    // Check if notification for this consulta already exists
    setNotifications((prev) => {
      if (prev.some((n) => n.id === arrival.id)) {
        return prev
      }
      return [...prev, { ...arrival, isExiting: false }]
    })

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(arrival.id)
    }, 5000)
  }, [dismissNotification])

  // Real-time subscription for patient arrivals
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    console.log("[PatientArrivalBanner] Setting up subscription for medicoId:", medicoId)

    // Set up the subscription with proper auth
    const setupSubscription = async () => {
      // Get the current session to ensure realtime is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      console.log("[PatientArrivalBanner] Session exists:", !!session)

      if (session?.access_token) {
        // Explicitly set the auth token for realtime BEFORE subscribing
        await supabase.realtime.setAuth(session.access_token)
        console.log("[PatientArrivalBanner] Set realtime auth token")
      }

      // Now create and subscribe to the channel
      // Use unique channel name to avoid conflicts when multiple instances mount
      const channelName = `patient-arrival-${medicoId}-${Date.now()}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "consultas",
          },
          async (payload) => {
            console.log("[PatientArrivalBanner] Received UPDATE event:", payload.eventType, "id:", payload.new?.id)

            // Filter: only this médico's consultas
            if (payload.new.medico_id !== medicoId) {
              console.log("[PatientArrivalBanner] Skipping - different médico")
              return
            }

            // Check if paciente_llego_timestamp was just set (was null, now has value)
            const wasNull = payload.old?.paciente_llego_timestamp === null
            const isNowSet = payload.new.paciente_llego_timestamp !== null

            console.log("[PatientArrivalBanner] paciente_llego_timestamp - wasNull:", wasNull, "isNowSet:", isNowSet)

            if (wasNull && isNowSet) {
              console.log("[PatientArrivalBanner] Patient arrived for consulta:", payload.new.id)

              // Fetch patient details
              const { data: consulta } = await supabase
                .from("consultas")
                .select("pacientes(nombre, apellido)")
                .eq("id", payload.new.id)
                .single()

              if (consulta?.pacientes) {
                // Handle both array and object response formats
                const paciente = Array.isArray(consulta.pacientes)
                  ? consulta.pacientes[0]
                  : consulta.pacientes

                if (paciente) {
                  addNotification({
                    id: payload.new.id,
                    pacienteNombre: paciente.nombre,
                    pacienteApellido: paciente.apellido,
                  })
                }
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log("[PatientArrivalBanner] Subscription status:", status)
          if (err) {
            console.error("[PatientArrivalBanner] Subscription error:", err)
          }
          if (status === "SUBSCRIBED") {
            console.log("[PatientArrivalBanner] Successfully subscribed to postgres_changes")
          }
          if (status === "CHANNEL_ERROR") {
            console.error("[PatientArrivalBanner] Channel error occurred")
          }
          if (status === "TIMED_OUT") {
            console.error("[PatientArrivalBanner] Subscription timed out")
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [medicoId, addNotification])

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            role="alert"
            aria-live="assertive"
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border border-l-4 shadow-lg",
              "bg-yellow-50 border-yellow-200 border-l-yellow-500 text-yellow-900",
              "dark:bg-yellow-950 dark:border-yellow-800 dark:border-l-yellow-500 dark:text-yellow-50",
              notification.isExiting ? "animate-fade-out" : "animate-slide-in"
            )}
          >
            {/* Icon */}
            <Bell className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />

            {/* Message */}
            <p className="flex-1 text-base leading-relaxed">
              <span className="font-semibold">
                {notification.pacienteNombre} {notification.pacienteApellido}
              </span>{" "}
              ha llegado al consultorio
            </p>

            {/* Close button */}
            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 p-1 rounded-md text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:text-yellow-200 dark:hover:bg-yellow-900 transition-colors"
              aria-label="Cerrar notificaci&oacute;n"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
