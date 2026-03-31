/**
 * GET /api/n8n/doctors
 *
 * List active doctors available for appointments.
 * Called by n8n when the WhatsApp agent needs to show doctor options.
 *
 * Required headers:
 *   x-api-key: API key for authentication
 *
 * Query parameters:
 *   especialidad?: string - Filter by specialty (optional)
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       doctors: [
 *         {
 *           id: string,
 *           nombre: string,
 *           apellido: string,
 *           especialidad: string | null,
 *           matricula: string | null
 *         }
 *       ],
 *       count: number
 *     }
 *   }
 */

import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  validateApiKey,
  unauthorizedResponse,
  serverErrorResponse,
  successResponse,
} from "../auth"

export async function GET(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request)
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error!)
  }

  // Get optional filters from query params
  const especialidad = request.nextUrl.searchParams.get("especialidad")

  const supabase = createAdminClient()

  // Build query for active doctors
  let query = supabase
    .from("medicos")
    .select(`
      id,
      especialidad,
      matricula,
      usuarios_pms!inner (
        nombre,
        apellido
      )
    `)
    .is("deleted_at", null)

  // Apply specialty filter if provided
  if (especialidad) {
    query = query.ilike("especialidad", `%${especialidad}%`)
  }

  const { data: doctors, error } = await query.order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching doctors:", error)
    return serverErrorResponse("Failed to fetch doctors")
  }

  // Transform the data to flatten the structure
  const transformedDoctors = doctors.map((doctor) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usuario = doctor.usuarios_pms as any
    return {
      id: doctor.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombre_completo: `Dr. ${usuario.nombre} ${usuario.apellido}`,
      especialidad: doctor.especialidad,
      matricula: doctor.matricula,
    }
  })

  return successResponse({
    doctors: transformedDoctors,
    count: transformedDoctors.length,
  })
}
