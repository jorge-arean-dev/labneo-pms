import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch médico's obras sociales associations
    const { data, error } = await supabase
      .from("medicos_obras_sociales")
      .select(`
        obra_social_id,
        obras_sociales!inner(
          id,
          nombre,
          codigo
        )
      `)
      .eq("medico_id", id)
      .eq("obras_sociales.is_active", true)

    if (error) {
      console.error("Error fetching medico obras sociales:", error)
      return NextResponse.json(
        { error: "Error al cargar las obras sociales del médico" },
        { status: 500 }
      )
    }

    // Transform data to return only obras_sociales
    // Note: Supabase returns obras_sociales as an array even with !inner
    const obrasSociales = data.map((item) => {
      const obraSocial = Array.isArray(item.obras_sociales)
        ? item.obras_sociales[0]
        : item.obras_sociales
      return obraSocial as { id: string; nombre: string; codigo: string }
    })

    return NextResponse.json(obrasSociales)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Error inesperado al cargar las obras sociales del médico" },
      { status: 500 }
    )
  }
}
