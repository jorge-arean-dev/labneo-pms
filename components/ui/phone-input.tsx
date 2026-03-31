"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/lib/constants/country-codes"

export interface PhoneInputValue {
  countryCode: string
  areaCode: string
  phoneNumber: string
}

interface PhoneInputProps {
  value: PhoneInputValue
  onChange: (value: PhoneInputValue) => void
  disabled?: boolean
}

/**
 * PhoneInput Component
 *
 * A reusable phone input component that displays country code, area code, and phone number
 * in separate fields with visual formatting (+ and spaces), but returns the raw concatenated
 * value without formatting.
 *
 * Display format: +54 911 28796633
 * Database format: 5491128796633
 *
 * Usage:
 * ```tsx
 * const [phone, setPhone] = useState<PhoneInputValue>({
 *   countryCode: DEFAULT_COUNTRY_CODE,
 *   areaCode: "",
 *   phoneNumber: ""
 * })
 *
 * <PhoneInput value={phone} onChange={setPhone} />
 *
 * // To get the formatted value for database:
 * const formattedPhone = formatPhoneForDatabase(phone)
 * ```
 */
export function PhoneInput({ value, onChange, disabled = false }: PhoneInputProps) {
  const handleAreaCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric values
    const numericValue = e.target.value.replace(/\D/g, "")
    onChange({
      ...value,
      areaCode: numericValue,
    })
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric values
    const numericValue = e.target.value.replace(/\D/g, "")
    onChange({
      ...value,
      phoneNumber: numericValue,
    })
  }

  return (
    <div className="grid grid-cols-[140px_1fr_2fr] gap-2">
      <Select
        value={value.countryCode}
        onValueChange={(code) => onChange({ ...value, countryCode: code })}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="País" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.flag} {country.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Área"
        value={value.areaCode}
        onChange={handleAreaCodeChange}
        disabled={disabled}
        inputMode="numeric"
      />
      <Input
        placeholder="Número de teléfono"
        value={value.phoneNumber}
        onChange={handlePhoneNumberChange}
        disabled={disabled}
        inputMode="numeric"
      />
    </div>
  )
}

/**
 * Formats phone input value for database storage
 *
 * Removes the '+' symbol and spaces to create a clean numeric string.
 *
 * @param value - PhoneInputValue object
 * @returns Formatted phone string (e.g., "5491128796633") or empty string if incomplete
 */
export function formatPhoneForDatabase(value: PhoneInputValue): string {
  if (!value.areaCode.trim() || !value.phoneNumber.trim()) {
    return ""
  }

  // Remove the '+' from country code and concatenate without spaces
  const cleanCountryCode = value.countryCode.replace("+", "")
  return `${cleanCountryCode}${value.areaCode}${value.phoneNumber}`
}

/**
 * Parses a database phone string into PhoneInputValue
 *
 * Attempts to split a raw phone number string into country code, area code, and phone number.
 * This is a best-effort parser based on common patterns.
 *
 * @param phoneString - Raw phone string from database (e.g., "5491128796633")
 * @param defaultCountryCode - Default country code to use if parsing fails
 * @returns PhoneInputValue object
 */
export function parsePhoneFromDatabase(
  phoneString: string | null | undefined,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE
): PhoneInputValue {
  if (!phoneString || phoneString.trim() === "") {
    return {
      countryCode: defaultCountryCode,
      areaCode: "",
      phoneNumber: "",
    }
  }

  // Remove any non-numeric characters
  const cleanPhone = phoneString.replace(/\D/g, "")

  // Try to match against known country codes
  for (const country of COUNTRY_CODES) {
    const codeDigits = country.code.replace("+", "")
    if (cleanPhone.startsWith(codeDigits)) {
      const remaining = cleanPhone.slice(codeDigits.length)

      // For Argentina (+54), area codes are typically 2-4 digits
      // For simplicity, assume first 3 digits are area code, rest is phone number
      if (remaining.length >= 4) {
        const areaCode = remaining.slice(0, 3)
        const phoneNumber = remaining.slice(3)
        return {
          countryCode: country.code,
          areaCode,
          phoneNumber,
        }
      }

      return {
        countryCode: country.code,
        areaCode: remaining,
        phoneNumber: "",
      }
    }
  }

  // Fallback: couldn't match a country code
  return {
    countryCode: defaultCountryCode,
    areaCode: "",
    phoneNumber: cleanPhone,
  }
}
