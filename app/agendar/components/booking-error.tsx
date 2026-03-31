"use client"

/**
 * Booking Error Component
 *
 * Displays friendly error messages for invalid, expired, or used tokens.
 * Designed for elderly users with large text and clear messaging.
 * Forces light mode for consistent public-facing appearance.
 */

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { BookingErrorType } from "../types"

interface BookingErrorProps {
  type: BookingErrorType
}

const errorConfig = {
  invalid: {
    icon: AlertCircle,
    title: "Enlace no válido",
    message: "El enlace que usaste no es válido. Por favor, solicita un nuevo enlace a través de WhatsApp.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  expired: {
    icon: Clock,
    title: "Enlace expirado",
    message: "Este enlace ha expirado. Los enlaces son válidos por 24 horas. Por favor, solicita uno nuevo a través de WhatsApp.",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  used: {
    icon: CheckCircle2,
    title: "Enlace ya utilizado",
    message: "Este enlace ya fue utilizado para reservar un turno. Si necesitas hacer otra reserva, por favor solicita un nuevo enlace a través de WhatsApp.",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  server: {
    icon: AlertCircle,
    title: "Error del servidor",
    message: "Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente en unos minutos.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
}

export function BookingError({ type }: BookingErrorProps) {
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

  const config = errorConfig[type]
  const Icon = config.icon

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Error Card */}
        <div
          className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl p-8 text-center shadow-sm`}
          role="alert"
          aria-live="assertive"
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`${config.iconColor} p-4 rounded-full bg-white shadow-sm`}>
              <Icon className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {config.title}
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-700 leading-relaxed">
            {config.message}
          </p>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-base text-gray-700">
            Si tenés dudas, contactá a la clínica por WhatsApp.
          </p>
        </div>
      </div>
    </main>
  )
}
