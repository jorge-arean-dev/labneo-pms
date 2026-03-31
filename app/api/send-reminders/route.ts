/**
 * API Route: Send Appointment Reminders
 *
 * Called by pg_cron every 30 minutes to send 24-hour reminder emails.
 * Secured with a secret key to prevent unauthorized access.
 *
 * Uses admin client (service role) to bypass RLS since this is a
 * server-to-server call without user session.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendReminderEmail, getEmailConfig } from "@/lib/email"

// Admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Verify the cron secret to prevent unauthorized access
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error("CRON_SECRET not configured")
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Find appointments that need reminders (within time window)
 */
async function findAppointmentsNeedingReminders(hoursBeforeMin: number, hoursBeforeMax: number) {
  const now = new Date()

  // Calculate the time window
  const minTime = new Date(now.getTime() + hoursBeforeMin * 60 * 60 * 1000)
  const maxTime = new Date(now.getTime() + hoursBeforeMax * 60 * 60 * 1000)

  // Get estado ID for "programada" (send reminders for scheduled appointments)
  const { data: estadoData } = await supabaseAdmin
    .from("estados_consulta")
    .select("id")
    .eq("codigo", "programada")
    .single()

  if (!estadoData) {
    console.log("No 'programada' estado found")
    return []
  }

  // Find appointments in the time window
  const { data: consultas, error } = await supabaseAdmin
    .from("consultas")
    .select("id, paciente_id, medico_id, fecha_hora, motivo")
    .eq("estado_id", estadoData.id)
    .gte("fecha_hora", minTime.toISOString())
    .lte("fecha_hora", maxTime.toISOString())

  if (error) {
    console.error("Error fetching appointments:", error)
    return []
  }

  // Filter out appointments that already have a reminder
  const consultaIds = consultas?.map((c) => c.id) || []
  if (consultaIds.length === 0) return []

  const { data: existingReminders } = await supabaseAdmin
    .from("email_reminders")
    .select("consulta_id")
    .in("consulta_id", consultaIds)
    .eq("email_type", "recordatorio_24h")
    .in("status", ["sent", "pending"])

  const sentConsultaIds = new Set(existingReminders?.map((r) => r.consulta_id) || [])

  return consultas?.filter((c) => !sentConsultaIds.has(c.id)) || []
}

/**
 * Record a reminder in the database
 */
async function recordReminder(
  consultaId: string,
  recipientEmail: string,
  recipientName: string,
  status: "sent" | "failed",
  errorMessage?: string
) {
  await supabaseAdmin.from("email_reminders").insert({
    consulta_id: consultaId,
    email_type: "recordatorio_24h",
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    scheduled_for: new Date().toISOString(),
    status,
    error_message: errorMessage || null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  })
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Check if email and reminders are enabled (using admin client)
    const config = await getEmailConfig(supabaseAdmin)

    if (!config?.enabled) {
      return NextResponse.json({
        success: true,
        message: "Email sending is disabled",
        sent: 0,
      })
    }

    if (!config?.reminders_enabled) {
      return NextResponse.json({
        success: true,
        message: "Reminders are disabled",
        sent: 0,
      })
    }

    // Calculate time window based on config
    const hoursBefore = config.reminder_hours_before || 24
    const hoursBeforeMin = hoursBefore - 1
    const hoursBeforeMax = hoursBefore + 1

    // Find appointments needing reminders
    const appointments = await findAppointmentsNeedingReminders(hoursBeforeMin, hoursBeforeMax)

    if (appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No appointments need reminders",
        sent: 0,
      })
    }

    // Send reminders
    let sentCount = 0
    let failedCount = 0

    for (const appointment of appointments) {
      // Send reminder using admin client (bypasses RLS)
      const result = await sendReminderEmail(
        {
          consultaId: appointment.id,
          pacienteId: appointment.paciente_id,
          medicoId: appointment.medico_id,
          fechaHora: appointment.fecha_hora,
          motivo: appointment.motivo,
        },
        supabaseAdmin
      )

      // Get patient info for recording
      const { data: paciente } = await supabaseAdmin
        .from("pacientes")
        .select("nombre, apellido, email")
        .eq("id", appointment.paciente_id)
        .single()

      if (paciente?.email) {
        await recordReminder(
          appointment.id,
          paciente.email,
          `${paciente.nombre} ${paciente.apellido}`,
          result.sent ? "sent" : "failed",
          result.error
        )
      }

      if (result.sent) {
        sentCount++
      } else {
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${appointments.length} appointments`,
      sent: sentCount,
      failed: failedCount,
    })
  } catch (error) {
    console.error("Error processing reminders:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing (still requires auth)
export async function GET(request: NextRequest) {
  return POST(request)
}
