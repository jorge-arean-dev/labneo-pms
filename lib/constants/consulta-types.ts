/**
 * Tipo Consulta Display Name Mappings
 *
 * Maps database values to user-friendly display names for consultation types.
 * Database values are enforced by CHECK constraint in consultas table.
 */

export type TipoConsulta = 'primera_vez' | 'control' | 'urgencia'

export const TIPO_CONSULTA_LABELS: Record<TipoConsulta, string> = {
  primera_vez: 'Primera vez',
  control: 'Control',
  urgencia: 'Urgencia',
}

/**
 * Badge configuration for tipo_consulta letter indicators.
 * Colors are safelisted in tailwind.config.ts to prevent purging.
 */
export const TIPO_CONSULTA_BADGE: Record<TipoConsulta, { letter: string; color: string }> = {
  primera_vez: {
    letter: 'P',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
  control: {
    letter: 'C',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  urgencia: {
    letter: 'U',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
}

/**
 * Get display name for a tipo_consulta value
 */
export function getTipoConsultaLabel(tipo: TipoConsulta | null): string {
  if (!tipo) return '—'
  return TIPO_CONSULTA_LABELS[tipo] || tipo
}

/**
 * Get badge config (letter + color) for a tipo_consulta value
 */
export function getTipoConsultaBadge(tipo: TipoConsulta | null): { letter: string; color: string } | null {
  if (!tipo) return null
  return TIPO_CONSULTA_BADGE[tipo] || null
}

/**
 * All available tipo_consulta options for filters/dropdowns
 */
export const TIPO_CONSULTA_OPTIONS: { value: TipoConsulta; label: string }[] = [
  { value: 'primera_vez', label: 'Primera vez' },
  { value: 'control', label: 'Control' },
  { value: 'urgencia', label: 'Urgencia' },
]
