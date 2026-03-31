"use client"

/**
 * Booking Summary Component
 *
 * Compact header displaying patient and doctor information.
 * Calendly-inspired clean design with minimal styling.
 */

import { User, Stethoscope } from "lucide-react"

interface BookingSummaryProps {
  pacienteNombre: string
  medicoNombre: string
}

export function BookingSummary({ pacienteNombre, medicoNombre }: BookingSummaryProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sm:py-6">
      <div className="max-w-md mx-auto">
        {/* Main Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-4">
          Reservar Turno
        </h1>

        {/* Patient & Doctor Info - Inline */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 text-center">
          {/* Patient */}
          <div className="flex items-center justify-center gap-2">
            <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-600">{pacienteNombre}</span>
          </div>

          {/* Separator - only on larger screens */}
          <span className="hidden sm:inline text-gray-300">•</span>

          {/* Doctor */}
          <div className="flex items-center justify-center gap-2">
            <Stethoscope className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-600">Dr. {medicoNombre}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
