"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImageIcon, Upload, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { uploadClinicLogo, deleteClinicLogo } from "../actions"

interface LogoUploadCardProps {
  currentLogoUrl: string | null
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"]

export function LogoUploadCard({ currentLogoUrl }: LogoUploadCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)

  const isLoading = isUploading || isDeleting

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input value so the same file can be selected again
    event.target.value = ""

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de archivo no permitido. Usa JPG o PNG")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("El archivo es demasiado grande. Tamaño máximo: 2MB")
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadClinicLogo(formData)

      if (result.success && result.publicUrl) {
        setLogoUrl(result.publicUrl)
        toast.success("Logo actualizado exitosamente")
        router.refresh()
      } else {
        toast.error(result.error || "Error al subir el logo")
      }
    } catch {
      toast.error("Error inesperado al subir el logo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteClinicLogo()

      if (result.success) {
        setLogoUrl(null)
        toast.success("Logo eliminado exitosamente")
        router.refresh()
      } else {
        toast.error(result.error || "Error al eliminar el logo")
      }
    } catch {
      toast.error("Error inesperado al eliminar el logo")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ImageIcon className="h-5 w-5" />
          Logo del Consultorio
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Imagen que aparecerá en los emails y comunicaciones del sistema
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Logo Preview */}
        {!logoUrl ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-12">
            <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              No hay logo configurado
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8">
            <div className="relative w-48 h-48 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo del consultorio"
                className="w-full h-full object-contain rounded-md"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Logo actual del consultorio
            </p>
          </div>
        )}

        {/* Button Group */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleUploadClick}
            disabled={isLoading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {logoUrl ? "Cambiar Logo" : "Subir Logo"}
              </>
            )}
          </Button>

          {logoUrl && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isLoading}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Logo
                </>
              )}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground mt-3">
          Formatos permitidos: JPG, PNG. Tamaño máximo: 2MB
        </p>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
