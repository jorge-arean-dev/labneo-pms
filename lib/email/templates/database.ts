/**
 * Database Email Templates
 *
 * Handles fetching custom email templates from the database
 * and replacing placeholders with actual values.
 */

import { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { EmailTemplateData } from "../types"
import { formatDateSpanish, formatTimeSpanish, capitalize } from "./base"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, any, any>

interface DatabaseTemplates {
  id: string
  confirmacion_turno: string
  recordatorio_consulta: string
  cancelacion_turno: string
}

// Cache for templates (refreshed on each request but avoids multiple DB calls)
let templatesCache: DatabaseTemplates | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Fetch email templates from the database
 */
export async function fetchDatabaseTemplates(
  client?: DbClient
): Promise<DatabaseTemplates | null> {
  // Check cache validity
  if (templatesCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return templatesCache
  }

  try {
    const supabase = client || (await createClient())

    const { data, error } = await supabase
      .from("email_templates")
      .select("id, confirmacion_turno, recordatorio_consulta, cancelacion_turno")
      .single()

    if (error) {
      console.error("Error fetching email templates from database:", error)
      return null
    }

    // Update cache
    templatesCache = data as DatabaseTemplates
    cacheTimestamp = Date.now()

    return templatesCache
  } catch (error) {
    console.error("Error fetching email templates:", error)
    return null
  }
}

/**
 * Replace placeholders in template text with actual values
 *
 * Supported placeholders:
 * - {{paciente_nombre}} - Patient's first name
 * - {{paciente_apellido}} - Patient's last name
 * - {{medico_nombre}} - Doctor's name (e.g., "Dr. María García")
 * - {{fecha}} - Formatted date (e.g., "Lunes 20 de enero de 2026")
 * - {{hora}} - Formatted time (e.g., "10:30 AM")
 * - {{direccion}} - Clinic address
 * - {{telefono}} - Clinic phone
 * - {{whatsapp_numero}} - Clinic WhatsApp number
 * - {{google_maps_url}} - Clinic Google Maps URL
 */
export function replacePlaceholders(
  template: string,
  data: EmailTemplateData
): string {
  const {
    paciente_nombre,
    paciente_apellido,
    medico_nombre,
    fecha_consulta,
    hora_consulta,
    direccion_consultorio,
    telefono_consultorio,
    whatsapp_numero,
    google_maps_url,
  } = data

  const fechaDate = new Date(fecha_consulta)
  const fechaFormateada = capitalize(formatDateSpanish(fechaDate))
  const horaFormateada = hora_consulta || formatTimeSpanish(fechaDate)

  return template
    .replace(/\{\{paciente_nombre\}\}/g, paciente_nombre)
    .replace(/\{\{paciente_apellido\}\}/g, paciente_apellido)
    .replace(/\{\{medico_nombre\}\}/g, medico_nombre)
    .replace(/\{\{fecha\}\}/g, fechaFormateada)
    .replace(/\{\{hora\}\}/g, horaFormateada)
    .replace(/\{\{direccion\}\}/g, direccion_consultorio || "")
    .replace(/\{\{telefono\}\}/g, telefono_consultorio || "")
    .replace(/\{\{whatsapp_numero\}\}/g, whatsapp_numero || "")
    .replace(/\{\{google_maps_url\}\}/g, google_maps_url || "")
}

/**
 * Get processed template text for a specific type
 * Falls back to default templates if database templates are not available
 */
export async function getProcessedTemplate(
  type: "confirmacion" | "recordatorio" | "cancelacion",
  data: EmailTemplateData,
  client?: DbClient
): Promise<string> {
  const templates = await fetchDatabaseTemplates(client)

  if (!templates) {
    // Return empty string - templates will use their hardcoded defaults
    return ""
  }

  let templateText: string
  switch (type) {
    case "confirmacion":
      templateText = templates.confirmacion_turno
      break
    case "recordatorio":
      templateText = templates.recordatorio_consulta
      break
    case "cancelacion":
      templateText = templates.cancelacion_turno
      break
    default:
      return ""
  }

  return replacePlaceholders(templateText, data)
}

/**
 * Clear the templates cache (useful after updating templates)
 */
export function clearTemplatesCache(): void {
  templatesCache = null
  cacheTimestamp = 0
}

/**
 * Check if content appears to be HTML
 * Returns true if content contains HTML tags
 */
function isHtmlContent(text: string): boolean {
  // Check for common HTML tags (excluding placeholders like {{...}})
  const htmlTagPattern = /<\/?(?:p|div|span|b|i|u|strong|em|a|br|ul|ol|li|h[1-6]|font)[^>]*>/i
  return htmlTagPattern.test(text)
}

/**
 * Apply base styles to HTML content for email rendering
 *
 * Email clients (Gmail, Outlook, etc.) have extremely poor CSS inheritance.
 * This function injects explicit inline styles into ALL elements to ensure
 * consistent rendering across Gmail, Outlook, Apple Mail, etc.
 *
 * IMPORTANT:
 * - Email clients don't support "inherit" - must use explicit pixel values.
 * - The rich text editor may capture computed font-sizes (like 0.875rem from Tailwind's text-sm)
 *   so we need to REPLACE any existing font-size, not just add when missing.
 */
function styleHtmlContent(html: string): string {
  const baseFontSize = "16px"
  const baseColor = "#3f3f46"
  const linkColor = "#2563EB"

  let styledHtml = html

  // Helper to normalize font-size in a style string
  // Replaces any existing font-size with the base font size
  const normalizeFontSize = (style: string): string => {
    // Remove any existing font-size declaration
    const withoutFontSize = style.replace(/font-size:\s*[^;]+;?/gi, "").trim()
    // Add the base font-size
    const cleanStyle = withoutFontSize.replace(/;?\s*$/, "")
    return cleanStyle ? `${cleanStyle}; font-size: ${baseFontSize}` : `font-size: ${baseFontSize}`
  }

  // Process ALL opening tags that might need font-size normalization
  // This is aggressive but necessary for email client compatibility

  // Process <a> tags (with style) - REPLACE font-size
  styledHtml = styledHtml.replace(
    /<a\s+([^>]*?)style="([^"]*)"([^>]*)>/gi,
    (_, before, style, after) => {
      return `<a ${before}style="${normalizeFontSize(style)}"${after}>`
    }
  )
  // Process <a> tags (without style)
  styledHtml = styledHtml.replace(
    /<a\s+(?![^>]*style=)([^>]*)>/gi,
    `<a style="font-size: ${baseFontSize}; color: ${linkColor}; text-decoration: underline;" $1>`
  )

  // Process <span> tags (with style) - REPLACE font-size
  styledHtml = styledHtml.replace(
    /<span\s+([^>]*?)style="([^"]*)"([^>]*)>/gi,
    (_, before, style, after) => {
      return `<span ${before}style="${normalizeFontSize(style)}"${after}>`
    }
  )

  // Process <u> tags (with style) - REPLACE font-size
  styledHtml = styledHtml.replace(
    /<u\s+([^>]*?)style="([^"]*)"([^>]*)>/gi,
    (_, before, style, after) => {
      return `<u ${before}style="${normalizeFontSize(style)}"${after}>`
    }
  )
  // Process <u> tags (without style or attributes)
  styledHtml = styledHtml.replace(
    /<u>/gi,
    `<u style="font-size: ${baseFontSize};">`
  )

  // Process <font> tags (with style) - REPLACE font-size
  styledHtml = styledHtml.replace(
    /<font\s+([^>]*?)style="([^"]*)"([^>]*)>/gi,
    (_, before, style, after) => {
      return `<font ${before}style="${normalizeFontSize(style)}"${after}>`
    }
  )
  // Process <font> tags (without style)
  styledHtml = styledHtml.replace(
    /<font\s+(?![^>]*style=)([^>]*)>/gi,
    `<font style="font-size: ${baseFontSize};" $1>`
  )

  // Process <b>, <strong>, <i>, <em> tags - also need font-size in some email clients
  styledHtml = styledHtml.replace(/<b>/gi, `<b style="font-size: ${baseFontSize};">`)
  styledHtml = styledHtml.replace(/<strong>/gi, `<strong style="font-size: ${baseFontSize};">`)
  styledHtml = styledHtml.replace(/<i>/gi, `<i style="font-size: ${baseFontSize};">`)
  styledHtml = styledHtml.replace(/<em>/gi, `<em style="font-size: ${baseFontSize};">`)

  // Wrap content in a styled div with base styles
  const trimmed = styledHtml.trim()
  if (!trimmed.startsWith("<p") && !trimmed.startsWith("<div")) {
    return `<div style="color: ${baseColor}; font-size: ${baseFontSize}; line-height: 1.5;">${styledHtml}</div>`
  }

  return styledHtml
}

/**
 * Convert plain text (with newlines) to HTML paragraphs
 * Preserves line breaks and wraps text in proper HTML
 *
 * If content is already HTML (from rich text editor), it passes through
 * with minimal processing to preserve formatting.
 */
export function textToHtml(text: string): string {
  if (!text) return ""

  // If content is already HTML, apply base styles and return
  if (isHtmlContent(text)) {
    return styleHtmlContent(text)
  }

  // Plain text: Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/)

  return paragraphs
    .map((para) => {
      // Replace single newlines with <br>
      const htmlContent = para
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("<br>")

      return `<p style="color: #3f3f46; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">${htmlContent}</p>`
    })
    .join("\n")
}
