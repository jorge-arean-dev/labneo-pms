/**
 * Public Booking Page (/agendar)
 *
 * Server component that validates the booking token and renders
 * either the booking form or an error state.
 *
 * Accessed via: /agendar?token=abc123
 */

import { Metadata } from "next"
import { validateBookingToken } from "./actions"
import { BookingForm } from "./components/booking-form"
import { BookingError } from "./components/booking-error"

export const metadata: Metadata = {
  title: "Reservar Turno",
  description: "Reservá tu turno médico de forma rápida y sencilla",
}

interface AgendarPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function AgendarPage({ searchParams }: AgendarPageProps) {
  const params = await searchParams
  const token = params.token

  // No token provided
  if (!token) {
    return <BookingError type="invalid" />
  }

  // Validate token
  const validation = await validateBookingToken(token)

  // Token validation failed
  if (!validation.valid || !validation.data) {
    return <BookingError type={validation.error || "invalid"} />
  }

  // Token is valid - render booking form
  return <BookingForm bookingData={validation.data} />
}
