import { createClient } from "@/lib/supabase/client"

/**
 * Fetches the clinic logo URL from Supabase storage
 * Returns null if no logo is found
 */
export async function fetchLogoUrl(): Promise<string | null> {
  const supabase = createClient()

  try {
    // List files in the logo bucket to find the logo
    const { data: files, error: listError } = await supabase.storage
      .from("logo")
      .list("", {
        limit: 1,
        sortBy: { column: "created_at", order: "desc" },
      })

    if (listError || !files || files.length === 0) {
      console.warn("No logo found in storage:", listError?.message)
      return null
    }

    // Get the first (most recent) logo file
    const logoFile = files[0]

    // Get the public URL for the logo
    const { data: urlData } = supabase.storage
      .from("logo")
      .getPublicUrl(logoFile.name)

    return urlData?.publicUrl || null
  } catch (error) {
    console.error("Error fetching logo:", error)
    return null
  }
}

/**
 * Fetches the clinic name from the clinic_info table
 * Returns a placeholder if no clinic info is found or nombre is empty
 */
export async function fetchClinicName(): Promise<string> {
  const supabase = createClient()
  const PLACEHOLDER = "Clínica Dermatológica"

  try {
    const { data, error } = await supabase
      .from("clinic_info")
      .select("nombre")
      .single()

    if (error || !data?.nombre) {
      console.warn("No clinic name found:", error?.message)
      return PLACEHOLDER
    }

    return data.nombre
  } catch (error) {
    console.error("Error fetching clinic name:", error)
    return PLACEHOLDER
  }
}

/**
 * Generates a sanitized filename for the PDF
 */
export function generatePDFFilename(nombre: string, apellido: string): string {
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, "") // Remove special characters

  return `historia_clinica_${sanitize(nombre)}_${sanitize(apellido)}.pdf`
}
