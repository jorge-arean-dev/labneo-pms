/**
 * Country Codes Constants
 *
 * Static list of country calling codes for phone number input.
 * Used across the application for phone number fields.
 *
 * Usage:
 * import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/lib/constants/country-codes"
 */

export interface CountryCode {
  code: string
  country: string
  flag?: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+51", country: "Perú", flag: "🇵🇪" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+1", country: "USA/Canadá", flag: "🇺🇸" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
] as const

/**
 * Default country code for Argentina
 */
export const DEFAULT_COUNTRY_CODE = "+54"
