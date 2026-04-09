/**
 * Profile-completeness helpers for odontólogos.
 *
 * An odontólogo must have every one of the required fields populated before
 * they can create a new solicitud (prótesis or alquiler de equipos). The
 * localidad in particular drives price-list resolution and delivery/service
 * address, so it's non-negotiable.
 */

import type { OdontologoPerfil, UsuarioPms } from "@/lib/types/entities"

export const REQUIRED_PROFILE_FIELDS = [
  "telefono",
  "localidad_id",
  "cuit",
  "situacion_iva",
  "direccion_consultorio",
] as const

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number]

/** Labels used in UI banners when informing the user what's missing. */
export const PROFILE_FIELD_LABELS: Record<RequiredProfileField, string> = {
  telefono: "Teléfono",
  localidad_id: "Localidad",
  cuit: "CUIT",
  situacion_iva: "Situación frente al IVA",
  direccion_consultorio: "Dirección del consultorio",
}

/**
 * Returns the list of missing required field keys. Returns an empty array when
 * the profile is complete.
 */
export function getMissingProfileFields(
  perfil: Partial<OdontologoPerfil> | null | undefined
): RequiredProfileField[] {
  if (!perfil) return [...REQUIRED_PROFILE_FIELDS]

  const missing: RequiredProfileField[] = []
  for (const key of REQUIRED_PROFILE_FIELDS) {
    const value = perfil[key]
    if (value === null || value === undefined || value === "") {
      missing.push(key)
    }
  }
  return missing
}

/**
 * True when the odontólogo has every required field populated. Also checks
 * the base usuarios_pms fields (nombre/apellido), which are NOT NULL in the
 * DB but might still be empty strings in rare cases.
 */
export function isOdontologoProfileComplete(
  usuario: Pick<UsuarioPms, "nombre" | "apellido"> | null | undefined,
  perfil: Partial<OdontologoPerfil> | null | undefined
): boolean {
  if (!usuario) return false
  if (!usuario.nombre?.trim() || !usuario.apellido?.trim()) return false
  return getMissingProfileFields(perfil).length === 0
}
