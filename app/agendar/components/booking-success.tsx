"use client"

/**
 * Booking Success Component
 *
 * Celebratory confirmation screen after successful booking.
 * Shows appointment details clearly for elderly users.
 * Forces light mode for consistent public-facing appearance.
 */

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { CheckCircle2, Calendar, Clock, User, Stethoscope, Mail } from "lucide-react"
import { formatTimeForDisplay } from "@/lib/utils/date-format"

interface BookingSuccessProps {
  pacienteNombre: string
  medicoNombre: string
  fechaHora: string
}

export function BookingSuccess({
  pacienteNombre,
  medicoNombre,
  fechaHora,
}: BookingSuccessProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const previousTheme = useRef(resolvedTheme)

  // Force light mode for this public booking page via next-themes API
  useEffect(() => {
    previousTheme.current = resolvedTheme
    setTheme("light")

    return () => {
      setTheme(previousTheme.current || "system")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Parse and format date/time
  const date = new Date(fechaHora)
  const formattedDate = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const formattedTime = formatTimeForDisplay(
    `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header with checkmark */}
          <div className="bg-emerald-500 p-8 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-lg mb-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={2} aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              ¡Turno Confirmado!
            </h1>
            <p className="text-emerald-100 text-lg">
              Tu reserva fue realizada con éxito
            </p>
          </div>

          {/* Appointment Details */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Patient */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-full">
                <User className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Paciente</p>
                <p className="text-lg font-semibold text-gray-900">{pacienteNombre}</p>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-emerald-100 rounded-full">
                <Stethoscope className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Médico</p>
                <p className="text-lg font-semibold text-gray-900">Dr. {medicoNombre}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{formattedDate}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-amber-100 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Horario</p>
                <p className="text-lg font-semibold text-gray-900">{formattedTime}</p>
              </div>
            </div>

            {/* Email notice */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-blue-700">
                Si tenés un email registrado, vas a recibir una confirmación por correo electrónico.
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-base text-gray-600">
            Podés cerrar esta página. ¡Te esperamos!
          </p>
        </div>
      </div>
    </div>
  )
}
