/**
 * POST /api/n8n/create-token
 *
 * Creates a booking token for a patient to schedule an appointment.
 * Called by n8n when the WhatsApp agent needs to generate a booking link.
 *
 * Required headers:
 *   x-api-key: API key for authentication
 *
 * Request body:
 *   {
 *     paciente_id: string (required) - UUID of the patient
 *     medico_id: string (required) - UUID of the doctor
 *     phone_number?: string - WhatsApp phone number
 *     expires_in_hours?: number - Token expiration (default: 24)
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       token: string,
 *       booking_url: string,
 *       expires_at: string
 *     }
 *   }
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  validateApiKey,
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
  successResponse,
} from "../auth"

const CreateTokenSchema = z.object({
  paciente_id: z.string().uuid("paciente_id must be a valid UUID"),
  medico_id: z.string().uuid("medico_id must be a valid UUID"),
  phone_number: z.string().optional(),
  expires_in_hours: z.number().min(1).max(168).default(24), // Max 1 week
})

export async function POST(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request)
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error!)
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequestResponse("Invalid JSON body")
  }

  // Validate request data
  const validation = CreateTokenSchema.safeParse(body)
  if (!validation.success) {
    return badRequestResponse(validation.error.issues[0].message)
  }

  const { paciente_id, medico_id, phone_number, expires_in_hours } = validation.data

  const supabase = createAdminClient()

  // Verify patient exists
  const { data: patient, error: patientError } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido")
    .eq("id", paciente_id)
    .single()

  if (patientError || !patient) {
    return badRequestResponse(`Patient not found: ${paciente_id}`)
  }

  // Verify doctor exists and is active
  const { data: doctor, error: doctorError } = await supabase
    .from("medicos")
    .select("id")
    .eq("id", medico_id)
    .is("deleted_at", null)
    .single()

  if (doctorError || !doctor) {
    return badRequestResponse(`Doctor not found or inactive: ${medico_id}`)
  }

  // Calculate expiration time
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

  // Create the token
  const { data: tokenData, error: tokenError } = await supabase
    .from("booking_tokens")
    .insert({
      paciente_id,
      medico_id,
      phone_number: phone_number || null,
      expires_at: expiresAt.toISOString(),
    })
    .select("token, expires_at")
    .single()

  if (tokenError || !tokenData) {
    console.error("Error creating booking token:", tokenError)
    return serverErrorResponse("Failed to create booking token")
  }

  // Build booking URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const bookingUrl = baseUrl
    ? `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/agendar?token=${tokenData.token}`
    : `/agendar?token=${tokenData.token}`

  return successResponse({
    token: tokenData.token,
    booking_url: bookingUrl,
    expires_at: tokenData.expires_at,
    patient_name: `${patient.nombre} ${patient.apellido}`,
  })
}
