"use client"

import { useState } from "react"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AlertTriangle, Mail, Loader2 } from "lucide-react"

interface EmailChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
  userName: string
  onChangeEmail: (newEmail: string) => Promise<{ success: boolean; error: string | null }>
}

const emailSchema = z.string().email("El formato del email es invalido")

export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  userName,
  onChangeEmail,
}: EmailChangeDialogProps) {
  const [newEmail, setNewEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetState = () => {
    setNewEmail("")
    setError(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  const validate = (): string | null => {
    if (!newEmail.trim()) {
      return "El nuevo email es requerido"
    }

    const result = emailSchema.safeParse(newEmail.trim())
    if (!result.success) {
      return result.error.issues[0].message
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      return "El nuevo email debe ser diferente al actual"
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await onChangeEmail(newEmail.trim().toLowerCase())

      if (result.success) {
        toast.success(
          `Email cambiado exitosamente. Se ha enviado una invitacion a ${newEmail.trim().toLowerCase()}`
        )
        handleOpenChange(false)
      } else {
        toast.error(result.error || "Error al cambiar el email")
      }
    } catch {
      toast.error("Error inesperado al cambiar el email")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cambiar Email de {userName}</DialogTitle>
        </DialogHeader>

        <Alert className="border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertTitle>Cambio de Email de Cuenta</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="mb-2">Al cambiar el email de este usuario:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Se enviara una nueva invitacion al nuevo email</li>
              <li>El estado de la cuenta cambiara a &quot;Pendiente&quot;</li>
              <li>El usuario debera verificar su nuevo email y establecer una nueva contrasena</li>
              <li>Todas las sesiones activas se cerraran inmediatamente</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Separator />

        <div className="space-y-2">
          <Label>Email actual</Label>
          <p className="text-sm text-muted-foreground">{currentEmail}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-email">Nuevo email *</Label>
          <Input
            id="new-email"
            type="email"
            placeholder="nuevo-email@ejemplo.com"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSubmitting) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className={error ? "border-destructive" : ""}
            disabled={isSubmitting}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!newEmail.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cambiando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Cambiar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
