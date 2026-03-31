import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all active obras sociales
    const { data, error } = await supabase
      .from("obras_sociales")
      .select("id, nombre, codigo")
      .eq("is_active", true)
      .order("nombre", { ascending: true })

    if (error) {
      console.error("Error fetching obras sociales:", error)
      return NextResponse.json(
        { error: "Error al cargar obras sociales" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Error inesperado al cargar obras sociales" },
      { status: 500 }
    )
  }
}
