/**
 * /api/n8n/patients
 *
 * GET - Look up patient by DNI
 * POST - Create a new patient
 *
 * Called by n8n when the WhatsApp agent needs to identify or register patients.
 *
 * Required headers:
 *   x-api-key: API key for authentication
 *
 * GET /api/n8n/patients?dni=12345678
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       id: string,
 *       dni: string,
 *       nombre: string,
 *       apellido: string,
 *       telefono: string | null,
 *       email: string | null
 *     }
 *   }
 *
 * POST /api/n8n/patients
 * Request body:
 *   {
 *     dni: string (required),
 *     nombre: string (required),
 *     apellido: string (required),
 *     fecha_nacimiento: string (required, YYYY-MM-DD),
 *     telefono?: string,
 *     email?: string,
 *     obra_social_id?: string
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

// Schema for creating a new patient
const CreatePatientSchema = z.object({
  dni: z.string().min(7, "DNI must be at least 7 characters"),
  nombre: z.string().min(2, "Nombre must be at least 2 characters"),
  apellido: z.string().min(2, "Apellido must be at least 2 characters"),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_nacimiento must be YYYY-MM-DD"),
  telefono: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  obra_social_id: z.string().uuid("obra_social_id must be a valid UUID").optional(),
})

/**
 * GET /api/n8n/patients?dni=12345678
 *
 * Look up a patient by DNI
 */
export async function GET(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request)
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error!)
  }

  // Get DNI from query params
  const dni = request.nextUrl.searchParams.get("dni")

  if (!dni) {
    return badRequestResponse("Missing required query parameter: dni")
  }

  const supabase = createAdminClient()

  // Look up patient by DNI
  const { data: patient, error } = await supabase
    .from("pacientes")
    .select("id, dni, nombre, apellido, telefono, email, fecha_nacimiento")
    .eq("dni", dni)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return Response.json(
        { success: false, error: "Patient not found", found: false },
        { status: 404 }
      )
    }
    console.error("Error looking up patient:", error)
    return serverErrorResponse("Failed to look up patient")
  }

  return successResponse({
    ...patient,
    found: true,
  })
}

/**
 * POST /api/n8n/patients
 *
 * Create a new patient
 */
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
  const validation = CreatePatientSchema.safeParse(body)
  if (!validation.success) {
    return badRequestResponse(validation.error.issues[0].message)
  }

  const patientData = validation.data
  const supabase = createAdminClient()

  // Check if patient with this DNI already exists
  const { data: existingPatient } = await supabase
    .from("pacientes")
    .select("id, nombre, apellido")
    .eq("dni", patientData.dni)
    .single()

  if (existingPatient) {
    return Response.json(
      {
        success: false,
        error: `Patient with DNI ${patientData.dni} already exists`,
        existing_patient: {
          id: existingPatient.id,
          nombre: existingPatient.nombre,
          apellido: existingPatient.apellido,
        },
      },
      { status: 409 } // Conflict
    )
  }

  // Create the patient
  const { data: newPatient, error: createError } = await supabase
    .from("pacientes")
    .insert({
      dni: patientData.dni,
      nombre: patientData.nombre,
      apellido: patientData.apellido,
      fecha_nacimiento: patientData.fecha_nacimiento,
      telefono: patientData.telefono || null,
      email: patientData.email || null,
      obra_social_id: patientData.obra_social_id || null,
    })
    .select("id, dni, nombre, apellido, telefono, email, fecha_nacimiento")
    .single()

  if (createError || !newPatient) {
    console.error("Error creating patient:", createError)
    return serverErrorResponse("Failed to create patient")
  }

  return Response.json(
    { success: true, data: newPatient, created: true },
    { status: 201 }
  )
}
