"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils/date-format"

interface AccesoVeviPageProps {
  usuario: string | null
  password: string | null
  registradoAt: string | null
  comentarios: string | null
}

export function AccesoVeviPage({
  usuario,
  password,
  registradoAt,
  comentarios,
}: AccesoVeviPageProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isRegistered = !!registradoAt && !!usuario && !!password

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado al portapapeles`)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Acceso Vevi</h1>
        <p className="text-muted-foreground">
          Tus credenciales de acceso a la plataforma Vevi Dental.
        </p>
      </div>

      {!isRegistered ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Pendiente de registro</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Todavía no estás registrado en Vevi Dental. El administrador te dará
                de alta al procesar tu primera solicitud de prótesis.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-base">Credenciales Vevi Dental</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Usuario */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Usuario</Label>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono flex-1 break-all">{usuario}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(usuario!, "Usuario")}
                  aria-label="Copiar usuario"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Contraseña</Label>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono flex-1 break-all">
                  {showPassword ? password : "••••••••"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(password!, "Contraseña")}
                  aria-label="Copiar contraseña"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Fecha de registro */}
            <div className="space-y-1 pt-2 border-t">
              <Label className="text-muted-foreground text-xs">Fecha de registro</Label>
              <p className="text-sm">{formatDateTime(registradoAt!)}</p>
            </div>

            {/* Comentarios (opcional) */}
            {comentarios && (
              <div className="space-y-1 pt-2 border-t">
                <Label className="text-muted-foreground text-xs">Comentarios del administrador</Label>
                <p className="text-sm whitespace-pre-wrap">{comentarios}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
