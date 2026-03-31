"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Phone, MapPin, Loader2, Save } from "lucide-react"
import { updateClinicInfo } from "../actions"
import { LogoUploadCard } from "./logo-upload-card"
import type { ClinicInfo } from "@/lib/email/types"

interface ClinicInfoTabContentProps {
  clinicInfo: ClinicInfo | null
}

// Country codes for WhatsApp dropdown (only Argentina for now)
const COUNTRY_CODES = [
  { value: "+54", label: "+54 (Argentina)" },
]

/**
 * Parse WhatsApp number from database format (+5491XXXXXXXXX) to UI state
 * Returns the number without country code and the "9"
 */
function parseWhatsAppFromDb(dbValue: string | null): { countryCode: string; number: string } {
  if (!dbValue) {
    return { countryCode: "+54", number: "" }
  }

  // Check if it starts with +549 (Argentina mobile format)
  if (dbValue.startsWith("+549")) {
    return { countryCode: "+54", number: dbValue.slice(4) } // Remove +549
  }

  // If doesn't match expected format, treat as empty
  console.warn("WhatsApp number doesn't match expected format (+549...), treating as empty:", dbValue)
  return { countryCode: "+54", number: "" }
}

/**
 * Format WhatsApp number for database storage
 * Concatenates country code + "9" + number -> +5491XXXXXXXXX
 */
function formatWhatsAppForDb(countryCode: string, number: string): string | null {
  if (!number.trim()) {
    return null
  }

  // Remove any non-digit characters from the number
  const cleanNumber = number.replace(/\D/g, "")

  if (!cleanNumber) {
    return null
  }

  // Format: +54 + 9 + number
  return `${countryCode}9${cleanNumber}`
}

export function ClinicInfoTabContent({ clinicInfo }: ClinicInfoTabContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Parse initial WhatsApp state from DB
  const initialWhatsApp = parseWhatsAppFromDb(clinicInfo?.whatsapp_numero || null)

  // Form state
  const [formData, setFormData] = useState({
    nombre: clinicInfo?.nombre || "",
    descripcion: clinicInfo?.descripcion || "",
    telefono: clinicInfo?.telefono || "",
    email: clinicInfo?.email || "",
    sitio_web: clinicInfo?.sitio_web || "",
    direccion: clinicInfo?.direccion || "",
    ciudad: clinicInfo?.ciudad || "",
    provincia: clinicInfo?.provincia || "",
    codigo_postal: clinicInfo?.codigo_postal || "",
    google_maps_url: clinicInfo?.google_maps_url || "",
  })

  // Separate state for WhatsApp (country code + number)
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(initialWhatsApp.countryCode)
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsApp.number)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Handle WhatsApp number input - only allow digits
  const handleWhatsappNumberChange = (value: string) => {
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, "")
    setWhatsappNumber(digitsOnly)
  }

  const handleSave = async () => {
    if (!clinicInfo) {
      toast.error("No se pudo cargar la información del consultorio")
      return
    }

    if (!formData.nombre.trim()) {
      toast.error("El nombre del consultorio es requerido")
      return
    }

    // Validate Google Maps URL if provided
    if (formData.google_maps_url.trim() && !formData.google_maps_url.startsWith("https://")) {
      toast.error("El link de Google Maps debe comenzar con https://")
      return
    }

    setIsLoading(true)

    // Format WhatsApp number for database
    const whatsappForDb = formatWhatsAppForDb(whatsappCountryCode, whatsappNumber)

    const result = await updateClinicInfo(clinicInfo.id, {
      ...formData,
      whatsapp_numero: whatsappForDb || undefined,
    })

    if (result.success) {
      toast.success("Información del consultorio actualizada")
      router.refresh()
    } else {
      toast.error(result.error || "Error al actualizar la información")
    }

    setIsLoading(false)
  }

  if (!clinicInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No se pudo cargar la información del consultorio.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload Card */}
      <LogoUploadCard currentLogoUrl={clinicInfo.logo_url} />

      {/* Clinic Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Datos del Consultorio</CardTitle>
          </div>
          <CardDescription>
            Información básica que aparecerá en los emails y comunicaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Consultorio *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleInputChange("nombre", e.target.value)}
              placeholder="Ej: Clínica Dermatológica"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleInputChange("descripcion", e.target.value)}
              placeholder="Breve descripción de la clínica"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Información de Contacto</CardTitle>
          </div>
          <CardDescription>
            Datos de contacto que se incluirán en los recordatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange("telefono", e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Ej: contacto@clinica.com"
              />
            </div>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp_numero">Número de WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Ingrese el número sin el &quot;15&quot;, solo código de área + número (ej: 1124567586)
            </p>
            <div className="flex gap-2">
              <Select
                value={whatsappCountryCode}
                onValueChange={setWhatsappCountryCode}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Código" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="whatsapp_numero"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => handleWhatsappNumberChange(e.target.value)}
                placeholder="Ej: 1124567586"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sitio_web">Sitio Web</Label>
            <Input
              id="sitio_web"
              type="url"
              value={formData.sitio_web}
              onChange={(e) => handleInputChange("sitio_web", e.target.value)}
              placeholder="Ej: https://www.clinica.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Ubicación</CardTitle>
          </div>
          <CardDescription>
            Dirección completa para incluir en los emails de cita
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleInputChange("direccion", e.target.value)}
              placeholder="Ej: Av. Corrientes 1234, Piso 5, Oficina B"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => handleInputChange("ciudad", e.target.value)}
                placeholder="Ej: Buenos Aires"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia</Label>
              <Input
                id="provincia"
                value={formData.provincia}
                onChange={(e) => handleInputChange("provincia", e.target.value)}
                placeholder="Ej: CABA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_postal">Código Postal</Label>
              <Input
                id="codigo_postal"
                value={formData.codigo_postal}
                onChange={(e) => handleInputChange("codigo_postal", e.target.value)}
                placeholder="Ej: C1043"
              />
            </div>
          </div>

          {/* Google Maps URL */}
          <div className="space-y-2">
            <Label htmlFor="google_maps_url">Link Google Maps</Label>
            <Input
              id="google_maps_url"
              type="url"
              value={formData.google_maps_url}
              onChange={(e) => handleInputChange("google_maps_url", e.target.value)}
              placeholder="Ej: https://maps.google.com/..."
            />
            <p className="text-sm text-muted-foreground">
              Copie el link de Google Maps de la ubicación del consultorio
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
