"use server"

/**
 * Server Actions for Public Booking Page (/agendar)
 *
 * These actions handle token validation and appointment creation
 * for patients booking via WhatsApp links.
 *
 * Uses admin client since this is a public page without authentication.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { sendConfirmationEmail } from "@/lib/email"
import {
  TokenValidationResult,
  BookingResult,
  BookingData,
} from "./types"
import {
  MedicoHorario,
  AvailableSlotsResult,
  DEFAULT_PARAMETROS_AGENDA,
} from "@/lib/types"
import {
  calculateAvailableSlots,
  buildAvailableSlotsResult,
  getDayOfWeek,
  parseDateString,
} from "@/lib/utils/slot-calculator"
import { formatTimeInAppTimezone } from "@/lib/utils/timezone"

/**
 * Validate a booking token
 *
 * Checks if token exists, is not expired, and has not been used.
 * Returns patient and doctor data if valid.
 */
export async function validateBookingToken(
  token: string
): Promise<TokenValidationResult> {
  const supabase = createAdminClient()

  // Fetch token with patient and doctor data
  const { data: tokenData, error: tokenError } = await supabase
    .from("booking_tokens")
    .select(`
      id,
      token,
      paciente_id,
      medico_id,
      phone_number,
      expires_at,
      used_at,
      consulta_id,
      created_at
    `)
    .eq("token", token)
    .single()

  if (tokenError || !tokenData) {
    return { valid: false, error: "invalid" }
  }

  // Check if token has been used
  if (tokenData.used_at) {
    return { valid: false, error: "used" }
  }

  // Check if token has expired
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)
  if (now > expiresAt) {
    return { valid: false, error: "expired" }
  }

  // Fetch patient data
  const { data: pacienteData, error: pacienteError } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido")
    .eq("id", tokenData.paciente_id)
    .single()

  if (pacienteError || !pacienteData) {
    return { valid: false, error: "invalid" }
  }

  // Fetch doctor data (nombre/apellido from usuarios_pms)
  const { data: medicoData, error: medicoError } = await supabase
    .from("medicos")
    .select(`
      id,
      user_id,
      usuarios_pms!inner (
        nombre,
        apellido
      )
    `)
    .eq("id", tokenData.medico_id)
    .is("deleted_at", null)
    .single()

  if (medicoError || !medicoData) {
    return { valid: false, error: "invalid" }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usuariosPms = medicoData.usuarios_pms as any

  const bookingData: BookingData = {
    token: tokenData,
    paciente: {
      id: pacienteData.id,
      nombre: pacienteData.nombre,
      apellido: pacienteData.apellido,
    },
    medico: {
      id: medicoData.id,
      nombre: usuariosPms.nombre,
      apellido: usuariosPms.apellido,
    },
  }

  return { valid: true, data: bookingData }
}

/**
 * Get available time slots for a doctor on a specific date
 *
 * Used by the booking calendar to show available times.
 */
export async function getAvailableSlotsForBooking(
  medicoId: string,
  date: string // YYYY-MM-DD format
): Promise<{
  data: AvailableSlotsResult | null
  error: string | null
}> {
  const supabase = createAdminClient()

  // Check if date is blocked
  const { data: blockedData } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("id")
    .eq("medico_id", medicoId)
    .lte("fecha_inicio", date)
    .gte("fecha_fin", date)
    .limit(1)

  if (blockedData && blockedData.length > 0) {
    return {
      data: { date, slots: [], hasAvailability: false },
      error: null,
    }
  }

  // Parse date and get day of week
  const selectedDate = parseDateString(date)
  const diaSemana = getDayOfWeek(selectedDate)

  // Fetch scheduling parameters
  const { data: parametrosData } = await supabase
    .from("medicos_parametros_agenda")
    .select("duracion_consulta, duracion_buffer, max_consultas_concurrentes")
    .eq("medico_id", medicoId)
    .single()

  const parametros = parametrosData || DEFAULT_PARAMETROS_AGENDA

  // Fetch schedules for this day of week
  const { data: schedulesData, error: schedulesError } = await supabase
    .from("medicos_horarios")
    .select("id, medico_id, dia_semana, hora_inicio, hora_fin, activo")
    .eq("medico_id", medicoId)
    .eq("dia_semana", diaSemana)
    .eq("activo", true)
    .order("hora_inicio")

  if (schedulesError) {
    return { data: null, error: schedulesError.message }
  }

  // If no schedules for this day, return empty result
  if (!schedulesData || schedulesData.length === 0) {
    return {
      data: {
        date,
        slots: [],
        hasAvailability: false,
      },
      error: null,
    }
  }

  // Get estados that don't block the schedule
  const { data: estadosData } = await supabase
    .from("estados_consulta")
    .select("id")
    .in("codigo", ["cancelada", "ausente"])

  const excludedEstadoIds = estadosData?.map(e => e.id) || []

  // Fetch existing appointments for the date
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  let query = supabase
    .from("consultas")
    .select("fecha_hora")
    .eq("medico_id", medicoId)
    .gte("fecha_hora", startOfDay)
    .lte("fecha_hora", endOfDay)

  if (excludedEstadoIds.length > 0) {
    query = query.not("estado_id", "in", `(${excludedEstadoIds.join(",")})`)
  }

  const { data: consultasData } = await query

  // Count appointments per time slot
  const appointmentCounts = new Map<string, number>()
  for (const consulta of consultasData || []) {
    const fechaHora = new Date(consulta.fecha_hora)
    const timeKey = formatTimeInAppTimezone(fechaHora)
    const currentCount = appointmentCounts.get(timeKey) || 0
    appointmentCounts.set(timeKey, currentCount + 1)
  }

  // Calculate available slots
  const slots = calculateAvailableSlots(
    schedulesData as MedicoHorario[],
    parametros,
    appointmentCounts,
    selectedDate
  )

  const result = buildAvailableSlotsResult(date, slots)

  return { data: result, error: null }
}

/**
 * Get working days for a doctor
 *
 * Returns array of day numbers (0=Sunday, 1=Monday, etc.)
 * Used to disable non-working days in the calendar.
 */
export async function getMedicoWorkDaysForBooking(
  medicoId: string
): Promise<{
  data: number[] | null
  error: string | null
}> {
  const supabase = createAdminClient()

  const { data: schedulesData, error } = await supabase
    .from("medicos_horarios")
    .select("dia_semana, activo")
    .eq("medico_id", medicoId)
    .eq("activo", true)

  if (error) {
    return { data: null, error: error.message }
  }

  const workDays = new Set<number>()
  for (const schedule of schedulesData || []) {
    if (schedule.activo) {
      workDays.add(schedule.dia_semana)
    }
  }

  return { data: [...workDays].sort(), error: null }
}

/**
 * Fetch blocked dates for a doctor (public booking route, uses admin client)
 */
export async function getMedicoBlockedDatesForBooking(
  medicoId: string
): Promise<{
  data: string[] | null
  error: string | null
}> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("medicos_bloqueos_agenda")
    .select("fecha_inicio, fecha_fin")
    .eq("medico_id", medicoId)
    .gte("fecha_fin", today)

  if (error) {
    return { data: null, error: error.message }
  }

  const blockedDates: string[] = []
  for (const block of data || []) {
    const start = new Date(block.fecha_inicio + "T00:00:00")
    const end = new Date(block.fecha_fin + "T00:00:00")
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      if (!blockedDates.includes(dateStr)) {
        blockedDates.push(dateStr)
      }
    }
  }

  return { data: blockedDates, error: null }
}

/**
 * Create an appointment from a booking token
 *
 * This action:
 * 1. Validates the token is still valid
 * 2. Validates the selected slot is available
 * 3. Creates the consulta with origen='whatsapp'
 * 4. Marks the token as used
 * 5. Sends confirmation email
 */
export async function createBookingAppointment(
  token: string,
  fechaHora: string // ISO datetime string
): Promise<BookingResult> {
  const supabase = createAdminClient()

  // Re-validate token before creating appointment
  const validation = await validateBookingToken(token)

  if (!validation.valid || !validation.data) {
    return {
      success: false,
      error: validation.error === "used"
        ? "Este enlace ya fue utilizado para reservar un turno."
        : validation.error === "expired"
          ? "Este enlace ha expirado. Por favor, solicita uno nuevo."
          : "El enlace no es válido.",
    }
  }

  const { paciente, medico, token: tokenData } = validation.data

  // Extract date and time for validation
  const appointmentDate = new Date(fechaHora)
  const dateStr = appointmentDate.toISOString().split("T")[0]
  const timeStr = formatTimeInAppTimezone(appointmentDate)

  // Validate slot availability
  const { data: slotsResult, error: slotsError } = await getAvailableSlotsForBooking(
    medico.id,
    dateStr
  )

  if (slotsError) {
    return { success: false, error: `Error al verificar disponibilidad: ${slotsError}` }
  }

  if (!slotsResult || slotsResult.slots.length === 0) {
    return { success: false, error: "El médico no tiene horarios disponibles para esta fecha." }
  }

  const selectedSlot = slotsResult.slots.find(slot => slot.time === timeStr)

  if (!selectedSlot) {
    return { success: false, error: `El horario ${timeStr} no está disponible.` }
  }

  if (!selectedSlot.isAvailable) {
    return {
      success: false,
      error: `El horario ${timeStr} ya no está disponible. Por favor, selecciona otro horario.`,
    }
  }

  // Get default estado (programada)
  const { data: estadoData, error: estadoError } = await supabase
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "programada")
    .single()

  if (estadoError || !estadoData) {
    return { success: false, error: "Error al obtener el estado inicial de la consulta." }
  }

  // Create the consulta with origen='whatsapp'
  const { data: consultaData, error: consultaError } = await supabase
    .from("consultas")
    .insert({
      paciente_id: paciente.id,
      medico_id: medico.id,
      fecha_hora: fechaHora,
      estado_id: estadoData.id,
      origen: "whatsapp",
    })
    .select("id")
    .single()

  if (consultaError || !consultaData) {
    return { success: false, error: "Error al crear el turno. Por favor, intenta nuevamente." }
  }

  // Mark token as used
  const { error: tokenUpdateError } = await supabase
    .from("booking_tokens")
    .update({
      used_at: new Date().toISOString(),
      consulta_id: consultaData.id,
    })
    .eq("id", tokenData.id)

  if (tokenUpdateError) {
    console.error("Error marking token as used:", tokenUpdateError)
    // Don't fail the booking if token update fails
  }

  // Send confirmation email (fire and forget)
  sendConfirmationEmail({
    consultaId: consultaData.id,
    pacienteId: paciente.id,
    medicoId: medico.id,
    fechaHora: fechaHora,
  }, supabase).catch((err) => {
    console.error("Error sending confirmation email:", err)
  })

  return {
    success: true,
    consultaId: consultaData.id,
    fechaHora: fechaHora,
  }
}
